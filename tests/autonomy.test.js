import { test } from "node:test";
import assert from "node:assert/strict";
import {
  abortAutonomy,
  autonomyReport,
  createAutonomyRun,
  pauseAutonomy,
  returnToAutonomy,
  selectNearestSeaVehicle,
  takeControl,
  tickAutonomy,
} from "../src/autonomy.js";

const OP = {
  id: "autonomy-coast-response",
  incidentCandidates: [{ id: "incident-a", x: 30, z: -40 }],
  detectRadius: 8,
  verifyRadius: 6,
  minSeaBattery: 30,
  phaseTimeouts: { AIR_SEARCH: 60, SEA_DISPATCH: 120, JOINT_VERIFY: 30 },
};

const SEA = [
  { id: "ida-2", x: 60, z: -40, battery: 90, available: true },
  { id: "ida-1", x: 10, z: -40, battery: 90, available: true },
];

test("autonomy progresses from search through one dispatch to completion", () => {
  const run = createAutonomyRun(OP, 0);
  assert.equal(run.phase, "READY");

  assert.deepEqual(tickAutonomy(run, { now: 1, air: { x: 0, z: 0 }, sea: SEA }).events, ["search:start"]);
  assert.equal(run.phase, "AIR_SEARCH");

  assert.deepEqual(tickAutonomy(run, { now: 2, air: { x: 31, z: -40 }, sea: SEA }).events, ["incident:detected"]);
  assert.equal(run.phase, "DETECTED");

  const dispatches = [];
  for (const now of [3, 4, 5]) {
    dispatches.push(...tickAutonomy(run, { now, air: { x: 31, z: -40 }, sea: SEA }).events.filter((e) => e.startsWith("dispatch:")));
  }
  assert.deepEqual(dispatches, ["dispatch:ida-1"]);
  assert.equal(run.phase, "SEA_DISPATCH");
  assert.equal(run.selectedSeaId, "ida-1");

  const arrived = SEA.map((v) => v.id === "ida-1" ? { ...v, x: 32, z: -40 } : v);
  assert.deepEqual(tickAutonomy(run, { now: 6, air: { x: 31, z: -40 }, sea: arrived }).events, ["verify:start"]);
  assert.equal(run.phase, "JOINT_VERIFY");
  assert.deepEqual(tickAutonomy(run, { now: 7, air: { x: 31, z: -40 }, sea: arrived }).events, ["operation:complete"]);
  assert.equal(run.phase, "COMPLETE");
});

test("sea vehicle selection rejects unavailable or low battery and breaks distance ties by id", () => {
  const target = { x: 0, z: 0, minBattery: 30 };
  const chosen = selectNearestSeaVehicle([
    { id: "ida-z", x: 1, z: 0, battery: 100, available: false },
    { id: "ida-low", x: 1, z: 0, battery: 29, available: true },
    { id: "ida-b", x: 3, z: 4, battery: 80, available: true },
    { id: "ida-a", x: -3, z: -4, battery: 80, available: true },
  ], target);
  assert.equal(chosen.id, "ida-a");
});

test("no eligible sea vehicle fails clearly and terminal phases never restart", () => {
  const run = createAutonomyRun(OP, 0);
  tickAutonomy(run, { now: 1, air: { x: 0, z: 0 }, sea: [] });
  tickAutonomy(run, { now: 2, air: { x: 30, z: -40 }, sea: [] });
  const out = tickAutonomy(run, { now: 3, air: { x: 30, z: -40 }, sea: [] });
  assert.equal(run.phase, "FAILED");
  assert.equal(run.reason, "uygun İDA bulunamadı");
  assert.deepEqual(out.events, ["operation:failed"]);
  assert.deepEqual(tickAutonomy(run, { now: 50, air: { x: 0, z: 0 }, sea: SEA }).events, []);
  assert.equal(run.phase, "FAILED");
});

test("abort is terminal and report keeps the reason", () => {
  const run = createAutonomyRun(OP, 5);
  abortAutonomy(run, "operatör iptali");
  assert.equal(run.phase, "ABORTED");
  assert.equal(autonomyReport(run).reason, "operatör iptali");
  tickAutonomy(run, { now: 20, air: { x: 30, z: -40 }, sea: SEA });
  assert.equal(run.phase, "ABORTED");
});

test("pause freezes elapsed time while manual control does not", () => {
  const run = createAutonomyRun(OP, 0);
  tickAutonomy(run, { now: 1, air: { x: 0, z: 0 }, sea: SEA });
  pauseAutonomy(run, true);
  tickAutonomy(run, { now: 11, air: { x: 0, z: 0 }, sea: SEA });
  assert.equal(run.elapsed, 1);

  pauseAutonomy(run, false);
  takeControl(run, "ida-1");
  tickAutonomy(run, { now: 14, air: { x: 0, z: 0 }, sea: SEA });
  assert.equal(run.elapsed, 4);
  assert.equal(run.controlledByVehicle, "ida-1");

  returnToAutonomy(run, "iha-1");
  assert.equal(run.controlledByVehicle, "ida-1");
  returnToAutonomy(run, "ida-1");
  assert.equal(run.controlledByVehicle, null);
});

test("phase timeout fails instead of waiting forever", () => {
  const run = createAutonomyRun({ ...OP, phaseTimeouts: { ...OP.phaseTimeouts, AIR_SEARCH: 5 } }, 0);
  tickAutonomy(run, { now: 1, air: { x: 0, z: 0 }, sea: SEA });
  tickAutonomy(run, { now: 7, air: { x: 0, z: 0 }, sea: SEA });
  assert.equal(run.phase, "FAILED");
  assert.equal(run.reason, "AIR_SEARCH zaman aşımı");
});
