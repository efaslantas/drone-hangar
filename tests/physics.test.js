import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG, droneById } from "../src/catalog.js";
import {
  createState,
  step,
  hoverThrottle,
  collectiveToThrottle,
  eulerYXZ,
  yawErrTo,
  rotateVec,
} from "../src/physics.js";
import { aabbFromBox, applyWorld } from "../src/collide.js";

const whoop = CATALOG[0];
const fleet = CATALOG[2];

function fly(spec, input, seconds, y0 = 8) {
  const s = createState(0, y0, 0);
  s.armed = true;
  const n = Math.floor(seconds * 60);
  for (let i = 0; i < n; i++) step(s, input, spec, 1 / 60);
  return s;
}

test("yaw error is 0 looking at a point ahead (-Z)", () => {
  const s = createState(0, 8, 0);
  assert.ok(Math.abs(yawErrTo(s, 0, -10)) < 0.05);
  const right = yawErrTo(s, 10, 0);
  assert.ok(right > 1.2 && right < 1.9, `right ${right}`);
});

test("hover throttle roughly holds altitude in angle mode", () => {
  const s = createState(0, 8, 0);
  s.armed = true;
  const thr = hoverThrottle(whoop);
  const input = { throttle: thr, yaw: 0, pitch: 0, roll: 0, angleMode: true };
  for (let i = 0; i < 240; i++) step(s, input, whoop, 1 / 60);
  assert.ok(s.y > 4 && s.y < 14, `alt=${s.y}`);
  assert.equal(s.crashed, false);
});

test("disarmed craft falls to ground", () => {
  const s = createState(0, 5, 0);
  const input = { throttle: 1, yaw: 0, pitch: 0, roll: 0, angleMode: true };
  for (let i = 0; i < 180; i++) step(s, input, whoop, 1 / 60);
  assert.ok(s.y < 0.2);
  assert.equal(s.armed, false);
});

test("stick center (lift 0) maps to hover throttle", () => {
  const whoopH = hoverThrottle(whoop);
  assert.ok(Math.abs(collectiveToThrottle(0, whoop, 0) - whoopH) < 1e-9);
  assert.equal(collectiveToThrottle(-1, whoop, 0), 0);
  assert.equal(collectiveToThrottle(1, whoop, 0), 1);
  assert.equal(collectiveToThrottle(0, whoop, 0.5), 0.5);
  assert.equal(collectiveToThrottle(0, whoop, 0.2), whoopH);
});

test("FPV PS-stick curve keeps a precise hover centre and reaches full throttle", () => {
  const racer = CATALOG.find((d) => d.id === "racer");
  const h = hoverThrottle(racer);
  const up = collectiveToThrottle(1, racer, 0);
  assert.equal(up, 1);
  assert.ok(collectiveToThrottle(0.2, racer, 0) < h + 0.04, "small correction stays precise");
  assert.ok(Math.abs(collectiveToThrottle(-0.5, racer, 0) - h * 0.5) < 1e-9, "lower half has no dead throttle band");
  assert.equal(collectiveToThrottle(-1, racer, 0), 0);
});

test("FPV lower stick cuts thrust and produces a controlled descent", () => {
  const racer = CATALOG.find((d) => d.id === "racer");
  const go = { r2: 0, yaw: 0, pitch: 0, roll: 0, angleMode: false };
  const down = fly(racer, { ...go, lift: -1 }, 1, 40);
  const drop = 40 - down.y;
  assert.ok(drop > 4 && drop < 12, `drop ${drop}`);
  assert.equal(down.crashed, false);
});

test("every drone holds hover for 8s without tumbling", () => {
  for (const spec of CATALOG) {
    const s = fly(spec, { lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0, angleMode: true }, 8);
    const e = eulerYXZ(s.qw, s.qx, s.qy, s.qz);
    assert.equal(s.crashed, false, spec.id);
    assert.ok(Math.abs(s.y - 8) < 0.6, `${spec.id} y=${s.y}`);
    assert.ok(Math.hypot(s.x, s.z) < 0.8, `${spec.id} drift`);
    assert.ok(Math.hypot(e.pitch, e.roll) < 0.08, `${spec.id} tilt`);
  }
});

