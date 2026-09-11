import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Sky } from "three/addons/objects/Sky.js";
import { aabbFromBox } from "./collide.js";

import { applyScannedMaterials } from "./scanned-materials.js";
import { enrichMap } from "./map-character.js";
import { addEnvironmentDetails } from "./environment-details.js";
import { surfaceTexture, finishSurfaces } from "./surfaces.js";
import { addStructuralDetail } from "./structural-detail.js";
import { grassBladeGeometry } from "./natural-shapes.js";
import { addAmbient, tickAmbient } from "./ambient.js";

let _pmrem = null;
let _envRT = null;
let foliageMap = null;

function tex(draw, size = 256, repeat = 40) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function groundTex() { return surfaceTexture("earth", 48); }

function asphaltTex() { return surfaceTexture("asphalt", 14); }

function concreteTex() { return surfaceTexture("concrete", 10); }

function facadeTex(base, litChance) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let y = 16; y < 240; y += 64) {
    for (let x = 16; x < 246; x += 56) {
      const lit = Math.random() < litChance;
      g.fillStyle = "#454c4b";
      g.fillRect(x-2,y-2,36,40);
      g.fillStyle = lit ? "#9e987d" : "#354b54";
      g.fillRect(x,y,32,34);
      g.fillStyle = "rgba(198,211,211,.16)";g.fillRect(x,y,32,10);
      g.fillStyle = "#68706c";g.fillRect(x+15,y,2,34);
      g.fillStyle = "#a5a59b";g.fillRect(x-3,y+35,38,3);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function mesh(geo, mat, x, y, z, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

function makePlay(minx, maxx, minz, maxz, ceil) {
  return { bounds: { minx, maxx, minz, maxz }, ceil, boxes: [] };
}

function solid(scene, play, w, h, d, x, y, z, mat, yaw = 0, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = yaw;
  m.castShadow = cast;
  m.receiveShadow = true;
  scene.add(m);
  play.boxes.push(aabbFromBox(x, y, z, w, h, d, yaw));
  if (y-h/2 < .05 && w > 1 && d > 1) m.userData.groundFootprint = {w,d,yaw};
  return m;
}

function addContainer(scene, play, x, y, z, yaw, color) {
  scene.add(container(x, y, z, yaw, color));
  play.boxes.push(aabbFromBox(x, y + 1.25, z, 6.0, 2.5, 2.4, yaw));
}

function addVan(scene, play, x, z, yaw, color) {
  scene.add(van(x, z, yaw, color));
  play.boxes.push(aabbFromBox(x, 1.05, z, 1.9, 2.1, 4.6, yaw));
}

function groundFit(scene, play, mat) {
  const { minx, maxx, minz, maxz } = play.bounds;
  const w=maxx-minx+28, d=maxz-minz+(scene.userData.mapId === "coast" ? 14 : 28);
  let geometry;
  if (scene.userData.mapId === "forest") {
    const shape=new THREE.Shape();
    shape.moveTo(-w/2,-d/2);shape.lineTo(w/2,-d/2);shape.lineTo(w/2,d/2);shape.lineTo(-w/2,d/2);shape.closePath();
    const hole=new THREE.Path();hole.absarc(minx*.35-(minx+maxx)/2,10,12.8,0,Math.PI*2,true);
    shape.holes.push(hole);geometry=new THREE.ShapeGeometry(shape,48);
    // ShapeGeometry UVs use world units; match the other ground planes.
    const uv=geometry.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/w+.5,uv.getY(i)/d+.5);
  } else geometry=new THREE.PlaneGeometry(w,d);
  const g = new THREE.Mesh(geometry, mat);
  g.rotation.x = -Math.PI / 2;
  g.position.set((minx + maxx) / 2, 0, (minz + maxz) / 2 + (scene.userData.mapId === "coast" ? 7 : 0));
  g.receiveShadow = true;
  scene.add(g);
}

function fence(scene, play, h = 3.6) {
  const first=scene.children.length;
  scene.userData.perimeterHeight=h;
  const { minx, maxx, minz, maxz } = play.bounds;
  const t = 0.22;
  const y = h / 2;
  const conc = new THREE.MeshStandardMaterial({ color: 0x6a6860, roughness: 0.88, metalness: 0.08 });
  const rail = new THREE.MeshStandardMaterial({ color: 0x2c3034, roughness: 0.55, metalness: 0.45 });
  const cx = (minx + maxx) / 2;
  const cz = (minz + maxz) / 2;
  const wx = maxx - minx;
  const wz = maxz - minz;
  scene.add(mesh(new THREE.BoxGeometry(wx + t, h, t), conc, cx, y, maxz, false));
  scene.add(mesh(new THREE.BoxGeometry(wx + t, h, t), conc, cx, y, minz, false));
  scene.add(mesh(new THREE.BoxGeometry(t, h, wz + t), conc, minx, y, cz, false));
  scene.add(mesh(new THREE.BoxGeometry(t, h, wz + t), conc, maxx, y, cz, false));
  scene.add(mesh(new THREE.BoxGeometry(wx + t, 0.14, t * 1.5), rail, cx, h, maxz, false));
  scene.add(mesh(new THREE.BoxGeometry(wx + t, 0.14, t * 1.5), rail, cx, h, minz, false));
  scene.add(mesh(new THREE.BoxGeometry(t * 1.5, 0.14, wz + t), rail, minx, h, cz, false));
  scene.add(mesh(new THREE.BoxGeometry(t * 1.5, 0.14, wz + t), rail, maxx, h, cz, false));
  for(const part of scene.children.slice(first))part.userData.perimeterFallback=true;
}

function lamp(scene, x, z) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.45, metalness: 0.6 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 7.2, 8), metal);
  pole.position.y = 3.6;
  pole.castShadow = true;
  const headMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, emissive: 0xffe6b0, emissiveIntensity: 0.35 });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.35), headMat);
  head.position.set(0.35, 7.15, 0);
  g.add(pole, head);
  g.position.set(x, 0, z);
  scene.add(g);
  if (scene.userData.night && !scene.userData.lite && (scene.userData.lampCount || 0) < 3) {
    const light = new THREE.PointLight(0xffd49b, 55, 22, 2);
    light.position.set(x+.35,6.9,z);scene.add(light);
    scene.userData.lampCount = (scene.userData.lampCount || 0)+1;
  }
  live(scene, head, { type: "lamp", phase: x * 0.2 + z * 0.05 });
  return g;
}

