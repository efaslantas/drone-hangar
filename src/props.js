// Real scanned props (Poly Haven, CC0) placed on the maps: barrels, crates,
// tyres, barriers, a generator, stumps, rocks, shrubs, hydrants… Loaded lazily
// after the procedural world is up, desktop only (the lite/touch build keeps
// its boxes). Models are real-world scale; we only snap them to the ground and
// register a collider for anything a drone can actually hit.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { aabbFromBox } from "./collide.js";

export const MODEL_BASE = "/models";

// [id, x, z, yawDeg, opts?]  opts: { h: target height in m, scale, collide: false, yOffset: mount height in m }
export const PROPS = {
  yard: [
    // the clutter spots that used to be procedural barrels/crates
    ["Barrel_01", -6.5, -2.5, 20],
    ["wooden_crate_02", 8, -18, 10],
    ["barrel_03", -7, -22, 0],
    ["plastic_crate_02", 4, -40, 35],
    ["Barrel_02", -9, -36, 60],
    // warehouse A south face: loading clutter
    ["hand_truck", 12, 2.4, 100],
    ["cardboard_box_01", 15, 2.1, 15],
    ["cardboard_box_01", 16.2, 2.0, -20, { scale: 0.85 }],
    ["industrial_pastic_container", 20, 2.3, 0],
    ["plastic_crate_02", 24, 2.2, 5],
    // tower base: tyres and a jerrycan
    ["old_tyre", 29.4, -34, 0],
    ["old_tyre", 30.2, -35.4, 40],
    ["metal_jerrycan", 29, -37.6, 70],
    // warehouse B north face: generator and gas
    ["portable_generator", -20, -1.6, 180],
    ["propane_tank", -17.4, -1.5, 0],
    ["propane_tank", -16.7, -2.0, 30],
    // south end of the road
    ["concrete_road_barrier_02", 10.6, -50, 90],
    ["concrete_road_barrier_02", 10.6, -53.6, 90],
    ["wooden_military_crate", -12, -60, 25],
    ["Barrel_01", -13.3, -58.5, 0],
    ["trashbag", -11.4, -61.6, 0, { collide: false }],
    // facade detail: a leaning ladder and a caged door lamp on warehouse A, hardware on B, bins + a manhole on the road
    ["ladder_sectioned_01", 7.3, -8, 0],
    ["industrial_caged_sconce", 7.5, -1, 0, { yOffset: 3.2, collide: false }],
    ["gate_latch_01", -8.3, 8, 0, { collide: false }],
    ["metal_trash_can", 27, 1.9, 0],
    ["water_manhole_cover", 2, -16, 0, { collide: false }],
    ["water_manhole_cover", -3, -46, 0, { collide: false }],
  ],
  airfield: [
    ["portable_generator", 7.6, 6, 90],
    ["propane_tank", 7.7, 8.3, 0],
    ["Barrel_01", -9.6, 2, 0],
    ["barrel_03", -9.6, 3.2, 20],
    ["Barrel_02", -9.4, 4.4, 0],
    ["old_tyre", -8.4, -1.2, 0],
    ["concrete_road_barrier_02", 11.5, -30, 0],
    ["concrete_road_barrier_02", -11.5, -30, 0],
    ["concrete_road_barrier_02", 11.5, -60, 0],
    ["concrete_road_barrier_02", -11.5, -60, 0],
    ["wooden_crate_02", 16, -14, 30],
    ["cardboard_box_01", 17.3, -14.6, -10],
    ["metal_jerrycan", 15.2, -15.4, 0],
    ["hand_truck", 8.2, 12, -90],
    ["metal_trash_can", 9, 10, 0],
    ["water_manhole_cover", 0, -40, 0, { collide: false }],
  ],
  coast: [
    // the shoreline rocks (were dodecahedrons); heights match the old radii
    ["rock_07", -30, -42, 0, { h: 2.2 }],
    ["rock_moss_set_01", -24, -40, 40, { h: 1.6 }],
    ["rock_07", -18, -38, 120, { h: 1.9 }],
    ["rock_moss_set_01", -12, -42, 200, { h: 2.4 }],
    ["rock_07", -6, -40, 60, { h: 1.7 }],
    ["rock_07", 6, -42, 300, { h: 2.4 }],
    ["rock_moss_set_01", 12, -40, 15, { h: 1.9 }],
    ["rock_07", 18, -38, 250, { h: 2.1 }],
    ["rock_moss_set_01", 24, -42, 90, { h: 2.4 }],
    ["rock_07", 0, -38, 180, { h: 2.6 }],
    ["wooden_crate_02", -3, -6.6, 15],
    ["Barrel_02", -2, -8.1, 0],
    ["old_tyre", 8, 4, 0],
    ["shrub_02", 20, -14, 0, { collide: false }],
    ["shrub_02", -22, 2, 90, { collide: false }],
    ["fern_02", 26, -4, 0, { collide: false }],
    ["fern_02", -28, -18, 40, { collide: false }],
  ],
  city: [
    ["fire_hydrant", 7, -6, 0],
    ["fire_hydrant", -7, -44, 180],
    ["trashbag", 12.6, -10, 0, { collide: false }],
    ["trashbag", -12.8, -27, 30, { collide: false }],
    ["trashbag", 12.4, -62, 60, { collide: false }],
    ["street_lamp_01", 6, -24, 180],
    ["street_lamp_01", -6, -24, 0],
    ["street_lamp_01", 6, -56, 180],
    ["street_lamp_01", -6, -56, 0],
    ["concrete_road_barrier_02", 6, -14, 0],
    ["concrete_road_barrier_02", -6, -14, 0],
    ["wooden_crate_02", 12, -38, 20],
    ["cardboard_box_01", 12.2, -39.3, -15],
    ["Barrel_01", -12, -74, 0],
    ["barrel_03", -12, -75.2, 30],
    ["metal_trash_can", 9, -44, 0],
    ["water_manhole_cover", 0, -20, 0, { collide: false }],
    ["water_manhole_cover", 0, -34, 0, { collide: false }],
  ],
  forest: [
    ["tree_stump_01", 10, -20, 0],
    ["tree_stump_01", -8, -40, 120],
    ["tree_stump_01", 14, -75, 200],
    ["tree_stump_01", -30, -95, 40],
    ["rock_07", 2, -30, 0, { h: 1.2 }],
    ["rock_moss_set_01", -6, -52, 60, { h: 1.4 }],
    ["rock_moss_set_01", 18, -58, 200, { h: 1.8 }],
    ["rock_07", -20, -112, 90, { h: 2 }],
    ["shrub_02", 9, -16, 0, { collide: false }],
    ["shrub_02", 3, -44, 80, { collide: false }],
    ["shrub_02", 9.5, -66, 160, { collide: false }],
    ["shrub_02", 2.5, -90, 240, { collide: false }],
    ["fern_02", 8, -30, 0, { collide: false }],
    ["fern_02", 4, -52, 120, { collide: false }],
    ["fern_02", 9, -104, 60, { collide: false }],
  ],
  indoor: [
    ["wooden_crate_02", -36, -10, 10],
    ["wooden_crate_02", -36, -11.5, 0],
    ["plastic_crate_02", 36, -20, 0],
    ["plastic_crate_02", 36, -21.3, 15],
    ["cardboard_box_01", 34.5, -60, 20],
    ["Barrel_01", -34, -40, 0],
    ["barrel_03", -34, -41.3, 0],
    ["hand_truck", 34, 20, -90],
    ["industrial_pastic_container", -35, 25, 0],
    ["wooden_military_crate", 33, -70, 5],
  ],
};