test("lift 0 in angle mode holds altitude", () => {
  const s = fly(whoop, { lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0, angleMode: true }, 4);
  assert.ok(s.y > 7.4 && s.y < 8.6, `alt=${s.y}`);
});

test("pitch stick then release returns to level", () => {
  const s = createState(0, 8, 0);
  s.armed = true;
  const go = { lift: 0, r2: 0, yaw: 0, pitch: 0.7, roll: 0, angleMode: true };
  const idle = { lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0, angleMode: true };
  for (let i = 0; i < 90; i++) step(s, go, fleet, 1 / 60);
  const mid = eulerYXZ(s.qw, s.qx, s.qy, s.qz);
  assert.ok(Math.abs(mid.pitch) > 0.08, `mid pitch ${mid.pitch}`);
  for (let i = 0; i < 180; i++) step(s, idle, fleet, 1 / 60);
  const end = eulerYXZ(s.qw, s.qx, s.qy, s.qz);
  assert.ok(Math.abs(end.pitch) < 0.06, `end pitch ${end.pitch}`);
  assert.ok(Math.abs(end.roll) < 0.06, `end roll ${end.roll}`);
  assert.equal(s.crashed, false);
});

test("forward pitch moves into the park (-Z), not tumbling", () => {
  const s = fly(fleet, { lift: 0, r2: 0, yaw: 0, pitch: 0.55, roll: 0, angleMode: true }, 3);
  assert.equal(s.crashed, false);
  assert.ok(s.z < -1.2, `z=${s.z} (expected forward -Z)`);
  assert.ok(Math.abs(s.x) < 1.2, `x=${s.x}`);
  assert.ok(s.y > 4, `y=${s.y}`);
});

test("forward pitch has the same nose direction in Acro and Angle", () => {
  for (const angleMode of [true, false]) {
    const s = fly(fleet, { lift: 0, r2: 0, yaw: 0, pitch: 0.35, roll: 0, angleMode }, 0.35);
    const [, fy, fz] = rotateVec(s.qw, s.qx, s.qy, s.qz, 0, 0, -1);
    assert.ok(fy < -0.05 && fz < 0, `${angleMode ? "angle" : "acro"}: forward.y=${fy}, z=${fz}`);
  }
});

test("right roll moves +X", () => {
  const s = fly(fleet, { lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0.55, angleMode: true }, 3);
  assert.equal(s.crashed, false);
  assert.ok(s.x > 1.2, `x=${s.x}`);
});

test("positive yaw input (D key) turns right in both angle and acro mode", () => {
  // kaxis("KeyD", "KeyA") in input.js reports +1 for D — this must turn the
  // nose the same way "right roll moves +X" does, in every flight mode.
  // Angle mode had this inverted (D turned left) until this test was added.
  const angle = fly(fleet, { lift: 0, r2: 0, yaw: 1, pitch: 0, roll: 0, angleMode: true }, 0.5);
  const [fxA, , fzA] = rotateVec(angle.qw, angle.qx, angle.qy, angle.qz, 0, 0, -1);
  assert.ok(fxA > 0.05, `angle mode: forward.x=${fxA} (expected > 0, turned right)`);

  const acro = fly(fleet, { lift: 0, r2: 0, yaw: 1, pitch: 0, roll: 0, angleMode: false }, 0.5);
  const [fxB] = rotateVec(acro.qw, acro.qx, acro.qy, acro.qz, 0, 0, -1);
  assert.ok(fxB > 0.05, `acro mode: forward.x=${fxB} (expected > 0, turned right)`);
});

