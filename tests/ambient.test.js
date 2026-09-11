import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";

// Same canvas shim as visual.test.js: no pixels in Node, only structure/motion.
const context = new Proxy({
  createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
  measureText: () => ({ width: 20 }),
}, { get: (obj, key) => (key in obj ? obj[key] : () => {}) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };

const { buildWorld, clearWorld, MAPS, tickWorld } = await import("../src/world.js");
const { tickAmbient } = await import("../src/ambient.js");

function world(id, opts = {}) {
  const scene = new THREE.Scene();
  const play = buildWorld(scene, id, opts);
  return { scene, play };
}

function finite(scene) {
  scene.traverse((o) => {
    assert.ok(Number.isFinite(o.position.x + o.position.y + o.position.z), `${o.name || o.type} position`);
    assert.ok(Number.isFinite(o.rotation.x + o.rotation.y + o.rotation.z), `${o.name || o.type} rotation`);
    assert.ok(Number.isFinite(o.scale.x + o.scale.y + o.scale.z), `${o.name || o.type} scale`);
    if (o.isInstancedMesh) assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite), `${o.name} instances`);
  });
}

test("every map gets a living layer and survives a long tick without NaN", () => {
  for (const map of MAPS) for (const lite of [false, true]) {
    const { scene, play } = world(map.id, { lite });
    assert.ok(scene.userData.ambient.length > 0, `${map.id}: ambient entries`);
    play.wind = map.id === "airfield" ? { x: 1.1, z: 0.4 } : null;
    for (let i = 0; i < 400; i++) tickWorld(scene, i / 60, 1 / 60, { x: 3, y: 6, z: -12, armed: true, throttleOut: 0.5 });
    finite(scene);
    clearWorld(scene);
    assert.equal(scene.userData.ambient, null);
  }
});

test("airfield windsock points downwind and hangs when the air is calm", () => {
  const { scene, play } = world("airfield");
  const sock = scene.getObjectByName("windsock");
  assert.ok(sock, "windsock present");
  play.wind = { x: 1.1, z: 0.4 };
  for (let i = 0; i < 300; i++) tickAmbient(scene, i / 60, 1 / 60);
  const want = Math.atan2(-0.4, 1.1);
  assert.ok(Math.abs(sock.rotation.y - want) < 0.08, `yaw ${sock.rotation.y} vs ${want}`);
  const windyDroop = sock.rotation.z;
  play.wind = null;
  for (let i = 0; i < 400; i++) tickAmbient(scene, 5 + i / 60, 1 / 60);
  assert.ok(sock.rotation.z < windyDroop - 0.4, `calm droop ${sock.rotation.z} vs windy ${windyDroop}`);
});

test("hangar: flickering panels, rotating warning beacons, dust and an exit sign", () => {
  const { scene } = world("indoor");
  const types = scene.userData.ambient.map((e) => e.type);
  assert.ok(types.filter((t) => t === "flicker").length >= 2);
  assert.ok(types.filter((t) => t === "beacon").length >= 2);
  assert.ok(scene.getObjectByName("exit-sign"));
  const panels = [];
  scene.traverse((o) => o.name === "hangar-panel" && panels.push(o));
  const mats = new Set(panels.map((p) => p.material));
  assert.ok(mats.size >= 2, "flickering panels own their material");
  const beam = scene.getObjectByName("beacon");
  const y0 = beam.rotation.y;
  for (let i = 0; i < 60; i++) tickAmbient(scene, i / 60, 1 / 60);
  assert.ok(beam.rotation.y > y0 + 1, "beacon rotates");
  const motes = scene.userData.lifeObjs.find((o) => o.userData.life?.type === "motes");
  assert.ok(motes && motes.userData.life.pos.length / 3 >= 100, "desktop dust count");
  const lite = world("indoor", { lite: true }).scene;
  const liteMotes = lite.userData.lifeObjs.find((o) => o.userData.life?.type === "motes");
  assert.ok(liteMotes && liteMotes.userData.life.pos.length / 3 < 100, "lite dust reduced");
});