let manifestPromise = null;
// The shipped .glb files are meshopt-compressed with WebP textures (tools/optimize-models.mjs).
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();

function manifest() {
  if (!manifestPromise) manifestPromise = fetch(`${MODEL_BASE}/manifest.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`manifest HTTP ${r.status}`))));
  return manifestPromise;
}

/** Load (once) and measure a model; the promise is shared by every placement. */
export function loadModel(id) {
  if (!cache.has(id)) {
    cache.set(
      id,
      (async () => {
        const man = await manifest();
        const entry = man[id];
        if (!entry) throw new Error(`model yok: ${id}`);
        const gltf = await loader.loadAsync(entry.file);
        const root = gltf.scene;
        root.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        const box = new THREE.Box3().setFromObject(root);
        return { root, size: box.getSize(new THREE.Vector3()), minY: box.min.y };
      })(),
    );
  }
  return cache.get(id);
}

/** Pure: the placed instance's transform + collider box for one placement. */
export function placementFor([id, x, z, yaw = 0, opts = {}], m) {
  let s = opts.scale ?? 1;
  if (opts.h && m.size.y > 0) s = opts.h / m.size.y;
  const size = { x: m.size.x * s, y: m.size.y * s, z: m.size.z * s };
  const rot = (yaw * Math.PI) / 180;
  // A wall-mounted fixture (a door lamp) needs lifting off the ground, not just resting on it.
  const y = -m.minY * s + (opts.yOffset || 0);
  const collide = opts.collide !== false && size.x > 0.45 && size.y > 0.35;
  return { id, x, y, z, s, rot, size, collide };
}

/**
 * Drop this map's props into the scene. `token` is the scene's world token at
 * build time: if the pilot switched maps while models were still downloading,
 * late arrivals are dropped instead of landing in the wrong world.
 */
export async function placeProps(scene, play, mapId, token) {
  const list = PROPS[mapId];
  if (!list?.length) return 0;
  const settled = await Promise.allSettled(
    list.map(async (p) => {
      const m = await loadModel(p[0]);
      if (scene.userData.worldToken !== token) return false;
      const pl = placementFor(p, m);
      const inst = m.root.clone(); // shares geometry + materials
      inst.scale.setScalar(pl.s);
      inst.rotation.y = pl.rot;
      inst.position.set(pl.x, pl.y, pl.z);
      inst.userData.prop = pl.id;
      scene.add(inst);
      if (pl.collide) play.boxes.push(aabbFromBox(pl.x, pl.size.y / 2, pl.z, pl.size.x, pl.size.y, pl.size.z, pl.rot));
      return true;
    }),
  );
  const failed = settled.filter((r) => r.status === "rejected");
  if (failed.length) console.warn(`[props] ${failed.length} model yüklenemedi:`, failed.map((r) => String(r.reason)).join("; "));
  return settled.filter((r) => r.status === "fulfilled" && r.value).length;
}