function van(x, z, yaw, color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 1.7, 4.6),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15 }),
  );
  body.position.y = 1.05;
  body.castShadow = true;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 1.05, 1.3),
    new THREE.MeshStandardMaterial({ color: 0x1c2428, roughness: 0.3, metalness: 0.2 }),
  );
  cabin.position.set(0, 1.55, 1.7);
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.12, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x3a0808, emissive: 0xff2a1a, emissiveIntensity: 0.55 }),
  );
  tail.position.set(0, 0.95, -2.25);
  g.add(body, cabin, tail);
  const rubber = new THREE.MeshStandardMaterial({ color: 0x20221f, roughness: .94 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x858982, roughness: .48, metalness: .72 });
  for (const side of [-1,1]) for (const axle of [-1.42,1.42]) {
    const wheel = mesh(new THREE.CylinderGeometry(.34,.34,.16,12), rubber, side*.86,.36,axle);
    wheel.rotation.z = Math.PI/2; g.add(wheel);
    const hub = mesh(new THREE.CylinderGeometry(.16,.16,.17,10),trim,side*.86,.36,axle,false);
    hub.rotation.z = Math.PI/2;g.add(hub);
  }
  for (const side of [-1,1]) {
    g.add(mesh(new THREE.BoxGeometry(.35,.16,.04),trim,side*.58,.85,2.29,false));
    g.add(mesh(new THREE.BoxGeometry(.03,.045,.25),trim,side*.94,1.3,.7,false));
  }
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  g.userData.groundFootprint = {w:1.9,d:4.6,yaw};
  return g;
}

function container(x, y, z, yaw, color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, map: surfaceTexture("metal", 2), roughness: .78, metalness: .35 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x686b65, roughness: .65, metalness: .65 });
  g.add(mesh(new THREE.BoxGeometry(6, 2.5, 2.4), mat, 0, 1.25, 0));
  // All relief stays within the existing collision envelope.
  for (const side of [-1, 1]) {
    for (let i=0;i<20;i++) g.add(mesh(new THREE.BoxGeometry(.065,2.23,.035),mat,-2.85+i*.3,1.25,side*1.19,false));
    for (const h of [.12,2.38]) g.add(mesh(new THREE.BoxGeometry(6,.09,.06),steel,0,h,side*1.17,false));
    for (const dz of [-.57,.57]) g.add(mesh(new THREE.BoxGeometry(.035,2.1,.045),steel,side*2.99,1.25,dz,false));
  }
  // Two material batches instead of one draw call per rib.
  for (const material of [mat, steel]) {
    const parts = g.children.filter(o => o.material === material);
    const geos = parts.map(o => { o.updateMatrix(); return o.geometry.clone().applyMatrix4(o.matrix); });
    const combined = new THREE.Mesh(mergeGeometries(geos), material);
    combined.castShadow = combined.receiveShadow = true;
    for (const part of parts) { g.remove(part); part.geometry.dispose(); }
    geos.forEach(geo => geo.dispose()); g.add(combined);
  }
  g.position.set(x,y,z);g.rotation.y=yaw;
  g.userData.shippingContainer = true;
  if (y < .05) g.userData.groundFootprint = {w:6,d:2.4,yaw};
  return g;
}

// `wind` is the free-flight breeze for the map (m/s² push, see physics.js);
// missions bring their own op.wind and override it.
export const MAPS = [
  { id: "yard", name: "Depo sahası", blurb: "Konteyner koridoru, asfalt, hangar.", tint: "#6b7a52", wind: { x: 0.35, z: 0.15 } },
  { id: "airfield", name: "Pist", blurb: "Pist, rüzgâr tulumu, açık alan.", tint: "#8a8680", wind: { x: 0.9, z: 0.35 } },
  { id: "coast", name: "Kıyı", blurb: "Deniz, kayalık, seyir hattı.", tint: "#3d6a7a", wind: { x: 1.1, z: 0.4 } },
  { id: "city", name: "Sanayi kenti", blurb: "Sokak ve bina arası dar uçuş.", tint: "#5a5e62", wind: { x: 0.3, z: -0.2 } },
  { id: "indoor", name: "Kapalı hangar", blurb: "İç mekân. Whoop / cine için.", tint: "#3a342c", wind: null },
  { id: "forest", name: "Orman", blurb: "Geniş orman, ağaç arası seyir, gölet.", tint: "#2f5a34", wind: { x: 0.25, z: 0.1 } },
];

/** Wind a flight on this map gets: the op's own if it defines one, else the map breeze in free flight. */
export function windFor(op, mapId) {
  if (op && op.kind !== "free") return op.wind || null;
  return MAPS.find((m) => m.id === mapId)?.wind || null;
}

const DAY = {
  yard: {
    bg: 0xb4cce0, fog: 0xc2d4e4, near: 110, far: 220,
    hemi: [0xe8f0f5, 0x666353, 1.22], sun: 0xffe8c8, sunInt: 2.55,
    elevation: 0.66, bounce: 0.32, ambient: 0.28,
  },
  airfield: {
    bg: 0xc0d4e6, fog: 0xcadcea, near: 120, far: 240,
    hemi: [0xeaf2f7, 0x747469, 1.25], sun: 0xffead0, sunInt: 2.65,
    elevation: 0.7, bounce: 0.3, ambient: 0.3,
  },
  coast: {
    bg: 0xb8d8ea, fog: 0xc5deec, near: 100, far: 200,
    hemi: [0xe8f5fb, 0xa49376, 1.26], sun: 0xffdfb8, sunInt: 2.5,
    elevation: 0.62, bounce: 0.32, ambient: 0.3,
  },
  city: {
    bg: 0xb8c8d4, fog: 0xc4d0d8, near: 90, far: 190,
    hemi: [0xe4eaee, 0x666665, 1.18], sun: 0xffdfc5, sunInt: 2.4,
    elevation: 0.6, bounce: 0.34, ambient: 0.3,
  },
  forest: {
    bg: 0x9fc4a8, fog: 0xa8ceb0, near: 70, far: 170,
    hemi: [0xdceadd, 0x3d5234, 1.2], sun: 0xffddb0, sunInt: 2.25,
    elevation: 0.54, bounce: 0.36, ambient: 0.3,
  },
  indoor: {
    indoor: true,
    bg: 0x8a8680, fog: 0x9a9690, near: 55, far: 130,
    hemi: [0xffead7, 0x756e63, 1.25], sun: 0xffd9ad, sunInt: 2.05,
    elevation: 1.2, bounce: 0.38, ambient: 0.38,
  },
};

