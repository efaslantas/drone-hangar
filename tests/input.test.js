import test from "node:test";
import assert from "node:assert/strict";

const listeners = new Map();
globalThis.window = {
  addEventListener(name, handler) { listeners.set(name, handler); },
};

const buttons = Array.from({ length: 10 }, () => ({ pressed: false, value: 0 }));
const pad = { id: "DualSense", index: 0, axes: [0, 0, 0, 0], buttons };
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { getGamepads: () => [pad] },
});

const { poll, consume } = await import("../src/input.js");

function resetButtons() {
  for (const button of buttons) Object.assign(button, { pressed: false, value: 0 });
  poll(10_000);
  for (const action of ["vehiclePrev", "vehicleNext", "emergencyStop", "consoleHelp"]) consume(action);
}

test("poll exposes raw triggers and L1/R1/Options as consumable edges", () => {
  resetButtons();
  Object.assign(buttons[6], { pressed: true, value: 0.7 });
  Object.assign(buttons[7], { pressed: true, value: 0.8 });
  buttons[4].pressed = true;
  buttons[5].pressed = true;
  buttons[9].pressed = true;
  const value = poll(10_100);
  assert.equal(value.l2, 0.7);
  assert.equal(value.rawR2, 0.8);
  assert.equal(consume("vehiclePrev"), true);
  assert.equal(consume("vehicleNext"), true);
  assert.equal(consume("consoleHelp"), true);
  assert.equal(consume("vehiclePrev"), false, "held shoulder is not repeated");
});

test("emergency stop requires both triggers at 0.9 for 700 ms", () => {
  resetButtons();
  Object.assign(buttons[6], { pressed: true, value: 0.9 });
  Object.assign(buttons[7], { pressed: true, value: 0.9 });
  poll(20_000);
  poll(20_699);
  assert.equal(consume("emergencyStop"), false);
  poll(20_700);
  assert.equal(consume("emergencyStop"), true);
  poll(21_500);
  assert.equal(consume("emergencyStop"), false, "held chord fires once");

  buttons[6].value = 0.89;
  poll(21_600);
  buttons[6].value = 0.9;
  poll(22_000);
  buttons[7].value = 0.89;
  poll(23_000);
  assert.equal(consume("emergencyStop"), false);
});

test("typing in an editable field never becomes a flight command", () => {
  resetButtons();
  listeners.get("keydown")({ code: "KeyW", target: { matches: () => true }, preventDefault() {} });
  assert.equal(Math.abs(poll(30_000).lift), 0);
});
