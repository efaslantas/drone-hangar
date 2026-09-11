import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { aabbFromBox } from "./collide.js";

// Living set dressing per map. Everything here is deliberately cheap: a
// handful of meshes driven from one tick loop, one InstancedMesh per particle
// layer, and GPU-side vertex sway for the instanced grass. `lite` (touch
// devices) trims particle counts; nothing here adds shadow casters or lights.

function reg(scene, entry) {
  (scene.userData.ambient ||= []).push(entry);
  return entry;
}

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function canvasTex(draw, w = 64, h = 64) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function m(geo, mat, x, y, z) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  return mesh;
}

// ---------------------------------------------------------------- windsock
export function windsock(scene, x, z) {
  const metal = new THREE.MeshStandardMaterial({ color: 0x8a8f92, metalness: 0.7, roughness: 0.4 });
  const pole = m(new THREE.CylinderGeometry(0.05, 0.075, 5.6, 8), metal, x, 2.8, z);
  pole.castShadow = true;
  scene.add(pole);
  const stripes = canvasTex((g, w, h) => {
    for (let i = 0; i < 5; i++) {
      g.fillStyle = i % 2 ? "#f2f0e6" : "#e8641c";
      g.fillRect(0, (h / 5) * i, w, h / 5 + 1);
    }
  }, 16, 80);
  stripes.wrapS = THREE.RepeatWrapping;
  const cloth = new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide, roughness: 0.85 });
  const pivot = new THREE.Group();
  pivot.position.set(x, 5.6, z);
  pivot.name = "windsock";
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 20), metal);
  ring.rotation.y = Math.PI / 2;
  pivot.add(ring);
  const bodyGeo = new THREE.CylinderGeometry(0.17, 0.4, 2.2, 12, 1, true);
  bodyGeo.translate(0, 1.1, 0);
  const body = new THREE.Mesh(bodyGeo, cloth);
  body.rotation.z = -Math.PI / 2;
  pivot.add(body);
  const tip = new THREE.Group();
  tip.position.x = 2.2;
  const tipGeo = new THREE.CylinderGeometry(0.1, 0.17, 1.0, 12, 1, true);
  tipGeo.translate(0, 0.5, 0);
  const tipMesh = new THREE.Mesh(tipGeo, cloth);
  tipMesh.rotation.z = -Math.PI / 2;
  tip.add(tipMesh);
  pivot.add(tip);
  scene.add(pivot);
  return reg(scene, { type: "windsock", pivot, tip, phase: x * 0.3 + z * 0.1, yaw: 0.4 });
}

function tickWindsock(e, t, dt, wind) {
  const mag = wind ? Math.hypot(wind.x || 0, wind.z || 0) : 0;
  let str;
  let yaw;
  if (mag > 0.01) {
    str = clamp(mag / 1.4, 0.15, 1);
    // pivot +X rotated by yaw about Y points to (cos yaw, 0, -sin yaw)
    yaw = Math.atan2(-wind.z, wind.x);
  } else {
    str = 0.22 + 0.12 * Math.sin(t * 0.37 + e.phase);
    yaw = 0.4 + Math.sin(t * 0.11 + e.phase) * 0.6;
  }
  str += Math.sin(t * 4.1 + e.phase) * 0.04 + Math.sin(t * 7.3) * 0.02;
  str = clamp(str, 0.05, 1);
  const k = 1 - Math.exp(-2.5 * dt);
  let d = yaw - e.yaw;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  e.yaw += d * k;
  e.pivot.rotation.y = e.yaw;
  e.pivot.rotation.z += (-(1 - str) * 1.25 - e.pivot.rotation.z) * k;
  e.tip.rotation.z = -(1 - str) * 0.5 + Math.sin(t * 5.2 + e.phase) * 0.12 * (0.3 + str);
  e.tip.rotation.y = Math.sin(t * 3.7 + e.phase) * 0.1 * str;
}

