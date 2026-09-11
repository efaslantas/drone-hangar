import { test } from "node:test";
import assert from "node:assert/strict";
import { OPS, LEGACY_OPS, FREE, TRACKS, opById, ROOM_OP, wantsBots, playerCanBeHit, trackOf, trackById, trackDone, trackGate, isOpOpen, nextInTrack, firstOpenOp } from "../src/missions.js";
import { loadProgress, saveWin, isUnlocked, emptyProgress } from "../src/progress.js";
import { createRun, tickRun, onPad, landedSoft, inSphere, nextGoal, canSwapBattery, atPoint } from "../src/goals.js";
import { createState, step, withPayload, hoverThrottle } from "../src/physics.js";
import { CATALOG } from "../src/catalog.js";

// makePlay(minx, maxx, minz, maxz, ceil) per map in world.js — kept here so a
// gate/mark/target placed outside the fence (or above the ceiling) fails a
// test instead of being unreachable in play.
const BOUNDS = {
  yard: { minx: -40, maxx: 44, minz: -82, maxz: 16, ceil: 42 },
  airfield: { minx: -48, maxx: 48, minz: -88, maxz: 22, ceil: 50 },
  coast: { minx: -44, maxx: 44, minz: -46, maxz: 20, ceil: 40 },
  city: { minx: -34, maxx: 34, minz: -96, maxz: 14, ceil: 46 },
  forest: { minx: -70, maxx: 70, minz: -140, maxz: 30, ceil: 55 },
  indoor: { minx: -40.6, maxx: 40.6, minz: -80.6, maxz: 40.6, ceil: 15.55 },
};

function done(...ids) {
  const p = emptyProgress();
  for (const id of ids) p.done[id] = { at: 1, t: 10 };
  return p;
}

function store() {
  const m = {};
  return {
    getItem: (k) => m[k] ?? null,
    setItem: (k, v) => {
      m[k] = String(v);
    },
  };
}

test("academy tracks exclude combat while legacy mission ids survive", () => {
  assert.deepEqual(TRACKS.map((t) => t.id), ["school", "manual", "acro", "environment", "advanced", "mission"]);
  assert.equal(TRACKS.slice(0, 5).reduce((n, t) => n + t.ops.length, 0), 30, "five academy modules contain 30 lessons");
  assert.equal(OPS.length, TRACKS.reduce((n, t) => n + t.ops.length, 0));
  assert.equal(new Set(OPS.map((o) => o.id)).size, OPS.length, "op ids are unique across tracks");
  for (const id of ["school", "patrol", "waves", "race", "recon", "final"]) assert.equal(opById(id).id, id, `${id} keeps its id (progress + leaderboard key on it)`);
  for (const t of TRACKS) for (const op of t.ops) assert.equal(op.track, t.id);
  assert.ok(LEGACY_OPS.some((o) => o.id === "boss"));
  assert.equal(trackOf("boss"), null);
  assert.equal(trackOf("free"), null);
  assert.equal(opById("free").kind, "free");
  assert.equal(ROOM_OP.indoor, "school");
  assert.equal(ROOM_OP.lr, "range");
  for (const id of Object.values(ROOM_OP)) assert.ok(id === "free" || id === "team" || OPS.some((o) => o.id === id), id);
});