test("climb with lift 0.35 stays upright", () => {
  const s = fly(fleet, { lift: 0.35, r2: 0, yaw: 0, pitch: 0, roll: 0, angleMode: true }, 3);
  const e = eulerYXZ(s.qw, s.qx, s.qy, s.qz);
  assert.ok(s.y > 9, `y=${s.y}`);
  assert.ok(Math.hypot(e.pitch, e.roll) < 0.1);
  assert.equal(s.crashed, false);
});

test("whoop pitched cruise is not walking speed", () => {
  const s = fly(whoop, { lift: 0, r2: 0, yaw: 0, pitch: 1, roll: 0, angleMode: true }, 2.5);
  const kmh = Math.hypot(s.vx, s.vz) * 3.6;
  assert.ok(kmh > 18, `whoop ${kmh.toFixed(1)} km/h`);
  assert.equal(s.crashed, false);
});

test("racer pitched cruise is fast", () => {
  const racer = CATALOG.find((d) => d.id === "racer");
  const s = fly(racer, { lift: 0, r2: 0, yaw: 0, pitch: 0.7, roll: 0, angleMode: true }, 3);
  const kmh = Math.hypot(s.vx, s.vz) * 3.6;
  assert.ok(kmh > 40, `racer ${kmh.toFixed(1)} km/h`);
  assert.equal(s.crashed, false);
});

test("hard impact sets crashed", () => {
  const s = createState(0, 0.2, 0);
  s.armed = true;
  s.vy = -16;
  const input = { throttle: 0, yaw: 0, pitch: 0, roll: 0, angleMode: true };
  step(s, input, whoop, 1 / 60);
  assert.equal(s.crashed, true);
});

test("fast hit on a building crashes", () => {
  const spec = { size: 0.2 };
  const s = createState(2.05, 2, 0);
  s.armed = true;
  s.vx = 18;
  const play = {
    bounds: { minx: -40, maxx: 40, minz: -40, maxz: 40 },
    ceil: 30,
    boxes: [aabbFromBox(3, 2, 0, 2, 4, 2, 0)],
  };
  applyWorld(s, spec, play);
  assert.equal(s.crashed, true);
  assert.equal(s.crashReason, "çarptı");
});

test("slow graze on a wall does not crash", () => {
  const spec = { size: 0.2 };
  const s = createState(0, 2, 0);
  s.armed = true;
  s.vx = 2;
  const play = {
    bounds: { minx: -40, maxx: 40, minz: -40, maxz: 40 },
    ceil: 30,
    boxes: [aabbFromBox(1, 2, 0, 2, 4, 2, 0)],
  };
  applyWorld(s, spec, play);
  assert.equal(s.crashed, false);
  assert.ok(s.x <= 0.05);
});

test("map bounds stop endless flight", () => {
  const spec = { size: 0.2 };
  const s = createState(12, 5, 0);
  s.armed = true;
  s.vx = 14;
  applyWorld(s, spec, {
    bounds: { minx: -10, maxx: 10, minz: -10, maxz: 10 },
    ceil: 20,
    boxes: [],
  });
  assert.ok(s.x <= 10);
  assert.equal(s.crashed, true);
  assert.equal(s.crashReason, "saha dışı");
});

test("altitude limit crash zeroes velocity like other crashes", () => {
  const s = createState(0, 80.5, 0);
  s.armed = true;
  s.vx = 6;
  s.vy = 5;
  s.vz = -3;
  step(s, { throttle: 0.5, yaw: 0, pitch: 0, roll: 0, angleMode: true }, whoop, 1 / 60);
  assert.equal(s.crashed, true);
  assert.equal(s.crashReason, "irtifa limiti");
  assert.equal(s.vx, 0);
  assert.equal(s.vy, 0);
  assert.equal(s.vz, 0);
});