test("city: roller doors cycle, chimney smoke rises, traffic loops outside the fence", () => {
  const { scene, play } = world("city");
  const door = scene.getObjectByName("roller-door");
  const doorEntry = scene.userData.ambient.find((e) => e.type === "door");
  const off = doorEntry.offset;
  tickAmbient(scene, 2 - off, 1 / 60);
  assert.ok(Math.abs(door.scale.y - 1) < 1e-6, "closed at rest");
  tickAmbient(scene, 8.5 - off, 1 / 60);
  assert.ok(door.scale.y < 1 && door.scale.y > 0.06, "opening");
  tickAmbient(scene, 15 - off, 1 / 60);
  assert.ok(door.scale.y < 0.07, "open");
  const smoke = scene.userData.ambient.find((e) => e.type === "smoke");
  assert.equal(smoke.puffs.length, 10);
  for (let i = 0; i < 240; i++) tickAmbient(scene, i / 60, 1 / 60);
  for (const p of smoke.puffs) {
    assert.ok(p.sp.material.opacity >= 0 && p.sp.material.opacity <= 0.6);
    assert.ok(p.sp.position.y >= smoke.oy - 1e-6);
  }
  const traffic = scene.userData.ambient.find((e) => e.type === "traffic");
  assert.ok(traffic.cars.length >= 2);
  for (let i = 0; i < 60 * 40; i++) tickAmbient(scene, i / 60, 1 / 60);
  for (const c of traffic.cars) {
    assert.ok(c.g.position.z >= traffic.z0 && c.g.position.z <= traffic.z1, "van stays on its loop");
    assert.ok(c.g.position.x > play.bounds.maxx, "van is outside the play area");
    assert.equal(c.g.userData.groundFootprint, undefined);
  }
  assert.equal(world("city", { lite: true }).scene.userData.ambient.find((e) => e.type === "smoke").puffs.length, 5);
});

test("coast: foam lines roll toward the shore, gulls glide", () => {
  const { scene, play } = world("coast");
  const foam = scene.getObjectByName("shore-foam");
  assert.ok(foam?.isInstancedMesh);
  assert.equal(foam.count, 12);
  const entry = scene.userData.ambient.find((e) => e.type === "foam");
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  tickAmbient(scene, 0, 1 / 60);
  foam.getMatrixAt(0, m);
  const z0 = pos.setFromMatrixPosition(m).z;
  tickAmbient(scene, 2, 1 / 60);
  foam.getMatrixAt(0, m);
  const z1 = pos.setFromMatrixPosition(m).z;
  assert.ok(z1 > z0, "moves shoreward (+z)");
  assert.ok(z1 <= entry.zEnd && z0 >= entry.zStart && entry.zEnd <= play.bounds.minz);
  const gull = scene.userData.lifeObjs.find((o) => o.userData.life?.type === "bird");
  assert.equal(gull.userData.life.glide, true);
  assert.equal(world("yard").scene.userData.lifeObjs.find((o) => o.userData.life?.type === "bird").userData.life.glide, false);
});

test("forest: leaves keep falling around the pilot and the instanced grass gets a sway shader", () => {
  const { scene } = world("forest");
  const leaves = scene.getObjectByName("falling-leaves");
  assert.ok(leaves?.isPoints);
  const entry = scene.userData.ambient.find((e) => e.type === "leaves");
  assert.equal(entry.n, 60);
  const flyer = { x: 40, y: 6, z: -90 };
  for (let i = 0; i < 60 * 30; i++) tickAmbient(scene, i / 60, 1 / 60, flyer);
  const p = entry.pos;
  for (let i = 0; i < entry.n; i++) {
    assert.ok(Math.abs(p[i * 3] - flyer.x) <= 22.01 && Math.abs(p[i * 3 + 2] - flyer.z) <= 22.01, "leaf stays near the pilot");
    assert.ok(p[i * 3 + 1] >= 0.1, "leaf never sinks below ground");
  }
  const grass = scene.getObjectByName("ground-vegetation");
  assert.equal(typeof grass.material.onBeforeCompile, "function");
  const shader = { uniforms: {}, vertexShader: "#include <begin_vertex>" };
  grass.material.onBeforeCompile(shader);
  assert.ok(shader.vertexShader.includes("uSway") && shader.vertexShader.includes("instanceMatrix"));
  assert.ok(shader.uniforms.uSway);
  tickAmbient(scene, 7.5, 1 / 60, flyer);
  assert.equal(shader.uniforms.uSway.value, 7.5);
  assert.equal(world("forest", { lite: true }).scene.userData.ambient.find((e) => e.type === "leaves").n, 24);
});