test("every op references a real map and drone, and its goals sit inside the fence", () => {
  const drones = new Set(CATALOG.map((d) => d.id));
  for (const op of OPS) {
    const b = BOUNDS[op.map];
    assert.ok(b, `${op.id}: map ${op.map}`);
    if (op.drone) assert.ok(drones.has(op.drone), `${op.id}: drone ${op.drone}`);
    if (op.botDrone) assert.ok(drones.has(op.botDrone), `${op.id}: botDrone ${op.botDrone}`);
    const pts = [
      ...(op.steps || []).filter((s) => s.x != null),
      ...(op.gates || []),
      ...(op.marks || []),
      ...(op.targets || []),
      ...(op.parcels || []).flatMap((p) => [p.from, p.to]),
      ...(op.spawn ? [op.spawn] : []),
    ];
    for (const p of pts) {
      assert.ok(p.x > b.minx + 2 && p.x < b.maxx - 2, `${op.id}: x=${p.x} outside ${op.map}`);
      assert.ok(p.z > b.minz + 2 && p.z < b.maxz - 2, `${op.id}: z=${p.z} outside ${op.map}`);
      assert.ok(p.y >= 0 && p.y < b.ceil - 1, `${op.id}: y=${p.y} vs ceiling ${b.ceil}`);
    }
    if (op.kind === "cargo") for (const p of op.parcels) assert.ok(p.name && p.toName && p.from && p.to, `${op.id}: parcel shape`);
    assert.ok(op.limit > 0, `${op.id}: limit`);
    if (op.kind === "school") {
      assert.equal(op.steps.at(-1).t, "land", `${op.id}: school ops end on the pad`);
      for (const s of op.steps) if (s.t === "hover") assert.ok(s.hold > 0 && s.r > 0, `${op.id}: hover step`);
    }
    if (op.kind === "race") assert.ok(op.gates.length >= 4 && op.countdown === 3 && op.laps >= 3, `${op.id}: race shape`);
  }
});

test("school/race/recon/patrol have no hostile bots", () => {
  for (const id of ["hover", "school", "school-night", "patrol", "race", "race-forest", "recon", "sar", "range", "cargo"]) {
    const op = opById(id);
    assert.equal(wantsBots(op), false, id);
    assert.equal(playerCanBeHit(op), false, id);
  }
  assert.equal(wantsBots(opById("waves")), true);
  assert.equal(playerCanBeHit(opById("final")), true);
  assert.equal(playerCanBeHit(FREE), false);
  assert.equal(wantsBots(FREE), false);
});

test("unlock: first school rung open; the gate lesson opens the other tracks; rungs are a ladder", () => {
  const p = emptyProgress();
  assert.equal(isOpOpen(opById("hover"), p), true);
  assert.equal(isOpOpen(opById("school"), p), false, "lesson 2 waits on lesson 1");
  for (const id of ["race", "recon"]) assert.equal(isOpOpen(opById(id), p), false, `${id} waits on the school gate`);
  assert.equal(isOpOpen(opById("patrol"), p), true, "legacy direct links do not enter the academy ladder");
  assert.equal(isOpOpen(FREE, p), true);
  assert.equal(trackGate(trackById("manual"), p)?.id, "school-night");
  assert.equal(trackGate(trackById("acro"), p)?.id, "manual-check");
  assert.equal(trackGate(trackById("environment"), p)?.id, "acro-check");
  assert.equal(trackGate(trackById("advanced"), p)?.id, "env-check");
  assert.equal(trackGate(trackById("mission"), p)?.id, "manual-check");
  assert.equal(trackGate(trackById("school"), p), null);

  const st = store();
  saveWin("hover", 20, st);
  saveWin("school", 40, st);
  const p2 = loadProgress(st);
  for (const id of ["patrol", "school-wind"]) assert.equal(isOpOpen(opById(id), p2), true, id);
  for (const id of ["race", "recon", "race-airfield", "sar", "school-street"]) assert.equal(isOpOpen(opById(id), p2), false, `${id} waits on its academy prerequisite`);
  assert.equal(trackGate(trackById("advanced"), p2)?.id, "env-check");
  assert.ok(p2.best.school === 40);
  saveWin("school", 30, st);
  assert.equal(loadProgress(st).best.school, 30);

  saveWin("race", 90, st);
  assert.equal(isOpOpen(opById("race-airfield"), loadProgress(st)), false, "new advanced lessons wait for the environment certificate");
  assert.equal(isOpOpen(opById("race-forest"), loadProgress(st)), false);
});

