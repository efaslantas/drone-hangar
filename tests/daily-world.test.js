import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";

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
const { DAILY_MAPS } = await import("../src/daily.js");

function segmentHitsBox(a, b, box, margin = 0.65) {
  let lo = 0;
  let hi = 1;
  for (const [axis, min, max] of [
    ["x", box.minx - margin, box.maxx + margin],
    ["y", box.miny - margin, box.maxy + margin],
    ["z", box.minz - margin, box.maxz + margin],
  ]) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-9) {
      if (a[axis] < min || a[axis] > max) return false;
      continue;
    }
    let enter = (min - a[axis]) / delta;
    let leave = (max - a[axis]) / delta;
    if (enter > leave) [enter, leave] = [leave, enter];
    lo = Math.max(lo, enter);
    hi = Math.min(hi, leave);
    if (lo > hi) return false;
  }
  return true;
}

test("daily route templates keep every leg clear of map colliders", () => {
  for (const [mapId, map] of Object.entries(DAILY_MAPS)) {
    const scene = new THREE.Scene();
    const play = buildWorld(scene, mapId, { props: false });
    for (const [count, route] of Object.entries(map.routes)) {
      const points = [
        map.spawn,
        ...route.map((index) => {
          const [x, y, z] = map.pool[index];
          return { x, y, z };
        }),
        { x: 0, y: 1, z: 0 },
      ];
      for (let i = 1; i < points.length; i++) {
        const blocked = play.boxes.some((box) => segmentHitsBox(points[i - 1], points[i], box));
        assert.equal(blocked, false, `${mapId}/${count}: leg ${i} crosses a collider`);
      }
    }
    clearWorld(scene);
  }
});

test("forest collision layout is stable across reloads", () => {
  const firstScene = new THREE.Scene();
  const secondScene = new THREE.Scene();
  const first = buildWorld(firstScene, "forest", { props: false });
  const second = buildWorld(secondScene, "forest", { props: false });
  assert.deepEqual(second.boxes, first.boxes);
  clearWorld(firstScene);
  clearWorld(secondScene);
});

test("night maps keep the skyline clear of daylight decor", () => {
  const scene = new THREE.Scene();
  buildWorld(scene, "city", { night: true, gpu: true, props: false });
  const lifeTypes = scene.userData.lifeObjs.map((object) => object.userData.life?.type);
  assert.equal(lifeTypes.includes("cloud"), false);
  assert.equal(lifeTypes.includes("bird"), false);
  assert.equal(lifeTypes.includes("flag"), false);
  assert.ok(scene.getObjectByName("night-stars"));
  assert.equal(scene.getObjectByName("skyDome"), undefined);
  clearWorld(scene);
});
