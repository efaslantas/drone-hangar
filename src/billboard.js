import * as THREE from "three";
import { makeDrone, disposeDrone, spinProps } from "./models.js";
import { droneById } from "./catalog.js";
import { buildWorld, clearWorld, tickWorld, worldMatches } from "./world.js";

const previewWorlds=new WeakMap();
export function updateBillboardMap(scene,cam,id,{reduced=false,crafts=[]}={}){
  const mapId=id||'yard',previous=previewWorlds.get(scene);
  if(previous?.id===mapId&&previous.reduced===!!reduced&&previous.camera===cam&&previous.token===scene.userData.worldToken&&worldMatches(scene,mapId))return mapId;
  // Only completed builds can be reused; clearWorld or a failed build invalidates
  // the token even when the requested map name has not changed.
  previewWorlds.delete(scene);
  const keep=new Set(crafts.map(c=>c.mesh));
  for(const item of keep)scene.remove(item);
  try{
    clearWorld(scene);
    buildWorld(scene,mapId,{lite:reduced,quality:'medium'});
    cam.far=mapId==='sile'?6500:220;cam.fov=mapId==='sile'?58:44;cam.updateProjectionMatrix();
    scene.add(new THREE.HemisphereLight(0xdce6da,0x7d8666,.85));
    scene.traverse(o=>{if(o.castShadow)o.castShadow=false;if(o.receiveShadow)o.receiveShadow=false;});
  }finally{for(const item of keep)if(!item.parent)scene.add(item);}
  previewWorlds.set(scene,{id:mapId,reduced:!!reduced,camera:cam,token:scene.userData.worldToken});
  return mapId;
}

const ACCENT_WARM = 0xff6a2a;
const ACCENT_COOL = 0x3ec8e8;
const FLEET = [
  { id: "racer", variant: 0 },
  { id: "freestyle", variant: 1 },
  { id: "toothpick", variant: 0 },
  { id: "racer", variant: 1 },
  { id: "seven", variant: 0 },
  { id: "freestyle", variant: 1 },
  { id: "toothpick", variant: 1 },
  { id: "racer", variant: 0 },
];

function dummy() {
  return { pause() {}, resume() {}, stop() {}, setMap() {} };
}

function poseAt(craft, t) {
  const p = craft.phase;
  const s = craft.speed;
  const u = t * s + p;
  const side = craft.variant ? 1 : -1;
  return {
    x: Math.sin(u) * craft.rx + Math.sin(u * 2.15 + p) * 5.5 * side,
    y: 7.2 + Math.sin(u * 1.35 + p * 0.7) * 3.4 + craft.variant * 0.6,
    z: Math.cos(u * 0.92) * craft.rz + Math.cos(u * 1.7 + p) * 4.2,
  };
}

const _fwd = new THREE.Vector3();
const _nz = new THREE.Vector3(0, 0, -1);
const _quat = new THREE.Quaternion();

function bankLook(mesh, from, to, dt) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  _fwd.set(dx / len, dy / len, dz / len);
  _quat.setFromUnitVectors(_nz, _fwd);
  mesh.quaternion.slerp(_quat, 1 - Math.exp(-8 * dt));
  mesh.rotateZ(-Math.sin(Math.atan2(dx, dz) * 1.4) * 0.35);
}

export function startBillboard(canvas, { reduced = false } = {}) {
  if (!canvas) return dummy();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !reduced,
      alpha: true,
      powerPreference: reduced ? "low-power" : "high-performance",
    });
  } catch {
    return dummy();
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio, reduced ? 1 : 1.4));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .94;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x6a5340, 28, 95);
  scene.background = new THREE.Color(0x1a2838);

  const cam = new THREE.PerspectiveCamera(44, 1, 0.2, 220);
  cam.position.set(22, 5.4, 26);

  const nCraft = reduced ? 1 : 2;
  const crafts = [];
  for (let i = 0; i < nCraft; i++) {
    const def = FLEET[i];
    const base = droneById(def.id);
    const spec = { ...base, accent: def.variant ? ACCENT_COOL : ACCENT_WARM, color: def.variant ? 0x161c22 : 0x1a1210 };
    const mesh = makeDrone(spec);
    mesh.scale.setScalar(1.7);
    scene.add(mesh);
    crafts.push({
      mesh,
      variant: def.variant,
      phase: (i / nCraft) * Math.PI * 2,
      speed: 0.55 + (i % 3) * 0.12,
      rx: 11 + (i % 4) * 1.6,
      rz: 13 + (i % 3) * 1.8,
    });
  }

  let raf = 0;
  let running = false;
  let t0 = 0;
  let last = 0;
  const hangar = canvas.closest("#hangar") || canvas.parentElement;
  let mapId = "airfield";

  function setMap(id) {
    mapId=updateBillboardMap(scene,cam,id,{reduced,crafts});
  }

  function size() {
    const vw = Math.max(1, canvas.clientWidth);
    const vh = Math.max(1, canvas.clientHeight);
    renderer.setSize(vw, vh, false);
    cam.aspect = vw / vh;
    cam.updateProjectionMatrix();
  }

  function tick(now) {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    t0 += dt;

    tickWorld(scene, t0, dt, null);
    const camT = t0 * 0.07;
    if(mapId==='sile'){cam.position.set(-240+Math.sin(camT)*10,200,520+Math.cos(camT)*10);cam.lookAt(250,20,-400);}
    else{cam.position.set(18 + Math.sin(camT) * 4, 6.5, -55 + Math.cos(camT) * 4);cam.lookAt(0,3,-6);}

    for (const c of crafts) {
      const pos = poseAt(c, t0);
      const look = poseAt(c, t0 + 0.08);
      bankLook(c.mesh, pos, look, dt);
      c.mesh.position.set(pos.x, pos.y, pos.z);
      spinProps(c.mesh, 0.85, dt);
    }

    renderer.render(scene, cam);
  }

  function onVis() {
    if (document.hidden) pause();
    else if (hangar && !hangar.hidden) resume();
  }

  function pause() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function resume() {
    if (running) return;
    running = true;
    last = performance.now();
    size();
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    pause();
    window.removeEventListener("resize", size);
    document.removeEventListener("visibilitychange", onVis);
    for(const craft of crafts)disposeDrone(craft.mesh);
    clearWorld(scene);renderer.dispose();
  }

  window.addEventListener("resize", size);
  document.addEventListener("visibilitychange", onVis);
  hangar?.classList.add("live");
  new ResizeObserver(size).observe(canvas);
  setMap(mapId);
  resume();
  return { pause, resume, stop, setMap };
}
