import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceRoute,
  appendWaypoint,
  clearRoute,
  createRoute,
  removeWaypoint,
  replaceRoute,
  validateRoute,
} from "../src/route-editor.js";

const air = { kind: "air", bounds: { minx: -20, maxx: 20, minz: -30, maxz: 10, ceiling: 20 } };
const sea = { kind: "sea", water: { contains: (x, z) => x >= -10 && x <= 10 && z <= -40 && z >= -120 } };

test("air points default to eight metres and obey horizontal and altitude bounds", () => {
  const empty = createRoute("iha-1");
  const added = appendWaypoint(empty, { x: 2, z: -4 }, air);
  assert.equal(added.ok, true);
  assert.deepEqual(added.route.points, [{ x: 2, y: 8, z: -4 }]);
  assert.equal(added.route.mode, "ROUTE");
  assert.equal(appendWaypoint(empty, { x: 21, y: 8, z: 0 }, air).ok, false);
  assert.equal(appendWaypoint(empty, { x: 0, y: 1.9, z: 0 }, air).ok, false);
  assert.equal(appendWaypoint(empty, { x: 0, y: 19.1, z: 0 }, air).ok, false);
});

test("sea points are accepted only inside navigable water", () => {
  const empty = createRoute("ida-1");
  assert.equal(appendWaypoint(empty, { x: 4, z: -70 }, sea).ok, true);
  const dry = appendWaypoint(empty, { x: 4, z: -20 }, sea);
  assert.equal(dry.ok, false);
  assert.match(dry.error, /su/iu);
});

test("routes remove and clear points immutably", () => {
  const original = replaceRoute(createRoute("iha-1"), [{ x: 0, z: 0 }, { x: 2, z: -2 }], air).route;
  const removed = removeWaypoint(original, 0);
  assert.equal(removed.points.length, 1);
  assert.equal(original.points.length, 2);
  assert.deepEqual(clearRoute(original), { ...original, points: [], currentIndex: 0, mode: "HOLD" });
});

test("arrival advances the route and the last arrival enters HOLD", () => {
  const route = replaceRoute(createRoute("ida-1"), [{ x: 0, z: -60 }, { x: 4, z: -70 }], sea).route;
  const next = advanceRoute(route, { x: 0.5, z: -60 }, 1);
  assert.equal(next.currentIndex, 1);
  assert.equal(next.mode, "ROUTE");
  const done = advanceRoute(next, { x: 4, z: -70.5 }, 1);
  assert.equal(done.currentIndex, 2);
  assert.equal(done.mode, "HOLD");
});

test("replacement rejects every point atomically when one is invalid", () => {
  const original = appendWaypoint(createRoute("ida-1"), { x: 0, z: -70 }, sea).route;
  const result = replaceRoute(original, [{ x: 2, z: -80 }, { x: 2, z: -20 }], sea);
  assert.equal(result.ok, false);
  assert.equal(result.route, original);
  assert.equal(validateRoute({ ...original, points: [{ x: 0, z: -20 }] }, sea).ok, false);
});