function sky(scene, profile) {
  const p = typeof profile === "string" ? DAY[profile] : profile;
  const night = !!scene.userData.night;
  const elevation = night ? -0.12 : p.elevation;
  const azimuth = 0.32;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, Math.PI / 2 - elevation, azimuth);

  if (p.indoor) {
    scene.background = new THREE.Color(p.bg);
    scene.fog = new THREE.Fog(night ? 0x17232d : p.fog, p.near, p.far);
  } else if (night) {
    // The atmospheric daylight shader produces a clipped sunset disc when its
    // sun is pushed below the horizon. A real dark field avoids that WebGPU
    // artefact and keeps building silhouettes intact.
    scene.background = new THREE.Color(0x07111c);
    scene.fog = new THREE.Fog(0x101a24, p.near * 0.8, p.far * 0.9);
    const positions = [];
    let seed = 0x51a7f00d;
    for (let i = 0; i < 180; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const az = (seed / 4294967296) * Math.PI * 2;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const el = 0.15 + (seed / 4294967296) * 1.25;
      positions.push(Math.cos(az) * Math.cos(el) * 340, Math.sin(el) * 340, Math.sin(az) * Math.cos(el) * 340);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    starGeo.setAttribute("normal", new THREE.Float32BufferAttribute(new Float32Array(positions.length), 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xc9d9e8, size: 0.65, transparent: true, opacity: 0.78, depthWrite: false, fog: false }));
    stars.name = "night-stars";
    scene.add(stars);
  } else {
    // Node renderer hands in a TSL SkyMesh factory; otherwise the classic Sky.
    const dome = scene.userData.skyFactory ? scene.userData.skyFactory() : new Sky();
    dome.name = "skyDome";
    dome.scale.setScalar(420);
    const u = dome.skyUniforms || dome.material.uniforms;
    u.turbidity.value = 3.1;
    u.rayleigh.value = 1.35;
    u.mieCoefficient.value = 0.006;
    u.mieDirectionalG.value = 0.82;
    u.sunPosition.value.copy(sunDir);
    scene.add(dome);
    scene.background = new THREE.Color(p.bg);
    scene.fog = new THREE.Fog(p.fog, p.near, p.far);
  }

  const dim = night ? 0.48 : 1;
  scene.add(new THREE.AmbientLight(0xf0ece4, p.ambient * (p.indoor ? 1.25 : night ? 0.4 : 0.5)));
  scene.add(new THREE.HemisphereLight(p.hemi[0], p.hemi[1], p.hemi[2] * (p.indoor ? 1.0 : night ? 0.4 : 0.65)));
  scene.add(new THREE.HemisphereLight(0x000000, 0xc8b090, p.bounce * (night ? 0.4 : 0.5)));
  const sun = new THREE.DirectionalLight(night ? 0x99b4d2 : p.sun, p.sunInt * dim);
  sun.position.copy(night ? new THREE.Vector3(.3,.7,.4).normalize() : sunDir).multiplyScalar(90);
  if (!scene.userData.lite) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 180;
    sun.shadow.camera.left = -70;
    sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70;
    sun.shadow.camera.bottom = -70;
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = 0.04;
  }
  scene.add(sun);
}

function hangarLights(scene) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xeee6d4,
    emissive: 0xfff2cc,
    emissiveIntensity: 1.2,
  });
  for (const [x, z] of [
    [-14, 10],
    [14, 10],
    [-14, -20],
    [14, -20],
    [-14, -50],
    [14, -50],
  ]) {
    const pan = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 1.1), mat);
    pan.name = "hangar-panel";
    pan.position.set(x, 15.35, z);
    scene.add(pan);
    const lamp = new THREE.PointLight(0xfff0d0, 65, 32, 2);
    lamp.position.set(x, 14.6, z);
    scene.add(lamp);
  }
}

export function bakeEnv(renderer, scene, Gen = THREE.PMREMGenerator) {
  const dome = scene.getObjectByName("skyDome");
  if (!dome) {
    _envRT?.dispose();
    _envRT = null;
    scene.environment = null;
    scene.environmentIntensity = 1;
    return;
  }
  // The node renderer brings its own PMREM generator (three/webgpu build).
  if (!_pmrem) _pmrem = new Gen(renderer);
  const envScene = new THREE.Scene();
  const clone = dome.clone();
  clone.scale.setScalar(1);
  envScene.add(clone);
  const rt = _pmrem.fromScene(envScene, 0.04);
  _envRT?.dispose();
  _envRT = rt;
  scene.environment = rt.texture;
  scene.environmentIntensity = 0.3;
}

function live(scene, obj, data) {
  obj.userData.life = data;
  (scene.userData.lifeObjs ||= []).push(obj);
}

function foliageTexture() {
  if (foliageMap) return foliageMap;
  const c = document.createElement("canvas");c.width=c.height=256;
  const g=c.getContext("2d");
  for(let i=0;i<1500;i++) {
    const x=Math.random()*256,y=Math.random()*256;
    const shade=80+Math.random()*100;
    g.fillStyle=`rgb(${shade*.88|0},${shade|0},${shade*.7|0})`;
    g.beginPath();g.ellipse(x,y,2+Math.random()*5,1+Math.random()*2,Math.random()*Math.PI,0,Math.PI*2);g.fill();
  }
  foliageMap=new THREE.CanvasTexture(c);foliageMap.colorSpace=THREE.SRGBColorSpace;
  foliageMap.wrapS=foliageMap.wrapT=THREE.RepeatWrapping;foliageMap.repeat.set(2,1);
  return foliageMap;
}

function canopyGeometry(radius, width=14, height=10) {
  const geo = new THREE.SphereGeometry(radius,width,height);
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++) {
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const shape=1+.13*Math.sin(x*3.1+y*2.7)*Math.cos(z*3.3-y*1.7);
    pos.setXYZ(i,x*shape,y*shape,z*shape);
  }
  geo.computeVertexNormals();return geo;
}

