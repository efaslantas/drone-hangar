import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  AUTONOMY_COAST_RESPONSE,
  OPS,
  isOpOpen,
  opById,
  trackOf,
} from "../src/missions.js";
import { buildWorld, clearWorld } from "../src/world.js";

const context = new Proxy({
  createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
}, { get: (obj, key) => key in obj ? obj[key] : () => {} });
globalThis.document ||= { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };

test("coastal autonomy mission is complete, unlocked, and outside campaign rankings", () => {
  const op = opById("autonomy-coast-response");
  assert.equal(op, AUTONOMY_COAST_RESPONSE);
  assert.equal(op.kind, "autonomy");
  assert.equal(op.map, "coast");
  assert.ok(op.airRoute.length >= 3);
  assert.ok(op.incidentCandidates.length >= 2);
  assert.equal(new Set(op.seaVehicles.map((v) => v.id)).size, 2);
  assert.ok(op.detectRadius > 0 && op.verifyRadius > 0 && op.minSeaBattery > 0);
  for (const phase of ["AIR_SEARCH", "SEA_DISPATCH", "JOINT_VERIFY"]) assert.ok(op.phaseTimeouts[phase] > 0);
  assert.equal(isOpOpen(op, { done: {} }), true);
  assert.equal(trackOf(op.id), null);
  assert.equal(OPS.includes(op), false);
});

test("coast exposes navigable water, two safe sea spawns, and reachable incidents", () => {
  const scene = new THREE.Scene();
  const play = buildWorld(scene, "coast");
  assert.equal(typeof play.water?.contains, "function");
  assert.ok(play.water.surfaceY > 0, "the visible sea surface sits above the sand plane");
  assert.equal(play.water.shorelineZ, -40);
  assert.equal(play.seaSpawns.length, 2);
  for (const spawn of play.seaSpawns) {
    assert.equal(play.water.contains(spawn.x, spawn.z), true, spawn.id);
    assert.ok(spawn.z <= play.water.shorelineZ - 4, `${spawn.id} starts visibly offshore`);
  }
  assert.equal(play.water.contains(0, 0), false, "helipad is land");
  for (const incident of AUTONOMY_COAST_RESPONSE.incidentCandidates) {
    assert.equal(play.water.contains(incident.x, incident.z), true, incident.id);
    const nearest = Math.min(...AUTONOMY_COAST_RESPONSE.airRoute.map((p) => Math.hypot(p.x - incident.x, p.z - incident.z)));
    assert.ok(nearest <= AUTONOMY_COAST_RESPONSE.detectRadius, `${incident.id}: route distance ${nearest}`);
  }
  clearWorld(scene);
});
