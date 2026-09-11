import { test } from "node:test";
import assert from "node:assert/strict";
import { createAssessment, sampleAssessment, finalizeAssessment } from "../src/assessment.js";

test("a smooth completed flight earns a strong, finite report", () => {
  const a = createAssessment();
  const state = { vx: 1, vy: 0, vz: 0, wx: 0.1, wy: 0.1, wz: 0.1, grounded: false };
  for (let i = 0; i < 100; i += 1) sampleAssessment(a, state, { lift: 0, yaw: 0.05, pitch: 0.1, roll: 0 }, 0.02);
  state.grounded = true;
  state.lastTouchdown = { verticalSpeed: 0.7, horizontalSpeed: 0.3 };
  const report = finalizeAssessment(a, { won: true, op: { kind: "school", steps: [1] }, step: 1 }, state);
  assert.ok(report.total >= 85, JSON.stringify(report));
  assert.equal(report.passed, true);
  assert.equal(report.route, 100);
});

test("a partial crashed flight cannot pass and scores zero for landing", () => {
  const report = finalizeAssessment(createAssessment(), {
    won: false,
    op: { kind: "race", gates: [1, 2, 3, 4], laps: 2 },
    gatesDone: 2,
  }, { crashed: true, grounded: false });
  assert.equal(report.passed, false);
  assert.equal(report.route, 25);
  assert.equal(report.landing, 0);
});
