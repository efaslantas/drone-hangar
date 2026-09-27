import { R2_ENGAGE, KEY_CLIMB, KEY_DESCEND, radialDeadzone, expo, clamp, calibratedAxis, rightStickAxes, triggerValue, profileFor } from "./controls.js";

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
  vehiclePrev: false,
  vehicleNext: false,
  emergencyStop: false,
  consoleHelp: false,
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
  vehiclePrev: false,
  vehicleNext: false,
  consoleHelp: false,
};

let gpIndex = null;
let mouseFire = false;
let holdFire = false;
let emergencyChordAt = null;
let emergencyChordFired = false;

function edge(name, down) {
  if (down && !held[name]) flags[name] = true;
  held[name] = down;
}

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code === "Escape" && !e.repeat) { flags.hangar = true; e.preventDefault(); }
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => keys.clear());

window.addEventListener("gamepadconnected", (e) => {
  gpIndex = e.gamepad.index;
});
window.addEventListener("gamepaddisconnected", (e) => {
  if (gpIndex === e.gamepad.index) {
    gpIndex = null;
    flags.controlLost = true;
  }
});
let lastTouchAt = 0;
window.addEventListener(
  "touchstart",
  () => {
    lastTouchAt = Date.now();
  },
  { passive: true },
);
window.addEventListener("mousedown", (e) => {
  if (Date.now() - lastTouchAt < 900) return;
  if (e.button === 0) mouseFire = true;
});
window.addEventListener("mouseup", (e) => {
  if (e.button === 0) mouseFire = false;
});
window.addEventListener("blur", () => {
  mouseFire = false;
  holdFire = false;
});

function kaxis(pos, neg) {
  let v = 0;
  if (keys.has(pos)) v += 1;
  if (keys.has(neg)) v -= 1;
  return v;
}

function rawTrigger(gp, buttonIndex) {
  const button = gp?.buttons?.[buttonIndex];
  const value = typeof button === "object" ? Number(button.value) || 0 : Number(button) || 0;
  if (value > 0.02) return Math.min(1, value);
  return button?.pressed ? 1 : 0;
}

export function consoleInput(rawInput, vehicleKind, profile = {}) {
  const threshold = Number(profile.manualIntentThreshold) || 0.22;
  if (vehicleKind === "sea") {
    const command = {
      throttle: clamp(-Number(rawInput?.viz?.ly || 0)),
      steer: clamp(Number(rawInput?.viz?.rx || 0)),
    };
    return {
      command,
      manualIntent: Math.max(Math.abs(command.throttle), Math.abs(command.steer)) >= threshold,
    };
  }
  const command = {
    lift: clamp(Number(rawInput?.lift || 0)),
    yaw: clamp(Number(rawInput?.yaw || 0)),
    pitch: clamp(Number(rawInput?.pitch || 0)),
    roll: clamp(Number(rawInput?.roll || 0)),
  };
  return {
    command,
    manualIntent: Object.values(command).some((value) => Math.abs(value) >= threshold),
  };
}

