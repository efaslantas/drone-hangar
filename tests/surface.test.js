import { test } from "node:test";
import assert from "node:assert/strict";
import { createSurfaceState, stepSurface } from "../src/surface.js";

const SPEC = {
  maxSpeed: 12,
  acceleration: 5,
  drag: 0.7,
  turnRate: 1.2,
  batteryDrain: 0.15,
};
const WATER = { contains: () => true };

test("surface craft accelerates forward, respects speed and turn limits, and drains battery", () => {
  const s = createSurfaceState("ida-1", 0, 0, 0);
  for (let i = 0; i < 600; i++) stepSurface(s, { throttle: 1, steer: 1 }, SPEC, 1 / 60, WATER);
  assert.ok(s.speed > 0 && s.speed <= SPEC.maxSpeed);
  assert.ok(Math.abs(s.turnRate) <= SPEC.turnRate);
  assert.ok(Math.hypot(s.x, s.z) > 5);
  assert.ok(s.battery < 100);
});

test("surface craft coasts down with no throttle and stops on an empty battery", () => {
  const s = createSurfaceState("ida-1", 0, 0, 0);
  for (let i = 0; i < 180; i++) stepSurface(s, { throttle: 1, steer: 0 }, SPEC, 1 / 60, WATER);
  const fast = s.speed;
  for (let i = 0; i < 180; i++) stepSurface(s, { throttle: 0, steer: 0 }, SPEC, 1 / 60, WATER);
  assert.ok(s.speed < fast * 0.2);
  s.battery = 0;
  for (let i = 0; i < 300; i++) stepSurface(s, { throttle: 1, steer: 0 }, SPEC, 1 / 60, WATER);
  assert.ok(s.speed < 0.05);
});

test("surface craft keeps its last safe point when the next point is land", () => {
  const s = createSurfaceState("ida-1", 0, 0, Math.PI / 2);
  const water = { contains: (x) => x <= 1 };
  for (let i = 0; i < 120; i++) stepSurface(s, { throttle: 1, steer: 0 }, SPEC, 1 / 60, water);
  assert.ok(s.x <= 1);
  assert.equal(s.speed, 0);
  assert.ok(s.blockedFor > 0);
});

test("large dt is substepped and remains finite and bounded", () => {
  const s = createSurfaceState("ida-1", 0, 0, 0);
  stepSurface(s, { throttle: 1, steer: 0 }, SPEC, 5, WATER);
  assert.ok(Number.isFinite(s.x) && Number.isFinite(s.z));
  assert.ok(Math.hypot(s.x, s.z) <= SPEC.maxSpeed * 5);
  assert.ok(s.z < 0);
});

test("surface craft supports bounded reverse without changing forward limits", () => {
  const spec = { ...SPEC, maxReverseSpeed: 2.5 };
  const state = createSurfaceState("ida-1", 0, 0, 0);
  for (let i = 0; i < 600; i++) stepSurface(state, { throttle: -1, steer: 0 }, spec, 1 / 60, WATER);
  assert.ok(state.speed < 0);
  assert.ok(state.speed >= -2.5);
  assert.ok(state.z > 0, "reverse moves astern");
});