test("a pilot from before the tracks keeps every win open, even with a new rung inserted before it", () => {
  // Old campaign: school → patrol → waves → race → recon → final, all won.
  const p = done("school", "patrol", "waves", "race", "recon", "final");
  for (const id of ["school", "patrol", "waves", "race", "recon", "final"]) assert.equal(isOpOpen(opById(id), p), true, id);
  assert.equal(isOpOpen(opById("hover"), p), true, "the new first lesson is open too");
  assert.equal(isOpOpen(opById("school-wind"), p), true);
  assert.equal(isOpOpen(opById("arena"), p), true, "legacy combat remains open");
  for (const id of ["race-airfield", "sar"]) assert.equal(isOpOpen(opById(id), p), false, `${id}: new academy prerequisites apply`);
  assert.equal(isOpOpen(opById("boss"), p), true, "legacy direct links remain available outside the academy");
  assert.equal(isUnlocked(OPS, "school", p), true, "legacy helper agrees: a win never re-locks");
  assert.equal(trackDone(trackById("school"), p), 1);
});

test("track navigation: next rung and the first open lesson", () => {
  assert.equal(nextInTrack("hover").id, "school");
  assert.equal(nextInTrack("school-night"), null, "last rung has no next");
  assert.equal(nextInTrack("final"), null, "legacy combat stays outside the academy ladder");
  assert.equal(nextInTrack("free"), null);
  assert.equal(firstOpenOp("school", emptyProgress()).id, "hover");
  assert.equal(firstOpenOp("school", done("hover")).id, "school");
  assert.equal(firstOpenOp("school", done("hover", "school", "school-wind", "school-street", "school-acro", "school-night")).id, "hover", "diploma: fall back to lesson 1");
  assert.equal(firstOpenOp("nope", emptyProgress()), null);
});

test("hover lesson: hold inside each sphere, decay when you drift out, then land", () => {
  const op = opById("hover");
  const run = createRun(op);
  const s = createState(0, 2.8, 6);
  s.armed = true;
  const [h1] = op.steps;
  s.x = h1.x; s.y = h1.y; s.z = h1.z;
  for (let i = 0; i < 100; i++) tickRun(run, { state: s, dt: 0.02 }); // 2 s of 4
  assert.equal(run.step, 0);
  assert.match(run.hint, /2\.0\/4s/);
  s.x = 30; // drift out: a training hover must be continuous
  for (let i = 0; i < 50; i++) tickRun(run, { state: s, dt: 0.02 });
  assert.equal(run.hoverAcc, 0);
  s.x = h1.x;
  for (let i = 0; i < 205; i++) tickRun(run, { state: s, dt: 0.02 });
  assert.equal(run.step, 1, "first sphere done");
  for (const st of op.steps.slice(1)) {
    if (st.t !== "hover") break;
    s.x = st.x; s.y = st.y; s.z = st.z;
    for (let i = 0; i < (st.hold / 0.02) + 5; i++) tickRun(run, { state: s, dt: 0.02 });
  }
  assert.equal(op.steps[run.step].t, "land");
  assert.equal(nextGoal(run).kind, "pad");
  s.x = 0; s.y = 0.4; s.z = 0; s.armed = false; s.grounded = true; s.vx = s.vy = s.vz = 0;
  tickRun(run, { state: s, dt: 0.02 });
  assert.equal(run.won, true);
});