function trees(scene, count, rad0, kind = "oak") {
  if (scene.userData.lite) count = Math.min(count, 8);
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.95 });
  for (let i = 0; i < count; i++) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.4, 6), bark);
    trunk.position.y = 1.2;
    const leaf = new THREE.MeshStandardMaterial({
      color: i % 3 === 0 ? 0x526444 : i % 3 === 1 ? 0x3d5338 : 0x63734c,
      roughness: 1, map: foliageTexture(), alphaTest: .35, side: THREE.DoubleSide,
    });
    const a = new THREE.Mesh(canopyGeometry(1.45), leaf);
    a.position.y = 3.15;
    a.scale.set(1, 0.85, 1);
    const b = new THREE.Mesh(canopyGeometry(.95), leaf);
    b.position.set(0.55, 2.7, 0.2);
    t.add(trunk, a, b);
    const ang = (i / count) * Math.PI * 2;
    const rad = rad0 + (i % 6) * 6;
    t.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad - 30);
    t.rotation.y = (i * 1.13) % (Math.PI * 2);
    t.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    live(scene, t, { type: "sway", amp: 0.045, phase: i * 0.7 });
    scene.add(t);
    // Detailed tree (trees.js) swaps in after both distance levels load.
    scene.userData.treePlacements.push({
      mesh: t, x: t.position.x, z: t.position.z, rotY: t.rotation.y,
      h: kind === "palm" ? 6 + (i % 5) * 0.6 : 5 + (i % 4) * 0.4,
      kind, variant: i, phase: i * 0.7, amp: 0.045,
    });
  }
}