test("indoor wall via step crashes at speed", () => {
  const play = {
    bounds: { minx: -41, maxx: 41, minz: -81, maxz: 41 },
    ceil: 15.5,
    boxes: [aabbFromBox(0, 8, 40, 80, 16, 1.2, 0)],
  };
  const s = createState(0, 8, 39.5);
  s.armed = true;
  s.vz = 16;
  step(s, { lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0, angleMode: true }, whoop, 1 / 60, play);
  assert.equal(s.crashed, true);
  assert.equal(s.crashReason, "çarptı");
});

test("arcade acro auto-boosts throttle when pitched; realistic does not", () => {
  const racer = CATALOG.find((d) => d.id === "racer");
  const hover = { lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0, angleMode: false };
  const go = { lift: 0, r2: 0, yaw: 0, pitch: 0.25, roll: 0, angleMode: false };
  const arcade = createState(0, 40, 0);
  arcade.armed = true;
  const real = createState(0, 40, 0);
  real.armed = true;
  for (let i = 0; i < 60; i++) {
    step(arcade, hover, racer, 1 / 60);
    step(real, hover, racer, 1 / 60, { real: true });
  }
  for (let i = 0; i < 14; i++) {
    step(arcade, go, racer, 1 / 60);
    step(real, go, racer, 1 / 60, { real: true });
  }
  const h = hoverThrottle(racer);
  assert.ok(arcade.throttleOut > h * 1.12, `arcade thr ${arcade.throttleOut}`);
  assert.ok(real.throttleOut < arcade.throttleOut * 0.92, `real ${real.throttleOut} vs arcade ${arcade.throttleOut}`);
  assert.ok(real.y < arcade.y, `real ${real.y.toFixed(2)} vs arcade ${arcade.y.toFixed(2)}`);
});

test("realistic flag does not change angle hover", () => {
  const s = createState(0, 8, 0);
  s.armed = true;
  const go = { lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0, angleMode: true };
  for (let i = 0; i < 480; i++) step(s, go, whoop, 1 / 60, { real: true });
  assert.ok(Math.abs(s.y - 8) < 0.6, `y=${s.y}`);
  assert.equal(s.crashed, false);
});

test("realistic acro motors spool instead of jumping", () => {
  const racer = CATALOG.find((d) => d.id === "racer");
  const s = createState(0, 8, 0);
  s.armed = true;
  const punch = { throttle: 1, yaw: 0, pitch: 0, roll: 0, angleMode: false };
  step(s, punch, racer, 1 / 60, { real: true });
  assert.ok(s.motor > 0 && s.motor < 0.5, `motor ${s.motor}`);
  for (let i = 0; i < 90; i++) step(s, punch, racer, 1 / 60, { real: true });
  assert.ok(s.motor > 0.9, `spooled ${s.motor}`);
});

test("punch sag cuts thrust when the pack is empty", () => {
  const racer = CATALOG.find((d) => d.id === "racer");
  const punch = { throttle: 1, yaw: 0, pitch: 0, roll: 0, angleMode: false };
  const full = createState(0, 8, 0);
  full.armed = true;
  full.motor = 1;
  const low = createState(0, 8, 0);
  low.armed = true;
  low.motor = 1;
  low.battery = 0.2;
  for (let i = 0; i < 60; i++) {
    step(full, punch, racer, 1 / 60, { real: true });
    step(low, punch, racer, 1 / 60, { real: true });
  }
  assert.ok(full.y > low.y + 2, `full ${full.y.toFixed(2)} vs low ${low.y.toFixed(2)}`);
});

test("realistic acro holds hover when motor is pre-spooled", () => {
  const racer = CATALOG.find((d) => d.id === "racer");
  const s = createState(0, 40, 0);
  s.armed = true;
  s.motor = hoverThrottle(racer);
  const go = { lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0, angleMode: false };
  for (let i = 0; i < 180; i++) step(s, go, racer, 1 / 60, { real: true });
  assert.ok(Math.abs(s.y - 40) < 2.5, `y=${s.y}`);
  assert.equal(s.crashed, false);
});

