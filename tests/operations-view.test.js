import test from "node:test";
import assert from "node:assert/strict";
import { clearOperationsConsole, operationsViewModel, renderOperationsConsole } from "../src/operations-view.js";

const state = {
  session: {
    selectedId: "ida-1",
    emergency: false,
    vehicles: [
      { id: "iha-1", kind: "air", mode: "HOLD" },
      { id: "ida-1", kind: "sea", mode: "MANUAL" },
      { id: "ida-2", kind: "sea", mode: "ROUTE" },
    ],
  },
  telemetry: {
    "iha-1": { battery: 0.84, speed: 12.2 },
    "ida-1": { battery: 0.71, speed: 4.4 },
    "ida-2": { battery: 0.65, speed: 3.1 },
  },
  controller: { connected: false, name: "" },
  routes: { "ida-1": { points: [{ x: 0, z: -70 }], currentIndex: 0 } },
  routeError: "Nokta su alanı dışında",
  scenarios: [{ id: "kiyi-1", name: "Kıyı 1" }],
  mapRevision: 3,
  tactical: {
    shorelineY: 1,
    vehicles: [{ id: "ida-1", kind: "sea", x: 0.4, y: 0.7, selected: true }],
    routes: [{ id: "ida-1", points: [{ x: 0.4, y: 0.7 }, { x: 0.5, y: 0.9 }] }],
  },
};

test("view model has exactly three fleet cards and operational warnings", () => {
  const model = operationsViewModel(state);
  assert.equal(model.vehicles.length, 3);
  assert.equal(model.vehicles.filter((vehicle) => vehicle.selected).length, 1);
  assert.deepEqual(model.vehicles.find((vehicle) => vehicle.id === "ida-1"), {
    id: "ida-1", kind: "sea", label: "İDA-1", mode: "MANUEL", battery: "71%", speed: "4.4 m/s", selected: true,
  });
  assert.match(model.controllerWarning, /bağlı değil/i);
  assert.equal(model.routeError, "Nokta su alanı dışında");
  assert.equal(model.emergency, false);
});

test("latched emergency is explicit in the model", () => {
  const model = operationsViewModel({ ...state, session: { ...state.session, emergency: true } });
  assert.equal(model.emergency, true);
  assert.match(model.emergencyLabel, /acil durdurma/i);
});

function fakeRoot() {
  const listeners = new Map();
  const nodes = new Map([
    ["#operations-fleet", { innerHTML: "" }],
    ["#operations-controller", { textContent: "", hidden: true }],
    ["#operations-route-error", { textContent: "", hidden: true }],
    ["#operations-scenarios", { innerHTML: "" }],
    ["#operations-emergency", { hidden: true, textContent: "" }],
    ["#operations-map-overlay", { dataset: {}, textContent: "" }],
  ]);
  const classes = new Set();
  return {
    hidden: true,
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name) },
    querySelector: (selector) => nodes.get(selector) || null,
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); },
    nodes,
    listeners,
  };
}

test("renderer exposes fleet and scenario actions then cleanup removes state and listeners", () => {
  const root = fakeRoot();
  let selected = "";
  const actions = { selectVehicle: (id) => { selected = id; } };
  renderOperationsConsole(root, operationsViewModel(state), actions);
  assert.equal(root.hidden, false);
  assert.equal(root.classList.contains("active"), true);
  assert.match(root.nodes.get("#operations-fleet").innerHTML, /data-vehicle="ida-1"/);
  assert.match(root.nodes.get("#operations-scenarios").innerHTML, /data-scenario-action="load"/);
  assert.match(root.nodes.get("#operations-map-overlay").innerHTML, /operations-map-vehicle/);
  assert.match(root.nodes.get("#operations-map-overlay").innerHTML, /polyline/);
  root.listeners.get("click")({ target: { closest: () => ({ dataset: { vehicle: "ida-2" } }) } });
  assert.equal(selected, "ida-2");
  clearOperationsConsole(root);
  assert.equal(root.hidden, true);
  assert.equal(root.classList.contains("active"), false);
  assert.equal(root.listeners.size, 0);
});