function padTex() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#1c1e1a";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#e6c14a";
  g.lineWidth = 12;
  g.beginPath();
  g.arc(128, 128, 110, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 16;
  g.beginPath();
  g.moveTo(86, 64);
  g.lineTo(86, 192);
  g.moveTo(170, 64);
  g.lineTo(170, 192);
  g.moveTo(86, 128);
  g.lineTo(170, 128);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function padAt(scene) {
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(6, 48),
    new THREE.MeshStandardMaterial({ map: padTex(), roughness: 0.7, metalness: 0.08 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.04;
  pad.receiveShadow = true;
  scene.add(pad);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(5.4, 0.08, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.35 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.09;
  ring.name = "padHint";
  scene.add(ring);
}

function waterMat() {
  const material = new THREE.MeshStandardMaterial({
    color: 0x355f60, metalness: .22, roughness: .23,
    transparent: true, opacity: .93, envMapIntensity: .9,
  });
  const time = { value: 0 };
  material.userData.waveTime = time;
  material.onBeforeCompile = shader => {
    shader.uniforms.waveTime = time;
    shader.vertexShader = "uniform float waveTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `
      #include <begin_vertex>
      transformed.z += sin(position.x*.28+waveTime*.75)*.09 + cos(position.y*.35-waveTime*.6)*.06;
    `);
    shader.vertexShader = shader.vertexShader.replace("#include <beginnormal_vertex>", `
      #include <beginnormal_vertex>
      objectNormal = normalize(vec3(-.0252*cos(position.x*.28+waveTime*.75), .021*sin(position.y*.35-waveTime*.6), 1.0));
    `);
  };
  material.customProgramCacheKey = () => "hangar-water-v1";
  return material;
}

function scatterClutter(scene, play) {
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6a18, roughness: 0.55, metalness: 0.08 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.7 });
  const barrelMat = [
    new THREE.MeshStandardMaterial({ color: 0x2a5a9a, roughness: 0.5, metalness: 0.25 }),
    new THREE.MeshStandardMaterial({ color: 0x8a2a22, roughness: 0.5, metalness: 0.2 }),
    new THREE.MeshStandardMaterial({ color: 0xc8a020, roughness: 0.45, metalness: 0.15 }),
  ];
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.85 });
  const spots = [
    [6, -4],
    [-5, -2],
    [8, -18],
    [-7, -22],
    [4, -40],
    [-9, -36],
    [11, -8],
  ];
  const real = !!scene.userData.props; // scanned barrels/crates come from props.js instead
  spots.forEach(([x, z], i) => {
    if (x < play.bounds.minx + 3 || x > play.bounds.maxx - 3) return;
    if (z < play.bounds.minz + 3 || z > play.bounds.maxz - 3) return;
    if (real && i % 3 !== 0) return;
    if (i % 3 === 0) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 8), i % 2 ? coneMat : white);
      c.position.set(x, 0.28, z);
      c.castShadow = true;
      scene.add(c);
    } else if (i % 3 === 1) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.85, 10), barrelMat[i % 3]);
      b.position.set(x, 0.43, z);
      b.castShadow = true;
      scene.add(b);
      play.boxes.push(aabbFromBox(x, 0.43, z, 0.7, 0.9, 0.7, 0));
    } else {
      solid(scene, play, 1.1, 0.7, 1.1, x, 0.35, z, crateMat);
    }
  });
}

function grassTufts(scene, n) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x667249, roughness: 1, side: THREE.DoubleSide });
  const grass=new THREE.InstancedMesh(grassBladeGeometry(),mat,n*9);
  const tr=new THREE.Object3D();let index=0;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 7 + (i % 7) * 1.8;
    if(Math.hypot(Math.cos(a)*r,Math.sin(a)*r-6)<6)continue;
    for(let j=0;j<9;j++) {
      const turn=j*2.4+i;
      tr.position.set(Math.cos(a)*r+Math.cos(turn)*.07,.012,Math.sin(a)*r-6+Math.sin(turn)*.07);
      tr.rotation.set(0,turn,0);tr.scale.set(1,.2+(j%4)*.065,1);tr.updateMatrix();grass.setMatrixAt(index++,tr.matrix);
    }
  }
  grass.count=index;grass.name='natural-grass-tufts';grass.receiveShadow=true;grass.computeBoundingSphere();scene.add(grass);
}

function clouds(scene) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const g=canvas.getContext('2d');
  for(let i=0;i<32;i++) {
    const x=90+(i*73%330),y=95+(i*29%65),r=26+(i*17%35);
    const grad=g.createRadialGradient(x,y,0,x,y,r);
    grad.addColorStop(0,'rgba(242,243,238,.14)');grad.addColorStop(.5,'rgba(232,237,238,.08)');grad.addColorStop(1,'rgba(230,235,239,0)');
    g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2);
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.SpriteMaterial({map,opacity:.6,depthWrite:false,fog:true});
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Sprite(mat);
    m.scale.set(48+(i%3)*13,19+(i%2)*6,1);
    m.position.set((i - 3) * 22, 42 + (i % 3) * 5, -50 - i * 7);
    live(scene, m, { type: "cloud", vx: 1.1 + i * 0.08 });
    scene.add(m);
  }
}

function birds(scene, n = 5, opts = {}) {
  const mat = new THREE.MeshBasicMaterial({ color: opts.color ?? 0x1c1c20 });
  const size = opts.size ?? 1;
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.5 * size, 0.035, 0.1 * size), mat);
    const w2 = w1.clone();
    w1.position.x = 0.2 * size;
    w2.position.x = -0.2 * size;
    w1.userData.wing = 1;
    w2.userData.wing = -1;
    g.add(w1, w2);
    live(scene, g, {
      type: "bird",
      r: 14 + i * 3.5,
      y: 11 + (i % 3) * 2.4,
      sp: 0.35 + i * 0.05,
      ph: i * 1.1,
      glide: !!opts.glide,
    });
    scene.add(g);
  }
}

function flag(scene, x, z) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 5.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3c, metalness: 0.6, roughness: 0.4 }),
  );
  pole.position.set(x, 2.6, z);
  scene.add(pole);
  if (scene.userData.gpu) {
    // Node renderer: keep the two-band cloth and deform its tiny vertex grid
    // from tickWorld. This preserves the WebGL flag motion without another
    // shader dialect or a per-frame allocation.
    const geo = new THREE.PlaneGeometry(1.6, 0.9, 8, 4);
    const uvs = geo.attributes.uv;
    const colors = new Float32Array(uvs.count * 3);
    for (let i = 0; i < uvs.count; i++) {
      const top = uvs.getY(i) > 0.5;
      colors[i * 3] = top ? 0.95 : 0.85;
      colors[i * 3 + 1] = top ? 0.85 : 0.18;
      colors[i * 3 + 2] = top ? 0.2 : 0.12;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const cloth = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    cloth.position.set(x + 0.85, 4.6, z);
    live(scene, cloth, { type: "flag", base: Float32Array.from(geo.attributes.position.array) });
    scene.add(cloth);
    return;
  }
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float time;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.z += sin(uv.x * 6.0 + time * 4.0) * uv.x * 0.18;
        p.y += sin(uv.x * 4.0 + time * 3.2) * uv.x * 0.08;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vec3 a = vec3(0.85, 0.18, 0.12);
        vec3 b = vec3(0.95, 0.85, 0.2);
        gl_FragColor = vec4(mix(a, b, step(0.5, vUv.y)), 1.0);
      }
    `,
  });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9, 8, 4), mat);
  cloth.position.set(x + 0.85, 4.6, z);
  live(scene, cloth, { type: "flag" });
  scene.add(cloth);
}

function dustSystem(scene) {
  const n = 140;
  const pos = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const normals = new Float32Array(pos.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xc8b890,
    size: 0.14,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  scene.userData.dust = { pos, geo, mat, n };
}

function motes(scene, n = 80) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 50;
    pos[i * 3 + 1] = 1 + Math.random() * 12;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 70 - 20;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const normals = new Float32Array(pos.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xe8d8a8,
    size: 0.08,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  live(scene, pts, { type: "motes", pos });
  scene.add(pts);
}

function decorate(scene, play, mapId) {
  const lite = !!scene.userData.lite;
  if (mapId !== "indoor") {
    if (!lite) {
      // The low-poly daylight clouds become oversized, brightly clipped sheets
      // against the WebGPU night background. Keep the night silhouette clean;
      // stars and map lighting already provide the distant depth cues.
      if (!scene.userData.night) clouds(scene);
      if (!scene.userData.night) birds(scene, 5, mapId === "coast" ? { color: 0xe4e7ea, size: 1.35, glide: true } : {});
      dustSystem(scene);
      if (mapId !== "forest" && !scene.userData.night) flag(scene, -6, 6);
    }
    if (mapId !== "forest") scatterClutter(scene, play);
  }
  if (!lite && (mapId === "yard" || mapId === "coast")) grassTufts(scene, 28);
  if (mapId === "indoor") motes(scene, lite ? 40 : 120);
}

export function tickWorld(scene, t, dt, flyer) {
  const objs = scene.userData.lifeObjs;
  if (objs) {
    for (const o of objs) {
      const L = o.userData.life;
      if (!L) continue;
      if (L.type === "sway") {
        o.rotation.z = Math.sin(t * 1.35 + L.phase) * L.amp;
        o.rotation.x = Math.cos(t * 0.95 + L.phase) * L.amp * 0.45;
      } else if (L.type === "cloud") {
        o.position.x += L.vx * dt;
        if (o.position.x > 90) o.position.x = -90;
      } else if (L.type === "bird") {
        const a = t * L.sp + L.ph;
        o.position.set(Math.cos(a) * L.r, L.y + Math.sin(a * 2.2) * 0.55, Math.sin(a) * L.r - 18);
        o.rotation.y = -a + Math.PI / 2;
        // Gulls mostly glide: a few flaps, then wings held out, shallow bank.
        const flap = L.glide ? (Math.sin(t * 0.9 + L.ph) > 0.55 ? 1 : 0.12) : 1;
        for (const w of o.children) {
          if (w.userData.wing) w.rotation.z = Math.sin(t * 11 + L.ph) * 0.5 * flap * w.userData.wing;
        }
        if (L.glide) o.rotation.z = Math.sin(a * 1.3) * 0.25;
      } else if (L.type === "water" || L.type === "flag") {
        if (o.material?.uniforms?.time) o.material.uniforms.time.value = t;
        if (o.material?.userData?.waveTime) o.material.userData.waveTime.value = t;
        if (L.base) {
          const attr = o.geometry.attributes.position;
          const p = attr.array;
          const uvAttr = o.geometry.attributes.uv;
          for (let i = 0; i < attr.count; i++) {
            const j = i * 3;
            if (L.type === "water") {
              p[j + 2] = L.base[j + 2] + Math.sin(L.base[j] * .28 + t * .75) * .09 + Math.cos(L.base[j + 1] * .35 - t * .6) * .06;
            } else {
              const u = uvAttr.getX(i);
              p[j + 1] = L.base[j + 1] + Math.sin(u * 4 + t * 3.2) * u * .08;
              p[j + 2] = L.base[j + 2] + Math.sin(u * 6 + t * 4) * u * .18;
            }
          }
          attr.needsUpdate = true;
          if (L.type === "water") o.geometry.computeVertexNormals();
        }
      } else if (L.type === "lamp") {
        if (o.material) o.material.emissiveIntensity = 0.55 + Math.sin(t * 7.5 + L.phase) * 0.12;
      } else if (L.type === "motes") {
        const p = L.pos;
        for (let i = 0; i < p.length; i += 3) {
          p[i] += Math.sin(t * 0.4 + i) * dt * 0.15;
          p[i + 1] += dt * 0.12;
          if (p[i + 1] > 14) p[i + 1] = 1;
        }
        o.geometry.attributes.position.needsUpdate = true;
      }
    }
  }
  const dust = scene.userData.dust;
  if (dust && flyer) {
    const near = flyer.armed && flyer.y < 4.5 && (flyer.throttleOut || 0) > 0.22;
    dust.mat.opacity += ((near ? 0.5 : 0) - dust.mat.opacity) * Math.min(1, dt * 4);
    if (dust.mat.opacity > 0.02) {
      const p = dust.pos;
      for (let i = 0; i < dust.n; i++) {
        const a = t * 3 + i * 0.7;
        const rad = 0.4 + (i % 9) * 0.18;
        p[i * 3] = flyer.x + Math.cos(a) * rad;
        p[i * 3 + 1] = 0.08 + (i % 5) * 0.05 + Math.sin(t * 4 + i) * 0.04;
        p[i * 3 + 2] = flyer.z + Math.sin(a) * rad;
      }
      dust.geo.attributes.position.needsUpdate = true;
    }
  }
  tickAmbient(scene, t, dt, flyer);
}

function buildYard(scene) {
  const play = makePlay(-40, 44, -82, 16, 42);
  sky(scene, "yard");
  groundFit(scene, play, new THREE.MeshStandardMaterial({ map: groundTex(), roughness: 0.95, metalness: 0 }));
  fence(scene, play);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(12, play.bounds.maxz - play.bounds.minz - 4),
    new THREE.MeshStandardMaterial({ map: asphaltTex(), roughness: 0.9, metalness: 0 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.02, (play.bounds.minz + play.bounds.maxz) / 2);
  road.receiveShadow = true;
  scene.add(road);
  padAt(scene);

  const conc = new THREE.MeshStandardMaterial({ color: 0x8a8680, roughness: 0.88, metalness: 0.05 });
  const wareA = facadeTex("#8a8680", 0.12);
  wareA.repeat.set(2, 1);
  const wareB = facadeTex("#7a8288", 0.06);
  wareB.repeat.set(2, 1);
  solid(scene, play, 28, 9, 16, 22, 4.5, -8, new THREE.MeshStandardMaterial({ map: wareA, roughness: 0.8, metalness: 0.05 }));
  scene.add(mesh(new THREE.BoxGeometry(29, 0.35, 17), conc, 22, 9.15, -8, false));
  solid(scene, play, 34, 7.2, 14, -26, 3.6, 8, new THREE.MeshStandardMaterial({ map: wareB, roughness: 0.82 }));
  solid(scene, play, 10, 5.5, 12, -14, 2.75, -28, new THREE.MeshStandardMaterial({ color: 0x6a4a3a, roughness: 0.9 }));
  solid(scene, play, 8, 12, 8, 36, 6, -36, new THREE.MeshStandardMaterial({ color: 0x5a5e62, roughness: 0.75 }));

  const cols = [0x8b3a2a, 0x2c4f7c, 0x3d6b4f, 0xb57a2a, 0x4a4a4a];
  const stacks = [
    [10, -22, 0],
    [10, -24.5, 0],
    [16.2, -22, 0.1],
    [16.2, -24.5, 0],
    [-8, -48, 1.2],
    [-8, -50.5, 1.2],
    [-1.8, -48, 1.2],
    [6, -72, 0],
    [6, -74.5, 0],
    [12.2, -72, 0],
  ];
  stacks.forEach(([x, z, yaw], i) => {
    addContainer(scene, play, x, 0, z, yaw, cols[i % cols.length]);
    if (i % 3 === 0) addContainer(scene, play, x, 2.5, z, yaw, cols[(i + 2) % cols.length]);
  });

  addVan(scene, play, -4.5, -6, 0.2, 0x2f3a44);
  addVan(scene, play, 5.2, 4, -1.2, 0x8a1f1f);
  addVan(scene, play, -18, -52, 1.57, 0xcfc8b8);

  for (const [x, z] of [
    [-7, 8],
    [7, 8],
    [-7, -16],
    [7, -32],
    [-7, -64],
    [7, -48],
    [18, -8],
    [-20, -20],
  ]) {
    lamp(scene, x, z);
  }

  const postMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6, metalness: 0.4 });
  for (let i = 0; i < 14; i++) {
    const z = 12 - i * 4;
    if (z < play.bounds.minz + 2) break;
    scene.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), postMat, 8.5, 0.8, z, false));
    scene.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), postMat, -8.5, 0.8, z, false));
  }
  trees(scene, 18, 48, "oak");
  return play;
}

