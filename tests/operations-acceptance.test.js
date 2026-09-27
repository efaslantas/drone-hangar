import test from "node:test";
import assert from "node:assert/strict";
import { createState } from "../src/physics.js";
import { createSurfaceState } from "../src/surface.js";
import { createRoute } from "../src/route-editor.js";
import { droneById } from "../src/catalog.js";
import {
  createOperationsRuntime,
  handleOperationsControlLoss,
  rebuildOperationsRuntime,
  projectOperationsPoint,
  setOperationsEmergency,
  stepOperationsRuntime,
} from "../src/operations-runtime.js";

const airSpec = droneById("camera");
const seaSpec = { maxSpeed: 7, maxReverseSpeed: 2.5, acceleration: 3, drag: 0.6, turnRate: 1, batteryDrain: 0 };
const water = { contains: () => true };

function runtime() {
  const air = createState(0, 8, -20);
  air.armed = true;
  return createOperationsRuntime({
    air: { id: "iha-1", kind: "air", state: air, spec: airSpec },
    sea: [
      { id: "ida-1", kind: "sea", state: createSurfaceState("ida-1", -8, -66, 0), spec: seaSpec },
      { id: "ida-2", kind: "sea", state: createSurfaceState("ida-2", 8, -68, 0), spec: seaSpec },
    ],
    water,
  });
}

test("console starts with exactly one UAV and two USVs; only selected vehicle moves manually", () => {
  const rt = runtime();
  assert.deepEqual(rt.session.vehicles.map(({ id, kind }) => [id, kind]), [["iha-1", "air"], ["ida-1", "sea"], ["ida-2", "sea"]]);
  const before = rt.vehicles.map((vehicle) => [vehicle.state.x, vehicle.state.z]);
  for (let i = 0; i < 120; i++) stepOperationsRuntime(rt, { lift: 0, yaw: 0, pitch: 0.5, roll: 0, viz: {} }, 1 / 60);
  assert.notDeepEqual([rt.vehicles[0].state.x, rt.vehicles[0].state.z], before[0]);
  assert.deepEqual([rt.vehicles[1].state.x, rt.vehicles[1].state.z], before[1]);
  assert.deepEqual([rt.vehicles[2].state.x, rt.vehicles[2].state.z], before[2]);
});

test("routes move both vehicle kinds and 0.22 manual input cancels only selected route", () => {
  const rt = runtime();
  rt.routes["iha-1"] = { ...createRoute("iha-1"), points: [{ x: 0, y: 8, z: -100 }], mode: "ROUTE" };
  rt.session = { ...rt.session, vehicles: rt.session.vehicles.map((v) => v.id === "iha-1" ? { ...v, mode: "ROUTE" } : v) };
  const beforeAir = rt.vehicles[0].state.z;
  for (let i = 0; i < 120; i++) stepOperationsRuntime(rt, { lift: 0, yaw: 0, pitch: 0, roll: 0, viz: {} }, 1 / 60);
  assert.ok(rt.vehicles[0].state.z < beforeAir);
  stepOperationsRuntime(rt, { lift: 0, yaw: 0.22, pitch: 0, roll: 0, viz: {} }, 1 / 60);
  assert.equal(rt.session.vehicles[0].mode, "MANUAL");

  rt.session = { ...rt.session, selectedId: "ida-1", vehicles: rt.session.vehicles.map((v) => ({ ...v, mode: v.id === "ida-1" ? "ROUTE" : "HOLD" })) };
  rt.routes["ida-1"] = { ...createRoute("ida-1"), points: [{ x: -8, z: -90 }], mode: "ROUTE" };
  const beforeSea = rt.vehicles[1].state.z;
  for (let i = 0; i < 120; i++) stepOperationsRuntime(rt, { viz: { ly: 0, rx: 0 } }, 1 / 60);
  assert.ok(rt.vehicles[1].state.z < beforeSea);
});

test("disconnect, emergency latch, re-enable, and scenario rebuild are safe", () => {
  const rt = runtime();
  handleOperationsControlLoss(rt);
  assert.equal(rt.session.vehicles[0].mode, "HOLD");
  setOperationsEmergency(rt, true);
  assert.ok(rt.session.vehicles.every((vehicle) => vehicle.mode === "STOPPED"));
  setOperationsEmergency(rt, false);
  assert.equal(rt.session.vehicles[0].mode, "MANUAL");
  const rebuilt = rebuildOperationsRuntime(rt, {
    vehicles: [{ id: "iha-1", kind: "air", start: { x: 4, y: 8, z: -30, heading: 0 } }, { id: "ida-1", kind: "sea", start: { x: -4, z: -67, heading: 0 } }, { id: "ida-2", kind: "sea", start: { x: 4, z: -67, heading: 0 } }],
    routes: { "iha-1": createRoute("iha-1"), "ida-1": createRoute("ida-1"), "ida-2": createRoute("ida-2") },
  });
  assert.notEqual(rebuilt, rt);
  assert.equal(rebuilt.vehicles[0].state.x, 4);
});

test("operations runtime has no result, progress, leaderboard, or network writer", () => {
  const rt = runtime();
  for (const key of ["result", "progress", "leaderboard", "network", "sendResult"]) assert.equal(key in rt, false);
});

test("tactical projection maps shoreline and offshore corners consistently", () => {
  const bounds = { minx: -42, maxx: 42, minz: -140, maxz: -40 };
  assert.deepEqual(projectOperationsPoint({ x: -42, z: -140 }, bounds), { x: 0, y: 0 });
  assert.deepEqual(projectOperationsPoint({ x: 42, z: -40 }, bounds), { x: 1, y: 1 });
  assert.deepEqual(projectOperationsPoint({ x: 0, z: -90 }, bounds), { x: 0.5, y: 0.5 });
});