test("range op: the mid-run pad step needs a slow, low touch on the pad, and the nav points there", () => {
  const op = opById("range");
  const run = createRun(op);
  const padIdx = op.steps.findIndex((s) => s.t === "pad");
  assert.ok(padIdx > 0 && padIdx < op.steps.length - 1, "pit stop sits between gates");
  const fly = (x, y, z) => tickRun(run, { state: { x, y, z, vx: 0, vy: 0, vz: 0, armed: true, battery: 1 }, dt: 0.02 });
  fly(0, 8, 6);
  for (const g of op.steps.slice(0, padIdx)) fly(g.x, g.y, g.z);
  assert.equal(run.step, padIdx);
  assert.equal(nextGoal(run).kind, "pad");
  // Fast pass over the pad does not count.
  tickRun(run, { state: { x: 0, y: 1, z: 0, vx: 12, vy: 0, vz: 0, armed: true, battery: 0.3 }, dt: 0.02 });
  assert.equal(run.step, padIdx);
  const slow = { x: 0, y: 0.6, z: 0, vx: 0.5, vy: 0, vz: 0, armed: false, grounded: true, battery: 0.3 };
  assert.equal(canSwapBattery(slow), true);
  tickRun(run, { state: slow, dt: 0.02 });
  assert.equal(run.step, padIdx + 1, "pit stop done after disarming");
  assert.equal(nextGoal(run).kind, "gate");
  for (const g of op.steps.slice(padIdx + 1, -1)) fly(g.x, g.y, g.z);
  assert.equal(op.steps[run.step].t, "land");
  tickRun(run, { state: { x: 0, y: 0.3, z: 0, vx: 0, vy: 0, vz: 0, armed: false, grounded: true, battery: 0.2 }, dt: 0.02 });
  assert.equal(run.won, true);
});

test("boss op is a no-respawn wave op with an armoured heavy bot; arena is a bigger score op", () => {
  const boss = opById("boss");
  assert.equal(boss.kind, "waves");
  assert.deepEqual(boss.waves, [1, 2]);
  assert.equal(boss.botDrone, "heavy");
  assert.ok(boss.botHp >= 8);
  assert.equal(wantsBots(boss), true);
  const arena = opById("arena");
  assert.equal(arena.kind, "final");
  assert.ok(arena.scoreNeed > opById("final").scoreNeed);
  assert.ok(arena.bots > opById("final").bots);
});

test("cargo: pick up low and slow, a crash drops it back, deliver each parcel, then land", () => {
  const op = opById("cargo");
  const run = createRun(op);
  assert.equal(op.parcels.length, 3);
  assert.equal(trackOf("cargo").id, "mission");
  const at = (x, y, z, extra = {}) => ({ x, y, z, vx: 0, vy: 0, vz: 0, armed: true, battery: 1, crashed: false, ...extra });
  const [p1, p2, p3] = op.parcels;
  tickRun(run, { state: at(0, 4, 6), dt: 0.02 });
  assert.equal(nextGoal(run).kind, "pickup");
  assert.equal(nextGoal(run).x, p1.from.x);
  assert.match(run.hint, /Koli 1\/3/);
  // A fast fly-over or a hover 4 m up does not pick anything up.
  tickRun(run, { state: at(p1.from.x, 1, p1.from.z, { vx: 6 }), dt: 0.02 });
  tickRun(run, { state: at(p1.from.x, 4, p1.from.z), dt: 0.02 });
  assert.equal(run.carrying, null);
  assert.equal(atPoint(at(p1.from.x, 0.8, p1.from.z), p1.from), true);
  tickRun(run, { state: at(p1.from.x, 0.8, p1.from.z), dt: 0.02 });
  assert.equal(run.carrying, 0);
  assert.equal(nextGoal(run).kind, "drop");
  assert.equal(nextGoal(run).y, p1.to.y);
  assert.match(run.hint, /Taşınıyor: Palet/);
  // Crash on the way: the parcel is back at its pickup ring, counted as dropped.
  tickRun(run, { state: at(10, 3, -10, { crashed: true, armed: false }), dt: 0.02 });
  assert.equal(run.carrying, null);
  assert.equal(run.dropped, 1);
  assert.equal(nextGoal(run).x, p1.from.x);
  tickRun(run, { state: at(p1.from.x, 0.8, p1.from.z), dt: 0.02 });
  assert.equal(run.carrying, 0);
  // 3 m above the roof zone is not a delivery; 1 m above it is.
  tickRun(run, { state: at(p1.to.x, p1.to.y + 3, p1.to.z), dt: 0.02 });
  assert.equal(run.delivered, 0);
  tickRun(run, { state: at(p1.to.x, p1.to.y + 1, p1.to.z), dt: 0.02 });
  assert.equal(run.delivered, 1);
  assert.equal(run.parcels[0].done, true);
  assert.equal(run.carrying, null);
  for (const p of [p2, p3]) {
    tickRun(run, { state: at(p.from.x, 0.8, p.from.z), dt: 0.02 });
    tickRun(run, { state: at(p.to.x, (p.to.y || 0) + 1, p.to.z), dt: 0.02 });
  }
  assert.equal(run.delivered, 3);
  assert.equal(nextGoal(run).kind, "pad");
  assert.equal(run.won, false, "still has to land");
  tickRun(run, { state: at(0, 0.3, 0, { armed: false, grounded: true }), dt: 0.02 });
  assert.equal(run.won, true);
});