// ----------------------------------------------------------------- beacons
function beacon(scene, x, y, z, { colors = [0xffa020], rate = 1.6, size = 1 } = {}) {
  const base = m(new THREE.CylinderGeometry(0.16 * size, 0.19 * size, 0.12 * size, 10), new THREE.MeshStandardMaterial({ color: 0x24282a, roughness: 0.6, metalness: 0.5 }), x, y + 0.06 * size, z);
  const domeMat = new THREE.MeshStandardMaterial({ color: colors[0], emissive: colors[0], emissiveIntensity: 1.6, roughness: 0.3 });
  const dome = m(new THREE.SphereGeometry(0.14 * size, 12, 8), domeMat, x, y + 0.16 * size, z);
  const beamMat = new THREE.MeshBasicMaterial({
    color: colors[0], transparent: true, opacity: 0.16, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const beams = new THREE.Group();
  beams.position.set(x, y + 0.16 * size, z);
  for (const side of [0, Math.PI]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(3.4 * size, 0.34 * size), beamMat);
    b.position.x = 1.7 * size;
    const w = new THREE.Group();
    w.rotation.y = side;
    w.add(b);
    beams.add(w);
  }
  beams.name = "beacon";
  scene.add(base, dome, beams);
  return reg(scene, { type: "beacon", beams, domeMat, beamMat, colors, rate, phase: hash(x + z) * 6 });
}

function tickBeacon(e, t, dt) {
  e.beams.rotation.y += e.rate * dt;
  const a = e.beams.rotation.y + e.phase;
  e.domeMat.emissiveIntensity = 1.1 + Math.abs(Math.cos(a)) * 0.9;
  if (e.colors.length > 1) {
    const c = e.colors[Math.floor(a / Math.PI) % e.colors.length];
    if (e.beamMat.color.getHex() !== c) {
      e.beamMat.color.setHex(c);
      e.domeMat.color.setHex(c);
      e.domeMat.emissive.setHex(c);
    }
  }
}

// ------------------------------------------------------------- fluorescents
function fluorescents(scene) {
  const panels = [];
  scene.traverse((o) => {
    if (o.name === "hangar-panel") panels.push(o);
  });
  panels.forEach((p, i) => {
    if (i % 3 !== 1) return;
    p.material = p.material.clone();
    reg(scene, { type: "flicker", mat: p.material, seed: i * 7.3 });
  });
}

function tickFlicker(e, t) {
  const f = hash(Math.floor(t * 17) + e.seed);
  e.mat.emissiveIntensity = (f > 0.9 ? 0.3 : f > 0.84 ? 0.75 : 1.2) + Math.sin(t * 100) * 0.03;
}

function exitSign(scene, x, y, z) {
  const tex = canvasTex((g, w, h) => {
    g.fillStyle = "#0f6b2f";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#dfffe6";
    g.font = "bold 26px sans-serif";
    g.textAlign = "center";
    g.fillText("ÇIKIŞ", w / 2, h / 2 + 9);
  }, 128, 48);
  const sign = m(new THREE.BoxGeometry(1.1, 0.4, 0.06), new THREE.MeshStandardMaterial({ map: tex, emissive: 0x2cff77, emissiveMap: tex, emissiveIntensity: 0.9, roughness: 0.6 }), x, y, z);
  sign.rotation.y = Math.PI;
  sign.name = "exit-sign";
  scene.add(sign);
}

// -------------------------------------------------------------- roller door
const BAY_DEPTH = 3.2;

function findBuilding(scene, faceX, z, facing) {
  return scene.children.find((o) => {
    const p = o.geometry?.parameters;
    if (o.geometry?.type !== "BoxGeometry" || !p || p.width < 8 || p.height < 5 || p.depth < 5) return false;
    const face = o.position.x + facing * (p.width / 2);
    return Math.abs(face - faceX) < 0.01 && Math.abs(o.position.z - z) < p.depth / 2;
  });
}

function sameBox(a, b) {
  return ["minx", "maxx", "miny", "maxy", "minz", "maxz"].every((k) => Math.abs(a[k] - b[k]) < 1e-6);
}

// Planar UVs in building proportions, so the facade windows keep the same
// scale on every piece the wall is cut into.
function planarUv(geo, min, size) {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nrm.getX(i));
    const ny = Math.abs(nrm.getY(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const zz = pos.getZ(i);
    if (nx > 0.5) uv.setXY(i, (zz - min.z) / size.z, (y - min.y) / size.y);
    else if (ny > 0.5) uv.setXY(i, (x - min.x) / size.x, (zz - min.z) / size.z);
    else uv.setXY(i, (x - min.x) / size.x, (y - min.y) / size.y);
  }
  uv.needsUpdate = true;
}

/**
 * Cut a doorway into the building behind the door: the wall mesh and its
 * collider become four boxes around a bay, and the bay gets an interior.
 * Returns the bay's inner x extent so the door can sit on the face.
 */
function carveBay(scene, play, building, faceX, z, facing, w, h) {
  const p = building.geometry.parameters;
  const bx = building.position.x;
  const by = building.position.y;
  const bz = building.position.z;
  const min = { x: bx - p.width / 2, y: by - p.height / 2, z: bz - p.depth / 2 };
  const size = { x: p.width, y: p.height, z: p.depth };
  const innerX = faceX - facing * BAY_DEPTH; // back wall of the bay
  const bayMinX = Math.min(faceX, innerX);
  const bayMaxX = Math.max(faceX, innerX);
  const farMinX = facing < 0 ? bayMaxX : min.x;
  const farMaxX = facing < 0 ? min.x + size.x : bayMinX;
  const hw = w / 2 + 0.25;
  const parts = [
    // the bulk of the building behind the bay
    { x: (farMinX + farMaxX) / 2, y: by, z: bz, w: farMaxX - farMinX, h: size.y, d: size.z },
    // beside the bay, left and right
    { x: (bayMinX + bayMaxX) / 2, y: by, z: (min.z + (z - hw)) / 2, w: BAY_DEPTH, h: size.y, d: z - hw - min.z },
    { x: (bayMinX + bayMaxX) / 2, y: by, z: (z + hw + min.z + size.z) / 2, w: BAY_DEPTH, h: size.y, d: min.z + size.z - (z + hw) },
    // above the bay
    { x: (bayMinX + bayMaxX) / 2, y: (h + 0.3 + min.y + size.y) / 2, z, w: BAY_DEPTH, h: min.y + size.y - (h + 0.3), d: hw * 2 },
  ].filter((b) => b.w > 0.01 && b.h > 0.01 && b.d > 0.01);
  // collider: swap the building's single box for the four pieces
  const old = aabbFromBox(bx, by, bz, p.width, p.height, p.depth);
  const idx = play.boxes.findIndex((b) => sameBox(b, old));
  if (idx >= 0) play.boxes.splice(idx, 1);
  for (const b of parts) play.boxes.push(aabbFromBox(b.x, b.y, b.z, b.w, b.h, b.d));
  // mesh: same material, wall cut open, facade UVs kept in building proportions
  const geos = parts.map((b) => {
    const gm = new THREE.BoxGeometry(b.w, b.h, b.d);
    gm.translate(b.x - bx, b.y - by, b.z - bz);
    return gm;
  });
  const merged = mergeGeometries(geos);
  geos.forEach((gm) => gm.dispose());
  planarUv(merged, { x: -size.x / 2, y: -size.y / 2, z: -size.z / 2 }, size);
  const wall = new THREE.Mesh(merged, building.material);
  wall.position.copy(building.position);
  wall.castShadow = building.castShadow;
  wall.receiveShadow = building.receiveShadow;
  wall.userData = { ...building.userData };
  wall.name = "cut-building";
  scene.remove(building);
  building.geometry.dispose();
  scene.add(wall);
  // interior: dark concrete bay with a light strip and a pallet at the back
  const inner = new THREE.MeshStandardMaterial({ color: 0x4a4d4c, roughness: 0.95, side: THREE.DoubleSide });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a3d3c, roughness: 0.9, side: THREE.DoubleSide });
  const cx = (bayMinX + bayMaxX) / 2;
  const floor = m(new THREE.PlaneGeometry(BAY_DEPTH - 0.02, w), floorMat, cx, 0.02, z);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  const back = m(new THREE.PlaneGeometry(w, h), inner, innerX + facing * 0.02, h / 2, z);
  back.rotation.y = facing < 0 ? -Math.PI / 2 : Math.PI / 2; // faces the doorway
  const ceil = m(new THREE.PlaneGeometry(BAY_DEPTH, w), inner, cx, h - 0.02, z);
  ceil.rotation.x = Math.PI / 2;
  const sideL = m(new THREE.PlaneGeometry(BAY_DEPTH, h), inner, cx, h / 2, z - w / 2 + 0.02);
  const sideR = m(new THREE.PlaneGeometry(BAY_DEPTH, h), inner, cx, h / 2, z + w / 2 - 0.02);
  sideR.rotation.y = Math.PI;
  const strip = m(new THREE.BoxGeometry(BAY_DEPTH * 0.7, 0.06, 0.18), new THREE.MeshStandardMaterial({ color: 0xf2efe4, emissive: 0xfff1cc, emissiveIntensity: 1.3 }), cx, h - 0.08, z);
  // Bands run along the plane's long (v) axis, i.e. along the threshold.
  const hazard = canvasTex((g, cw, ch) => {
    for (let i = -1; i < 12; i++) {
      g.fillStyle = i % 2 ? "#1a1a1a" : "#e0b21a";
      g.beginPath();
      g.moveTo(0, i * 24);
      g.lineTo(0, i * 24 + 24);
      g.lineTo(cw, i * 24 + 24 - cw);
      g.lineTo(cw, i * 24 - cw);
      g.closePath();
      g.fill();
    }
  }, 32, 256);
  hazard.wrapT = THREE.RepeatWrapping;
  hazard.repeat.set(1, Math.max(1, Math.round(w / 0.6)));
  const line = m(new THREE.PlaneGeometry(0.3, w), new THREE.MeshStandardMaterial({ map: hazard, roughness: 0.8 }), faceX - facing * 0.25, 0.035, z);
  line.rotation.x = -Math.PI / 2;
  const palletMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.85 });
  const pallet = m(new THREE.BoxGeometry(1.1, 0.9, 1.2), palletMat, innerX + facing * 0.7, 0.45, z + w / 2 - 0.9);
  pallet.castShadow = true;
  play.boxes.push(aabbFromBox(pallet.position.x, 0.45, pallet.position.z, 1.1, 0.9, 1.2));
  for (const o of [floor, back, ceil, sideL, sideR, strip, line, pallet]) {
    o.name = "loading-bay";
    scene.add(o);
  }
  return { innerX };
}

