import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import { VARIANTS, fitTree, treePart } from "../src/trees.js";
import { worldGeometry } from '../src/perimeter.js';

// Minimal .glb reader (magic/version/length header, then length-prefixed
// chunks) — just enough to pull each material's name and baseColorFactor
// out of the embedded JSON chunk, without a DOM/fetch-backed GLTFLoader.
function glbDocument(path) {
  const data = fs.readFileSync(path);
  let off = 12; // skip magic(4) + version(4) + total length(4)
  while (off < data.length) {
    const clen = data.readUInt32LE(off);
    const ctype = data.readUInt32LE(off + 4);
    const chunk = data.subarray(off + 8, off + 8 + clen);
    if (ctype === 0x4e4f534a) return JSON.parse(chunk.toString("utf8"));
    off += 8 + clen;
  }
  return [];
}

// Same canvas shim as visual.test.js — buildWorld touches canvas-based procedural textures.
const context = new Proxy(
  {
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    measureText: () => ({ width: 20 }),
  },
  { get: (obj, key) => (key in obj ? obj[key] : () => {}) },
);
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };

const { buildWorld, clearWorld } = await import("../src/world.js");

// makePlay(minx, maxx, minz, maxz, ceil) per map in world.js.
const BOUNDS = {
  yard: { minx: -40, maxx: 44, minz: -82, maxz: 16 },
  coast: { minx: -44, maxx: 44, minz: -46, maxz: 20 },
  forest: { minx: -70, maxx: 70, minz: -140, maxz: 30 },
};

test("detailed trees ship local compressed near/far geometry with bounded triangle counts", () => {
  for(const id of new Set(Object.values(VARIANTS).flat())) {
    const levels=['','-lod'].map(suffix=>{
      const path=new URL(`../public/models/${id}/${id}${suffix}.glb`,import.meta.url);
      assert.ok(fs.statSync(path).size<6000000, `${id}${suffix}: transfer budget`);
      const doc=glbDocument(path);
      assert.ok(doc.extensionsUsed.includes('EXT_meshopt_compression'));
      return doc.meshes.reduce((n,m)=>n+m.primitives.reduce((k,p)=>k+doc.accessors[p.indices].count/3,0),0);
    });
    assert.ok(levels[0]<250000,`${id}: near geometry budget`);
    assert.ok(levels[1]<levels[0]*.7,`${id}: far geometry is meaningfully smaller`);
  }
});

test("tree fitting grounds and scales a nested exported mesh without changing the shared source", () => {
  const scene=new THREE.Group(),parent=new THREE.Group();scene.add(parent);parent.position.set(4,3,-2);
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,4,2),new THREE.MeshStandardMaterial());
  mesh.name='pine_sapling_small_a';mesh.position.set(2,1,3);parent.add(mesh);
  const part=treePart(scene,'pine_sapling_small',0);assert.equal(part,mesh);
  const fitted=fitTree(part,8);fitted.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(fitted);
  assert.ok(Math.abs(bounds.min.y)<1e-6);assert.ok(Math.abs(bounds.max.y-8)<1e-6);
  assert.ok(Math.abs(bounds.min.x+bounds.max.x)<1e-6);
  assert.deepEqual(mesh.position.toArray(),[2,1,3]);
});

test('quantized fence vertices survive world-space baking without integer wrap', () => {
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Int16BufferAttribute([32767,0,-32767,0,32767,0],3,true));
  const mesh=new THREE.Mesh(geo);mesh.position.set(8,2,-4);mesh.scale.set(3,4,2);mesh.updateMatrixWorld(true);
  const baked=worldGeometry(mesh),p=baked.getAttribute('position');
  assert.deepEqual([p.getX(0),p.getY(0),p.getZ(0)],[11,2,-6]);
  assert.deepEqual([p.getX(1),p.getY(1),p.getZ(1)],[8,6,-4]);
  assert.equal(geo.getAttribute('position').array[0],32767);
  baked.dispose();geo.dispose();mesh.material.dispose();
});

test("buildWorld never fetches on its own: treePlacements are recorded synchronously, with no opts.props", () => {
  const scene = new THREE.Scene();
  buildWorld(scene, "yard"); // opts.props defaults false — no dynamic import, no network
  assert.ok(Array.isArray(scene.userData.treePlacements));
  assert.ok(scene.userData.treePlacements.length > 0);
  clearWorld(scene);
});

// trees() draws a distant ring (rad0 well past the playable fence, by design —
// a horizon treeline, not an obstacle inside it), so unlike scatterForest()'s
// in-fence placements below, these are checked on kind/height, not position.
test("yard trees: real-oak placements, sane height, procedural fallback attached", () => {
  const scene = new THREE.Scene();
  buildWorld(scene, "yard");
  const ps = scene.userData.treePlacements;
  assert.ok(ps.length >= 18, `only ${ps.length} placements`);
  for (const p of ps) {
    assert.equal(p.kind, "oak");
    assert.ok(p.h >= 4.5 && p.h <= 7, `h=${p.h}`);
    assert.ok(p.mesh?.isObject3D, "procedural stand-in still in place until the real tree lands");
    assert.ok(VARIANTS.oak[p.variant % VARIANTS.oak.length]);
  }
  clearWorld(scene);
});

test("coast trees: coastal placements retain their height envelope", () => {
  const scene = new THREE.Scene();
  buildWorld(scene, "coast");
  const ps = scene.userData.treePlacements;
  assert.ok(ps.length >= 10, `only ${ps.length} placements`);
  for (const p of ps) {
    assert.equal(p.kind, "palm");
    assert.ok(p.h >= 6 && p.h <= 9, `h=${p.h}`);
  }
  clearWorld(scene);
});

test("forest: tall/short procedural split maps onto pineTall/pineRound with the same per-tree height", () => {
  const scene = new THREE.Scene();
  buildWorld(scene, "forest");
  const ps = scene.userData.treePlacements;
  assert.ok(ps.length > 100, `only ${ps.length} placements`);
  const tall = ps.filter((p) => p.kind === "pineTall");
  const round = ps.filter((p) => p.kind === "pineRound");
  assert.ok(tall.length > 0 && round.length > 0);
  for (const p of tall) {
    assert.ok(p.h >= 5.5 && p.h <= 8, `tall h=${p.h}`);
    assert.ok(p.x > BOUNDS.forest.minx && p.x < BOUNDS.forest.maxx);
    assert.ok(p.z > BOUNDS.forest.minz && p.z < BOUNDS.forest.maxz);
  }
  for (const p of round) assert.ok(p.h >= 2.8 && p.h <= 4.8, `round h=${p.h}`);
  assert.equal(new Set(ps.map((p) => p.mesh)).size, ps.length, "each placement keeps its own procedural mesh");
  clearWorld(scene);
});

test("city and indoor call no tree builder: no placements to swap", () => {
  for (const id of ["city", "indoor"]) {
    const scene = new THREE.Scene();
    buildWorld(scene, id);
    assert.deepEqual(scene.userData.treePlacements, [], id);
    clearWorld(scene);
  }
});
