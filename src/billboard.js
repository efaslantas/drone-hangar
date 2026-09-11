import * as THREE from "three";
import { makeDrone, spinProps } from "./models.js";
import { droneById } from "./catalog.js";
import { buildWorld, clearWorld, tickWorld } from "./world.js";

const TEAM_A = 0xff6a2a;
const TEAM_B = 0x3ec8e8;
const FLEET = [
  { id: "racer", team: 0 },
  { id: "freestyle", team: 1 },
  { id: "toothpick", team: 0 },
  { id: "racer", team: 1 },
  { id: "seven", team: 0 },
  { id: "freestyle", team: 1 },
  { id: "toothpick", team: 1 },
  { id: "racer", team: 0 },
];

function dummy() {
  return { pause() {}, resume() {}, stop() {}, setMap() {} };
}

function poseAt(craft, t) {
  const p = craft.phase;
  const s = craft.speed;
  const u = t * s + p;
  const side = craft.team ? 1 : -1;
  return {
    x: Math.sin(u) * craft.rx + Math.sin(u * 2.15 + p) * 5.5 * side,
    y: 7.2 + Math.sin(u * 1.35 + p * 0.7) * 3.4 + craft.team * 0.6,
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
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x6a5340, 28, 95);
  scene.background = new THREE.Color(0x1a2838);

  const cam = new THREE.PerspectiveCamera(44, 1, 0.2, 220);
  cam.position.set(22, 5.4, 26);

  const nCraft = reduced ? 5 : FLEET.length;
  const crafts = [];
  for (let i = 0; i < nCraft; i++) {
    const def = FLEET[i];
    const base = droneById(def.id);
    const spec = { ...base, accent: def.team ? TEAM_B : TEAM_A, color: def.team ? 0x161c22 : 0x1a1210 };
    const mesh = makeDrone(spec);
    mesh.scale.setScalar(1.7);
    scene.add(mesh);
    crafts.push({
      mesh,
      team: def.team,
      phase: (i / nCraft) * Math.PI * 2,
      speed: 0.55 + (i % 3) * 0.12,
      rx: 11 + (i % 4) * 1.6,
      rz: 13 + (i % 3) * 1.8,
      fire: 0.3 + i * 0.17,
      hit: 0,
      prev: { x: 0, y: 8, z: 0 },
    });
  }

  const tracerN = reduced ? 12 : 22;
  const tracers = [];
  for (let i = 0; i < tracerN; i++) {
    const pos = new Float32Array(6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0], 3));
    const mat = new THREE.LineBasicMaterial({
      color: TEAM_A,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    line.visible = false;
    scene.add(line);
    tracers.push({ line, geo, pos, mat, life: 0, max: 0.16 });
  }
  let tracerI = 0;

  const sparkGeo = new THREE.SphereGeometry(0.18, 8, 6);
  const sparkMatA = new THREE.MeshBasicMaterial({ color: 0xffe08a });
  const sparkMatB = new THREE.MeshBasicMaterial({ color: 0xa8f0ff });
  const sparks = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(sparkGeo, sparkMatA);
    m.visible = false;
    scene.add(m);
    sparks.push({ mesh: m, life: 0 });
  }
  let sparkI = 0;

  const flash = new THREE.PointLight(0xffcc88, 0, 18, 2);
  scene.add(flash);

  function fireTracer(from, to, team) {
    const t = tracers[tracerI++ % tracers.length];
    t.pos[0] = from.x;
    t.pos[1] = from.y;
    t.pos[2] = from.z;
    t.pos[3] = to.x;
    t.pos[4] = to.y;
    t.pos[5] = to.z;
    t.geo.attributes.position.needsUpdate = true;
    t.mat.color.setHex(team ? TEAM_B : TEAM_A);
    t.mat.opacity = 1;
    t.life = t.max;
    t.line.visible = true;
  }

  function hitAt(p, team) {
    const s = sparks[sparkI++ % sparks.length];
    s.mesh.position.set(p.x, p.y, p.z);
    s.mesh.material = team ? sparkMatB : sparkMatA;
    s.mesh.visible = true;
    s.mesh.scale.setScalar(1);
    s.life = 0.22;
    flash.position.copy(s.mesh.position);
    flash.intensity = 6;
    flash.color.setHex(team ? TEAM_B : TEAM_A);
  }

  let raf = 0;
  let running = false;
  let t0 = 0;
  let last = 0;
  const hangar = canvas.closest("#hangar") || canvas.parentElement;
  let mapId = "yard";

  function keepers() {
    const s = new Set(crafts.map((c) => c.mesh));
    for (const t of tracers) s.add(t.line);
    for (const sp of sparks) s.add(sp.mesh);
    s.add(flash);
    return s;
  }

  function setMap(id) {
    mapId = id || "yard";
    const keep = keepers();
    for (const item of keep) scene.remove(item);
    clearWorld(scene);
    buildWorld(scene, mapId, { lite: reduced });
    scene.traverse((o) => {
      if (o.castShadow) o.castShadow = false;
      if (o.receiveShadow) o.receiveShadow = false;
    });
    for (const o of keep) {
      if (!o.parent) scene.add(o);
    }
  }

  function size() {
    const vw = Math.max(1, Math.floor(window.visualViewport?.width || innerWidth));
    const vh = Math.max(1, Math.floor(window.visualViewport?.height || innerHeight));
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
    cam.position.set(Math.sin(camT) * 24, 5.2 + Math.sin(camT * 0.55) * 1.6, Math.cos(camT) * 28);
    cam.lookAt(Math.sin(camT * 0.4) * 2, 8.4, Math.cos(camT * 0.3) * 1.5);

    for (const c of crafts) {
      const pos = poseAt(c, t0);
      const look = poseAt(c, t0 + 0.08);
      bankLook(c.mesh, pos, look, dt);
      c.mesh.position.set(pos.x, pos.y, pos.z);
      spinProps(c.mesh, 0.85, dt);
      if (c.hit > 0) {
        c.hit -= dt;
        const k = 1 + c.hit * 0.8;
        c.mesh.scale.setScalar(1.7 * k);
      } else {
        c.mesh.scale.setScalar(1.7);
      }
      c.prev = pos;
      c.fire -= dt;
      if (c.fire <= 0) {
        c.fire = 0.45 + Math.random() * 0.85;
        let best = null;
        let bestD = 22;
        for (const o of crafts) {
          if (o.team === c.team) continue;
          const d = Math.hypot(o.prev.x - pos.x, o.prev.y - pos.y, o.prev.z - pos.z);
          if (d < bestD) {
            bestD = d;
            best = o;
          }
        }
        if (best) {
          const jitter = (n) => n + (Math.random() - 0.5) * 0.7;
          fireTracer(
            pos,
            { x: jitter(best.prev.x), y: jitter(best.prev.y), z: jitter(best.prev.z) },
            c.team,
          );
          if (Math.random() < 0.38) {
            best.hit = 0.18;
            hitAt(best.prev, c.team);
          }
        }
      }
    }

    for (const tr of tracers) {
      if (tr.life <= 0) continue;
      tr.life -= dt;
      tr.mat.opacity = Math.max(0, tr.life / tr.max);
      if (tr.life <= 0) tr.line.visible = false;
    }
    for (const s of sparks) {
      if (s.life <= 0) continue;
      s.life -= dt;
      s.mesh.scale.setScalar(1 + (0.22 - s.life) * 8);
      s.mesh.visible = s.life > 0;
    }
    flash.intensity *= Math.exp(-8 * dt);

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
    renderer.dispose();
  }

  window.addEventListener("resize", size);
  document.addEventListener("visibilitychange", onVis);
  hangar?.classList.add("live");
  setMap(mapId);
  resume();
  return { pause, resume, stop, setMap };
}