export function poll(now = performance.now()) {
  let lift = 0;
  if (keys.has("KeyW")) lift += KEY_CLIMB;
  if (keys.has("KeyS")) lift -= KEY_DESCEND;
  let yaw = expo(kaxis("KeyD", "KeyA"), 0.2);
  let pitch = expo(kaxis("ArrowUp", "ArrowDown") + kaxis("KeyI", "KeyK"), 0.2);
  let roll = expo(kaxis("ArrowRight", "ArrowLeft") + kaxis("KeyL", "KeyJ"), 0.2);
  let r2 = 0;
  let l2 = 0;
  let rawR2 = 0;
  let gpName = "";
  let viz = { lx: 0, ly: 0, rx: 0, ry: 0, r2: 0 };

  const pads = navigator.getGamepads?.() || [];
  const gp = gpIndex != null ? pads[gpIndex] : pads.find(Boolean);
  if (gp) {
    gpName = gp.id;
    const calibrated = Array.from(gp.axes, (v, i) => calibratedAxis(v, gamepadCalibration?.axes?.[i]));
    const [lx, ly] = radialDeadzone(calibrated[0] || 0, calibrated[1] || 0, controlProfile.dead);
    const [rax, ray] = rightStickAxes(calibrated);
    const [rx, ry] = radialDeadzone(rax, ray, controlProfile.dead);
    const trig = triggerValue(gp);
    l2 = rawTrigger(gp, 6);
    rawR2 = trig;
    r2 = controlProfile.punch && trig > R2_ENGAGE ? trig : 0;
    yaw = expo(lx, controlProfile.expo) * controlProfile.rate;
    lift = -ly;
    roll = expo(rx, controlProfile.expo) * controlProfile.rate;
    pitch = expo(-ry, controlProfile.expo) * controlProfile.rate;
    viz = { lx, ly, rx, ry, r2: trig };
  }

  if (sticks.left.active || sticks.right.active) {
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

  edge("arm", keys.has("Space") || (gp && gp.buttons[0]?.pressed));
  edge("reset", keys.has("KeyR") || (gp && gp.buttons[1]?.pressed));
  edge("cam", keys.has("KeyC") || (gp && gp.buttons[2]?.pressed));
  edge("mode", keys.has("KeyT") || (gp && gp.buttons[3]?.pressed));
  edge("help", keys.has("KeyH") || (gp && (gp.buttons[9]?.pressed || gp.buttons[8]?.pressed)));
  edge("mute", keys.has("KeyM"));
  edge("vehiclePrev", Boolean(gp?.buttons[4]?.pressed));
  edge("vehicleNext", Boolean(gp?.buttons[5]?.pressed));
  edge("consoleHelp", Boolean(gp?.buttons[9]?.pressed));

  if (l2 >= 0.9 && rawR2 >= 0.9) {
    if (emergencyChordAt == null) emergencyChordAt = now;
    if (!emergencyChordFired && now - emergencyChordAt >= 700) {
      flags.emergencyStop = true;
      emergencyChordFired = true;
    }
  } else {
    emergencyChordAt = null;
    emergencyChordFired = false;
  }

  const fire =
    keys.has("KeyF") ||
    mouseFire ||
    holdFire ||
    Boolean(gp && (gp.buttons[5]?.pressed || gp.buttons[4]?.pressed));

  return {
    lift: clamp(lift),
    r2: clamp(r2, 0, 1),
    l2,
    rawR2,
    yaw: clamp(yaw),
    pitch: clamp(pitch),
    roll: clamp(roll),
    fire,
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

export function bindHold(el, on) {
  const start = (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.setPointerCapture?.(e.pointerId);
    on(true);
  };
  const stop = (e) => {
    e.preventDefault();
    on(false);
  };
  el.addEventListener("pointerdown", start, { passive: false });
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointercancel", stop);
  el.addEventListener("lostpointercapture", () => on(false));
}

export function setHoldFire(v) {
  holdFire = v;
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
  });
}

const RADIUS = 88;
const stickTouch = { left: null, right: null };
const stickOrigin = {
  left: { x: 0, y: 0 },
  right: { x: 0, y: 0 },
};
const fireTouches = new Set();

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

function refreshFire() {
  holdFire = fireTouches.size > 0;
}

export function bindFlightTouches(root) {
  function roleFor(touch, target) {
    if (target?.closest?.("[data-fire]")) return "fire";
    if (target?.closest?.("[data-ui]")) return "ui";
    if (stickTouch.left != null && stickTouch.right != null) return "fire";
    return touch.clientX < window.innerWidth * 0.5 ? "left" : "right";
  }

  function onStart(e) {
    for (const t of e.changedTouches) {
      const node = document.elementFromPoint(t.clientX, t.clientY) || e.target;
      const role = roleFor(t, node);
      if (role === "ui") continue;
      e.preventDefault();
      if (role === "fire") {
        fireTouches.add(t.identifier);
        refreshFire();
        continue;
      }
      if (stickTouch[role] != null) {
        fireTouches.add(t.identifier);
        refreshFire();
        continue;
      }
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
      if (fireTouches.delete(t.identifier)) refreshFire();
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