test("realistic acro from motor 0 has no instant hover", () => {
  const racer = CATALOG.find((d) => d.id === "racer");
  const s = createState(0, 40, 0);
  s.armed = true;
  const go = { lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0, angleMode: false };
  step(s, go, racer, 1 / 60, { real: true });
  assert.ok(s.motor < hoverThrottle(racer) * 0.5, `motor ${s.motor}`);
  assert.ok(s.vy < -0.04, `vy=${s.vy}`);
});

test("mass slows acro rate follow", () => {
  const racer = CATALOG.find((d) => d.id === "racer");
  const light = { ...racer, mass: 0.18 };
  const heavy = { ...racer, mass: 1.4 };
  const go = { throttle: 0.2, yaw: 0, pitch: 1, roll: 0, angleMode: false };
  const a = createState(0, 8, 0);
  a.armed = true;
  const b = createState(0, 8, 0);
  b.armed = true;
  for (let i = 0; i < 12; i++) {
    step(a, go, light, 1 / 60, { real: true });
    step(b, go, heavy, 1 / 60, { real: true });
  }
  assert.ok(Math.abs(a.wx) > Math.abs(b.wx) * 1.15, `light ${a.wx.toFixed(2)} heavy ${b.wx.toFixed(2)}`);
});

function packLife(spec, input) {
  const s = createState(0, 10, 0);
  s.armed = true;
  let t = 0;
  for (let i = 0; i < 120 * 2400 && s.battery > 0; i++) {
    step(s, input, spec, 1 / 120);
    s.y = 10;
    s.vy = 0;
    t = i / 120;
  }
  return t;
}

test("an empty pack cannot hold altitude", () => {
  const spec = droneById("whoop");
  const s = createState(0, 5, 0);
  s.armed = true;
  s.battery = 0;
  for (let i = 0; i < 60 * 20; i++) {
    step(s, { roll: 0, pitch: 0, yaw: 0, lift: 0, r2: 0, angleMode: true }, spec, 1 / 60);
  }
  assert.equal(s.throttleOut, 0);
  assert.ok(s.y < 1, `held ${s.y.toFixed(2)} m on a flat pack`);
});

test("hover endurance matches each airframe's rating", () => {
  for (const spec of CATALOG) {
    const t = packLife(spec, {
      roll: 0,
      pitch: 0,
      yaw: 0,
      lift: 0,
      r2: 0,
      angleMode: spec.defaultMode === "angle",
    });
    const off = Math.abs(t - spec.endurance) / spec.endurance;
    assert.ok(off < 0.1, `${spec.id} hovered ${t.toFixed(0)}s against a rating of ${spec.endurance}s`);
  }
});

test("airframe decides endurance under load, not just the throttle", () => {
  const hard = (id) => {
    const spec = droneById(id);
    return packLife(spec, {
      roll: 0,
      pitch: 0.6,
      yaw: 0,
      lift: 0.5,
      r2: 1,
      angleMode: spec.defaultMode === "angle",
    });
  };
  const lr = hard("seven");
  const racer = hard("racer");
  assert.ok(lr > racer * 2, `long range ${lr.toFixed(0)}s vs racer ${racer.toFixed(0)}s`);
});

// Both prior tests happen to pin every airframe to load ~1 (hover) or a
// clamped load ~4 (r2:1 saturates collectiveToThrottle for every craft), so a
// flat `draw = 1` regression — throttle stops affecting drain at all — left
// both green. This pins the actual shape: pack life must fall at each step up
// in throttle, on one airframe, well past what the endurance rating alone
// would explain.
test("higher throttle drains a pack faster than hover, on the same airframe", () => {
  const spec = droneById("whoop");
  const at = (lift) => packLife(spec, { roll: 0, pitch: 0, yaw: 0, lift, r2: 0, angleMode: true });
  const hover = at(0);
  const mid = at(0.5);
  const full = at(1);
  assert.ok(hover > mid && mid > full, `not monotonic: hover ${hover.toFixed(0)}s mid ${mid.toFixed(0)}s full ${full.toFixed(0)}s`);
  assert.ok(hover > full * 2.5, `full throttle (${full.toFixed(0)}s) too close to hover (${hover.toFixed(0)}s) for a load-relative model`);
});

