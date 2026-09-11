import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PROPS, placementFor } from "../src/props.js";
import { MODELS } from "../tools/models-list.mjs"; // never fetch-models.mjs: it downloads on import

// makePlay(minx, maxx, minz, maxz, ceil) per map in world.js.
const BOUNDS = {
  yard: { minx: -40, maxx: 44, minz: -82, maxz: 16 },
  airfield: { minx: -48, maxx: 48, minz: -88, maxz: 22 },
  coast: { minx: -44, maxx: 44, minz: -46, maxz: 20 },
  city: { minx: -34, maxx: 34, minz: -96, maxz: 14 },
  forest: { minx: -70, maxx: 70, minz: -140, maxz: 30 },
  indoor: { minx: -40.6, maxx: 40.6, minz: -80.6, maxz: 40.6 },
};
// Building/hangar footprints a prop must not stand inside (x0,x1,z0,z1).
const SOLIDS = {
  yard: [[8, 36, -16, 0], [-43, -9, 1, 15], [-19, -9, -34, -22], [32, 40, -40, -32]],
  airfield: [[10, 46, -3, 19], [-41, -11, -3, 15]],
  city: [[14, 30, -25, -11], [-26, -14, -26, -14], [13, 31, -60, -44], [-29, -15, -60, -48], [14, 26, -88, -76], [-28, -12, -91, -77], [-5, 5, -71, -61]],
  coast: [],
  forest: [],
  indoor: [[-40, 40, 39.4, 40.6], [-40, 40, -80.6, -79.4], [39.4, 40.6, -80, 40], [-40.6, -39.4, -80, 40], [-0.6, 0.6, -50.6, -49.4]],
};

const manifest = JSON.parse(fs.readFileSync(new URL("../public/models/manifest.json", import.meta.url), "utf8"));

test("every placed model is in the fetched manifest, and every fetched model is CC0 with a file on disk", () => {
  for (const id of MODELS) {
    assert.ok(manifest[id], `${id} missing from manifest`);
    assert.equal(manifest[id].license, "CC0");
    assert.ok(fs.existsSync(new URL(`../public${manifest[id].file}`, import.meta.url)), `${id}: glTF file missing`);
  }
  for (const [map, list] of Object.entries(PROPS)) for (const p of list) assert.ok(manifest[p[0]], `${map}: ${p[0]} not fetched`);
});

test("placements sit inside the fence, off the pad, and outside buildings", () => {
  for (const [map, list] of Object.entries(PROPS)) {
    const b = BOUNDS[map];
    assert.ok(b, map);
    for (const [id, x, z] of list) {
      assert.ok(x > b.minx + 1 && x < b.maxx - 1 && z > b.minz + 1 && z < b.maxz - 1, `${map}/${id} (${x},${z}) outside`);
      assert.ok(Math.hypot(x, z) > 6, `${map}/${id} (${x},${z}) on the helipad`);
      for (const [x0, x1, z0, z1] of SOLIDS[map]) assert.ok(!(x > x0 && x < x1 && z > z0 && z < z1), `${map}/${id} (${x},${z}) inside a building`);
    }
  }
  assert.ok(PROPS.yard.length >= 15 && PROPS.forest.length >= 10 && PROPS.indoor.length >= 8);
});

test("coast rocks cover the ten shoreline slots the procedural rocks used", () => {
  const slots = new Set();
  for (let i = 0; i < 10; i++) slots.add(`${(i - 5) * 6},${-46 + 4 + (i % 3) * 2}`);
  const rocks = PROPS.coast.filter((p) => p[0].startsWith("rock")).map((p) => `${p[1]},${p[2]}`);
  for (const s of slots) assert.ok(rocks.includes(s), `slot ${s} has no rock`);
});

test("placementFor: ground snap, target-height scaling, collider only for things worth hitting", () => {
  const barrel = { size: { x: 0.6, y: 0.9, z: 0.6 }, minY: -0.05 };
  const p = placementFor(["Barrel_01", 3, -4, 90], barrel);
  assert.equal(p.s, 1);
  assert.ok(Math.abs(p.y - 0.05) < 1e-9, "bottom of the model lands on y=0");
  assert.ok(Math.abs(p.rot - Math.PI / 2) < 1e-9);
  assert.equal(p.collide, true);
  const rock = { size: { x: 2, y: 1, z: 1.5 }, minY: 0 };
  const r = placementFor(["rock_07", 0, 0, 0, { h: 2.5 }], rock);
  assert.equal(r.s, 2.5);
  assert.deepEqual(r.size, { x: 5, y: 2.5, z: 3.75 });
  const fern = placementFor(["fern_02", 0, 0, 0, { collide: false }], { size: { x: 1, y: 0.8, z: 1 }, minY: 0 });
  assert.equal(fern.collide, false);
  const tiny = placementFor(["metal_jerrycan", 0, 0, 0], { size: { x: 0.3, y: 0.45, z: 0.15 }, minY: 0 });
  assert.equal(tiny.collide, false, "a jerrycan is too small to be a collider");
});
