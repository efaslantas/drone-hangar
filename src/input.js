import {normalizeRcSettings,selectRcDevice,mapRcInput} from './rc-input.js';
import { R2_ENGAGE, KEY_CLIMB, KEY_DESCEND, radialDeadzone, expo, clamp, calibratedAxis, rightStickAxes, triggerValue, profileFor } from "./controls.js";

let inputSettings=normalizeRcSettings(null);
export function setInputSettings(value){inputSettings=normalizeRcSettings(value);return inputSettings;}
export function getInputSettings(){return structuredClone(inputSettings);}
export function readInputDevices(){return Array.from(globalThis.navigator?.getGamepads?.()||[]).filter(Boolean);}
let controlProfile = profileFor("training");
let gamepadCalibration = null;

export function setControlProfile(name) {
  controlProfile = profileFor(name);
}

export function setGamepadCalibration(value) {
  gamepadCalibration = value?.axes?.length ? value : null;
}

export function getGamepadCalibration() {
  return gamepadCalibration;
}

export function captureGamepadCalibration(durationMs = 4000, onProgress = () => {}) {
  const pads = navigator.getGamepads?.() || [];
  const gp = gpIndex != null ? pads[gpIndex] : pads.find(Boolean);
  if (!gp) return Promise.reject(new Error("PS kol bulunamadı"));
  const axes = Array.from(gp.axes, (v) => ({ center: Number(v) || 0, min: Number(v) || 0, max: Number(v) || 0 }));
  const started = performance.now();
  return new Promise((resolve) => {
    const sample = (now) => {
      const current = navigator.getGamepads?.()[gp.index];
      if (!current) {
        resolve(null);
        return;
      }
      current.axes.forEach((v, i) => {
        axes[i] ??= { center: Number(v) || 0, min: Number(v) || 0, max: Number(v) || 0 };
        axes[i].min = Math.min(axes[i].min, v);
        axes[i].max = Math.max(axes[i].max, v);
      });
      const ratio = Math.min(1, (now - started) / durationMs);
      onProgress(ratio);
      if (ratio < 1) requestAnimationFrame(sample);
      else {
        const result = { id: current.id, axes, at: Date.now() };
        setGamepadCalibration(result);
        resolve(result);
      }
    };
    requestAnimationFrame(sample);
  });
}

const keys = new Set();

export const sticks = {
  left: { x: 0, y: 0, active: false },
  right: { x: 0, y: 0, active: false },
};

export const flags = {
  arm: false,
  cam: false,
  reset: false,
  mode: false,
  hangar: false,
  help: false,
  mute: false,
  controlLost: false,
};

const held = {
  arm: false,
  cam: false,
  reset: false,
  mode: false,
  hangar: false,
  help: false,
  mute: false,
};

let gpIndex = null;

function edge(name, down) {
  if (down && !held[name]) flags[name] = true;
  held[name] = down;
}

globalThis.window?.addEventListener("keydown", (e) => {
  if (e.target?.matches?.("input, textarea, select, [contenteditable='true']") && e.code !== "Escape") return;
  // A focused button owns Space; native activation must not also request ARM.
  if(e.code==='Space'&&e.target?.closest?.('button, a[href], summary, [role="button"]'))return;
  keys.add(e.code);
  if (e.code === "Escape" && !e.repeat) { flags.hangar = true; e.preventDefault(); }
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
});
globalThis.window?.addEventListener("keyup", (e) => keys.delete(e.code));
globalThis.window?.addEventListener("blur", () => keys.clear());

globalThis.window?.addEventListener("gamepadconnected", (e) => {
  gpIndex = e.gamepad.index;
});
globalThis.window?.addEventListener("gamepaddisconnected", (e) => {
  if (gpIndex === e.gamepad.index) {
    gpIndex = null;
    flags.controlLost = true;
  }
});
function kaxis(pos, neg) {
  let v = 0;
  if (keys.has(pos)) v += 1;
  if (keys.has(neg)) v -= 1;
  return v;
}

export function poll() {
  let lift = 0;
  if (keys.has("KeyW")) lift += KEY_CLIMB;
  if (keys.has("KeyS")) lift -= KEY_DESCEND;
  let yaw = expo(kaxis("KeyD", "KeyA"), 0.2);
  let pitch = expo(kaxis("ArrowUp", "ArrowDown") + kaxis("KeyI", "KeyK"), 0.2);
  let roll = expo(kaxis("ArrowRight", "ArrowLeft") + kaxis("KeyL", "KeyJ"), 0.2);
  let r2 = 0;
  let gpName = "";
  let viz = { lx: 0, ly: 0, rx: 0, ry: 0, r2: 0 };

  const pads = navigator.getGamepads?.() || [];
  const isRc=inputSettings.mode==='rc';
  const gp = isRc?selectRcDevice(pads,inputSettings):gpIndex != null ? pads[gpIndex] : pads.find(Boolean);
  const rcInput=isRc?mapRcInput(gp,inputSettings):null;
  if(isRc) {
    ({yaw,pitch,roll}=rcInput);gpName=gp?.id||'';
    viz={lx:yaw,ly:1-2*rcInput.throttle,rx:roll,ry:-pitch,r2:0};
  } else if (gp) {
    gpName = gp.id;
    const calibrated = Array.from(gp.axes, (v, i) => calibratedAxis(v, gamepadCalibration?.axes?.[i]));
    const [lx, ly] = radialDeadzone(calibrated[0] || 0, calibrated[1] || 0, controlProfile.dead);
    const [rax, ray] = rightStickAxes(calibrated);
    const [rx, ry] = radialDeadzone(rax, ray, controlProfile.dead);
    const trig = triggerValue(gp);
    r2 = controlProfile.punch && trig > R2_ENGAGE ? trig : 0;
    yaw = expo(lx, controlProfile.expo) * controlProfile.rate;
    lift = -ly;
    roll = expo(rx, controlProfile.expo) * controlProfile.rate;
    pitch = expo(-ry, controlProfile.expo) * controlProfile.rate;
    viz = { lx, ly, rx, ry, r2: trig };
  }

  if (!isRc && (sticks.left.active || sticks.right.active)) {
    yaw = expo(sticks.left.x, 0.2);
    lift = -sticks.left.y;
    roll = expo(sticks.right.x, 0.22);
    pitch = expo(-sticks.right.y, 0.22);
    viz = {
      lx: sticks.left.x,
      ly: sticks.left.y,
      rx: sticks.right.x,
      ry: sticks.right.y,
      r2,
    };
  }

  const actionPad=isRc?null:gp;
  edge("arm", keys.has("Space") || (actionPad && actionPad.buttons[0]?.pressed));
  edge("reset", keys.has("KeyR") || (actionPad && actionPad.buttons[1]?.pressed));
  edge("cam", keys.has("KeyC") || (actionPad && actionPad.buttons[2]?.pressed));
  edge("mode", keys.has("KeyT") || (actionPad && actionPad.buttons[3]?.pressed));
  edge("help", keys.has("KeyH") || (actionPad && (actionPad.buttons[9]?.pressed || actionPad.buttons[8]?.pressed)));
  edge("mute", keys.has("KeyM"));
  return {
    ...(isRc?rcInput:{controlMode:'gamepad',lift:clamp(lift)}),
    r2: clamp(r2, 0, 1),
    yaw: clamp(yaw),
    pitch: clamp(pitch),
    roll: clamp(roll),
    gpName,
    connected: Boolean(gp),
    viz,
  };
}