test("realistic acro idles instead of stopping at zero stick", () => {
  const racer = CATALOG.find((d) => d.id === "racer");
  const idle = { throttle: 0, yaw: 0, pitch: 0, roll: 0, angleMode: false };
  const real = createState(0, 8, 0);
  real.armed = true;
  const arcade = createState(0, 8, 0);
  arcade.armed = true;
  for (let i = 0; i < 60; i++) {
    step(real, idle, racer, 1 / 60, { real: true });
    step(arcade, idle, racer, 1 / 60);
  }
  assert.ok(real.motor > 0.02, `realistic motor settled at ${real.motor}, expected an idle floor`);
  assert.equal(arcade.motor, 0, "arcade should still cut motors fully at zero stick");
});

test("realistic acro turbulence is a bounded, slow drift — not present in arcade", () => {
  const racer = CATALOG.find((d) => d.id === "racer");
  const hover = { lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0, angleMode: false };

  // Math.random() gerçek rastgeleligini gecici olarak sabit bir uca cekip
  // gust'in sinirina (gustMax) dogru surekli itmesini sagliyoruz -- boylece
  // clamp'in gercekten calisip calismadigini deterministik olarak sinariz.
  const realRandom = Math.random;
  Math.random = () => 1; // (1-0.5)*jerk*dt hep pozitif -> gust hep +gustMax'a dogru buyur
  try {
    const s = createState(0, 8, 0);
    s.armed = true;
    for (let i = 0; i < 300; i++) step(s, hover, racer, 1 / 60, { real: true });
    assert.ok(s.gustX > 0.25 && s.gustX <= 0.30001, `gustX ${s.gustX} should have saturated near the 0.3 no-wind cap`);

    const windy = createState(0, 8, 0);
    windy.armed = true;
    for (let i = 0; i < 300; i++) step(windy, hover, racer, 1 / 60, { real: true, wind: { x: 1, z: 0 } });
    assert.ok(windy.gustX > 1.45 && windy.gustX <= 1.50001, `gustX ${windy.gustX} should have saturated near the 1.5 windy cap`);
  } finally {
    Math.random = realRandom;
  }

  // Gercek rastgelelikle: arcade'de gust hep 0, gercekci modda zamanla
  // hareket etmis (deterministik olmayan ama isareti kesin bir kontrol).
  const arcade = createState(0, 8, 0);
  arcade.armed = true;
  const real = createState(0, 8, 0);
  real.armed = true;
  for (let i = 0; i < 120; i++) {
    step(arcade, hover, racer, 1 / 60);
    step(real, hover, racer, 1 / 60, { real: true });
  }
  assert.equal(arcade.gustX, 0, "arcade mode must have zero turbulence");
  assert.equal(arcade.gustZ, 0, "arcade mode must have zero turbulence");
  assert.ok(real.gustX !== 0 || real.gustZ !== 0, "realistic mode should have accumulated some gust");
});

test("turbulence clears once disarmed even in realistic mode", () => {
  const racer = CATALOG.find((d) => d.id === "racer");
  const s = createState(0, 8, 0);
  s.armed = true;
  for (let i = 0; i < 60; i++) step(s, { throttle: 0.5, yaw: 0, pitch: 0, roll: 0, angleMode: false }, racer, 1 / 60, { real: true });
  s.armed = false;
  step(s, { throttle: 0, yaw: 0, pitch: 0, roll: 0, angleMode: false }, racer, 1 / 60, { real: true });
  assert.equal(s.gustX, 0);
  assert.equal(s.gustZ, 0);
});