test("payload makes the airframe heavier and thirstier, but never unflyable", () => {
  const heavy = CATALOG.find((d) => d.id === "heavy");
  const loaded = withPayload(heavy, 0.45);
  assert.ok(loaded.maxThrustG < heavy.maxThrustG && loaded.maxThrustG > 1.2, `thrust ${loaded.maxThrustG}`);
  assert.ok(hoverThrottle(loaded) > hoverThrottle(heavy));
  assert.ok(loaded.endurance < heavy.endurance && loaded.maxRate < heavy.maxRate && loaded.mass > heavy.mass);
  assert.equal(heavy.maxThrustG, 2.6, "the catalog entry itself is untouched");
  assert.ok(withPayload(CATALOG.find((d) => d.id === "whoop"), 0.45).maxThrustG >= 1.2, "even a whoop can lift the arcade parcel");
  const play = { drain: 1, wind: null, ceil: 40, boxes: [], bounds: { minx: -40, maxx: 40, minz: -40, maxz: 40 } };
  const input = { lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0, angleMode: true };
  const a = createState(0, 8, 0);
  const b = createState(0, 8, 0);
  a.armed = b.armed = true;
  for (let i = 0; i < 300; i++) {
    step(a, input, heavy, 1 / 60, play);
    step(b, input, loaded, 1 / 60, play);
  }
  assert.ok(b.battery < a.battery, `loaded ${b.battery} vs empty ${a.battery}`);
  assert.ok(b.y > 5 && !b.crashed, `loaded airframe still holds altitude: y=${b.y}`);
});

test("ops can pin night and realistic physics", () => {
  assert.equal(opById("school-night").night, true);
  assert.equal(opById("sar").night, true);
  assert.equal(opById("school-acro").real, true);
  for (const id of ["hover", "school", "recon"]) {
    assert.equal(opById(id).night, undefined, id);
    assert.equal(opById(id).real, undefined, id);
  }
  assert.equal(opById("race").real, true, "academy races pin realistic Acro physics");
});

test("school gates then land wins", () => {
  const run = createRun(opById("school"));
  const s = createState(0, 8, 20);
  s.armed = true;
  tickRun(run, { state: s, dt: 0.02 });
  const gates = opById("school").steps.filter((st) => st.t === "gate");
  for (const g of gates) {
    s.x = g.x;
    s.y = g.y;
    s.z = g.z;
    tickRun(run, { state: s, dt: 0.02 });
  }
  assert.equal(run.step, 4);
  s.x = 0;
  s.y = 0.4;
  s.z = 0;
  s.armed = false;
  s.grounded = true;
  s.vx = s.vy = s.vz = 0;
  tickRun(run, { state: s, dt: 0.02 });
  assert.equal(run.won, true);
});

test("fast fly-through still counts a gate", () => {
  const run = createRun({
    kind: "school",
    spawn: { x: 0, y: 5, z: 5 },
    limit: 30,
    steps: [
      { t: "gate", x: 0, y: 5, z: -10, r: 2.2, hint: "g" },
      { t: "land", hint: "land" },
    ],
  });
  tickRun(run, { state: { x: 0, y: 5, z: 8, vx: 0, vy: 0, vz: 0, armed: true }, dt: 0.016 });
  tickRun(run, { state: { x: 0, y: 5, z: -28, vx: 0, vy: 0, vz: -80, armed: true }, dt: 0.016 });
  assert.equal(run.step, 1);
});