test("set dressing never touches the scene transform and stays out of colliders", () => {
  for (const map of MAPS) {
    const { scene, play } = world(map.id);
    assert.deepEqual([scene.rotation.x, scene.rotation.y, scene.rotation.z], [0, 0, 0], `${map.id}: scene rotation`);
    assert.deepEqual([scene.position.x, scene.position.y, scene.position.z], [0, 0, 0], `${map.id}: scene position`);
    const inside = (x, y, z) => play.boxes.some((b) => x > b.minx && x < b.maxx && y > b.miny && y < b.maxy && z > b.minz && z < b.maxz);
    scene.traverse((o) => {
      if (o.name === "papi" || o.name === "windsock" || o.name === "chimney-smoke") {
        assert.equal(inside(o.position.x, o.position.y + 0.1, o.position.z), false, `${map.id}: ${o.name} inside a collider`);
      }
    });
    clearWorld(scene);
  }
});

test("city roller doors sit flush on a building face, traffic stays on the ground plane", () => {
  const { scene, play } = world("city");
  const faces = [];
  scene.traverse((o) => {
    const big = o.geometry?.type === "BoxGeometry" && o.geometry.parameters.width >= 8 && o.geometry.parameters.height >= 5;
    if (big || o.name === "cut-building") {
      o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      faces.push(o.position.x + bb.min.x, o.position.x + bb.max.x);
    }
  });
  const doors = [];
  scene.traverse((o) => o.name === "roller-door" && doors.push(o));
  assert.equal(doors.length, 2);
  for (const d of doors) {
    const gap = Math.min(...faces.map((f) => Math.abs(f - d.position.x)));
    assert.ok(gap < 0.1, `door at x=${d.position.x} is ${gap.toFixed(2)} m off the nearest facade`);
  }
  const groundHalfX = (play.bounds.maxx - play.bounds.minx) / 2 + 14;
  const groundZ = [(play.bounds.minz + play.bounds.maxz) / 2 - ((play.bounds.maxz - play.bounds.minz) / 2 + 14), (play.bounds.minz + play.bounds.maxz) / 2 + ((play.bounds.maxz - play.bounds.minz) / 2 + 14)];
  const road = scene.getObjectByName("ring-road");
  const halfW = road.geometry.parameters.width / 2;
  const halfL = road.geometry.parameters.height / 2;
  assert.ok(Math.abs(road.position.x) + halfW <= groundHalfX, "road within ground x");
  assert.ok(road.position.z - halfL >= groundZ[0] && road.position.z + halfL <= groundZ[1], "road within ground z");
});

test("coast foam has real matrices before the first tick (hangar billboard never ticks)", () => {
  const { scene } = world("coast");
  const foam = scene.getObjectByName("shore-foam");
  const m = new THREE.Matrix4();
  const identity = new THREE.Matrix4();
  for (let i = 0; i < foam.count; i++) {
    foam.getMatrixAt(i, m);
    assert.ok(!m.equals(identity), `instance ${i} still identity`);
  }
});