function buildAirfield(scene) {
  const play = makePlay(-48, 48, -88, 22, 50);
  sky(scene, "airfield");
  groundFit(scene, play, new THREE.MeshStandardMaterial({ color: 0x4a4c48, roughness: 0.92 }));
  fence(scene, play);
  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(18, play.bounds.maxz - play.bounds.minz - 6),
    new THREE.MeshStandardMaterial({ map: asphaltTex(), roughness: 0.88 }),
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, 0.03, (play.bounds.minz + play.bounds.maxz) / 2);
  runway.receiveShadow = true;
  scene.add(runway);
  padAt(scene);
  const hang = new THREE.MeshStandardMaterial({ color: 0x6e7270, roughness: 0.8 });
  solid(scene, play, 36, 10, 22, 28, 5, 8, hang);
  solid(scene, play, 30, 8, 18, -26, 4, 6, hang);
  lamp(scene, 10, 4);
  lamp(scene, -10, 4);
  lamp(scene, 10, -40);
  lamp(scene, -10, -40);
  addVan(scene, play, 12, -8, 0.1, 0x3a4044);
  return play;
}

function buildCoast(scene) {
  const play = makePlay(-44, 44, -46, 20, 40);
  sky(scene, "coast");
  groundFit(scene, play, new THREE.MeshStandardMaterial({ color: 0xd9c8a4, map: surfaceTexture("sand", 32), roughness: 0.95 }));
  fence(scene, play, .75);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(160, 80, 24, 12), waterMat());
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.15, play.bounds.minz - 40);
  live(scene, water, { type: "water", ...(scene.userData.gpu ? { base: Float32Array.from(water.geometry.attributes.position.array) } : {}) });
  scene.add(water);
  padAt(scene);
  const rock = new THREE.MeshStandardMaterial({ color: 0x88817a, map: surfaceTexture("concrete", 2), roughness: 0.9 });
  for (let i = 0; i < 10; i++) {
    if (scene.userData.props) break; // scanned shoreline rocks land on these slots from props.js
    const x = (i - 5) * 6;
    const z = play.bounds.minz + 4 + (i % 3) * 2;
    scene.add(mesh(new THREE.DodecahedronGeometry(1.2 + (i % 3) * 0.6, 1), rock, x, 0.6, z));
    play.boxes.push(aabbFromBox(x, 0.6, z, 2.2, 1.8, 2.2, 0));
  }
  solid(scene, play, 14, 2.2, 3, 0, 1.1, play.bounds.minz + 8, new THREE.MeshStandardMaterial({ color: 0x6a5a48 }));
  trees(scene, 10, 40, "palm");
  addVan(scene, play, -6, -4, 0.3, 0xcfc8b8);
  return play;
}

