import test from "node:test";
import assert from "node:assert/strict";

globalThis.window ??= { addEventListener() {} };
globalThis.navigator ??= { getGamepads: () => [] };

const { consoleInput } = await import("../src/input.js");

test("air console input keeps Mode 2 axes", () => {
  const routed = consoleInput({ lift: 0.4, yaw: -0.3, pitch: 0.2, roll: -0.5 }, "air");
  assert.deepEqual(routed.command, { lift: 0.4, yaw: -0.3, pitch: 0.2, roll: -0.5 });
  assert.equal(routed.manualIntent, true);
});

test("sea console input uses left vertical throttle and right horizontal steer", () => {
  const routed = consoleInput({ viz: { lx: 0.1, ly: -0.65, rx: 0.4, ry: -0.2 } }, "sea");
  assert.deepEqual(routed.command, { throttle: 0.65, steer: 0.4 });
  assert.equal(routed.manualIntent, true);
});

test("manual intent threshold includes 0.22 but ignores 0.21", () => {
  assert.equal(consoleInput({ viz: { ly: -0.21, rx: 0 } }, "sea").manualIntent, false);
  assert.equal(consoleInput({ viz: { ly: -0.22, rx: 0 } }, "sea").manualIntent, true);
  assert.equal(consoleInput({ lift: 0, yaw: 0.21, pitch: 0, roll: 0 }, "air").manualIntent, false);
  assert.equal(consoleInput({ lift: 0, yaw: 0.22, pitch: 0, roll: 0 }, "air").manualIntent, true);
});