test("city loading bays: the wall is cut, the door panel blocks only while closed", async () => {
  const { applyWorld } = await import("../src/collide.js");
  const { scene, play } = world("city");
  const spec = { size: 0.2 };
  const doors = scene.userData.ambient.filter((e) => e.type === "door");
  assert.equal(doors.length, 2);
  const cut = [];
  scene.traverse((o) => o.name === "cut-building" && cut.push(o));
  assert.equal(cut.length, 2, "both walls replaced by cut meshes");
  for (const d of doors) {
    const bayX = d.x - d.facing * 1.5; // 1.5 m inside the doorway
    const outsideX = d.x + d.facing * 0.3; // just outside the panel
    const into = -d.facing * 3; // velocity heading through the door
    tickAmbient(scene, 2 - d.offset, 1 / 60); // closed
    let s = { x: bayX, y: 1.5, z: d.z, vx: 0, vy: 0, vz: 0, armed: true, crashed: false };
    applyWorld(s, spec, play);
    assert.equal(s.crashed, false);
    assert.ok(Math.abs(s.x - bayX) < 0.01 && Math.abs(s.z - d.z) < 0.01, "bay itself is hollow");
    s = { x: d.x + d.facing * 0.2, y: 1.5, z: d.z, vx: into, vy: 0, vz: 0, armed: true, crashed: false };
    applyWorld(s, spec, play);
    assert.ok(Math.sign(s.x - d.x) === Math.sign(d.facing) && Math.abs(s.x - d.x) >= 0.2 && Math.abs(s.vx) < Math.abs(into), `closed door pushes back (x=${s.x} face=${d.x} vx=${s.vx})`);
    tickAmbient(scene, 15 - d.offset, 1 / 60); // open
    assert.ok(d.aabb.miny > 3, `open door collider lifted to ${d.aabb.miny}`);
    s = { x: outsideX, y: 1.5, z: d.z, vx: into, vy: 0, vz: 0, armed: true, crashed: false };
    applyWorld(s, spec, play);
    assert.ok(Math.abs(s.x - outsideX) < 1e-6 && s.vx === into, "open door lets the craft through at 1.5 m");
    s = { x: bayX, y: 6, z: d.z, vx: 0, vy: 0, vz: 0, armed: true, crashed: false };
    applyWorld(s, spec, play);
    assert.ok(Math.abs(s.y - 6) > 0.01 || Math.abs(s.x - bayX) > 0.01, "wall above the bay is still solid");
    s = { x: bayX, y: 1.5, z: d.z + 3.5, vx: 0, vy: 0, vz: 0, armed: true, crashed: false };
    applyWorld(s, spec, play);
    assert.ok(Math.abs(s.z - (d.z + 3.5)) > 0.01 || Math.abs(s.x - bayX) > 0.01, "wall beside the bay is still solid");
  }
  const bays = [];
  scene.traverse((o) => o.name === "loading-bay" && bays.push(o));
  assert.ok(bays.length >= 14, "bay interior geometry present");
});

test("hangar background ticks its world (billboard)", async () => {
  const src = await import("node:fs").then((fs) => fs.readFileSync(new URL("../src/billboard.js", import.meta.url), "utf8"));
  assert.match(src, /tickWorld\(scene, t0, dt, null\)/);
});

test("a closed roller door blocks the whole carved opening, frame included", async () => {
  const { applyWorld } = await import("../src/collide.js");
  const { scene, play } = world("city");
  const spec = { size: 0.2 };
  for (const d of scene.userData.ambient.filter((e) => e.type === "door")) {
    tickAmbient(scene, 2 - d.offset, 1 / 60); // closed
    const into = -d.facing * 3;
    for (const [dy, dz] of [[1.5, 2.25], [1.5, -2.25], [3.75, 0]]) {
      const s = { x: d.x + d.facing * 0.2, y: dy, z: d.z + dz, vx: into, vy: 0, vz: 0, armed: true, crashed: false };
      applyWorld(s, spec, play);
      assert.ok(Math.abs(s.vx) < Math.abs(into), `door edge at dz=${dz} dy=${dy} lets the craft through`);
    }
  }
});