test("a visible edge pass gets gate credit", () => {
  const run = createRun({
    kind: "school",
    spawn: { x: 0, y: 5, z: 5 },
    steps: [
      { t: "gate", x: 0, y: 5, z: -10, r: 2.2, hint: "g" },
      { t: "land", hint: "land" },
    ],
  });
  tickRun(run, { state: { x: 2.45, y: 5, z: -5, battery: 1, armed: true }, dt: 0.016 });
  tickRun(run, { state: { x: 2.45, y: 5, z: -15, battery: 1, armed: true }, dt: 0.016 });
  assert.equal(run.step, 1);
});

test("being inside a gate without crossing its plane does not count", () => {
  const run = createRun({
    kind: "school",
    spawn: { x: 0, y: 5, z: 5 },
    steps: [{ t: "gate", x: 0, y: 5, z: -10, r: 2.2, hint: "g" }],
  });
  tickRun(run, { state: { x: 0, y: 5, z: -7.9, battery: 1, armed: true }, dt: 0.016 });
  tickRun(run, { state: { x: 0, y: 5, z: -8.1, battery: 1, armed: true }, dt: 0.016 });
  assert.equal(run.step, 0);
});

test("academy mode policy rejects a mismatched flight mode", () => {
  const run = createRun(opById("manual-takeoff"));
  tickRun(run, { state: createState(0, 0.1, 0), dt: 0.02, flightMode: "acro" });
  assert.equal(run.lost, true);
  assert.match(run.reason, /ANGLE/);
});

test("takeoff objective requires a grounded disarmed start before climbing", () => {
  const op = opById("manual-takeoff");
  const run = createRun(op);
  const airborne = { ...createState(0, 3, 7), armed: true, grounded: false };
  tickRun(run, { state: airborne, dt: 0.02, flightMode: "angle" });
  assert.equal(run.step, 0);
  const ground = { ...createState(0, 0.1, 7), armed: false, grounded: true };
  tickRun(run, { state: ground, dt: 0.02, flightMode: "angle" });
  tickRun(run, { state: airborne, dt: 0.02, flightMode: "angle" });
  assert.equal(run.step, 1);
});

test("timeout fails", () => {
  const run = createRun({ ...opById("school"), limit: 0.05 });
  const s = createState(0, 8, 0);
  tickRun(run, { state: s, dt: 0.1 });
  assert.equal(run.lost, true);
});

test("race three laps", () => {
  const op = opById("race");
  const run = createRun(op);
  for (let lap = 0; lap < 3; lap++) {
    for (const g of op.gates) {
      const from = run.gatesDone === 0 ? op.spawn : op.gates[(run.gatesDone - 1) % op.gates.length];
      tickRun(run, { state: { x: (from.x + g.x) / 2, y: (from.y + g.y) / 2, z: (from.z + g.z) / 2, vx: 0, vy: 0, vz: 0, armed: true }, dt: 0.02 });
      tickRun(run, { state: { x: g.x + (g.x - from.x) * 0.1, y: g.y + (g.y - from.y) * 0.1, z: g.z + (g.z - from.z) * 0.1, vx: 0, vy: 0, vz: 0, armed: true }, dt: 0.02 });
    }
  }
  assert.equal(run.won, true);
  assert.equal(run.lap, 3);
});

test("recon marks then pad", () => {
  const op = opById("recon");
  const run = createRun(op);
  for (const m of op.marks) {
    tickRun(run, { state: { x: m.x, y: m.y, z: m.z, vx: 0, vy: 0, vz: 0, armed: true }, dt: 0.02 });
  }
  assert.ok(run.marks.every((m) => m.done));
  tickRun(run, { state: { x: 0, y: 0.3, z: 0, vx: 0, vy: 0, vz: 0, armed: false, grounded: true }, dt: 0.02 });
  assert.equal(run.won, true);
});

