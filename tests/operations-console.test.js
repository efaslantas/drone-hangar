import test from "node:test";
import assert from "node:assert/strict";

const api = await import("../src/operations-console.js").catch(() => ({}));
const fleet = [
  { id: "iha-1", kind: "air" },
  { id: "ida-1", kind: "sea" },
  { id: "ida-2", kind: "sea" },
];

test("session has exactly one manual owner and selection transfers ownership", () => {
  assert.equal(typeof api.createConsoleSession, "function");
  const a = api.createConsoleSession(fleet, "iha-1");
  assert.deepEqual(a.vehicles.map((v) => v.mode), ["MANUAL", "HOLD", "HOLD"]);
  const b = api.selectVehicle(a, "ida-1");
  assert.equal(b.selectedId, "ida-1");
  assert.deepEqual(b.vehicles.map((v) => v.mode), ["HOLD", "MANUAL", "HOLD"]);
  assert.notEqual(a, b);
});

test("vehicle cycling wraps in both directions", () => {
  const a = api.createConsoleSession(fleet, "iha-1");
  assert.equal(api.cycleVehicle(a, -1).selectedId, "ida-2");
  assert.equal(api.cycleVehicle(api.cycleVehicle(a, 1), 1).selectedId, "ida-2");
});

test("emergency stop stays latched until explicit re-enable", () => {
  const a = api.emergencyStop(api.createConsoleSession(fleet, "iha-1"));
  assert.equal(a.emergency, true);
  assert.deepEqual(a.vehicles.map((v) => v.mode), ["STOPPED", "STOPPED", "STOPPED"]);
  assert.equal(api.selectVehicle(a, "ida-1").vehicles[1].mode, "STOPPED");
  assert.equal(api.setVehicleMode(a, "ida-1", "MANUAL").vehicles[1].mode, "STOPPED");
  const b = api.reenableConsole(a);
  assert.equal(b.emergency, false);
  assert.deepEqual(b.vehicles.map((v) => v.mode), ["MANUAL", "HOLD", "HOLD"]);
});

test("control loss holds selected vehicle and invalid operations are ignored", () => {
  const a = api.createConsoleSession(fleet, "ida-1");
  assert.equal(api.vehicleMode(api.handleControlLoss(a), "ida-1"), "HOLD");
  const route = api.setVehicleMode(a, "ida-1", "ROUTE");
  assert.equal(api.vehicleMode(api.handleControlLoss(route), "ida-1"), "HOLD");
  assert.equal(api.selectVehicle(a, "missing"), a);
  assert.equal(api.setVehicleMode(a, "ida-1", "BOGUS"), a);
});