function rollerDoor(scene, play, x, z, { w = 4.2, h = 3.6, facing = -1, period = 22, offset = 0 } = {}) {
  const building = play ? findBuilding(scene, x, z, facing) : null;
  if (building) carveBay(scene, play, building, x, z, facing, w, h);
  const frame = new THREE.MeshStandardMaterial({ color: 0x3a4044, roughness: 0.6, metalness: 0.5 });
  const slatTex = canvasTex((g, cw, ch) => {
    g.fillStyle = "#6e7478";
    g.fillRect(0, 0, cw, ch);
    for (let y = 0; y < ch; y += 8) {
      g.fillStyle = "#5a6064";
      g.fillRect(0, y, cw, 2);
      g.fillStyle = "#858b8f";
      g.fillRect(0, y + 2, cw, 1);
    }
  }, 32, 64);
  slatTex.wrapS = slatTex.wrapT = THREE.RepeatWrapping;
  slatTex.repeat.set(1, 6);
  const slatMat = new THREE.MeshStandardMaterial({ map: slatTex, roughness: 0.55, metalness: 0.4 });
  const xf = x + facing * 0.05;
  for (const side of [-1, 1]) scene.add(m(new THREE.BoxGeometry(0.1, h + 0.3, 0.16), frame, x + facing * 0.06, (h + 0.3) / 2, z + side * (w / 2 + 0.08)));
  scene.add(m(new THREE.BoxGeometry(0.2, 0.3, w + 0.5), frame, x + facing * 0.1, h + 0.25, z));
  const panel = m(new THREE.BoxGeometry(0.08, h, w), slatMat, xf, h / 2, z);
  panel.name = "roller-door";
  scene.add(panel);
  const strobeMat = new THREE.MeshStandardMaterial({ color: 0x3a2000, emissive: 0xffa020, emissiveIntensity: 0 });
  const strobe = m(new THREE.BoxGeometry(0.12, 0.14, 0.3), strobeMat, x + facing * 0.12, h + 0.55, z - w / 2 - 0.1);
  scene.add(strobe);
  // The panel's own collider follows it up: closed it is a wall, open only the
  // rolled-up top strip remains.
  // Covers the carved hole (w + 0.5 wide, h + 0.3 high), not just the panel,
  // so nothing slips past a closed door along the frame.
  const aabb = { minx: xf - 0.08, maxx: xf + 0.08, miny: 0, maxy: h + 0.3, minz: z - w / 2 - 0.25, maxz: z + w / 2 + 0.25 };
  if (play) play.boxes.push(aabb);
  return reg(scene, { type: "door", panel, strobeMat, h, period, offset, aabb, x, z, facing, moving: false, open: 0 });
}