test("waves break after clear", () => {
  const run = createRun(opById("waves"));
  tickRun(run, { state: createState(0, 8, 0), dt: 0.05, aliveBots: 0, waveSpawned: true });
  assert.ok(run.waveBreak > 18);
  assert.equal(run.recall, true);
  run.waveBreak = 0.01;
  tickRun(run, { state: createState(0, 8, 0), dt: 0.05, aliveBots: 0, waveSpawned: true });
  assert.equal(run.wave, 1);
});

test("next goal points at the current school gate then the pad", () => {
  const run = createRun(opById("school"));
  const g0 = nextGoal(run);
  assert.equal(g0.kind, "gate");
  assert.equal(g0.z, opById("school").steps[0].z);
  run.step = 4;
  assert.equal(nextGoal(run).kind, "pad");
});

test("empty pack off the pad fails the op", () => {
  const run = createRun(opById("patrol"));
  const s = createState(18, 6, -22);
  s.armed = true;
  s.battery = 0;
  tickRun(run, { state: s, dt: 0.02 });
  assert.equal(run.lost, true);
  assert.equal(run.reason, "batarya bitti");
});

test("crossing the winning gate the same tick the pack empties still wins", () => {
  const op = opById("race");
  const run = createRun(op);
  run.gatesDone = 11; // last gate of lap 3/3
  run.lap = 2;
  const g = op.gates[3];
  const from = op.gates[2];
  run.prev = { x: (from.x + g.x) / 2, y: (from.y + g.y) / 2, z: (from.z + g.z) / 2 };
  const s = createState(g.x + (g.x - from.x) * 0.1, g.y + (g.y - from.y) * 0.1, g.z + (g.z - from.z) * 0.1);
  s.armed = true;
  s.battery = 0; // pack also died this exact frame, off-pad
  tickRun(run, { state: s, dt: 0.02 });
  assert.equal(run.won, true, `expected a win, got lost=${run.lost} reason=${run.reason}`);
  assert.equal(run.lap, 3);
});

test("a wave-clear the same tick the pack empties still recalls, not fails", () => {
  const run = createRun(opById("waves"));
  const s = createState(40, 8, -30);
  s.armed = true;
  s.battery = 0; // pack died this exact frame, far from the pad
  tickRun(run, { state: s, dt: 0.02, aliveBots: 0, waveSpawned: true });
  assert.equal(run.recall, true, `expected a wave-clear recall, got lost=${run.lost} reason=${run.reason}`);
  assert.equal(run.lost, false);
});

test("empty pack on the pad does not fail", () => {
  const run = createRun(opById("patrol"));
  const s = createState(0, 0.4, 0);
  s.armed = false;
  s.battery = 0;
  tickRun(run, { state: s, dt: 0.02 });
  assert.equal(run.lost, false);
});

test("pad detect and wind/drain play fields", () => {
  const s = createState(0, 0.5, 0);
  assert.equal(onPad(s), true);
  s.armed = false;
  s.grounded = true;
  s.vx = s.vy = s.vz = 0;
  assert.equal(landedSoft(s), true);
  assert.equal(inSphere(s, 0, 0.5, 0, 1), true);
  const spec = CATALOG.find((d) => d.id === "whoop");
  const a = createState(0, 8, 0);
  a.armed = true;
  const play = { drain: 8, wind: { x: 2, z: 0 }, ceil: 40, boxes: [], bounds: { minx: -40, maxx: 40, minz: -40, maxz: 40 } };
  const input = { lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0, angleMode: true };
  const b0 = a.battery;
  for (let i = 0; i < 60; i++) step(a, input, spec, 1 / 60, play);
  assert.ok(a.battery < b0 - 0.02, `batt ${a.battery}`);
  assert.ok(a.vx > 0.05, `wind vx ${a.vx}`);
});
