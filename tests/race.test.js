import { test } from "node:test";
import assert from "node:assert/strict";
import { OPS, opById } from "../src/missions.js";
import { createRun, tickRun } from "../src/goals.js";
import { createCountdown, tickCountdown } from "../src/countdown.js";
import { loadProgress, saveWin, saveLap, emptyProgress } from "../src/progress.js";

function store(seed) {
  const m = seed ? { "efa-hangar-ops-v1": JSON.stringify(seed) } : {};
  return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); }, raw: () => m };
}

function at(x, y, z) {
  return { x, y, z, vx: 0, vy: 0, vz: 0, armed: true, battery: 1 };
}

function cross(run, op, g, dt) {
  const from = run.gatesDone === 0 ? op.spawn : op.gates[(run.gatesDone - 1) % op.gates.length];
  tickRun(run, { state: at((from.x + g.x) / 2, (from.y + g.y) / 2, (from.z + g.z) / 2), dt: 0 });
  tickRun(run, { state: at(g.x + (g.x - from.x) * 0.1, g.y + (g.y - from.y) * 0.1, g.z + (g.z - from.z) * 0.1), dt });
}

test("race records a split per lap, keeps last and best", () => {
  const op = opById("race");
  const run = createRun(op);
  const dt = 0.5;
  const lapSeconds = [6, 4, 5];
  for (const secs of lapSeconds) {
    const perGate = secs / op.gates.length;
    for (const g of op.gates) {
      for (let k = 0; k < perGate / dt - 1; k++) tickRun(run, { state: at(50, 20, 50), dt });
      cross(run, op, g, dt);
    }
  }
  assert.equal(run.won, true);
  assert.equal(run.lapTimes.length, 3);
  assert.equal(run.lastLap, run.lapTimes[2]);
  assert.equal(run.bestLap, Math.min(...run.lapTimes));
  assert.ok(Math.abs(run.lapTimes[1] - 4) < 0.01, `lap 2 ${run.lapTimes[1]}`);
  assert.ok(Math.abs(run.lapTimes.reduce((a, b) => a + b, 0) - run.t) < 1e-9, "splits add up to the run clock");
  assert.equal(run.lapStart, run.t);
});

test("every campaign op starts with a countdown; free flight does not", () => {
  for (const op of OPS) assert.equal(op.countdown, 3, op.id);
  assert.equal(opById("free").countdown, undefined);
  assert.equal(OPS.filter((o) => o.kind === "race").length, 6);
});

test("countdown beeps 3-2-1 once each, then GO, then goes quiet", () => {
  const c = createCountdown(3);
  const beeps = [];
  let goAt = null;
  let shows = new Set();
  for (let i = 1; i <= 80; i++) {
    const r = tickCountdown(c, 0.05);
    if (r.beep != null) beeps.push(r.beep);
    if (r.show) shows.add(r.show);
    if (r.go) {
      assert.equal(goAt, null, "GO fires once");
      goAt = i * 0.05;
      assert.equal(r.holding, false);
      assert.equal(r.show, "GO");
    } else if (goAt == null) assert.equal(r.holding, true);
    else assert.equal(r.holding, false);
  }
  assert.deepEqual(beeps, [3, 2, 1, 0]);
  assert.ok(Math.abs(goAt - 3) < 0.06, `go at ${goAt}`);
  assert.deepEqual([...shows].sort(), ["1", "2", "3", "GO"]);
  assert.deepEqual(tickCountdown(c, 1), { holding: false, show: null, beep: null, go: false });
  assert.equal(tickCountdown(null, 1).holding, false);
});

test("best lap persists with a win and stands alone after a loss", () => {
  const st = store();
  saveWin("race", 90, st, 27.5);
  assert.equal(loadProgress(st).bestLap.race, 27.5);
  saveWin("race", 85, st, 30);
  assert.equal(loadProgress(st).bestLap.race, 27.5, "slower lap does not overwrite");
  assert.equal(loadProgress(st).best.race, 85);
  assert.equal(saveLap("race", 26.1, st).improved, true);
  assert.equal(saveLap("race", 26.5, st).improved, false);
  assert.equal(loadProgress(st).bestLap.race, 26.1);
  assert.equal(loadProgress(st).done.race.t, 85, "a lost run's lap record does not mark the op done differently");
  saveLap("race", 0, st);
  saveLap("race", NaN, st);
  assert.equal(loadProgress(st).bestLap.race, 26.1);
});

test("legacy progress without bestLap still loads", () => {
  const st = store({ done: { school: { at: 1, t: 40 } }, best: { school: 40 } });
  const p = loadProgress(st);
  assert.deepEqual(p.bestLap, {});
  assert.equal(p.best.school, 40);
  assert.deepEqual(emptyProgress().bestLap, {});
});