function buildCity(scene) {
  const play = makePlay(-34, 34, -96, 14, 46);
  sky(scene, "city");
  groundFit(scene, play, new THREE.MeshStandardMaterial({ map: asphaltTex(), roughness: 0.9 }));
  fence(scene, play);
  padAt(scene);
  const fac = facadeTex("#6a6e72", 0.2);
  fac.repeat.set(1, 2);
  const bmat = new THREE.MeshStandardMaterial({ map: fac, roughness: 0.82 });
  const blocks = [
    [16, 18, 14, 22, -18],
    [12, 24, 12, -20, -20],
    [18, 14, 16, 22, -52],
    [14, 22, 12, -22, -54],
    [12, 16, 12, 20, -82],
    [16, 14, 14, -20, -84],
    [10, 18, 10, 0, -66],
  ];
  for (const [w, h, d, x, z] of blocks) {
    solid(scene, play, w, h, d, x, h / 2, z, bmat);
  }
  addVan(scene, play, 4, -10, 0, 0x2f3a44);
  addVan(scene, play, -5, -36, 1.57, 0x8a1f1f);
  lamp(scene, 6, -8);
  lamp(scene, -6, -8);
  lamp(scene, 6, -40);
  lamp(scene, -6, -40);
  return play;
}

function forestFloorTex() { return surfaceTexture("forest", 48); }

function scatterForest(scene, play, count) {
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.95 });
  const barkTall = new THREE.MeshStandardMaterial({ color: 0x3e3020, roughness: 0.95 });
  const { minx, maxx, minz, maxz } = play.bounds;
  const pad = 4;
  const clearR = 9;
  const pondCx = minx * 0.35;
  const pondCz = (minz + maxz) / 2 - 10;
  // The forest is gameplay geometry, not decoration: a changing Math.random
  // layout could put a trunk across a daily route on one reload but not the
  // next. Keep the same natural-looking distribution on every client.
  let seed = 0xefa2026;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let n = count;
  if (scene.userData.lite) n = Math.min(n, 40);
  for (let i = 0; i < n; i++) {
    const x = minx + pad + random() * (maxx - minx - pad * 2);
    const z = minz + pad + random() * (maxz - minz - pad * 2);
    if (Math.hypot(x, z) < clearR) continue;
    if (Math.abs(x - 6) < 4.5) continue; // keep the marked north-south flight path open
    if (Math.hypot(x - pondCx, z - pondCz) < 15) continue;
    const tall = random() < 0.35;
    const t = new THREE.Group();
    const h = tall ? 5.5 + random() * 2.5 : 2.8 + random() * 2;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(tall ? 0.22 : 0.16, tall ? 0.3 : 0.22, h, 6), tall ? barkTall : bark);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    const leaf = new THREE.MeshStandardMaterial({
      color: i % 3 === 0 ? 0x526444 : i % 3 === 1 ? 0x3d5338 : 0x63734c,
      roughness: 1, map: foliageTexture(), alphaTest: .35, side: THREE.DoubleSide,
    });
    const topY = h + (tall ? 1.6 : 1.1);
    const rTop = tall ? 1.9 : 1.4;
    const a = new THREE.Mesh(canopyGeometry(rTop), leaf);
    a.position.y = topY;
    a.scale.set(1, tall ? 1.15 : 0.85, 1);
    a.castShadow = true;
    const b = new THREE.Mesh(canopyGeometry(rTop*.65), leaf);
    b.position.set(rTop * 0.4, topY - 0.5, rTop * 0.25);
    b.castShadow = true;
    t.add(trunk, a, b);
    t.position.set(x, 0, z);
    t.rotation.y = random() * Math.PI * 2;
    live(scene, t, { type: "sway", amp: 0.035, phase: i * 0.53 });
    scene.add(t);
    play.boxes.push(aabbFromBox(x, h / 2, z, tall ? 0.6 : 0.44, h, tall ? 0.6 : 0.44, 0));
    scene.userData.treePlacements.push({
      mesh: t, x, z, rotY: t.rotation.y, h,
      kind: tall ? "pineTall" : "pineRound", variant: i, phase: i * 0.53, amp: 0.035,
    });
  }
}

function forestPond(scene, play) {
  const cx = play.bounds.minx * 0.35;
  const cz = (play.bounds.minz + play.bounds.maxz) / 2 - 10;
  const water = new THREE.Mesh(new THREE.CircleGeometry(13, 64), waterMat());
  water.rotation.x = -Math.PI / 2;
  water.position.set(cx, -0.08, cz);
  live(scene, water, { type: "water", ...(scene.userData.gpu ? { base: Float32Array.from(water.geometry.attributes.position.array) } : {}) });
  scene.add(water);
  const bankMat = new THREE.MeshStandardMaterial({ color: 0x5a4a34, roughness: 0.92 });
  const bank = new THREE.Mesh(new THREE.RingGeometry(12.6, 14.2, 32), bankMat);
  bank.rotation.x = -Math.PI / 2;
  bank.position.set(cx, 0.01, cz);
  bank.receiveShadow = true;
  scene.add(bank);
}

