import { test } from "node:test";
import assert from "node:assert/strict";
import { airCommand, routeProgress, surfaceCommand } from "../src/autopilot.js";
import { createSurfaceState, stepSurface } from "../src/surface.js";
import { createState, step } from "../src/physics.js";
import { droneById } from "../src/catalog.js";

const SEA_SPEC = {
  maxSpeed: 12,
  acceleration: 5,
  drag: 0.7,
  turnRate: 1.2,
  batteryDrain: 0.05,
};

test("surface autopilot converges on a target without overshooting forever", () => {
  const s = createSurfaceState("ida-1", 0, 0, 0);
  const target = { x: 0, z: -120 };
  for (let i = 0; i < 2400; i++) {
    stepSurface(s, surfaceCommand(s, target, SEA_SPEC), SEA_SPEC, 1 / 60, { contains: () => true });
  }
  assert.ok(Math.hypot(s.x - target.x, s.z - target.z) < 2, `distance=${Math.hypot(s.x, s.z + 120)}`);
  assert.ok(s.speed < 1);
});

test("air autopilot moves the existing flight model closer to its waypoint", () => {
  const spec = droneById("camera");
  const s = createState(0, 8, 0);
  s.armed = true;
  const target = { x: 0, y: 8, z: -40 };
  const before = Math.hypot(s.x - target.x, s.y - target.y, s.z - target.z);
  for (let i = 0; i < 600; i++) step(s, airCommand(s, target, spec), spec, 1 / 60);
  const after = Math.hypot(s.x - target.x, s.y - target.y, s.z - target.z);
  assert.ok(after < before * 0.35, `before=${before} after=${after}`);
});

test("route progress reports a vehicle stuck after five seconds without improvement", () => {
  const state = { x: 0, z: 0 };
  const target = { x: 10, z: 0 };
  let tracker = null;
  for (let i = 0; i < 6; i++) tracker = routeProgress(state, target, tracker, 1);
  assert.equal(tracker.stuck, true);
  state.x = 2;
  tracker = routeProgress(state, target, tracker, 1);
  assert.equal(tracker.stuck, false);
  assert.equal(tracker.stuckFor, 0);
});

test("route progress does not call steady sub-threshold movement stuck", () => {
  const state = { x: 0, z: 0 };
  const target = { x: 20, z: 0 };
  let tracker = null;
  for (let i = 0; i < 60 * 6; i++) {
    state.x += 2 / 60;
    tracker = routeProgress(state, target, tracker, 1 / 60);
  }
  assert.equal(tracker.stuck, false);
  assert.ok(tracker.distance < 9);
});