function tickDoor(e, t) {
  const u = (t + e.offset) % e.period;
  // closed 7s → opening 3s → open 9s → closing 3s
  let open;
  let moving = false;
  if (u < 7) open = 0;
  else if (u < 10) {
    open = (u - 7) / 3;
    moving = true;
  } else if (u < 19) open = 1;
  else {
    open = 1 - (u - 19) / 3;
    moving = true;
  }
  const s = 1 - open * 0.94;
  e.panel.scale.y = s;
  e.panel.position.y = e.h - (e.h * s) / 2;
  e.strobeMat.emissiveIntensity = moving ? (Math.sin(t * 14) > 0 ? 2.2 : 0) : 0;
  e.moving = moving;
  e.open = open;
  if (e.aabb) e.aabb.miny = e.h - e.h * s;
}

// -------------------------------------------------------------------- smoke
let puffTex = null;
function smoke(scene, x, y, z, n) {
  const dark = new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 0.85, metalness: 0.25 });
  const stack = m(new THREE.CylinderGeometry(0.34, 0.42, 2.2, 10), dark, x, y + 1.1, z);
  const collar = m(new THREE.TorusGeometry(0.38, 0.05, 6, 12), dark, x, y + 2.05, z);
  collar.rotation.x = Math.PI / 2;
  scene.add(stack, collar);
  if (!puffTex) {
    puffTex = canvasTex((g, w, h) => {
      const grad = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      grad.addColorStop(0, "rgba(200,200,196,0.55)");
      grad.addColorStop(0.55, "rgba(180,180,176,0.22)");
      grad.addColorStop(1, "rgba(160,160,156,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }, 64, 64);
  }
  const puffs = [];
  for (let i = 0; i < n; i++) {
    const mat = new THREE.SpriteMaterial({ map: puffTex, transparent: true, opacity: 0, depthWrite: false, color: 0xa9a8a4 });
    const sp = new THREE.Sprite(mat);
    if (!sp.geometry.getAttribute("normal")) {
      const nrm = new Float32Array(sp.geometry.getAttribute("position").count * 3);
      for (let j = 2; j < nrm.length; j += 3) nrm[j] = 1;
      sp.geometry.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
    }
    sp.position.set(x, y + 2.2, z);
    sp.name = "chimney-smoke";
    scene.add(sp);
    puffs.push({ sp, age: i / n, seed: hash(i + x) });
  }
  return reg(scene, { type: "smoke", puffs, ox: x, oy: y + 2.2, oz: z });
}

function tickSmoke(e, t, dt, wind) {
  const dx = wind ? wind.x * 2.2 : 0.35;
  const dz = wind ? wind.z * 2.2 : 0.12;
  for (const p of e.puffs) {
    p.age += dt * 0.17 * (0.85 + p.seed * 0.3);
    if (p.age > 1) {
      p.age -= 1;
      p.seed = hash(t * 7 + p.seed);
    }
    const a = p.age;
    p.sp.position.set(
      e.ox + dx * a * 6 + Math.sin(a * 6 + p.seed * 9) * 0.5,
      e.oy + a * 7.5,
      e.oz + dz * a * 6 + Math.cos(a * 5 + p.seed * 7) * 0.4,
    );
    const s = 0.9 + a * 4.2;
    p.sp.scale.set(s, s, 1);
    p.sp.material.opacity = 0.5 * (1 - a) * Math.min(1, a * 6);
  }
}

// ------------------------------------------------------------------ traffic
function traffic(scene, play, makeVan, n = 2) {
  if (typeof makeVan !== "function") return null;
  const { minx, maxx, minz, maxz } = play.bounds;
  const x = maxx + 10;
  const z0 = minz - 12;
  const z1 = maxz + 12;
  const road = m(new THREE.PlaneGeometry(6.5, z1 - z0), new THREE.MeshStandardMaterial({ color: 0x3b3d3c, roughness: 0.92 }), x, 0.012, (z0 + z1) / 2);
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  road.name = "ring-road";
  scene.add(road);
  const lamp = new THREE.MeshStandardMaterial({ color: 0xfff3c8, emissive: 0xfff0b0, emissiveIntensity: scene.userData.night ? 2.6 : 0.8 });
  const cars = [];
  const colors = [0xcfc8b8, 0x2f3a44, 0x8a1f1f];
  for (let i = 0; i < n; i++) {
    const dir = i % 2 ? -1 : 1;
    const g = makeVan(x + dir * 1.7, z0 + ((z1 - z0) * (i + 0.5)) / n, dir > 0 ? 0 : Math.PI, colors[i % colors.length]);
    delete g.userData.groundFootprint;
    for (const side of [-0.62, 0.62]) g.add(m(new THREE.BoxGeometry(0.28, 0.14, 0.06), lamp, side, 0.85, 2.31));
    g.name = "traffic-van";
    scene.add(g);
    cars.push({ g, dir, speed: 7 + i * 1.8 });
  }
  void minx;
  return reg(scene, { type: "traffic", cars, z0, z1 });
}

function tickTraffic(e, t, dt) {
  for (const c of e.cars) {
    c.g.position.z += c.dir * c.speed * dt;
    if (c.g.position.z > e.z1) c.g.position.z = e.z0;
    if (c.g.position.z < e.z0) c.g.position.z = e.z1;
    c.g.rotation.y = c.dir > 0 ? 0 : Math.PI;
  }
}

// --------------------------------------------------------------------- foam
function foam(scene, play, n) {
  const shore = play.bounds.minz;
  const mat = new THREE.MeshBasicMaterial({ color: 0xf2f8f8, transparent: true, opacity: 0.42, depthWrite: false });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, n);
  mesh.name = "shore-foam";
  mesh.frustumCulled = false;
  scene.add(mesh);
  const lines = [];
  for (let i = 0; i < n; i++) {
    lines.push({ x: play.bounds.minx + 4 + hash(i * 3.1) * (play.bounds.maxx - play.bounds.minx - 8), w: 9 + hash(i * 5.7) * 9, phase: i / n });
  }
  const entry = reg(scene, { type: "foam", mesh, lines, zStart: shore - 26, zEnd: shore - 1, tr: new THREE.Object3D() });
  tickFoam(entry, 0);
  return entry;
}

function tickFoam(e, t) {
  const tr = e.tr;
  e.lines.forEach((l, i) => {
    const u = (t * 0.14 + l.phase) % 1;
    const fade = u > 0.85 ? 1 - (u - 0.85) / 0.15 : 1;
    tr.position.set(l.x + Math.sin(t * 0.5 + i) * 0.6, 0.06, e.zStart + (e.zEnd - e.zStart) * u);
    tr.rotation.set(-Math.PI / 2, 0, Math.sin(i) * 0.05);
    tr.scale.set(l.w * (1 - u * 0.4) * fade, (0.22 + u * 0.5) * fade, 1);
    tr.updateMatrix();
    e.mesh.setMatrixAt(i, tr.matrix);
  });
  e.mesh.instanceMatrix.needsUpdate = true;
}

// ------------------------------------------------------------------- leaves
function leaves(scene, n) {
  const tex = canvasTex((g, w, h) => {
    g.fillStyle = "#c79a3c";
    g.beginPath();
    g.ellipse(w / 2, h / 2, w * 0.42, h * 0.22, 0.6, 0, Math.PI * 2);
    g.fill();
  }, 32, 32);
  const pos = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const normals = new Float32Array(pos.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  const mat = new THREE.PointsMaterial({ map: tex, size: 0.24, transparent: true, alphaTest: 0.3, color: 0xd6a84a, depthWrite: false, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.name = "falling-leaves";
  scene.add(pts);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (hash(i) - 0.5) * 36;
    pos[i * 3 + 1] = 2 + hash(i * 2.3) * 14;
    pos[i * 3 + 2] = (hash(i * 4.1) - 0.5) * 36 - 20;
  }
  return reg(scene, { type: "leaves", pos, geo, n });
}

function tickLeaves(e, t, dt, flyer) {
  const cx = flyer?.x ?? 0;
  const cz = flyer?.z ?? -20;
  const p = e.pos;
  for (let i = 0; i < e.n; i++) {
    const j = i * 3;
    p[j] += Math.sin(t * 1.3 + i) * dt * 0.8;
    p[j + 1] -= dt * (0.55 + hash(i) * 0.5);
    p[j + 2] += Math.cos(t * 0.9 + i * 0.7) * dt * 0.5;
    if (p[j + 1] < 0.1 || Math.abs(p[j] - cx) > 22 || Math.abs(p[j + 2] - cz) > 22) {
      p[j] = cx + (hash(i + t) - 0.5) * 36;
      p[j + 1] = 12 + hash(i * 1.7 + t) * 6;
      p[j + 2] = cz + (hash(i * 3.3 + t) - 0.5) * 36;
    }
  }
  e.geo.attributes.position.needsUpdate = true;
}

// --------------------------------------------------------------- grass sway
function grassSway(scene) {
  const grass = scene.getObjectByName("ground-vegetation");
  if (!grass?.material) return null;
  const u = { value: 0 };
  const mat = grass.material;
  if (scene.userData.gpu) {
    return reg(scene, { type: "grass-cpu", geo: grass.geometry, base: Float32Array.from(grass.geometry.attributes.position.array) });
  }
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSway = u;
    shader.vertexShader = "uniform float uSway;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
      {
        vec2 ip = instanceMatrix[3].xz;
        float w = sin(uSway * 1.7 + ip.x * 0.35 + ip.y * 0.21) * 0.5 + sin(uSway * 2.9 + ip.x * 0.9) * 0.25;
        transformed.x += w * position.y * 0.09;
        transformed.z += cos(uSway * 1.3 + ip.y * 0.4) * position.y * 0.05;
      }
      #endif
    `);
  };
  mat.customProgramCacheKey = () => "hangar-grass-sway-v1";
  mat.needsUpdate = true;
  return reg(scene, { type: "uniform", u });
}

// ---------------------------------------------------------------- per map
export function addAmbient(scene, play, id, helpers = {}) {
  const lite = !!scene.userData.lite;
  scene.userData.ambient = [];
  if (id === "airfield") {
    windsock(scene, 8, -12);
    beacon(scene, 28, 10.1, 8, { colors: [0xffffff, 0x2bd36b], rate: 1.1, size: 1.6 });
    const papi = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: 0xff2a2a, emissiveIntensity: 1.4 });
    const papiW = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: 0xffffff, emissiveIntensity: 1.2 });
    for (let i = 0; i < 4; i++) {
      const light = m(new THREE.BoxGeometry(0.5, 0.3, 0.3), i < 2 ? papiW : papi, 10.6 + i * 1.4, 0.2, -60);
      light.name = "papi";
      scene.add(light);
    }
  }
  if (id === "indoor") {
    fluorescents(scene);
    beacon(scene, -36, 1.36, -12, { colors: [0xffa020], rate: 2.2 });
    beacon(scene, 36, 1.36, -42, { colors: [0xffa020], rate: 1.9 });
    exitSign(scene, 0, 4.4, 39.3);
  }
  if (id === "city") {
    rollerDoor(scene, play, 13, -52, { facing: -1, offset: 3 });
    rollerDoor(scene, play, -14, -20, { facing: 1, offset: 12 });
    smoke(scene, -20, 24, -20, lite ? 5 : 10);
    traffic(scene, play, helpers.van, lite ? 2 : 3);
  }
  if (id === "yard") {
    smoke(scene, 36, 12, -36, lite ? 4 : 8);
    beacon(scene, 22, 9.5, -8, { colors: [0xffa020], rate: 1.7, size: 1.2 });
  }
  if (id === "coast") foam(scene, play, lite ? 7 : 12);
  if (id === "forest") leaves(scene, lite ? 24 : 60);
  if (["forest", "coast", "yard"].includes(id)) grassSway(scene);
  return scene.userData.ambient;
}

export function tickAmbient(scene, t, dt, flyer) {
  const list = scene.userData.ambient;
  if (!list?.length) return;
  const wind = scene.userData.play?.wind || null;
  for (const e of list) {
    switch (e.type) {
      case "windsock": tickWindsock(e, t, dt, wind); break;
      case "grass-cpu": {
        const attr = e.geo.attributes.position;
        const p = attr.array;
        for (let i = 0; i < attr.count; i++) {
          const j = i * 3;
          const y = e.base[j + 1];
          p[j] = e.base[j] + Math.sin(t * 1.7 + y * 1.9) * y * .09;
          p[j + 2] = e.base[j + 2] + Math.cos(t * 1.3 + y * 1.4) * y * .05;
        }
        attr.needsUpdate = true;
        e.geo.computeVertexNormals();
        break;
      }
      case "beacon": tickBeacon(e, t, dt); break;
      case "flicker": tickFlicker(e, t); break;
      case "door": tickDoor(e, t); break;
      case "smoke": tickSmoke(e, t, dt, wind); break;
      case "traffic": tickTraffic(e, t, dt); break;
      case "foam": tickFoam(e, t); break;
      case "leaves": tickLeaves(e, t, dt, flyer); break;
      case "uniform": e.u.value = t; break;
      default: break;
    }
  }
}