function buildForest(scene) {
  const play = makePlay(-70, 70, -140, 30, 55);
  sky(scene, "forest");
  groundFit(scene, play, new THREE.MeshStandardMaterial({ map: forestFloorTex(), roughness: 0.96, metalness: 0 }));
  padAt(scene);
  forestPond(scene, play);

  const dirtMat = new THREE.MeshStandardMaterial({ color: 0xa48a6d, map: surfaceTexture("forest", 20), roughness: 0.95 });
  const path = new THREE.Mesh(new THREE.PlaneGeometry(4.5, play.bounds.maxz - play.bounds.minz - 10), dirtMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(6, 0.015, (play.bounds.minz + play.bounds.maxz) / 2);
  path.receiveShadow = true;
  scene.add(path);

  scatterForest(scene, play, 220);
  grassTufts(scene, 34);

  for (const [x, z] of [
    [4, -10],
    [-6, -30],
    [8, -60],
    [-10, -90],
  ]) {
    lamp(scene, x, z);
  }
  return play;
}

function buildIndoor(scene) {
  const play = makePlay(-40.6, 40.6, -80.6, 40.6, 15.55);
  sky(scene, "indoor");
  hangarLights(scene);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 120),
    new THREE.MeshStandardMaterial({ map: concreteTex(), roughness: 0.82, color: 0xd8d4c8 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  padAt(scene);
  const wall = new THREE.MeshStandardMaterial({ color: 0xb8b0a4, roughness: 0.82 });
  solid(scene, play, 80, 16, 1.2, 0, 8, 40, wall, 0, false);
  solid(scene, play, 80, 16, 1.2, 0, 8, -80, wall, 0, false);
  solid(scene, play, 1.2, 16, 120, 40, 8, -20, wall, 0, false);
  solid(scene, play, 1.2, 16, 120, -40, 8, -20, wall, 0, false);
  const roof = new THREE.MeshStandardMaterial({ color: 0x8a8680, roughness: 0.88, emissive: 0x3a3830, emissiveIntensity: 0.08 });
  scene.add(mesh(new THREE.BoxGeometry(82, 0.6, 122), roof, 0, 17.4, -20, false));
  // Roof void accommodates the steel trusses above the training ceiling.
  for(const x of [-40,40])scene.add(mesh(new THREE.BoxGeometry(1.2,1.2,120),wall,x,16.6,-20,false));
  for(const z of [-80,40])scene.add(mesh(new THREE.BoxGeometry(80,1.2,1.2),wall,0,16.6,z,false));
  const lowerWall = new THREE.MeshStandardMaterial({ color: 0x555c55, roughness: .92, map: surfaceTexture("concrete", 6) });
  for (const x of [-39.37,39.37]) scene.add(mesh(new THREE.BoxGeometry(.025,2.1,118),lowerWall,x,1.05,-20,false));
  const beam = new THREE.MeshStandardMaterial({ color: 0x555b58, roughness: .72, metalness: .45 });
  for (let z = -72; z <= 32; z += 16) {
    scene.add(mesh(new THREE.BoxGeometry(78,.28,.22), beam,0,15.8,z,false));
    for (const x of [-39.35,39.35]) scene.add(mesh(new THREE.BoxGeometry(.12,15.4,.3),beam,x,7.7,z,false));
  }
  addContainer(scene, play, 8, 0, -28, 0, 0x8b3a2a);
  addContainer(scene, play, -8, 0, -28, 0, 0x2c4f7c);
  solid(scene, play, 1.1, 16, 1.1, 0, 8, -50, wall, 0, false);
  return play;
}

export function clearWorld(scene) {
  scene.userData.worldToken = null;
  scene.userData.surfaceRevision = null;
  scene.userData.ambient = null;
  const resources = scene.userData.worldResources;
  if (resources) for (const resource of resources) resource.dispose();
  scene.userData.worldResources = null;
  scene.clear();
}

export function buildWorld(scene, mapId = "yard", opts = {}) {
  const id = MAPS.some((m) => m.id === mapId) ? mapId : "yard";
  foliageMap = null;
  scene.userData.mapId = id;
  scene.userData.perimeterHeight = null;
  scene.userData.lite = !!opts.lite;
  scene.userData.night = !!opts.night;
  scene.userData.gpu = !!opts.gpu; // node renderer: no GLSL ShaderMaterial / onBeforeCompile
  scene.userData.skyFactory = opts.sky || null;
  // Real scanned props (props.js) replace the procedural barrels/crates/rocks;
  // they arrive async, so the token lets late loads know the map has changed.
  scene.userData.props = !!opts.props;
  scene.userData.worldToken = {};
  scene.userData.treePlacements = [];
  scene.userData.lifeObjs = [];
  scene.userData.lampCount = 0;
  scene.userData.dust = null;
  let play;
  if (id === "airfield") play = buildAirfield(scene);
  else if (id === "coast") play = buildCoast(scene);
  else if (id === "city") play = buildCity(scene);
  else if (id === "forest") play = buildForest(scene);
  else if (id === "indoor") play = buildIndoor(scene);
  else play = buildYard(scene);
  const architecture = scene.children.filter(o => o.geometry?.type === "BoxGeometry" && o.geometry.parameters.width >= 8 && o.geometry.parameters.height >= 5 && o.geometry.parameters.depth >= 5);
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x535b58, roughness: .72, metalness: .4 });
  if (!architecture.length) trimMat.dispose();
  for (const building of architecture) {
    const {width:w,height:h,depth:d} = building.geometry.parameters;
    const cap = mesh(new THREE.BoxGeometry(w,.18,d),trimMat,building.position.x,building.position.y+h/2-.09,building.position.z,false);
    scene.add(cap);
  }
  decorate(scene, play, id);
  if (["yard","indoor","airfield","city"].includes(id)) {
    const paint = new THREE.MeshStandardMaterial({ color: 0xc5b17d, roughness: .96, transparent: true, opacity: .65, depthWrite: false });
    const marks = new THREE.InstancedMesh(new THREE.PlaneGeometry(.12,2), paint, 16);
    const transform = new THREE.Object3D();
    for(let i=0;i<16;i++) {
      transform.position.set(i%2 ? 4.8 : -4.8,.035,-5-Math.floor(i/2)*3.4);
      transform.rotation.x=-Math.PI/2;transform.updateMatrix();marks.setMatrixAt(i,transform.matrix);
    }
    marks.receiveShadow=true;scene.add(marks);
  }
  enrichMap(scene, play, id);
  addStructuralDetail(scene, id);
  addEnvironmentDetails(scene, play, id);
  addAmbient(scene, play, id, { van });
  finishSurfaces(scene);
  if (opts.props) {
    const token = scene.userData.worldToken;
    import("./props.js")
      .then((m) => m.placeProps(scene, play, id, token))
      .catch((err) => console.warn("[props] modeller yüklenemedi:", err));
    import("./trees.js")
      .then((m) => m.placeTrees(scene, token))
      .catch((err) => console.warn("[trees] modeller yüklenemedi:", err));
    import("./perimeter.js")
      .then(m=>m.placePerimeter(scene,play,token))
      .catch(err=>console.warn('[perimeter] model unavailable; retaining wall:',err));
  }
  const resources = new Set();
  scene.traverse(o => {
    if (o.geometry) resources.add(o.geometry);
    for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) {
      resources.add(m);
      for (const value of Object.values(m)) if (value?.isTexture) resources.add(value);
    }
    if (o.shadow) resources.add(o.shadow);
  });
  scene.userData.worldResources = resources;
  scene.userData.play = play;
  applyScannedMaterials(scene);
  return play;
}