export function consume(name) {
  const v = flags[name];
  flags[name] = false;
  return v;
}

export function bindStick(el, side) {
  const st = sticks[side];
  const knob = el.querySelector(".knob");

  function setFrom(clientX, clientY) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const max = r.width * 0.38;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const m = Math.hypot(dx, dy);
    if (m > max) {
      dx = (dx / m) * max;
      dy = (dy / m) * max;
    }
    st.x = dx / max;
    st.y = dy / max;
    st.active = true;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function end() {
    st.x = 0;
    st.y = 0;
    st.active = false;
    knob.style.transform = "translate(0,0)";
  }

  el.addEventListener(
    "pointerdown",
    (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      setFrom(e.clientX, e.clientY);
    },
    { passive: false },
  );
  el.addEventListener(
    "pointermove",
    (e) => {
      if (!st.active) return;
      setFrom(e.clientX, e.clientY);
    },
    { passive: false },
  );
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("lostpointercapture", end);
}

export function bindTap(el, fn) {
  if (!el) return;
  el.addEventListener(
    "pointerdown",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn(e);
    },
    { passive: false },
  );
  el.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.detail === 0) fn(e);
  });
}

const RADIUS = 88;
const stickTouch = { left: null, right: null };
const stickOrigin = {
  left: { x: 0, y: 0 },
  right: { x: 0, y: 0 },
};

function setKnob(side) {
  const el = document.getElementById(side === "left" ? "st-l" : "st-r");
  const knob = el?.querySelector(".knob");
  if (!knob) return;
  const st = sticks[side];
  const px = st.x * 38;
  const py = st.y * 38;
  knob.style.transform = `translate(${px}px, ${py}px)`;
}

function applyStick(side, x, y) {
  const o = stickOrigin[side];
  let dx = x - o.x;
  let dy = y - o.y;
  const m = Math.hypot(dx, dy);
  if (m > RADIUS) {
    dx = (dx / m) * RADIUS;
    dy = (dy / m) * RADIUS;
  }
  sticks[side].x = dx / RADIUS;
  sticks[side].y = dy / RADIUS;
  sticks[side].active = true;
  setKnob(side);
}

function clearStick(side) {
  sticks[side].x = 0;
  sticks[side].y = 0;
  sticks[side].active = false;
  stickTouch[side] = null;
  setKnob(side);
}

export function bindFlightTouches(root) {
  function roleFor(touch, target) {
    if (target?.closest?.("[data-ui]")) return "ui";
    if (stickTouch.left != null && stickTouch.right != null) return "ui";
    return touch.clientX < (globalThis.window?.innerWidth || 0) * 0.5 ? "left" : "right";
  }

  function onStart(e) {
    for (const t of e.changedTouches) {
      const node = document.elementFromPoint(t.clientX, t.clientY) || e.target;
      const role = roleFor(t, node);
      if (role === "ui") continue;
      e.preventDefault();
      if (stickTouch[role] != null) continue;
      stickTouch[role] = t.identifier;
      stickOrigin[role] = { x: t.clientX, y: t.clientY };
      applyStick(role, t.clientX, t.clientY);
    }
  }

  function onMove(e) {
    let used = false;
    for (const t of e.changedTouches) {
      if (t.identifier === stickTouch.left) {
        used = true;
        applyStick("left", t.clientX, t.clientY);
      } else if (t.identifier === stickTouch.right) {
        used = true;
        applyStick("right", t.clientX, t.clientY);
      }
    }
    if (used) e.preventDefault();
  }

  function onEnd(e) {
    for (const t of e.changedTouches) {
      if (stickTouch.left === t.identifier) clearStick("left");
      if (stickTouch.right === t.identifier) clearStick("right");
    }
  }

  const opt = { passive: false, capture: true };
  root.addEventListener("touchstart", onStart, opt);
  root.addEventListener("touchmove", onMove, opt);
  root.addEventListener("touchend", onEnd, opt);
  root.addEventListener("touchcancel", onEnd, opt);
}
