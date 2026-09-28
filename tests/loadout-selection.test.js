import test from "node:test";
import assert from "node:assert/strict";
import { resolveOperationLoadout } from "../src/loadout-selection.js";
import { AUTONOMY_COAST_RESPONSE, FREE, TEAM, opById, roomOperation } from "../src/missions.js";

test("unlocked drone selection survives switching school operations", () => {
  const preferred = { drone: "racer", map: "forest" };
  assert.deepEqual(resolveOperationLoadout(preferred, opById("school-wind")), {
    drone: "racer",
    map: "airfield",
  });
});

test("locked autonomy loadout does not replace the pilot preference", () => {
  const preferred = { drone: "racer", map: "forest" };
  assert.deepEqual(resolveOperationLoadout(preferred, AUTONOMY_COAST_RESPONSE), {
    drone: "camera",
    map: "coast",
  });
  assert.deepEqual(resolveOperationLoadout(preferred, FREE), preferred);
});

test("map-only operation keeps the pilot's selected drone", () => {
  const preferred = { drone: "cinewhoop", map: "city" };
  assert.deepEqual(resolveOperationLoadout(preferred, TEAM), {
    drone: "cinewhoop",
    map: "airfield",
  });
});

test("room links select their activity without bypassing locks", () => {
  assert.equal(roomOperation("team", "hover", { done: {} }).id, "team");
  assert.equal(roomOperation("cine", "hover", { done: {} }).id, "hover");
  assert.equal(roomOperation("cine", "hover", { done: { "manual-check": { t: 1 } } }).id, "recon");
});
