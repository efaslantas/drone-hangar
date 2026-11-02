import test from "node:test";
import assert from "node:assert/strict";
import { resolveOperationLoadout } from "../src/loadout-selection.js";
import { FREE, opById, roomOperation } from "../src/missions.js";

test("unlocked drone selection survives switching school operations", () => {
  const preferred = { drone: "racer", map: "forest" };
  assert.deepEqual(resolveOperationLoadout(preferred, opById("school-wind")), {
    drone: "racer",
    map: "airfield",
  });
});

test("locked mission loadout does not replace the pilot preference", () => {
  const preferred = { drone: "racer", map: "forest" };
  assert.deepEqual(resolveOperationLoadout(preferred, opById("infrastructure")), {
    drone: "camera",
    map: "city",
  });
  assert.deepEqual(resolveOperationLoadout(preferred, FREE), preferred);
});

test("map-only operation keeps the pilot's selected drone", () => {
  const preferred = { drone: "cinewhoop", map: "city" };
  assert.deepEqual(resolveOperationLoadout(preferred, opById("school-wind")), {
    drone: "cinewhoop",
    map: "airfield",
  });
});

test("room links select their activity without bypassing locks", () => {
  assert.equal(roomOperation("team", "hover", { done: {} }).id, "free");
  assert.equal(roomOperation("cine", "hover", { done: {} }).id, "hover");
  assert.equal(roomOperation("cine", "hover", { done: { "manual-check": { t: 1 } } }).id, "recon");
});
test('Şile is restored for free flight while scripted activities use their authored map',()=>{
 const p={drone:'freestyle',map:'sile'};assert.deepEqual(resolveOperationLoadout(p,FREE),p);
 assert.equal(resolveOperationLoadout(p,{kind:'race',map:'airfield'}).map,'airfield');
 assert.equal(resolveOperationLoadout(p,{kind:'school'}).map,'airfield');assert.equal(p.map,'sile');
});
