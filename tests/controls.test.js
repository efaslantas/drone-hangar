import { test } from "node:test";
import assert from "node:assert/strict";
import { deadzone, radialDeadzone, expo, profileFor, calibratedAxis, rightStickAxes, R2_ENGAGE, triggerValue } from "../src/controls.js";

test("deadzone kills DualSense rest noise", () => {
  assert.equal(deadzone(0.05), 0);
  assert.ok(deadzone(-0.12) < 0);
  assert.equal(deadzone(0), 0);
  assert.ok(deadzone(0.5) > 0.3);
});

test("radial deadzone preserves diagonal direction and small PS corrections", () => {
  assert.deepEqual(radialDeadzone(0.04, -0.03), [0, 0]);
  const [x, y] = radialDeadzone(0.12, -0.12);
  assert.ok(x > 0 && y < 0);
  assert.ok(Math.abs(Math.abs(x) - Math.abs(y)) < 1e-9);
  const [cx, cy] = radialDeadzone(1, 1);
  assert.ok(Math.abs(Math.hypot(cx, cy) - 1) < 1e-9, "diagonal input is clamped to the unit circle");
});

test("PS training profile favours precision and disables trigger punch", () => {
  const training = profileFor("training");
  assert.ok(training.dead <= 0.08);
  assert.ok(training.expo > profileFor("standard").expo);
  assert.ok(training.rate < 1);
  assert.equal(training.punch, false);
  assert.equal(profileFor("unknown"), training);
});

test("expo is identity at 0 and ±1", () => {
  assert.equal(expo(0), 0);
  assert.ok(Math.abs(expo(1) - 1) < 1e-9);
  assert.ok(Math.abs(expo(-1) + 1) < 1e-9);
  assert.ok(Math.abs(expo(0.3)) < 0.3);
});

test("R2 engage ignores trigger rest", () => {
  assert.ok(R2_ENGAGE > 0.2);
});

test("right stick uses axes 2/3 in standard mapping", () => {
  const [x, y] = rightStickAxes([0, 0, 0.4, -0.5]);
  assert.equal(x, 0.4);
  assert.equal(y, -0.5);
});

test("right stick falls back to axes 2/5 when 3 is dead", () => {
  const [x, y] = rightStickAxes([0, 0, 0.4, 0, 0, -0.6]);
  assert.equal(x, 0.4);
  assert.equal(y, -0.6);
});

test("R2 reads button 7 analog, pressed, or WebKit axis 4", () => {
  assert.equal(triggerValue({ buttons: [{}, {}, {}, {}, {}, {}, {}, { value: 0.8, pressed: true }] }), 0.8);
  assert.equal(triggerValue({ buttons: [{}, {}, {}, {}, {}, {}, {}, { value: 0, pressed: true }] }), 1);
  assert.ok(triggerValue({ buttons: [], axes: [0, 0, 0, 0, 0.6] }) > 0.5);
  assert.equal(triggerValue({ buttons: [{}, {}, {}, {}, {}, {}, {}, { value: 0.01, pressed: false }], axes: [0, 0, 0, 0, 0] }), 0);
});

test("gamepad calibration removes centre drift and maps unequal travel", () => {
  const axis = { center: 0.08, min: -0.82, max: 0.94 };
  assert.equal(calibratedAxis(0.08, axis), 0);
  assert.equal(calibratedAxis(-0.82, axis), -1);
  assert.equal(calibratedAxis(0.94, axis), 1);
  assert.ok(calibratedAxis(0.5, axis) > 0 && calibratedAxis(0.5, axis) < 1);
});
