import test from "node:test";
import assert from "node:assert/strict";
import {
  SCENARIO_STORAGE_KEY,
  deleteScenario,
  listScenarios,
  loadScenario,
  saveScenario,
  scenarioFromSession,
  validateScenario,
} from "../src/scenarios.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    raw: values,
  };
}

function sample(name = "Kıyı Devriyesi") {
  return scenarioFromSession(name, {
    map: { id: "coast", wind: "calm", time: "day" },
    vehicles: [
      { id: "iha-1", kind: "air", start: { x: 0, y: 2, z: -20, heading: 0 } },
      { id: "ida-1", kind: "sea", start: { x: -8, z: -66, heading: 0 } },
      { id: "ida-2", kind: "sea", start: { x: 8, z: -68, heading: 0 } },
    ],
    routes: {
      "iha-1": { vehicleId: "iha-1", points: [{ x: 4, y: 8, z: -40 }] },
      "ida-1": { vehicleId: "ida-1", points: [{ x: -4, z: -80 }] },
      "ida-2": { vehicleId: "ida-2", points: [] },
    },
    camera: { vehicleId: "iha-1", view: "chase" },
  });
}

test("save, list, load, replace and delete use a stable scenario id", () => {
  const storage = memoryStorage();
  const scenario = sample();
  assert.equal(saveScenario(storage, scenario).ok, true);
  assert.deepEqual(listScenarios(storage).scenarios.map((item) => item.id), [scenario.id]);
  assert.deepEqual(loadScenario(storage, scenario.id), { ok: true, scenario });
  assert.equal(saveScenario(storage, { ...scenario, name: "Yeni ad" }).ok, true);
  assert.equal(listScenarios(storage).scenarios.length, 1);
  assert.equal(loadScenario(storage, scenario.id).scenario.name, "Yeni ad");
  assert.equal(deleteScenario(storage, scenario.id).ok, true);
  assert.equal(listScenarios(storage).scenarios.length, 0);
});

test("storage keeps at most the latest twenty scenarios", () => {
  const storage = memoryStorage();
  for (let i = 0; i < 21; i++) {
    const scenario = { ...sample(`Görev ${i}`), id: `gorev-${i}`, createdAt: i, updatedAt: i };
    assert.equal(saveScenario(storage, scenario).ok, true);
  }
  const listed = listScenarios(storage).scenarios;
  assert.equal(listed.length, 20);
  assert.equal(listed.some((item) => item.id === "gorev-0"), false);
});

test("oversized, unknown-version and invalid-waypoint scenarios are rejected", () => {
  const storage = memoryStorage();
  const base = sample();
  assert.equal(saveScenario(storage, { ...base, name: "x".repeat(128_001) }).ok, false);
  assert.equal(validateScenario({ ...base, version: 2 }).ok, false);
  const badPoint = structuredClone(base);
  badPoint.routes["iha-1"].points[0].x = "NaN";
  assert.equal(validateScenario(badPoint).ok, false);
  assert.equal(listScenarios(storage).scenarios.length, 0);
});

test("malformed storage and load failure return errors without touching active session", () => {
  const storage = memoryStorage();
  storage.setItem(SCENARIO_STORAGE_KEY, "not json");
  const active = { selectedId: "ida-1", marker: Symbol("active") };
  const result = loadScenario(storage, "missing");
  assert.equal(result.ok, false);
  assert.equal(active.selectedId, "ida-1");
  assert.equal(listScenarios(storage).ok, false);
});

test("scenario schema requires the exact fleet and coast-safe starts and routes", () => {
  const base = sample();
  const wrongFleet = structuredClone(base);
  wrongFleet.vehicles[1].id = "ida-9";
  assert.equal(validateScenario(wrongFleet).ok, false);

  const dryStart = structuredClone(base);
  dryStart.vehicles[1].start.z = -20;
  assert.equal(validateScenario(dryStart).ok, false);

  const dryRoute = structuredClone(base);
  dryRoute.routes["ida-1"].points[0].z = -20;
  assert.equal(validateScenario(dryRoute).ok, false);

  const airOutside = structuredClone(base);
  airOutside.routes["iha-1"].points[0].z = -100;
  assert.equal(validateScenario(airOutside).ok, false);
});
