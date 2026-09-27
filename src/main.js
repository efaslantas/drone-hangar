import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CATALOG, droneById, paceInfo } from "./catalog.js";
import { createState, step, rotateVec, hoverThrottle, yawErrTo, withPayload } from "./physics.js";
import { poll, consume, bindStick, bindHold, setHoldFire, bindFlightTouches, bindTap, setControlProfile, setGamepadCalibration, captureGamepadCalibration } from "./input.js";
import { makeDrone, makeSurfaceVehicle, spinProps, makeNametag, droneSvg, setCamPodTilt } from "./models.js";
import { buildWorld, clearWorld, MAPS, bakeEnv, tickWorld, windFor } from "./world.js";
import { ROOMS } from "./rooms.js";
import { connect } from "./net.js";
import { createGfx, wantsWebGPU, setGpuPreference, hasWebGPU, gfxLabel } from "./gfx.js";
import { createShot, stepShots, applyHits, makeBot, stepBot, canFire, aimDir, PLAYER_HP, BOT_HP } from "./combat.js";
import { startBillboard } from "./billboard.js";
import { TRACKS, FREE, TEAM, AUTONOMY_COAST_RESPONSE, opById, ROOM_OP, wantsBots, playerCanBeHit, trackOf, trackDone, trackGate, isOpOpen, nextInTrack, firstOpenOp } from "./missions.js";
import { TEAM_CSS, TEAM_SPAWN, scoreLine, matchStatus, enemyTargets, resultModel } from "./team.js";
import { loadProgress, saveWin, saveLap, saveAssessment } from "./progress.js";
import { createRun, tickRun, canSwapBattery, nextGoal } from "./goals.js";
import { sfx } from "./sfx.js";
import { briefingModel, fmtTime } from "./briefing.js";
import { createCountdown, tickCountdown } from "./countdown.js";
import { dailyId, dailyOp, pruneDailyGhosts } from "./daily.js";
import { ambience } from "./ambience.js";
import { createTrace, recordTrace, sampleTrace, traceCount, traceDuration, saveGhost, loadGhost, encodeTrace, decodeTrace } from "./ghost.js";
import { createSimulationClock, advanceSimulationClock, resetSimulationClock } from "./simulation-clock.js";
import { createAssessment, sampleAssessment, finalizeAssessment } from "./assessment.js";
import { abortAutonomy, autonomyReport, createAutonomyRun, pauseAutonomy, returnToAutonomy, takeControl, tickAutonomy } from "./autonomy.js";
import { airCommand, surfaceCommand } from "./autopilot.js";
import { createSurfaceState, stepSurface } from "./surface.js";
import { autonomyViewModel, clearAutonomyPanel, renderAutonomyPanel } from "./autonomy-view.js";

const HOME_LAT = 41.1758;
const HOME_LON = 29.6113;
const CALIBRATION_KEY = "efa-hangar-gamepad-calibration-v1";

try {
  setGamepadCalibration(JSON.parse(localStorage.getItem(CALIBRATION_KEY) || "null"));
} catch {
  setGamepadCalibration(null);
}

const q0 = new URLSearchParams(location.search);
if (q0.get("room")) document.getElementById("room").value = q0.get("room");
if (q0.get("name")) document.getElementById("pilot").value = q0.get("name");

// "?ghost=<id>" challenge link: fetch the shared run and, once it resolves
// (well after the rest of this module has finished setting up the hangar
// UI), jump straight to that op's prep screen with the ghost ready to race.
let sharedGhost = null; // { opId, trace, meta }
if (q0.get("ghost")) {
  fetch(`/api/ghost/${encodeURIComponent(q0.get("ghost"))}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((rec) => {
      if (!rec) return;
      const tr = decodeTrace(rec.data);
      if (!tr || !traceDuration(tr)) return;
      if (opById(rec.op).id !== rec.op) return; // unknown/garbage op id in the link
      sharedGhost = { opId: rec.op, trace: tr, meta: rec.meta || {} };
      prepareFlight(rec.op);
    })
    .catch(() => {});
}

const hangarEl = document.getElementById("hangar");
const flightEl = document.getElementById("flight");
const cardsEl = document.getElementById("cards");
const canvas = document.getElementById("view");
const recEl = document.getElementById("rec");
const tcEl = document.getElementById("tc");
const gpsEl = document.getElementById("gps");
const teleEl = document.getElementById("tele");
const metaEl = document.getElementById("cam-meta");
const osdCrash = document.getElementById("osd-crash");

let selected = "whoop";
let selectedMap = "indoor";
let progress = loadProgress();
try {
  // Each daily keeps its own ghost (~100 KB); only today's and yesterday's are worth keeping.
  pruneDailyGhosts(localStorage);
} catch {
  /* storage unavailable */
}
// Start on the first lesson still to be won, never on a locked rung.
let selectedOp = firstOpenOp("school", progress)?.id || "hover";
let run = null;
let targets = [];
let cargo = []; // per parcel: { crate, ring, zone, beam } meshes (cargo op)
let loadedSpec = null; // the selected airframe with the parcel slung under it
let prevCargo = { delivered: 0, carrying: null, dropped: 0 };
let lastWave = -1;
let lastWonId = null;
let prevStep = -1;
let prevGates = 0;
let prevMarks = 0;
let prevShot = 0;
let prevWaveClear = false;
let prevLap = 0;
let countdown = null;
let goFlash = 0;
let resultShown = false;
let trace = null; // this run's flight recording, from GO
let ghost = null; // { trace, mesh, pose } — the pilot's best run on this op
let replay = null; // { trace, t, dur, chaseBefore } while replaying
let lastResult = null; // { run, prevBest } so the card can come back after a replay
let prevNear = { key: null, d: 0 };
let fpsAt = 0; // wall-clock start of the current fps window (not the clamped dt)
let fpsN = 0;
const replayPose = {};
let swapChirp = false;
let lowChirp = false;
let deadPackTimer = 0;
let autonomy = null;
const simClock = createSimulationClock(120, 0.1, 16);
const goalRoot = new THREE.Group();
let myId = "";
let angleOverride = null;
let chase = false;
let netStatus = "bağlanıyor…";
let recTime = 0;
const remotes = new Map();
const hangarPilots = new Map();
const _lerpP = new THREE.Vector3();
const _lerpQ = new THREE.Quaternion();
const _targetPos = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();
const _tiltQuat = new THREE.Quaternion();
const _xAxis = new THREE.Vector3(1, 0, 0);
const _aimTarget = new THREE.Vector3();
const _aimScreen = new THREE.Vector3();
const _chaseToCraft = new THREE.Vector3();
const _chaseToAim = new THREE.Vector3();
const _chaseLook = new THREE.Vector3();
const AUTONOMY_SEA_SPEC = { maxSpeed: 8, acceleration: 3.6, drag: 0.62, turnRate: 1.05, batteryDrain: 0.018 };

function createTrainingRun(op) {
  const next = createRun(op);
  next.assessment = createAssessment();
  return next;
}

// FPV camera uptilt: the pod looks UP from the frame plane, so when the quad
// pitches nose-down to fly forward the view still holds the horizon. One value
// feeds the camera, the rounds (combat.aimDir) and the pod model
// (setCamPodTilt) — barrel, reticle and shot cannot drift apart.
function camTiltRad() {
  const tilt = Number(document.getElementById("cam-tilt")?.value || 30);
  return (tilt * Math.PI) / 180;
}


const touchUi =
  window.matchMedia("(pointer: coarse)").matches ||
  window.matchMedia("(hover: none)").matches ||
  ("ontouchstart" in window && window.matchMedia("(max-width: 1366px)").matches);
// WebGPU when the browser has it (desktop by default, `?gpu=1|0` / Ayarlar
// toggle override); the classic WebGL renderer otherwise. Resolved before the
// world is built so materials know which path they are on.
const gfx = await createGfx(canvas, { touchUi, wantGpu: wantsWebGPU(touchUi) });
const scene = new THREE.Scene();
let play = buildWorld(scene, selectedMap, { lite: touchUi, gpu: gfx.node, sky: gfx.createSky, props: !touchUi });
let loadedMap = selectedMap;
const renderer = gfx.renderer;
renderer.setPixelRatio(Math.min(devicePixelRatio, touchUi ? 1 : 2));
renderer.shadowMap.enabled = !touchUi;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const fpvCam = new THREE.PerspectiveCamera(118, 1, 0.04, touchUi ? 260 : 520);
// Wide enough to keep both the craft and the elevated FPV gun line visible.
const chaseCam = new THREE.PerspectiveCamera(82, 1, 0.1, touchUi ? 260 : 520);
// Node path gets a light bloom (lamps, sun glints, muzzle) — the classic
// composer keeps its old no-bloom setup.
const { composer, renderPass, bodycam } = gfx.createComposer(scene, fpvCam, { bloom: gfx.node && !touchUi, ao: gfx.node && !touchUi, antialias: !touchUi, aa: !touchUi });
bodycam.uniforms.quality.value = touchUi ? 0 : 1;
if (!touchUi) bakeEnv(renderer, scene, gfx.PMREMGenerator);
{
  const gpuBox = document.getElementById("gpu");
  const gpuStat = document.getElementById("gpu-status");
  if (gpuBox) {
    gpuBox.checked = gfx.node;
    gpuBox.disabled = !hasWebGPU() && !gfx.node;
    gpuBox.addEventListener("change", () => {
      setGpuPreference(gpuBox.checked);
      location.reload();
    });
  }
  if (gpuStat) gpuStat.textContent = hasWebGPU() ? `şu an: ${gfxLabel(gfx.kind)}` : `tarayıcıda WebGPU yok · şu an: ${gfxLabel(gfx.kind)}`;
}

let craft = null;
let state = createState();
let spec = droneById(selected);
let last = performance.now();
let netAcc = 0;
let flying = false;
let crashFade = 0;
let exitArmed = false;
let exitArmedAt = 0;
const EXIT_CONFIRM_MS = 1500;
let helpOpen = !touchUi;
let shots = [];
let visShots = []; // other pilots' tracers: drawn, never tested for hits
let team = null; // { mine, match, kills, deaths, downUntil } while in a team room
const shotMeshes = [];
let bots = [];
let playerHp = PLAYER_HP;
let score = 0;
let fireCd = 0;
const shotGeo = new THREE.CylinderGeometry(0.012, 0.018, 2.4, 5);
shotGeo.rotateX(Math.PI / 2);
const shotMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.95 });
const botShotMat = new THREE.MeshBasicMaterial({ color: 0xff5533, transparent: true, opacity: 0.9 });
const muzzle = new THREE.PointLight(0xffcc66, 0, 6, 2);
fpvCam.add(muzzle);
muzzle.position.set(0, -0.02, -0.25);
let hitFlash = 0;
let dmgFlash = 0;
let camKick = 0;
const helpEl = document.getElementById("help");
const meterL = document.querySelector("#m-l i");
const meterR = document.querySelector("#m-r i");
const meterR2 = document.getElementById("m-r2");
const padStat = document.getElementById("pad-stat");

function setHelp(on) {
  helpOpen = on;
  helpEl.hidden = !on;
}

function toggleMute(force) {
  const on = typeof force === "boolean" ? force : !sfx.isMuted();
  sfx.setMuted(on);
  const el = document.getElementById("mute");
  if (el) el.checked = on;
  persistLoadout();
}

function hex(n) {
  return `#${n.toString(16).padStart(6, "0")}`;
}

function paceMarkup(spec) {
  const p = paceInfo(spec);
  return `<div class="pace" data-n="${p.n}"><span class="pips"><b></b><b></b><b></b><b></b><b></b></span><em>${p.label}</em></div>`;
}

CATALOG.forEach((d) => {
  const b = document.createElement("button");
  b.className = "card" + (d.id === selected ? " on" : "");
  b.dataset.id = d.id;
  b.innerHTML = `${droneSvg(d)}<div class="cls">${d.class} · ${d.span || ""}</div><h2>${d.name}</h2><p>${d.blurb}</p>${paceMarkup(d)}<div class="swatch" style="background:${hex(d.accent)}"></div>`;
  b.onclick = () => {
    if (opById(selectedOp).lockDrone) return;
    selected = d.id;
    for (const c of cardsEl.children) c.classList.toggle("on", c.dataset.id === selected);
    hangarPreview?.show(d.id);
    if (typeof hangarJoin === "function") hangarJoin();
    paintOps();
  };
  cardsEl.appendChild(b);
});

const mapsEl = document.getElementById("maps");
MAPS.forEach((m) => {
  const b = document.createElement("button");
  b.className = "card map-card" + (m.id === selectedMap ? " on" : "");
  b.dataset.id = m.id;
  b.innerHTML = `<div class="thumb" style="--tint:${m.tint}"></div><div class="cls">Harita</div><h2>${m.name}</h2><p>${m.blurb}</p>`;
  b.onclick = () => {
    if (opById(selectedOp).lockMap) return;
    selectedMap = m.id;
    for (const c of mapsEl.children) c.classList.toggle("on", c.dataset.id === selectedMap);
    billboard.setMap(m.id);
    paintOps();
  };
  mapsEl.appendChild(b);
});

const roomCardsEl = document.getElementById("room-cards");
function paintRooms(counts = []) {
  const nBy = Object.fromEntries(counts.map((c) => [c.id, c.n]));
  if (!roomCardsEl.children.length) {
    ROOMS.forEach((r) => {
      const b = document.createElement("button");
      b.className = "card room-card" + (r.id === (document.getElementById("room").value || "hangar") ? " on" : "");
      b.dataset.id = r.id;
      b.innerHTML = `<div class="cls">Oda</div><h2>${r.name}</h2><p>${r.blurb}</p><div class="count" data-count>0 kişi</div>`;
      b.onclick = () => {
        document.getElementById("room").value = r.id;
        for (const c of roomCardsEl.children) c.classList.toggle("on", c.dataset.id === r.id);
        const oid = ROOM_OP[r.id];
        if (oid && isOpOpen(opById(oid), progress)) {
          selectedOp = oid;
          applyOp(opById(oid));
          paintOpsCards();
        }
        hangarJoin();
        paintOps();
      };
      roomCardsEl.appendChild(b);
    });
  }
  for (const b of roomCardsEl.children) {
    const n = nBy[b.dataset.id] || 0;
    const el = b.querySelector("[data-count]");
    if (el) el.textContent = `${n} kişi`;
    b.classList.toggle("on", b.dataset.id === (document.getElementById("room").value || "hangar"));
  }
  paintOps();
}
paintRooms();

function createHangarPreview() {
  const canvas = document.getElementById("hangar-preview");
  const cap = document.getElementById("model-caption");
  if (!canvas) return { show() {} };
  let prev;
  try {
    prev = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return { show() {} };
  }
  prev.toneMapping = THREE.ACESFilmicToneMapping;
  prev.toneMappingExposure = 1.0;
  prev.outputColorSpace = THREE.SRGBColorSpace;
  prev.setPixelRatio(Math.min(devicePixelRatio, touchUi ? 1 : 1.5));
  const sc = new THREE.Scene();
  const studio = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(prev);
  sc.environment = pmrem.fromScene(studio, .04).texture;
  sc.environmentIntensity = .8;
  studio.dispose(); pmrem.dispose();
  sc.add(new THREE.HemisphereLight(0xfff4e8, 0x3a3a38, 1.15));
  const sun = new THREE.DirectionalLight(0xfff4e5, 2.6);
  sun.position.set(0.8, 1.4, 1.1);
  sc.add(sun);
  const rimLight = new THREE.DirectionalLight(0xc3d9ee, 2.1);
  rimLight.position.set(-1, .6, -.8);
  sc.add(rimLight);
  const cam = new THREE.PerspectiveCamera(38, 1, 0.02, 8);
  cam.position.set(0.42, 0.32, 0.52);
  cam.lookAt(0, 0, 0);
  let mesh = null;
  let previewRadius = .3;
  function show(id) {
    const d = droneById(id);
    if (mesh) sc.remove(mesh);
    mesh = makeDrone(d, camTiltRad());
    mesh.rotation.y = 0;
    const s = 0.22 / d.size;
    mesh.scale.setScalar(s);
    mesh.updateMatrixWorld(true);
    previewRadius = new THREE.Box3().setFromObject(mesh).getBoundingSphere(new THREE.Sphere()).radius;
    mesh.rotation.y = Math.PI * .8;
    sc.add(mesh);
    if (cap) cap.textContent = d.name;
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("spec-class", d.class);
    set("spec-span", d.span || "—");
    set("spec-mode", d.defaultMode || "angle");
    set("spec-pace", paceInfo(d).label);
  }
  show(selected);
  function tick() {
    requestAnimationFrame(tick);
    if (hangarEl.hidden || !mesh || !canvas.getClientRects().length) return;
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 200;
    prev.setSize(w, h, false);
    cam.aspect = w / Math.max(h, 1);
    const halfFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov*.5)) * Math.min(1,cam.aspect));
    cam.position.set(.42,.32,.52).normalize().multiplyScalar(previewRadius / Math.sin(halfFov) * 1.08);
    cam.lookAt(0,0,0);
    cam.updateProjectionMatrix();
    mesh.rotation.y += 0.003;
    // Stationary propellers expose the blade shape and motor hardware in the showroom.
    for (const disc of mesh.userData.discs || []) disc.visible = false;
    prev.render(sc, cam);
  }
  tick();
  return { show };
}
const hangarPreview = createHangarPreview();
const billboard = startBillboard(document.getElementById("hangar-live"), { reduced: touchUi });

function applyOp(op) {
  if (op.map) {
    selectedMap = op.map;
    for (const c of mapsEl.children) c.classList.toggle("on", c.dataset.id === selectedMap);
    billboard.setMap(selectedMap);
  }
  if (op.drone) {
    selected = op.drone;
    for (const c of cardsEl.children) c.classList.toggle("on", c.dataset.id === selected);
    hangarPreview?.show(selected);
  }
  cardsEl.classList.toggle("locked", !!op.lockDrone);
  mapsEl.classList.toggle("locked", !!op.lockMap);
  // The team match lives in the `team` room: picking the mode moves you there.
  if (op.kind === "team") {
    const roomEl = document.getElementById("room");
    if (roomEl && roomEl.value !== "team") {
      roomEl.value = "team";
      // Only move the highlight; the head-counts come from the next server broadcast.
      for (const c of roomCardsEl.children) c.classList.toggle("on", c.dataset.id === "team");
      hangarJoin();
    }
  }
}

function paintOpsCards() {
  const el = document.getElementById("ops");
  if (!el) return;
  progress = loadProgress();
  el.innerHTML = "";
  const card = (op, cls, extra = "") => {
    const open = isOpOpen(op, progress);
    const b = document.createElement("button");
    b.className = "card" + extra + (op.id === selectedOp ? " on" : "") + (open ? "" : " lock");
    b.dataset.id = op.id;
    const best = progress.best[op.id];
    const done = progress.done[op.id];
    const tag = done ? `bitti · ${Math.round(best ?? done.t)}s` : open ? "açık" : "kilit";
    b.innerHTML = `<div class="cls">${esc(cls)}</div><h2>${esc(op.name)}</h2><p>${esc(op.blurb)}</p><div class="best">${tag}</div>`;
    b.onclick = () => {
      if (!open) return;
      selectedOp = op.id;
      applyOp(op);
      paintOpsCards();
      paintOps();
    };
    el.appendChild(b);
  };
  card(FREE, "Serbest");
  const daily = dailyOp(dailyId());
  card(daily, `Günün görevi · ${daily.dateLabel}`, " daily");
  card(AUTONOMY_COAST_RESPONSE, "Otonom Operasyon", " autonomy");
  for (const track of TRACKS) {
    const done = trackDone(track, progress);
    const complete = done === track.ops.length;
    const gate = trackGate(track, progress);
    const head = document.createElement("div");
    head.className = "ops-track" + (complete ? " complete" : "") + (gate ? " locked" : "");
    head.innerHTML =
      `<div class="ops-track-head"><span class="cls">${esc(track.kicker)}</span><h3>${esc(track.name)}</h3>` +
      `<em>${done}/${track.ops.length}${complete ? " · DİPLOMA" : ""}</em></div>` +
      `<p>${esc(track.blurb)}${gate ? ` <b>Kilit: önce ${esc(gate.name)}.</b>` : ""}</p>`;
    el.appendChild(head);
    track.ops.forEach((op, i) => card(op, `${track.short} ${i + 1}/${track.ops.length}`));
  }
}
paintOpsCards();
applyOp(opById(selectedOp));

const LOAD_KEY = "efa-hangar-loadout-v1";
(function restoreLoadout() {
  try {
    const o = JSON.parse(localStorage.getItem(LOAD_KEY) || "null");
    if (!o) return;
    const night = document.getElementById("night");
    const real = document.getElementById("real");
    const cam = document.getElementById("cam-tilt");
    const gun = document.getElementById("gun");
    const look = document.getElementById("camera-look");
    const control = document.getElementById("control-profile");
    if (night) night.checked = !!o.night;
    // Existing players get the training default once; later choices persist.
    if (real) real.checked = o.trainingVersion ? !!o.real : true;
    if (cam && o.cam) cam.value = String(o.cam);
    if (gun && o.gun) gun.value = String(o.gun);
    if (look && o.look && o.visualVersion === 2) look.value = String(o.look);
    if (control && o.control) control.value = String(o.control);
    const mute = document.getElementById("mute");
    if (mute) mute.checked = !!o.mute;
    if (o.mute) sfx.setMuted(true);
    const pilot = document.getElementById("pilot");
    if (pilot && o.name && !q0.get("name")) pilot.value = o.name;
  } catch {
    /* ignore */
  }
})();
setControlProfile(document.getElementById("control-profile")?.value || "training");
function persistLoadout() {
  try {
    localStorage.setItem(
      LOAD_KEY,
      JSON.stringify({
        night: !!document.getElementById("night")?.checked,
        real: !!document.getElementById("real")?.checked,
        mute: !!document.getElementById("mute")?.checked,
        cam: document.getElementById("cam-tilt")?.value || "30",
        gun: document.getElementById("gun")?.value || "std",
        look: document.getElementById("camera-look")?.value || "0",
        control: document.getElementById("control-profile")?.value || "training",
        trainingVersion: 1,
        visualVersion: 2,
        name: document.getElementById("pilot")?.value || "pilot",
      }),
    );
  } catch {
    /* ignore */
  }
}
for (const id of ["night", "real", "cam-tilt", "gun", "camera-look", "control-profile", "pilot"]) {
  document.getElementById(id)?.addEventListener("change", persistLoadout);
}
document.getElementById("control-profile")?.addEventListener("change", (event) => setControlProfile(event.target.value));
document.getElementById("calibrate-pad")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const status = document.getElementById("calibrate-status");
  button.disabled = true;
  try {
    const calibration = await captureGamepadCalibration(4000, (ratio) => {
      if (status) status.textContent = `İki stick'i tam daire gezdir · ${Math.ceil(4 * (1 - ratio))} sn`;
    });
    if (!calibration) throw new Error("Kol bağlantısı kesildi");
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(calibration));
    if (status) status.textContent = "Kalibrasyon kaydedildi ✓";
  } catch (error) {
    if (status) status.textContent = error?.message || "Kalibrasyon tamamlanamadı";
  } finally {
    button.disabled = false;
  }
});
// A new angle has to reach the craft already built, not just the next one.
document.getElementById("cam-tilt")?.addEventListener("change", () => {
  setCamPodTilt(craft, camTiltRad());
  hangarPreview?.show(selected);
});
document.getElementById("mute")?.addEventListener("change", (e) => {
  sfx.setMuted(!!e.target.checked);
  persistLoadout();
});

const preparationPanels = document.querySelector(".hangar-tabpanels");
const homeFeatures = preparationPanels.querySelector('[data-tab="ozellikler"]');
homeFeatures.hidden = false;
homeFeatures.removeAttribute("data-tab");
document.getElementById("home-hero").append(homeFeatures);
const preparationLayout = document.createElement("section");
preparationLayout.className = "preparation-layout";
preparationLayout.dataset.tab = "platform";
const preparationChoices = document.createElement("div");
preparationChoices.className = "preparation-choices";
// Grab it while the platform panel is still attached: the loop below moves that
// panel into the (not yet inserted) choices column, out of getElementById's reach.
const flightBriefing = document.getElementById("flight-briefing");
preparationLayout.append(document.querySelector(".model-stage"), preparationChoices);
for (const name of ["platform", "operasyon", "arena"]) {
  const panel = preparationPanels.querySelector(`[data-tab="${name}"]`);
  panel.removeAttribute("data-tab");
  panel.hidden = false;
  preparationChoices.append(panel);
}
// Briefing closes the right-hand column: read it last, then KALKIŞ YAP right below.
preparationChoices.append(flightBriefing);
preparationPanels.prepend(preparationLayout);
function showPreparationTab(tab) {
  for (const panel of document.querySelectorAll(".hangar-tabpanels > [data-tab]")) {
    panel.hidden = panel.dataset.tab !== tab;
  }
}
function prepareFlight(op, friends = false) {
  hangarEl.dataset.screen = "prepare";
  hangarEl.classList.toggle("with-friends", friends);
  document.getElementById("home-back").hidden = false;
  selectedOp = op; applyOp(opById(op)); paintOpsCards(); paintOps();
  document.querySelector('#hangar-tabs [data-tab="platform"]').click();
}
bindTap(document.getElementById("home-fly"), () => prepareFlight("free"));
bindTap(document.getElementById("home-school"), () => prepareFlight(firstOpenOp("school", loadProgress())?.id || "hover"));
bindTap(document.getElementById("home-daily"), () => prepareFlight(dailyId()));
{
  const d = dailyOp(dailyId());
  const sub = document.getElementById("home-daily-sub");
  if (sub && d) sub.textContent = `${d.dateLabel} · ${d.blurb.split(". ")[0]}`;
}
bindTap(document.getElementById("home-friends"), () => prepareFlight("free", true));
bindTap(document.getElementById("home-back"), () => {
  hangarEl.dataset.screen = "home";
  document.getElementById("home-back").hidden = true;
});
showPreparationTab("platform");
document.querySelectorAll("#hangar-tabs button[data-tab]").forEach((btn) => {
  bindTap(btn, () => {
    for (const b of document.querySelectorAll("#hangar-tabs button[data-tab]")) {
      b.classList.toggle("on", b === btn);
    }
    showPreparationTab(btn.dataset.tab);
  });
});

const fsBtn = document.getElementById("fullscreen-btn");
function updateFsBtn() {
  if (fsBtn) fsBtn.textContent = document.fullscreenElement ? "Tam Ekrandan Çık" : "Tam Ekran";
}
bindTap(fsBtn, () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
});
document.addEventListener("fullscreenchange", updateFsBtn);
updateFsBtn();

if ("ontouchstart" in window || touchUi) document.body.classList.add("touch");

let wakeLock = null;
async function lockWake() {
  try {
    wakeLock = await navigator.wakeLock?.request("screen");
    wakeLock?.addEventListener?.("release", () => {
      if (flying && document.visibilityState === "visible") lockWake();
    });
  } catch {
    wakeLock = null;
  }
}
function unlockWake() {
  wakeLock?.release?.();
  wakeLock = null;
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && flying) {
    sfx.unlock();
    lockWake();
    resize();
  }
});
window.addEventListener("pageshow", () => {
  if (flying) {
    sfx.unlock();
    lockWake();
    resize();
  }
});
bindStick(document.getElementById("st-l"), "left");
bindStick(document.getElementById("st-r"), "right");
bindFlightTouches(flightEl);
const fireBar = document.getElementById("btn-fire");
if (fireBar) bindHold(fireBar, setHoldFire);
bindTap(document.getElementById("btn-arm-touch"), () => {
  consume("arm");
  toggleArm();
});
if (!helpOpen) document.getElementById("help").hidden = true;
const osdEl = document.getElementById("osd");
if (osdEl) osdEl.hidden = touchUi;

const net = connect({
  onStatus(s) {
    netStatus = s;
    document.getElementById("netstat").textContent = s;
  },
  onHello(msg) {
    myId = msg.id;
    netStatus = "sunucuya bağlı";
    document.getElementById("netstat").textContent = netStatus;
    renderPilots(msg.room, msg.peers, msg.id);
    for (const p of remotes.keys()) dropRemote(p);
    for (const p of msg.peers) upsertRemote(p.id, p.meta, p.state);
    team = msg.team ? { mine: msg.team, match: null, kills: 0, deaths: 0, downUntil: 0 } : null;
    if (msg.match) applyMatch(msg.match);
    paintOps();
  },
  onMatch(msg) {
    applyMatch(msg);
  },
  onHit(msg) {
    if (msg.to === myId && inTeamOp()) {
      playerHp = Math.max(0, msg.hp | 0);
      dmgFlash = 1;
      sfx.hit();
    }
  },
  onDown(msg) {
    if (team?.match) team.match.scores = msg.scores || team.match.scores;
    const r = remotes.get(msg.id);
    if (r) r.alive = false;
    if (!team) return;
    if (msg.by === myId) {
      team.kills += 1;
      score += 1;
    }
    if (msg.id === myId) {
      team.deaths += 1;
      team.downUntil = performance.now() + 4000;
      playerHp = 0;
      if (flying && inTeamOp() && !state.crashed) {
        state.crashed = true;
        state.crashReason = "vuruldun";
        state.armed = false;
      }
    }
  },
  onRespawn(msg) {
    const r = remotes.get(msg.id);
    if (r) r.alive = true;
    if (msg.id === myId && team) {
      team.downUntil = 0;
      playerHp = msg.hp | 0 || PLAYER_HP;
    }
  },
  onJoin(msg) {
    upsertRemote(msg.id, msg.meta, null);
    bumpPilot(msg);
  },
  onLeave(msg) {
    dropRemote(msg.id);
    dropPilot(msg.id);
  },
  onState(msg) {
    const r = remotes.get(msg.id);
    if (!r) return;
    r.target = msg;
  },
  onRooms(list) {
    paintRooms(list);
  },
});

function shareUrl() {
  const u = new URL(location.href);
  u.searchParams.set("room", document.getElementById("room").value || "hangar");
  const n = document.getElementById("pilot").value;
  if (n) u.searchParams.set("name", n);
  return u.toString();
}
function refreshShare() {
  const el = document.getElementById("share-url");
  if (el) el.value = shareUrl();
}
function hangarJoin() {
  net.join(
    document.getElementById("room").value || "hangar",
    document.getElementById("pilot").value || "pilot",
    selected,
  );
  refreshShare();
}
hangarJoin();
refreshShare();
document.getElementById("room").addEventListener("input", hangarJoin);
document.getElementById("pilot").addEventListener("change", hangarJoin);
document.getElementById("copy-share").onclick = async () => {
  const el = document.getElementById("share-url");
  const v = el.value;
  const ok = () => {
    document.getElementById("copy-share").textContent = "Kopyalandı";
    setTimeout(() => {
      document.getElementById("copy-share").textContent = "Kopyala";
    }, 1200);
  };
  try {
    await navigator.clipboard.writeText(v);
    ok();
  } catch {
    el.removeAttribute("readonly");
    el.select();
    el.setSelectionRange(0, v.length);
    try {
      if (document.execCommand("copy")) ok();
    } catch {
      /* Safari: kullanıcı elle kopyalar */
    }
    el.setAttribute("readonly", "");
  }
};

function renderPilots(room, peers, selfId) {
  hangarPilots.clear();
  hangarPilots.set(selfId || "me", { name: document.getElementById("pilot").value || "pilot" });
  for (const p of peers || []) hangarPilots.set(p.id, { name: p.meta?.name || "pilot" });
  const el = document.getElementById("pilots");
  const names = [...hangarPilots.values()].map((p) => p.name).join(", ");
  el.textContent = `Bu odada şimdi: ${names} (${hangarPilots.size} kişi)`;
  paintOps();
}
function bumpPilot(msg) {
  hangarPilots.set(msg.id, { name: msg.meta?.name || "pilot" });
  const names = [...hangarPilots.values()].map((p) => p.name).join(", ");
  document.getElementById("pilots").textContent = `Bu odada şimdi: ${names} (${hangarPilots.size} kişi)`;
  paintOps();
}
function dropPilot(id) {
  hangarPilots.delete(id);
  const names = [...hangarPilots.values()].map((p) => p.name).join(", ") || "kimse yok";
  document.getElementById("pilots").textContent = `Bu odada şimdi: ${names} (${hangarPilots.size} kişi)`;
  paintOps();
}

function paintOps() {
  const d = droneById(selected);
  const m = MAPS.find((x) => x.id === selectedMap) || MAPS[0];
  const rid = document.getElementById("room")?.value || "hangar";
  const r = ROOMS.find((x) => x.id === rid) || ROOMS[0];
  const n = hangarPilots?.size || 0;
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  set("ops-drone", d.name);
  set("ops-pace", paceInfo(d).label);
  set("ops-map", m.name);
  set("ops-room", r.name);
  set("ops-room-n", `${n} kişi`);
  set("ops-op", opById(selectedOp).name);
  const where = document.getElementById("go-where");
  const op = opById(selectedOp);
  if (where) where.textContent = `${op.name} · ${m.name}`;
  set("spec-class", d.class);
  set("spec-span", d.span || "—");
  set("spec-mode", d.defaultMode || "angle");
  set("spec-pace", paceInfo(d).label);
  paintBriefing();
}

function esc(v) {
  return String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function paintBriefing() {
  const rowsEl = document.getElementById("briefing-rows");
  if (!rowsEl) return;
  const op = opById(selectedOp);
  const track = op.kind === "free" ? null : trackOf(op.id);
  const m = briefingModel({
    op,
    opIndex: track ? track.ops.indexOf(op) + 1 : 0,
    opTotal: track ? track.ops.length : 0,
    trackName: track ? track.name : "Görev",
    map: MAPS.find((x) => x.id === selectedMap) || MAPS[0],
    drone: droneById(selected),
    droneName: (id) => droneById(id).name,
    night: op.night ?? !!document.getElementById("night")?.checked,
    real: op.real ?? !!document.getElementById("real")?.checked,
    progress,
  });
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  set("briefing-title", m.title);
  set("briefing-kicker", m.kicker);
  rowsEl.innerHTML = m.rows
    .map((r) => `<div data-tone="${r.tone || ""}"><dt>${esc(r.k)}</dt><dd>${esc(r.v)}${r.sub ? `<small>${esc(r.sub)}</small>` : ""}</dd></div>`)
    .join("");
  const note = document.getElementById("briefing-note");
  if (note) {
    note.hidden = !m.note;
    note.textContent = m.note;
  }
}
for (const id of ["night", "real"]) document.getElementById(id)?.addEventListener("change", paintBriefing);

function upsertRemote(id, meta, st) {
  if (id === myId) return;
  dropRemote(id);
  const dspec = droneById(meta?.drone);
  const mesh = makeDrone(dspec, camTiltRad());
  const side = meta?.team || null;
  mesh.add(makeNametag(meta?.name || "pilot", side ? TEAM_CSS[side] : undefined));
  scene.add(mesh);
  remotes.set(id, { mesh, spec: dspec, target: st, meta, team: side, alive: true, fireAcc: 0 });
}

function inTeamOp() {
  return !!team?.mine && opById(selectedOp).kind === "team";
}

// Server snapshot of the team match: who is on which side, who is down, the
// clock and the scores. A match starting clears the card; one ending shows it.
function applyMatch(msg) {
  if (!team) team = { mine: null, match: null, kills: 0, deaths: 0, downUntil: 0 };
  const was = team.match;
  team.match = msg;
  for (const p of msg.players || []) {
    const r = remotes.get(p.id);
    if (r) {
      r.alive = p.alive;
      if (r.team !== p.team) {
        r.team = p.team;
        // Re-tint the nametag if the side only became known now.
        for (const ch of [...r.mesh.children]) if (ch.isSprite) r.mesh.remove(ch);
        r.mesh.add(makeNametag(r.meta?.name || "pilot", TEAM_CSS[p.team]));
      }
    }
    if (p.id === myId) {
      team.mine = p.team;
      if (p.alive) playerHp = p.hp;
    }
  }
  if (msg.running && !was?.running) {
    team.kills = 0;
    team.deaths = 0;
    team.downUntil = 0;
    playerHp = PLAYER_HP;
    if (flying && inTeamOp()) hideResult();
  }
  if (msg.ended && !was?.ended && flying && inTeamOp()) showTeamResult();
}

function showTeamResult() {
  const card = document.getElementById("result-card");
  if (!card || !team) return;
  const m = resultModel(team.match, team.mine, team.kills, team.deaths);
  card.classList.toggle("lost", m.won === false);
  document.getElementById("result-kicker").textContent = m.kicker;
  document.getElementById("result-title").textContent = m.title;
  document.getElementById("result-time").innerHTML = esc(m.score);
  document.getElementById("result-rows").innerHTML = m.rows.map((x) => `<div><dt>${esc(x.k)}</dt><dd>${esc(x.v)}</dd></div>`).join("");
  const laps = document.getElementById("result-laps");
  if (laps) laps.hidden = true;
  document.getElementById("result-hint").textContent = m.hint;
  const rb = document.getElementById("result-replay");
  if (rb) rb.hidden = true;
  lastResult = null;
  card.hidden = false;
  flightEl.classList.add("has-result");
  resultShown = true;
}

function dropRemote(id) {
  const r = remotes.get(id);
  if (!r) return;
  scene.remove(r.mesh);
  remotes.delete(id);
}

function snapCam() {
  _targetQuat.set(state.qx, state.qy, state.qz, state.qw);
  if (!chase) _targetQuat.multiply(_tiltQuat.setFromAxisAngle(_xAxis, camTiltRad()));
  const [ox, oy, oz] = rotateVec(state.qw, state.qx, state.qy, state.qz, 0, spec.size * 0.55, spec.size * 0.12);
  fpvCam.position.set(state.x + ox, state.y + oy, state.z + oz);
  fpvCam.quaternion.copy(_targetQuat);
}

function clearShots() {
  for (const m of shotMeshes) scene.remove(m);
  shotMeshes.length = 0;
  shots = [];
  visShots = [];
}

function clearGoals() {
  scene.remove(goalRoot);
  while (goalRoot.children.length) goalRoot.remove(goalRoot.children[0]);
  for (const t of targets) if (t.mesh) scene.remove(t.mesh);
  targets = [];
  for (const c of cargo) for (const m of [c.crate, c.ring, c.zone, c.beam]) scene.remove(m);
  cargo = [];
}

function disposeObject(root) {
  root?.traverse?.((obj) => {
    obj.geometry?.dispose?.();
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of materials) material?.dispose?.();
  });
}

function clearAutonomy() {
  if (autonomy?.root) {
    scene.remove(autonomy.root);
    disposeObject(autonomy.root);
  }
  autonomy = null;
  clearAutonomyPanel(document.getElementById("autonomy-panel"));
}

function routeLine(points, color, y = 0.2) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p.x, p.y ?? y, p.z)));
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.78 }));
}

function setupAutonomy(op) {
  clearAutonomy();
  if (op.kind !== "autonomy") return;
  const root = new THREE.Group();
  root.name = "autonomy-operation";
  const task = createAutonomyRun(op, 0);
  const boats = op.seaVehicles.map((cfg) => {
    const surface = createSurfaceState(cfg.id, cfg.x, cfg.z, cfg.heading);
    surface.battery = cfg.battery;
    const mesh = makeSurfaceVehicle(cfg);
    mesh.position.set(surface.x, 0, surface.z);
    root.add(mesh);
    const trail = routeLine([{ x: surface.x, z: surface.z }, { x: surface.x, z: surface.z }], cfg.id === "ida-1" ? 0x65d6ff : 0xffb020, 0.12);
    root.add(trail);
    return { cfg, state: surface, mesh, trail, points: [{ x: surface.x, z: surface.z }] };
  });
  root.add(routeLine(op.airRoute, 0x8ee7ff, 0.32));
  for (const boat of boats) root.add(routeLine([boat.state, task.target], 0xffb020, 0.14));
  const incident = new THREE.Mesh(
    new THREE.TorusGeometry(op.verifyRadius, 0.16, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0xff553d, transparent: true, opacity: 0.82 }),
  );
  incident.rotation.x = -Math.PI / 2;
  incident.position.set(task.target.x, 0.18, task.target.z);
  root.add(incident);
  scene.add(root);
  autonomy = { task, root, boats, routeIndex: 0, now: 0, trailAcc: 0, incident };
  renderAutonomyPanel(document.getElementById("autonomy-panel"), autonomyViewModel(task, autonomyVehicles()));
}

function autonomyVehicles() {
  if (!autonomy) return [];
  return [
    { id: "iha-1", role: "İHA", speed: Math.hypot(state.vx, state.vy, state.vz), battery: state.battery * 100 },
    ...autonomy.boats.map((boat) => ({ id: boat.state.id, role: "İDA", speed: boat.state.speed, battery: boat.state.battery })),
  ];
}

function autonomyAirTarget() {
  if (!autonomy) return null;
  if (["DETECTED", "SEA_DISPATCH", "JOINT_VERIFY", "COMPLETE"].includes(autonomy.task.phase)) {
    return { ...autonomy.task.target, y: autonomy.task.op.spawn.y };
  }
  const route = autonomy.task.op.airRoute;
  const target = route[autonomy.routeIndex % route.length];
  if (Math.hypot(state.x - target.x, state.y - target.y, state.z - target.z) < 3) autonomy.routeIndex = (autonomy.routeIndex + 1) % route.length;
  return target;
}

function stepAutonomyPhysics(simDt, input, activeSpec) {
  const controlled = autonomy.task.controlledByVehicle;
  const flightInput = controlled === "iha-1" ? input : airCommand(state, autonomyAirTarget(), activeSpec);
  step(state, flightInput, activeSpec, simDt, play);
  for (const boat of autonomy.boats) {
    let command = { throttle: 0, steer: 0 };
    if (controlled === boat.state.id) command = { throttle: Math.max(0, input.lift || 0), steer: input.yaw || 0 };
    else if (boat.state.id === autonomy.task.selectedSeaId && ["SEA_DISPATCH", "JOINT_VERIFY"].includes(autonomy.task.phase)) {
      command = surfaceCommand(boat.state, autonomy.task.target, AUTONOMY_SEA_SPEC);
    }
    stepSurface(boat.state, command, AUTONOMY_SEA_SPEC, simDt, play.water);
  }
}

function updateAutonomyScene(dt) {
  if (!autonomy) return;
  autonomy.trailAcc += dt;
  for (const boat of autonomy.boats) {
    boat.mesh.position.set(boat.state.x, 0, boat.state.z);
    boat.mesh.rotation.y = boat.state.heading;
    boat.mesh.userData.rudder.rotation.y = -boat.state.turnRate * 0.45;
    if (autonomy.trailAcc >= 0.5) {
      boat.points.push({ x: boat.state.x, z: boat.state.z });
      const cap = touchUi ? 80 : 240;
      if (boat.points.length > cap) boat.points.shift();
      boat.trail.geometry.dispose();
      boat.trail.geometry = new THREE.BufferGeometry().setFromPoints(boat.points.map((p) => new THREE.Vector3(p.x, 0.12, p.z)));
    }
  }
  if (autonomy.trailAcc >= 0.5) autonomy.trailAcc = 0;
  const pulse = 1 + Math.sin(autonomy.now * 4) * 0.08;
  autonomy.incident.scale.setScalar(pulse);
}

function tickAutonomyFrame(dt) {
  if (!autonomy || !run) return;
  autonomy.now += dt;
  tickAutonomy(autonomy.task, {
    now: autonomy.now,
    air: state,
    sea: autonomy.boats.map((boat) => boat.state),
  });
  run.t = autonomy.task.elapsed;
  if (autonomy.task.phase === "COMPLETE") {
    run.won = true;
    run.reason = autonomy.task.reason;
  } else if (["FAILED", "ABORTED"].includes(autonomy.task.phase)) {
    run.lost = true;
    run.reason = autonomy.task.reason;
  }
  run.autonomyReport = autonomyReport(autonomy.task);
  if (!autonomy.reported) {
    renderAutonomyPanel(document.getElementById("autonomy-panel"), autonomyViewModel(autonomy.task, autonomyVehicles()));
  }
}

function finishAutonomyResult() {
  if (!autonomy || !run || autonomy.reported) return;
  if (!["COMPLETE", "FAILED", "ABORTED"].includes(autonomy.task.phase)) return;
  autonomy.reported = true;
  const won = autonomy.task.phase === "COMPLETE";
  run.won = won;
  run.lost = !won;
  run.reason = autonomy.task.reason;
  run.t = autonomy.task.elapsed;
  run.autonomyReport = autonomyReport(autonomy.task);
  net.sendResult(run.op.id, run.op.name, won, run.t, undefined, { ranked: false });
  if (won) sfx.win();
  else sfx.fail();
  if (ghost) ghost.mesh.visible = false;
  document.getElementById("autonomy-panel").hidden = true;
  showResult(run, null);
}

function ringMesh(g, color, { from = null, stepIndex = -1 } = {}) {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(g.r || 2.4, 0.1, 8, 22),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
  );
  m.position.set(g.x, g.y, g.z);
  if (from) {
    const direction = new THREE.Vector3(g.x - from.x, g.y - from.y, g.z - from.z);
    if (direction.lengthSq() > 1e-8) m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize());
  }
  m.userData.stepIndex = stepIndex;
  goalRoot.add(m);
  return m;
}

function buildGoals(op) {
  clearGoals();
  if (!op || op.kind === "free") return;
  scene.add(goalRoot);
  if (op.kind === "school") {
    let from = op.spawn || { x: 0, y: 2, z: 0 };
    for (let stepIndex = 0; stepIndex < op.steps.length; stepIndex++) {
      const st = op.steps[stepIndex];
      if (["hover", "altitude", "speed", "heading", "gate"].includes(st.t)) ringMesh(st, st.t === "gate" ? 0x66ddff : 0xffcc33, { from, stepIndex });
      if (Number.isFinite(st.x) && Number.isFinite(st.y) && Number.isFinite(st.z)) from = st;
    }
  }
  if (op.kind === "race") {
    for (let i = 0; i < op.gates.length; i++) ringMesh(op.gates[i], 0xffb020, { from: i ? op.gates[i - 1] : op.spawn, stepIndex: i });
  }
  if (op.kind === "recon") for (const g of op.marks) ringMesh(g, 0x3ec8e8);
  if (op.kind === "patrol") {
    const mat = new THREE.MeshStandardMaterial({ color: 0xc4321a, roughness: 0.5, metalness: 0.15, emissive: 0x4a1008, emissiveIntensity: 0.4 });
    for (let i = 0; i < (op.targets || []).length; i++) {
      const t = op.targets[i];
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 1.15, 10), mat);
      mesh.position.set(t.x, t.y, t.z);
      scene.add(mesh);
      targets.push({ id: `t${i}`, x: t.x, y: t.y, z: t.z, hp: 1, alive: true, mesh });
    }
  }
  if (op.kind === "cargo") {
    const tints = [0xc98a2b, 0x3f7fbf, 0xb0443a, 0x4f9a5a];
    const flat = (pt, color) => {
      const m = new THREE.Mesh(
        new THREE.TorusGeometry(pt.r || 2.4, 0.09, 8, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(pt.x, (pt.y || 0) + 0.08, pt.z);
      return m;
    };
    (op.parcels || []).forEach((p, i) => {
      const tint = tints[i % tints.length];
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.7, 0.9),
        new THREE.MeshStandardMaterial({ color: tint, roughness: 0.85, metalness: 0.05 }),
      );
      crate.castShadow = true;
      crate.position.set(p.from.x, (p.from.y || 0) + 0.35, p.from.z);
      const ring = flat(p.from, tint);
      const zone = flat(p.to, 0x3ec8e8);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 7, 8),
        new THREE.MeshBasicMaterial({ color: 0x3ec8e8, transparent: true, opacity: 0.15 }),
      );
      beam.position.set(p.to.x, (p.to.y || 0) + 3.5, p.to.z);
      for (const m of [crate, ring, zone, beam]) scene.add(m);
      cargo.push({ crate, ring, zone, beam });
    });
    prevCargo = { delivered: 0, carrying: null, dropped: 0 };
  }
}

// Crates sit at their pickup ring, hang under the airframe while carried
// (chase camera only — in FPV it would fill the bottom of the lens), then
// rest at the drop point. The active drop zone glows, the next pickup too.
function paintCargo() {
  if (!run || run.op.kind !== "cargo") return;
  const nextIdx = run.carrying == null ? run.parcels.findIndex((x) => !x.done) : -1;
  run.parcels.forEach((p, i) => {
    const c = cargo[i];
    if (!c) return;
    const active = run.carrying === i;
    if (active) {
      c.crate.visible = chase;
      c.crate.position.set(state.x, state.y - spec.size * 0.5 - 0.55, state.z);
      c.crate.quaternion.set(state.qx, state.qy, state.qz, state.qw);
    } else {
      const at = p.done ? p.to : p.from;
      c.crate.visible = true;
      c.crate.position.set(at.x, (at.y || 0) + 0.35, at.z);
      c.crate.quaternion.identity();
    }
    c.ring.visible = !p.done && !active;
    c.ring.material.opacity = i === nextIdx ? 0.95 : 0.35;
    c.zone.visible = !p.done;
    c.zone.material.color.setHex(active ? 0xffee55 : 0x3ec8e8);
    c.zone.material.opacity = active ? 0.95 : 0.3;
    c.beam.visible = !p.done;
    c.beam.material.color.setHex(active ? 0xffee55 : 0x3ec8e8);
    c.beam.material.opacity = active ? 0.45 : 0.1;
  });
}

function spawnBots(nBot) {
  for (const b of bots) if (b.mesh) scene.remove(b.mesh);
  bots = [];
  const n = Math.max(0, nBot | 0);
  if (!n) return;
  const op = run?.op || opById(selectedOp);
  // Dogfight waves stay on quick 5"/3" frames; free-flight bots mix in the slower
  // classes. An op can pin one frame for every bot (the armoured heavy in "Ağır tank").
  const pool = op.botDrone
    ? [op.botDrone]
    : op.kind === "waves"
      ? ["racer", "freestyle", "toothpick"]
      : ["racer", "freestyle", "toothpick", "cinewhoop", "seven"];
  for (let i = 0; i < n; i++) {
    const botSpec = droneById(pool[i % pool.length]);
    const a = (i / Math.max(n, 1)) * Math.PI * 2;
    const bot = makeBot(`bot-${i}`, botSpec, Math.sin(a) * 10, 8, -32 + Math.cos(a) * 8, i);
    bot.hp = op.botHp || BOT_HP;
    bot.noRespawn = run?.op.kind === "waves";
    bot.mesh = makeDrone(botSpec, camTiltRad());
    const tag = makeNametag("BOT");
    tag.scale.set(2.4, 0.6, 1);
    tag.position.y = 0.7;
    bot.mesh.add(tag);
    scene.add(bot.mesh);
    bots.push(bot);
  }
}

function addShotMesh(shot) {
  const m = new THREE.Mesh(shotGeo, shot.owner === "player" ? shotMat : botShotMat);
  scene.add(m);
  shotMeshes.push(m);
  shot.mesh = m;
}

function spawn() {
  const op = opById(selectedOp);
  spec = droneById(selected);
  loadedSpec = op.kind === "cargo" ? withPayload(spec, op.payload) : null;
  sfx.setVoice(spec);
  hideResult();
  if (craft) scene.remove(craft);
  craft = makeDrone(spec, camTiltRad());
  scene.add(craft);
  let sp = op.spawn || { x: 0, y: 8, z: -14 };
  if (op.kind === "team" && team?.mine && TEAM_SPAWN[team.mine]) {
    // Each side lifts off from its own end, a few metres apart so a squad doesn't stack.
    const b = TEAM_SPAWN[team.mine];
    sp = { x: b.x + (Math.random() - 0.5) * 8, y: b.y, z: b.z + (Math.random() - 0.5) * 8 };
  }
  state = createState(sp.x, sp.y, sp.z);
  if (op.startGrounded) {
    state.y = spec.size * 0.45;
    state.grounded = true;
    state.groundedFor = 1;
  }
  state.armed = !op.startGrounded;
  state.motor = state.armed ? hoverThrottle(spec) : 0;
  state.throttleOut = state.motor;
  state.altHold = state.armed ? state.y : null;
  angleOverride = op.requiredFlightMode ? op.requiredFlightMode === "angle" : spec.defaultMode === "angle";
  resetSimulationClock(simClock);
  chase = false;
  recTime = 0;
  crashFade = 0;
  playerHp = PLAYER_HP;
  fireCd = 0;
  osdCrash.hidden = true;
  fpvCam.fov = spec.fpv ? 118 : 88;
  fpvCam.updateProjectionMatrix();
  clearShots();
  if (op.kind === "waves") {
    lastWave = 0;
    spawnBots(op.waves[0]);
  } else if (wantsBots(op)) spawnBots(op.bots || (touchUi ? 3 : 5));
  else spawnBots(0);
  setupAutonomy(op);
  snapCam();
}

function resize() {
  const vv = window.visualViewport;
  const w = Math.max(1, Math.floor(vv?.width || flightEl.clientWidth || innerWidth));
  const h = Math.max(1, Math.floor(vv?.height || flightEl.clientHeight || innerHeight));
  if (flying && vv) {
    flightEl.style.height = `${h}px`;
    flightEl.style.top = `${vv.offsetTop || 0}px`;
  } else {
    flightEl.style.height = "";
    flightEl.style.top = "";
  }
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  fpvCam.aspect = w / h;
  chaseCam.aspect = w / h;
  fpvCam.updateProjectionMatrix();
  chaseCam.updateProjectionMatrix();
  bodycam.uniforms.resolution.value.x = w;
  bodycam.uniforms.resolution.value.y = h;
}
window.addEventListener("resize", resize);
window.visualViewport?.addEventListener("resize", resize);
window.visualViewport?.addEventListener("scroll", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 280));
screen.orientation?.addEventListener?.("change", () => setTimeout(resize, 280));
gfx.canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
gfx.canvas.addEventListener("webglcontextrestored", resize);

function startFlight() {
  const op = opById(selectedOp);
  if (op.map) selectedMap = op.map;
  if (op.drone) selected = op.drone;
  // An op can pin night / realistic physics (night nav lesson, acro lesson).
  const nightOn = op.night ?? !!document.getElementById("night")?.checked;
  renderer.toneMappingExposure = nightOn ? 1.04 : selectedMap === "indoor" ? .88 : .93;
  const name = document.getElementById("pilot").value || "pilot";
  const room = document.getElementById("room").value || "hangar";
  const u = new URL(location.href);
  u.searchParams.set("room", room);
  u.searchParams.set("name", name);
  history.replaceState(null, "", u);
  net.join(room, name, selected);
  prevStep = -1;
  prevGates = 0;
  prevMarks = 0;
  prevShot = 0;
  prevWaveClear = false;
  swapChirp = false;
  lowChirp = false;
  if (loadedMap !== selectedMap || scene.userData.night !== nightOn) {
    for (const id of [...remotes.keys()]) dropRemote(id);
    clearWorld(scene);
    play = buildWorld(scene, selectedMap, { lite: touchUi, night: nightOn, gpu: gfx.node, sky: gfx.createSky, props: !touchUi });
    if (!touchUi) bakeEnv(renderer, scene, gfx.PMREMGenerator);
    loadedMap = selectedMap;
  }
  play.drain = op.drain ?? 1;
  play.wind = windFor(op, selectedMap);
  play.real = op.real ?? !!document.getElementById("real")?.checked;
  play.assists = op.assists || null;
  run = op.kind === "free" || op.kind === "team" ? null : createTrainingRun(op);
  prevLap = 0;
  countdown = run && op.countdown ? createCountdown(op.countdown) : null;
  goFlash = 0;
  showCountdown(null);
  if (run && !countdown) net.sendStart(op.id, op.name);
  replay = null;
  lastResult = null;
  trace = run && !countdown && op.kind !== "autonomy" ? createTrace() : null;
  loadGhostFor(run ? op : null);
  score = 0;
  buildGoals(op);
  hangarEl.hidden = true;
  flightEl.hidden = false;
  flying = true;
  billboard.pause();
  setHelp(false);
  setPlayMenu(false);
  sfx.unlock();
  ambience.start(selectedMap, { night: nightOn });
  lockWake();
  spawn();
  resize();
  requestAnimationFrame(resize);
  document.getElementById("rotate-hint")?.classList.remove("open");
}

function dropGhost() {
  if (ghost?.mesh) {
    scene.remove(ghost.mesh);
    ghost.mesh.traverse((o) => {
      // Geometries and the nametag canvas are per-mesh; the cloned materials
      // are ours too. Their maps (carbon weave etc.) are shared — leave them.
      if (o.isSprite) o.material?.map?.dispose?.();
      o.geometry?.dispose?.();
      o.material?.dispose?.();
    });
  }
  ghost = null;
}

// The pilot's best run on this op (or a shared "race my run" link's trace,
// when one is loaded and matches), flown again as a translucent craft.
function loadGhostFor(op) {
  dropGhost();
  if (!op || op.kind === "free") return;
  const shared = sharedGhost?.opId === op.id ? sharedGhost : null;
  const tr = shared ? shared.trace : loadGhost(op.id);
  if (!tr || !traceDuration(tr)) return;
  const mesh = makeDrone(droneById(tr.meta?.drone || selected), camTiltRad());
  mesh.traverse((o) => {
    if (!o.material) return;
    o.material = o.material.clone();
    o.material.transparent = true;
    o.material.opacity = 0.32;
    o.material.depthWrite = false;
  });
  const tag = makeNametag(shared?.meta?.name ? `HAYALET: ${shared.meta.name}` : "HAYALET");
  tag.position.y = 0.5;
  mesh.add(tag);
  mesh.visible = false;
  scene.add(mesh);
  ghost = { trace: tr, mesh, pose: {} };
}

function poseGhost(t, dt) {
  if (!ghost) return;
  const p = sampleTrace(ghost.trace, t, ghost.pose);
  if (!p) {
    ghost.mesh.visible = false;
    return;
  }
  // Hidden while it overlaps the pilot's own craft (both spawn on the same
  // spot, and in FPV the ghost would sit inside the camera until it pulls away).
  const near = Math.hypot(p.x - state.x, p.y - state.y, p.z - state.z) < 1.5;
  ghost.mesh.visible = !near && t <= traceDuration(ghost.trace) + 0.5;
  ghost.mesh.position.set(p.x, p.y, p.z);
  ghost.mesh.quaternion.set(p.qx, p.qy, p.qz, p.qw);
  spinProps(ghost.mesh, 0.5, dt);
}

function startReplay() {
  if (!trace || traceCount(trace) < 2) return;
  replay = { trace, t: 0, dur: traceDuration(trace), chaseBefore: chase };
  hideResult();
  chase = true;
  sfx.nearby(null); // bots/remotes are not stepped during the replay
}

// Uploads this run's trace and copies a "?ghost=<id>" link that flies straight
// into this op with the run loaded as the ghost to race (see the loader near
// the top of the module and loadGhostFor()).
async function shareResult() {
  const sb = document.getElementById("result-share");
  if (!sb || !trace || traceCount(trace) < 2 || !lastResult) return;
  const prevLabel = sb.textContent;
  const settle = (label, ms = 2200) => {
    sb.textContent = label;
    setTimeout(() => {
      sb.textContent = prevLabel;
      sb.disabled = false;
    }, ms);
  };
  sb.disabled = true;
  sb.textContent = "Paylaşılıyor…";
  try {
    const name = document.getElementById("pilot")?.value || "pilot";
    const res = await fetch("/api/ghost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: lastResult.run.op.id, data: encodeTrace(trace, { drone: selected, t: lastResult.run.t, name }) }),
    });
    if (!res.ok) throw new Error("paylasim basarisiz");
    const { id } = await res.json();
    const u = new URL(location.origin + location.pathname);
    u.searchParams.set("ghost", id);
    const link = u.toString();
    try {
      await navigator.clipboard.writeText(link);
      settle("Bağlantı kopyalandı");
    } catch {
      window.prompt("Bağlantıyı kopyala:", link);
      sb.textContent = prevLabel;
      sb.disabled = false;
    }
  } catch {
    settle("Paylaşılamadı");
  }
}

function ambienceEnv() {
  return {
    wind: play.wind,
    shoreDist: loadedMap === "coast" ? Math.max(0, state.z - play.bounds.minz) : Infinity,
    doorDist: nearestMovingDoor(),
  };
}

function endReplay() {
  if (!replay) return;
  chase = replay.chaseBefore;
  replay = null;
  if (lastResult) showResult(lastResult.run, lastResult.prevBest);
}

// The recorded run flown back with the chase camera; ARM/R/Esc return to the card.
function replayTick(dt, now, input) {
  replay.t += dt;
  const p = sampleTrace(replay.trace, replay.t, replayPose);
  if (p) {
    state.x = p.x;
    state.y = p.y;
    state.z = p.z;
    state.qw = p.qw;
    state.qx = p.qx;
    state.qy = p.qy;
    state.qz = p.qz;
    state.vx = state.vy = state.vz = 0;
  }
  poseGhost(replay.t, dt);
  applyPose(craft, state);
  craft.visible = true;
  spinProps(craft, 0.5, dt);
  sfx.motor(0.5, true, { speed: 8, alt: state.y, battery: 1, sag: 1, chase: true });
  ambience.tick(dt, ambienceEnv());
  followCam(dt, now);
  tickWorld(scene, now * 0.001, dt, state);
  for (const action of ["cam", "mode", "help", "mute"]) consume(action);
  if (replay.t > replay.dur + 1 || consume("arm") || consume("reset") || consume("hangar")) {
    endReplay();
    return;
  }
  bodycam.uniforms.time.value = now * 0.001;
  bodycam.uniforms.intensity.value = .06 + .29 * Number(document.getElementById("camera-look")?.value ?? 0);
  bodycam.enabled = true;
  bodycam.uniforms.speed.value = 0;
  bodycam.uniforms.crash.value = 0;
  renderPass.camera = chaseCam;
  composer.render();
  drawOsd(input, 0);
  const opg = document.getElementById("op-prog");
  if (opg) opg.textContent = `TEKRAR ${fmtTime(Math.min(replay.t, replay.dur))} / ${fmtTime(replay.dur)}`;
  osdCrash.hidden = true;
}

function nearestMovingDoor() {
  let best = Infinity;
  for (const e of scene.userData.ambient || []) {
    if (e.type !== "door" || !e.moving) continue;
    const d = Math.hypot(e.x - state.x, e.z - state.z);
    if (d < best) best = d;
  }
  return best;
}

function setExitArmed(on) {
  exitArmed = on;
  exitArmedAt = on ? performance.now() : 0;
  const b = document.getElementById("btn-back");
  if (b) b.textContent = on ? "TEKRAR BAS" : "MENÜ";
}

// Escape opens a menu; returning to the hangar requires an explicit choice.
function requestExit() {
  const menu = document.getElementById("flight-menu");
  if (menu.open) menu.close();
  else {
    document.getElementById("flight-look").value = document.getElementById("camera-look").value;
    menu.showModal();
  }
}
bindTap(document.getElementById("flight-resume"), () => document.getElementById("flight-menu").close());
bindTap(document.getElementById("flight-retry"), () => {
  document.getElementById("flight-menu").close();
  if (run) retryOp(); else spawn();
});
bindTap(document.getElementById("flight-home"), () => {
  document.getElementById("flight-menu").close(); backHangar();
});
document.getElementById("flight-menu").addEventListener("cancel", (event) => event.preventDefault());

function showCountdown(text) {
  const el = document.getElementById("countdown");
  if (!el) return;
  if (text == null) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const go = text === "GO";
  el.classList.toggle("go", go);
  document.getElementById("countdown-n").textContent = text;
  document.getElementById("countdown-l").textContent = go ? "BAŞLA" : "HAZIR OL";
}

function hideResult() {
  const card = document.getElementById("result-card");
  if (card) card.hidden = true;
  flightEl.classList.remove("has-result");
  resultShown = false;
}

// Short result card at the end of an op: total time against the personal
// best, lap splits for the race. Local only — the leaderboard still gets its
// time from the server's own clock via net.sendResult.
function showResult(r, prevBest) {
  const card = document.getElementById("result-card");
  if (!card || !r) return;
  const won = !!r.won;
  const opId = r.op.id;
  const autonomous = r.op.kind === "autonomy";
  const record = !autonomous && won && (prevBest == null || r.t < prevBest);
  card.classList.toggle("lost", !won);
  document.getElementById("result-kicker").textContent = won ? "GÖREV TAMAM" : "BAŞARISIZ";
  document.getElementById("result-title").textContent = r.op.name;
  document.getElementById("result-time").innerHTML = `${esc(fmtTime(r.t))}${record ? "<small>KİŞİSEL REKOR</small>" : ""}`;
  const rows = [];
  rows.push({ k: "Sonuç", v: won ? "Tamamlandı" : r.reason || "başarısız" });
  const best = autonomous ? null : progress.best?.[opId];
  if (!autonomous) rows.push({ k: "En iyi süre", v: best != null ? fmtTime(best) : "—", cls: record ? "record" : "" });
  if (!autonomous && won && prevBest != null) {
    const d = r.t - prevBest;
    rows.push({ k: "Rekora fark", v: `${d >= 0 ? "+" : "−"}${fmtTime(Math.abs(d))}` });
  }
  if (autonomous && r.autonomyReport) {
    const report = r.autonomyReport;
    const time = (value) => value == null ? "—" : fmtTime(value);
    rows.push({ k: "Toplam", v: time(report.totalSeconds) });
    rows.push({ k: "Tespit", v: time(report.detectionSeconds) });
    rows.push({ k: "İDA sevk", v: time(report.dispatchSeconds) });
    rows.push({ k: "Müdahale", v: time(report.interventionSeconds) });
    rows.push({ k: "Görev İDA'sı", v: report.selectedSeaId || "—" });
  } else if (r.op.kind === "race") {
    rows.push({ k: "Kapı", v: `${r.gatesDone}/${(r.op.gates?.length || 0) * (r.op.laps || 3)}` });
    const bl = progress.bestLap?.[opId];
    rows.push({ k: "En iyi tur", v: bl != null ? fmtTime(bl) : "—", cls: r.bestLap != null && bl != null && r.bestLap <= bl ? "record" : "" });
  } else if (r.op.kind === "school") rows.push({ k: "Adım", v: `${Math.min(r.step, r.op.steps.length)}/${r.op.steps.length}` });
  else if (r.op.kind === "recon") rows.push({ k: "İşaret", v: `${r.marks.filter((m) => m.done).length}/${r.marks.length}` });
  else if (r.op.kind === "patrol") rows.push({ k: "Hedef", v: `${r.shot}/${r.op.need || 6}` });
  else if (r.op.kind === "waves") rows.push({ k: "Dalga", v: `${Math.min(r.wave, r.op.waves.length)}/${r.op.waves.length}` });
  else if (r.op.kind === "final") rows.push({ k: "Skor", v: `${score}/${r.op.scoreNeed || 8}` });
  else if (r.op.kind === "cargo") {
    rows.push({ k: "Koli", v: `${r.delivered}/${r.parcels.length}` });
    if (r.dropped) rows.push({ k: "Düşen", v: String(r.dropped) });
  }
  if (r.report && !autonomous) {
    rows.push({ k: "Eğitim puanı", v: `${r.report.total}/100`, cls: r.report.total >= 80 ? "record" : "" });
    rows.push({ k: "Rota / kontrol", v: `${r.report.route} / ${r.report.control}` });
    rows.push({ k: "Stabilite / iniş", v: `${r.report.stability} / ${r.report.landing}` });
    rows.push({ k: "Mesafe / azami", v: `${r.report.distance} m / ${r.report.maxSpeed} km/h` });
  }
  document.getElementById("result-rows").innerHTML = rows
    .map((x) => `<div><dt>${esc(x.k)}</dt><dd class="${x.cls || ""}">${esc(x.v)}</dd></div>`)
    .join("");
  const laps = document.getElementById("result-laps");
  if (laps) {
    const list = r.lapTimes || [];
    laps.hidden = !list.length;
    laps.innerHTML = list.map((t, i) => `<span class="${t === r.bestLap ? "best" : ""}">T${i + 1} ${esc(fmtTime(t))}</span>`).join("");
  }
  document.getElementById("result-hint").textContent = won ? "ARM / Space → hangar · R → tekrar" : "ARM / Space → tekrar · Esc → menü";
  const rb = document.getElementById("result-replay");
  if (rb) rb.hidden = !(trace && traceCount(trace) > 1);
  const sb = document.getElementById("result-share");
  if (sb) {
    sb.hidden = !(trace && traceCount(trace) > 1);
    sb.disabled = false;
    sb.textContent = "Uçuşu paylaş";
  }
  lastResult = { run: r, prevBest };
  card.hidden = false;
  // Touch layer (sticks, fire/arm pads, compass) steps aside while the card is up.
  flightEl.classList.add("has-result");
  resultShown = true;
}
bindTap(document.getElementById("result-retry"), () => retryOp());
bindTap(document.getElementById("result-home"), () => backHangar());
bindTap(document.getElementById("result-replay"), () => startReplay());
bindTap(document.getElementById("result-share"), () => shareResult());
document.getElementById("flight-look").addEventListener("change", (event) => {
  document.getElementById("camera-look").value = event.target.value; persistLoadout();
});

function backHangar() {
  flying = false;
  setExitArmed(false);
  sfx.motor(0, false);
  sfx.nearby(null);
  ambience.stop();
  countdown = null;
  goFlash = 0;
  showCountdown(null);
  hideResult();
  replay = null;
  lastResult = null;
  trace = null;
  dropGhost();
  setPlayMenu(false);
  unlockWake();
  hangarEl.hidden = false;
  flightEl.hidden = true;
  flightEl.style.height = "";
  flightEl.style.top = "";
  clearShots();
  clearGoals();
  clearAutonomy();
  run = null;
  for (const b of bots) if (b.mesh) scene.remove(b.mesh);
  bots = [];
  if (lastWonId) {
    const next = nextInTrack(lastWonId);
    lastWonId = null;
    if (next && isOpOpen(next, progress)) {
      selectedOp = next.id;
      applyOp(next);
    }
  }
  paintOpsCards();
  paintOps();
  billboard.resume();
}

document.querySelectorAll("[data-start]").forEach((b) => {
  bindTap(b, startFlight);
});
bindTap(document.getElementById("btn-back"), () => {
  setPlayMenu(false);
  requestExit();
});
bindTap(document.getElementById("btn-arm"), () => {
  setPlayMenu(false);
  consume("arm");
  toggleArm();
});
bindTap(document.getElementById("btn-cam"), () => {
  setPlayMenu(false);
  chase = !chase;
});
bindTap(document.getElementById("btn-mode"), () => {
  setPlayMenu(false);
  if (!opById(selectedOp).requiredFlightMode) angleOverride = !angleOverride;
});
bindTap(document.getElementById("btn-help"), () => {
  setPlayMenu(false);
  setHelp(!helpOpen);
});
bindTap(document.getElementById("help-close"), () => setHelp(false));
bindTap(document.getElementById("rotate-hint"), (e) => e.currentTarget.classList.toggle("open"));

const autonomyPanel = document.getElementById("autonomy-panel");
bindTap(autonomyPanel?.querySelector('[data-action="pause"]'), () => autonomy && pauseAutonomy(autonomy.task, true));
bindTap(autonomyPanel?.querySelector('[data-action="resume"]'), () => autonomy && pauseAutonomy(autonomy.task, false));
bindTap(autonomyPanel?.querySelector('[data-action="take-air"]'), () => autonomy && takeControl(autonomy.task, "iha-1"));
bindTap(autonomyPanel?.querySelector('[data-action="take-sea"]'), () => {
  if (!autonomy) return;
  takeControl(autonomy.task, autonomy.task.selectedSeaId || autonomy.boats[0]?.state.id);
});
bindTap(autonomyPanel?.querySelector('[data-action="return"]'), () => {
  if (autonomy?.task.controlledByVehicle) returnToAutonomy(autonomy.task, autonomy.task.controlledByVehicle);
});
bindTap(autonomyPanel?.querySelector('[data-action="abort"]'), () => autonomy && abortAutonomy(autonomy.task));

const flightBar = document.getElementById("flight-bar");
const menuFab = document.getElementById("menu-fab");
function setPlayMenu(on) {
  flightBar.classList.toggle("open", on);
  // The open ☰ column sits where the fire/arm pads and sticks are on a phone.
  flightEl.classList.toggle("menu-open", on);
  menuFab.textContent = on ? "×" : "☰";
}
bindTap(menuFab, () => setPlayMenu(!flightBar.classList.contains("open")));

function retryOp() {
  const op = opById(selectedOp);
  run = op.kind === "free" || op.kind === "team" ? null : createTrainingRun(op);
  prevLap = 0;
  countdown = run && op.countdown ? createCountdown(op.countdown) : null;
  goFlash = 0;
  showCountdown(null);
  if (run && !countdown) net.sendStart(op.id, op.name);
  replay = null;
  lastResult = null;
  trace = run && !countdown && op.kind !== "autonomy" ? createTrace() : null;
  loadGhostFor(run ? op : null);
  prevStep = -1;
  prevGates = 0;
  prevMarks = 0;
  prevShot = 0;
  prevWaveClear = false;
  swapChirp = false;
  lowChirp = false;
  score = 0;
  buildGoals(op);
  spawn();
}

function toggleArm() {
  if (replay) {
    endReplay();
    return;
  }
  // Start line: the touch ARM button and flight-bar bypass the keyboard flag
  // gate, so hold them here too until GO.
  if (countdown) return;
  if (run?.won) {
    backHangar();
    return;
  }
  if (run?.lost) {
    retryOp();
    return;
  }
  if (state.crashed) {
    // Shot down in a team match: the server revives after 4 s, not before.
    if (inTeamOp() && performance.now() < (team.downUntil || 0)) return;
    spawn();
    return;
  }
  state.armed = !state.armed;
}

function applyPose(obj, s) {
  obj.position.set(s.x, s.y, s.z);
  obj.quaternion.set(s.qx, s.qy, s.qz, s.qw);
}

function followCam(dt, now) {
  const controlledBoat = autonomy?.boats.find((boat) => boat.state.id === autonomy.task.controlledByVehicle);
  if (controlledBoat) {
    const boat = controlledBoat.state;
    const fx = Math.sin(boat.heading);
    const fz = -Math.cos(boat.heading);
    fpvCam.position.set(boat.x - fx * 1.8, 1.35, boat.z - fz * 1.8);
    fpvCam.lookAt(boat.x + fx * 16, 0.7, boat.z + fz * 16);
    chaseCam.position.set(boat.x - fx * 7, 4.2, boat.z - fz * 7);
    chaseCam.lookAt(boat.x + fx * 4, 0.5, boat.z + fz * 4);
    _aimTarget.set(boat.x + fx * 80, 0.7, boat.z + fz * 80);
    return;
  }
  const [ox, oy, oz] = rotateVec(state.qw, state.qx, state.qy, state.qz, 0, spec.size * 0.55, spec.size * 0.12);
  _targetPos.set(state.x + ox, state.y + oy, state.z + oz);
  _targetQuat.set(state.qx, state.qy, state.qz, state.qw);
  // Tilt is baked into the slerp TARGET, not re-applied to the camera's own
  // (already-tilted) local axes every frame — the latter compounded the
  // selected angle frame after frame with no steady state, so the visible
  // tilt never actually settled at the chosen 15/30/45°.
  if (!chase) _targetQuat.multiply(_tiltQuat.setFromAxisAngle(_xAxis, camTiltRad()));
  const lag = spec.camLag || 10;
  const k = 1 - Math.exp(-lag * dt);
  if (chase) {
    fpvCam.position.lerp(_targetPos, k);
    fpvCam.quaternion.slerp(_targetQuat, k);
  } else {
    // The FPV lens and gun pod are one rigid assembly. Rotational camera lag
    // made the centre reticle show an older heading while rounds already used
    // the craft's current heading, especially during fast yaw/pitch inputs.
    fpvCam.position.copy(_targetPos);
    fpvCam.quaternion.copy(_targetQuat);
  }

  const thr = state.armed ? state.throttleOut : 0;
  const vib = (0.00025 + thr * 0.001) * (state.crashed ? 6 : 1);
  const t = now * 0.001;
  fpvCam.rotateX(Math.sin(t * 91.3) * vib);
  fpvCam.rotateZ(Math.sin(t * 118.7) * vib * 0.7);
  fpvCam.rotateY(Math.sin(t * 37.1) * vib * 0.35);

  const [fx, fy, fz] = rotateVec(state.qw, state.qx, state.qy, state.qz, 0, 0, -1);
  void fy;
  const back = 2.8 + spec.size * 3.2;
  chaseCam.position.set(state.x - fx * back, state.y + 1.35, state.z - fz * back);
  // Keep the craft and its actual gun line framed together. The reticle below
  // is projected onto that gun line, so it remains truthful in chase view.
  const [ax, ay, az] = aimDir(state.qw, state.qx, state.qy, state.qz, camTiltRad());
  _aimTarget.set(state.x + ax * 80, state.y + ay * 80, state.z + az * 80);
  _chaseToCraft.set(state.x, state.y, state.z).sub(chaseCam.position).normalize();
  _chaseToAim.copy(_aimTarget).sub(chaseCam.position).normalize();
  _chaseLook.copy(_chaseToCraft).add(_chaseToAim).normalize().add(chaseCam.position);
  chaseCam.lookAt(_chaseLook);
}

function updateAimReticle() {
  const camera = chase ? chaseCam : fpvCam;
  camera.updateMatrixWorld(true);
  _aimScreen.copy(_aimTarget).project(camera);
  const x = THREE.MathUtils.clamp((_aimScreen.x * 0.5 + 0.5) * 100, 3, 97);
  const y = THREE.MathUtils.clamp((-_aimScreen.y * 0.5 + 0.5) * 100, 8, 94);
  flightEl.style.setProperty("--aim-x", `${x.toFixed(2)}%`);
  flightEl.style.setProperty("--aim-y", `${y.toFixed(2)}%`);
}

function loop(now) {
  requestAnimationFrame(loop);
  if (document.hidden) {
    last = now;
    return;
  }
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const input = poll();

  if (flying) {
    if (!fpsAt) fpsAt = now;
    fpsN += 1;
    if (now - fpsAt >= 500) {
      const el = document.getElementById("hud-fps");
      if (el) el.textContent = `${Math.round((fpsN * 1000) / (now - fpsAt))} fps${gfx.kind === "webgpu" ? " · gpu" : ""}`;
      fpsAt = now;
      fpsN = 0;
    }
    if (replay) {
      replayTick(dt, now, input);
      return;
    }
    if (consume("hangar")) requestExit();
    if (document.getElementById("flight-menu").open) {
      Object.assign(input, { lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0, fire: false });
      for (const action of ["arm", "reset", "cam", "mode", "help", "mute"]) consume(action);
    }
    if (exitArmed && now - exitArmedAt >= EXIT_CONFIRM_MS) setExitArmed(false);
    let holding = false;
    if (countdown) {
      const c = tickCountdown(countdown, dt);
      if (c.beep != null) sfx.count(c.beep);
      showCountdown(c.show);
      holding = c.holding;
      if (c.go) {
        countdown = null;
        goFlash = 0.8;
        if (run) net.sendStart(run.op.id, run.op.name);
        trace = createTrace();
      }
    } else if (goFlash > 0) {
      goFlash -= dt;
      if (goFlash <= 0) showCountdown(null);
    }
    if (holding) {
      Object.assign(input, { lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0, fire: false });
      consume("arm");
      consume("mode");
    }
    if (consume("arm")) toggleArm();
    if (consume("reset")) (run ? retryOp() : spawn());
    if (consume("cam")) chase = !chase;
    if (consume("mode") && !opById(selectedOp).requiredFlightMode) angleOverride = !angleOverride;
    if (consume("help")) setHelp(!helpOpen);
    if (consume("mute")) toggleMute();

    if (autonomy?.task.paused) holding = true;
    input.angleMode = angleOverride;
    if (!state.armed && state.y <= spec.size * 0.5) {
      input.lift = -1;
      input.r2 = 0;
    }
    // With a parcel slung underneath the airframe flies its loaded profile.
    if (!holding) {
      const activeSpec = loadedSpec && run?.carrying != null ? loadedSpec : spec;
      advanceSimulationClock(simClock, dt, (simDt) => {
        if (autonomy) stepAutonomyPhysics(simDt, input, activeSpec);
        else step(state, input, activeSpec, simDt, play);
      });
    } else {
      resetSimulationClock(simClock);
    }
    if (canSwapBattery(state) && state.battery < 0.995) {
      if (!swapChirp) {
        sfx.gate();
        swapChirp = true;
      }
      state.battery = Math.min(1, state.battery + dt * 0.75);
    } else if (!canSwapBattery(state)) swapChirp = false;

    // A flat pack at rest is the end of the run: say so, so ARM/R recovers
    // instead of leaving a grounded drone that silently refuses to spool up.
    // Checked on speed, not state.armed — physics.js only auto-disarms on the
    // ground plane, so a pack that dies resting on a container/van/roof would
    // otherwise sit there armed forever with no OSD message. The 0.4s of
    // sustained slow speed (not just one slow instant) keeps this from firing
    // while still airborne: a hover in progress reads near-zero speed for a
    // beat too, but gravity pushes it past 1.5 m/s within ~0.15s if it's
    // actually still falling, well before the timer trips.
    if (!state.crashed && state.battery <= 0 && Math.hypot(state.vx, state.vy, state.vz) < 1.5 && !canSwapBattery(state)) {
      deadPackTimer += dt;
    } else {
      deadPackTimer = 0;
    }
    if (deadPackTimer > 0.4) {
      state.armed = false;
      state.crashed = true;
      state.crashReason = "batarya bitti";
    }
    sfx.motor(state.armed ? state.throttleOut : 0, state.armed && !state.crashed, {
      speed: Math.hypot(state.vx, state.vy, state.vz),
      alt: state.y,
      battery: state.battery,
      sag: state.sag,
      chase,
      crashed: state.crashed,
    });
    if (state.armed && state.battery < 0.22) {
      if (!lowChirp) {
        sfx.low();
        lowChirp = true;
      }
    } else if (state.battery > 0.28) lowChirp = false;
    tickWorld(scene, now * 0.001, dt, state);
    applyPose(craft, state);
    if (autonomy) {
      tickAutonomyFrame(dt);
      updateAutonomyScene(dt);
      finishAutonomyResult();
    }
    spinProps(craft, state.armed ? state.throttleOut : 0.04, dt);
    craft.visible = chase;
    followCam(dt, now);

    fireCd -= dt;
    muzzle.intensity = THREE.MathUtils.lerp(muzzle.intensity, 0, 1 - Math.exp(-18 * dt));
    hitFlash = Math.max(0, hitFlash - dt * 4);
    dmgFlash = Math.max(0, dmgFlash - dt * 3);
    camKick = Math.max(0, camKick - dt * 8);
    if (camKick) fpvCam.rotateX(-camKick * 0.04);

    const allowFire = !run || run.op.fire !== false;
    if (allowFire && input.fire && state.armed && !state.crashed && canFire(fireCd)) {
      const [fx, fy, fz] = aimDir(state.qw, state.qx, state.qy, state.qz, camTiltRad());
      const shot = createShot(state.x + fx * 0.55, state.y + fy * 0.55, state.z + fz * 0.55, fx, fy, fz, "player", 160);
      shots.push(shot);
      addShotMesh(shot);
      fireCd = document.getElementById("gun")?.value === "rapid" ? 0.05 : 0.09;
      muzzle.intensity = 8;
      camKick = 1;
    }
    const tsec = now * 0.001;
    const combat = playerCanBeHit(run?.op);
    if (!combat && bots.length) spawnBots(0);
    for (const bot of bots) {
      // Bots also wait for GO.
      const enemyShot = holding ? null : stepBot(bot, state, tsec, dt, play);
      if (bot.mesh) {
        bot.mesh.visible = bot.alive;
        if (bot.alive) {
          applyPose(bot.mesh, bot.state);
          spinProps(bot.mesh, 0.6, dt);
        }
      }
      if (enemyShot) {
        shots.push(enemyShot);
        addShotMesh(enemyShot);
      }
    }
    shots = stepShots(shots, dt);
    visShots = stepShots(visShots, dt);
    const botTargets = bots.filter((b) => b.alive).map((b) => ({
      id: b.id,
      x: b.state.x,
      y: b.state.y,
      z: b.state.z,
      hp: b.hp,
      alive: b.alive,
      ref: b,
    }));
    const playerT = { id: "player", x: state.x, y: state.y, z: state.z, hp: playerHp, alive: playerHp > 0 };
    const hpBefore = playerHp;
    if (run && targets.length) {
      applyHits(shots, targets, 2.1);
      run.shot = targets.filter((t) => !t.alive).length;
      for (const t of targets) if (t.mesh) t.mesh.visible = t.alive;
    }
    const hitList = combat ? [...botTargets, playerT] : botTargets;
    const hits = applyHits(shots, hitList);
    if (hits.some((h) => h.owner === "player" && h.target !== "player")) {
      hitFlash = 1;
      sfx.hit();
    }
    // Team match: my shots against the other side's pilots. The shot stops
    // here; whether it counts (range, cadence, alive) is the server's call.
    if (inTeamOp()) {
      for (const h of applyHits(shots, enemyTargets(remotes, team.mine))) {
        if (h.owner !== "player") continue;
        net.sendHit(h.target);
        hitFlash = 1;
        sfx.hit();
      }
    }
    playerHp = playerT.hp;
    if (playerHp < hpBefore) {
      dmgFlash = 1;
      sfx.hit();
    }
    if (!playerT.alive && !state.crashed) {
      state.crashed = true;
      state.crashReason = "isabet";
      state.armed = false;
    }
    for (const t of botTargets) {
      t.ref.hp = t.hp;
      if (!t.alive && t.ref.alive) {
        t.ref.alive = false;
        t.ref.respawn = 4;
        score += 1;
      }
    }
    for (let i = shotMeshes.length - 1; i >= 0; i--) {
      const sh = shots.find((s) => s.mesh === shotMeshes[i]) || visShots.find((s) => s.mesh === shotMeshes[i]);
      if (!sh) {
        scene.remove(shotMeshes[i]);
        shotMeshes.splice(i, 1);
        continue;
      }
      shotMeshes[i].position.set(sh.x, sh.y, sh.z);
      shotMeshes[i].lookAt(sh.x + sh.vx, sh.y + sh.vy, sh.z + sh.vz);
    }

    let nearSpec = null;
    let nearD = 45;
    let nearThr = 0.6;
    let nearKey = null;
    for (const b of bots) {
      if (!b.alive) continue;
      const d = Math.hypot(b.state.x - state.x, b.state.y - state.y, b.state.z - state.z);
      if (d < nearD) {
        nearD = d;
        nearSpec = b.spec;
        nearThr = b.state.throttleOut || 0.6;
        nearKey = b.id;
      }
    }
    for (const [rid, r] of remotes) {
      r.mesh.visible = (!run || run.op.kind === "free") && r.alive !== false;
      if (!r.mesh.visible || !r.target) continue;
      _lerpP.set(r.target.x, r.target.y, r.target.z);
      _lerpQ.set(r.target.qx, r.target.qy, r.target.qz, r.target.qw);
      r.mesh.position.lerp(_lerpP, 0.25);
      r.mesh.quaternion.slerp(_lerpQ, 0.25);
      spinProps(r.mesh, r.target.thr || 0.1, dt);
      // Their trigger is down: draw tracers from their gun pod (visual only).
      if (r.target.fire) {
        r.fireAcc = (r.fireAcc || 0) + dt;
        if (r.fireAcc >= 0.1) {
          r.fireAcc = 0;
          const [fx, fy, fz] = aimDir(r.target.qw, r.target.qx, r.target.qy, r.target.qz, camTiltRad());
          const p = r.mesh.position;
          const vs = createShot(p.x + fx * 0.6, p.y + fy * 0.6, p.z + fz * 0.6, fx, fy, fz, `vis-${rid}`, 160);
          visShots.push(vs);
          addShotMesh(vs);
        }
      } else r.fireAcc = 0;
      const d = Math.hypot(r.target.x - state.x, r.target.y - state.y, r.target.z - state.z);
      if (d < nearD) {
        nearD = d;
        nearSpec = r.spec;
        nearThr = r.target.thr || 0.3;
        nearKey = rid;
      }
    }
    // Doppler from the closing speed of the same craft frame to frame.
    let doppler = 1;
    if (nearKey && prevNear.key === nearKey && dt > 0) {
      const radial = Math.max(-120, Math.min(120, (nearD - prevNear.d) / dt));
      doppler = 343 / (343 + radial);
    }
    prevNear = { key: nearKey, d: nearD };
    sfx.nearby(state.armed && !state.crashed ? nearSpec : null, nearThr, nearD, doppler);
    ambience.tick(dt, ambienceEnv());
    if (run && !run.won && !run.lost) poseGhost(run.t, dt);

    if (run && run.op.kind !== "autonomy" && !run.won && !run.lost && !holding) {
      if (trace) recordTrace(trace, run.t, state);
      sampleAssessment(run.assessment, state, input, dt);
      tickRun(run, {
        state,
        dt,
        flightMode: angleOverride ? "angle" : "acro",
        score,
        aliveBots: bots.filter((b) => b.alive).length,
        waveSpawned: bots.length > 0,
      });
      if ((run.won || run.lost) && !run.report) {
        run.report = finalizeAssessment(run.assessment, run, state);
        if (run.won && run.op.academy && run.report.total < 70) {
          run.won = false;
          run.lost = true;
          run.reason = `yeterlilik puanı ${run.report.total}/100 · gereken 70`;
          run.report.passed = false;
        }
        progress = saveAssessment(run.op.id, run.report);
      }
      if (run.recall) {
        run.recall = false;
        state.x = 0;
        state.y = 2.2;
        state.z = 0;
        state.vx = state.vy = state.vz = 0;
        state.armed = false;
        state.battery = 1;
        snapCam();
      }
      if (run.op.kind === "waves" && run.waveBreak <= 0 && run.wave !== lastWave && !run.won) {
        lastWave = run.wave;
        spawnBots(run.op.waves[run.wave] || 0);
      }
      if (goalRoot.children.length) {
        let hi = -1;
        if (run.op.kind === "school") {
          // Rings exist only for hover/gate steps; a pad/land step has none,
          // so index by rings passed, not by step number.
          const steps = run.op.steps || [];
          const cur = steps[run.step];
          const visibleGoal = (s) => ["hover", "altitude", "speed", "heading", "gate"].includes(s.t);
          hi = cur && visibleGoal(cur) ? steps.slice(0, run.step).filter(visibleGoal).length : -1;
        } else if (run.op.kind === "race" && run.op.gates?.length) hi = run.gatesDone % run.op.gates.length;
        else if (run.op.kind === "recon") hi = run.marks.findIndex((m) => !m.done);
        goalRoot.children.forEach((ch, i) => {
          if (!ch.material) return;
          const on = i === hi;
          const completed = run.op.kind === "school" && ch.userData.stepIndex < run.step;
          ch.visible = !completed;
          const pulse = on ? 1 + Math.sin(now * 0.008) * 0.055 : 1;
          ch.scale.setScalar(pulse);
          ch.material.color.setHex(on ? 0xffee55 : 0x3a5570);
          ch.material.opacity = on ? 1 : 0.16;
        });
      }
      if (run.step !== prevStep) {
        if (prevStep >= 0 && run.step > prevStep) sfx.gate();
        prevStep = run.step;
      }
      if (run.gatesDone > prevGates) sfx.gate();
      prevGates = run.gatesDone || 0;
      if ((run.lap || 0) > prevLap) sfx.lap();
      prevLap = run.lap || 0;
      const marksN = run.marks?.filter((m) => m.done).length || 0;
      if (marksN > prevMarks) sfx.gate();
      prevMarks = marksN;
      if (run.shot > prevShot) sfx.hit();
      prevShot = run.shot || 0;
      if (run.waveClear && !prevWaveClear) sfx.hit();
      prevWaveClear = !!run.waveClear;
      if (run.op.kind === "cargo") {
        if (run.carrying != null && prevCargo.carrying == null) sfx.gate();
        if (run.delivered > prevCargo.delivered) sfx.lap();
        if (run.dropped > prevCargo.dropped) sfx.hit();
        prevCargo = { delivered: run.delivered, carrying: run.carrying, dropped: run.dropped };
        paintCargo();
      }
      if (run.won) {
        lastWonId = run.op.id;
        const prevBest = progress.best?.[run.op.id];
        progress = saveWin(run.op.id, run.t, undefined, run.bestLap);
        net.sendResult(run.op.id, run.op.name, true, run.t, run.lapTimes);
        paintOpsCards();
        sfx.win();
        // A new personal best (or the first finish) becomes the ghost to chase next time.
        if (trace && (prevBest == null || run.t < prevBest)) saveGhost(run.op.id, trace, { drone: selected, t: run.t, at: Date.now() });
        if (ghost) ghost.mesh.visible = false;
        showResult(run, prevBest);
      }
      if (run.lost) {
        if (run.bestLap != null) progress = saveLap(run.op.id, run.bestLap).progress;
        net.sendResult(run.op.id, run.op.name, false, run.t, run.lapTimes);
        sfx.fail();
        if (ghost) ghost.mesh.visible = false;
        showResult(run, progress.best?.[run.op.id]);
      }
    }

    const spd = Math.hypot(state.vx, state.vy, state.vz);
    crashFade = THREE.MathUtils.lerp(crashFade, state.crashed ? 1 : 0, 1 - Math.exp(-6 * dt));
    bodycam.uniforms.time.value = now * 0.001;
    const cameraLook = Number(document.getElementById("camera-look")?.value ?? 0);
    bodycam.uniforms.intensity.value = (chase ? .06 : .14) + (chase ? .29 : .86) * cameraLook;
    bodycam.enabled = true;
    bodycam.uniforms.speed.value = spd;
    bodycam.uniforms.crash.value = crashFade;
    renderPass.camera = chase ? chaseCam : fpvCam;
    updateAimReticle();
    composer.render();
    const hm = document.getElementById("hitmark");
    const dm = document.getElementById("dmgflash");
    if (hm) hm.style.opacity = String(hitFlash);
    if (dm) dm.style.opacity = String(dmgFlash * 0.45);
    if (state.armed) recTime += dt;
    drawOsd(input, spd);

    netAcc += dt;
    if (netAcc > 0.05) {
      netAcc = 0;
      net.sendState(state, allowFire && input.fire && state.armed && !state.crashed ? 1 : 0);
    }
  } else {
    consume("arm");
    consume("reset");
    consume("cam");
    consume("mode");
    consume("hangar");
    consume("help");
    if (consume("mute")) toggleMute();
  }
}

function pad(n, w = 2) {
  return String(Math.floor(n)).padStart(w, "0");
}

function timecode(t) {
  const cs = Math.floor((t % 1) * 30);
  const s = Math.floor(t) % 60;
  const m = Math.floor(t / 60) % 60;
  const h = Math.floor(t / 3600);
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(cs)}`;
}

function wantsPad() {
  if (state?.battery < 0.3 && !state.crashed) return true;
  if (!run || run.won || run.lost) return false;
  if (run.op.kind === "school") {
    const t = run.op.steps?.[run.step]?.t;
    return t === "land" || t === "pad";
  }
  if (run.op.kind === "patrol") return run.shot >= (run.op.need || 6);
  if (run.op.kind === "recon") return run.marks?.every((m) => m.done);
  if (run.op.kind === "final") return score >= (run.op.scoreNeed || 8);
  if (run.op.kind === "waves") return run.waveBreak > 0;
  if (run.op.kind === "cargo") return run.carrying == null && run.parcels.every((p) => p.done);
  return false;
}

function drawOsd(input, spd) {
  const realOn = !!play?.real && !angleOverride;
  const locked = !!opById(selectedOp).requiredFlightMode;
  const mode = `${angleOverride ? "ANGLE" : realOn ? "ACRO · REAL" : "ACRO"}${locked ? " · DERS" : ""}`;
  const aliveBots = bots.filter((b) => b.alive).length;
  const hpFill = document.getElementById("hp-fill");
  const hpN = document.getElementById("hp-n");
  if (hpFill) hpFill.style.width = `${(100 * playerHp) / PLAYER_HP}%`;
  if (hpN) hpN.textContent = String(playerHp);
  const hs = document.getElementById("hud-speed");
  const ha = document.getElementById("hud-alt");
  const hsc = document.getElementById("hud-score");
  const hb = document.getElementById("hud-bots");
  const hm = document.getElementById("hud-mode");
  if (hs) hs.textContent = `${(spd * 3.6).toFixed(0)} km/h`;
  if (ha) ha.textContent = `${state.y.toFixed(0)} m`;
  if (hsc) hsc.textContent = `SKOR ${score}`;
  if (hb) hb.textContent = `BOT ${aliveBots}`;
  if (hm) hm.textContent = mode;
  const shoot = !run || run.op.fire !== false;
  const fireButton = document.getElementById("btn-fire");
  if (fireButton) fireButton.hidden = !shoot;
  const haArm = document.getElementById("hud-arm");
  if (haArm) {
    haArm.textContent = state.crashed ? "CRASH" : state.armed ? "ARM" : "DISARM";
    haArm.classList.toggle("off", !state.armed || state.crashed);
  }
  const hpWrap = document.querySelector(".hp-wrap");
  if (hpWrap) hpWrap.hidden = !shoot;
  if (hsc) hsc.hidden = !shoot;
  if (hb) hb.hidden = run ? !wantsBots(run.op) : false;
  const reticle = document.querySelector(".reticle");
  if (reticle) reticle.style.display = shoot && !state.crashed ? "" : "none";
  const goal = nextGoal(run, { score, targets });
  const nav = document.getElementById("nav");
  const needle = document.getElementById("compass-n");
  const nd = document.getElementById("nav-dist");
  if (nav) nav.hidden = !goal || state.crashed || run?.won || run?.lost;
  if (goal && needle && nd) {
    const err = yawErrTo(state, goal.x, goal.z);
    needle.style.transform = `translateX(${Math.max(-1, Math.min(1, err / 1.2)) * 68}px)`;
    nd.textContent = `${Math.hypot(state.x - goal.x, state.z - goal.z).toFixed(0)} m`;
  }
  const hw = document.getElementById("hud-wind");
  if (hw) {
    const w = play?.wind;
    if (w && (w.x || w.z)) {
      hw.hidden = false;
      const we = yawErrTo(state, state.x + w.x, state.z + w.z);
      hw.textContent = `RÜZGAR ${we > 0.25 ? "→" : we < -0.25 ? "←" : "↑"}`;
    } else hw.hidden = true;
  }
  const batt = document.getElementById("batt-fill");
  if (batt) {
    batt.style.width = `${Math.round(state.battery * 100)}%`;
    batt.classList.toggle("warn", state.battery < 0.45 && state.battery >= 0.22);
    batt.classList.toggle("low", state.battery < 0.22);
  }
  const ot = document.getElementById("op-title");
  const oh = document.getElementById("op-hint");
  const opg = document.getElementById("op-prog");
  const oti = document.getElementById("op-time");
  const op = opById(selectedOp);
  if (ot) ot.textContent = op.name;
  if (oh) oh.textContent = run?.hint || op.blurb || "";
  if (oti) {
    if (run && op.limit) {
      const left = Math.max(0, op.limit - run.t);
      oti.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")}`;
    } else oti.textContent = "";
  }
  if (opg) opg.textContent = run?.won ? "TAMAM" : run?.lost ? "BAŞARISIZ" : "";
  if (op.kind === "team") {
    const st = matchStatus(team?.match, Date.now(), team?.mine);
    if (oh) oh.textContent = st.line;
    if (oti) oti.textContent = st.clock;
    const downMs = (team?.downUntil || 0) - performance.now();
    if (opg) opg.textContent = state.crashed && downMs > 0 ? `YENİDEN DOĞ ${Math.ceil(downMs / 1000)}` : "";
    if (hsc) hsc.textContent = scoreLine(team?.match);
    if (hb) hb.hidden = true;
  }
  const ol = document.getElementById("op-lap");
  if (ol) {
    if (run && run.op.kind === "race" && !run.won && !run.lost) {
      ol.hidden = false;
      const bestLap = run.bestLap ?? progress.bestLap?.[run.op.id];
      ol.textContent = `TUR ${fmtTime(run.t - (run.lapStart || 0))} · SON ${run.lastLap != null ? fmtTime(run.lastLap) : "—"} · EN İYİ ${bestLap != null ? fmtTime(bestLap) : "—"}`;
    } else ol.hidden = true;
  }
  const padHint = scene.getObjectByName("padHint");
  if (padHint?.material) {
    const hot = wantsPad();
    padHint.material.opacity = hot ? 0.55 + Math.sin(performance.now() * 0.008) * 0.35 : 0.28;
    padHint.material.color.setHex(hot ? 0xffee55 : 0xc9a227);
  }
  recEl.classList.toggle("on", state.armed && !state.crashed);
  recEl.textContent = state.armed ? "REC" : "STBY";
  tcEl.textContent = timecode(recTime);
  const lat = HOME_LAT - state.z * 9.0e-6;
  const lon = HOME_LON + state.x * 1.2e-5;
  gpsEl.textContent = `${Math.abs(lat).toFixed(5)}°N  ${Math.abs(lon).toFixed(5)}°E`;
  const thrPct = Math.round((state.throttleOut || 0) * 100);
  const sag = state.sag ?? 1;
  const pack = state.battery < 0.22 ? "  LOW" : sag < 0.85 ? "  SAG" : "";
  teleEl.textContent = `${spec.name}  ${mode}  THR ${thrPct}%${pack}${run?.carrying != null ? "  KARGO" : ""}`;
  metaEl.textContent = input.connected ? "PAD" : "KB";
  if (helpOpen) {
    const v = input.viz || { lx: 0, ly: 0, rx: 0, ry: 0, r2: 0 };
    meterL.style.transform = `translate(${v.lx * 18}px, ${v.ly * 18}px)`;
    meterR.style.transform = `translate(${v.rx * 18}px, ${v.ry * 18}px)`;
    meterR2.style.width = `${(v.r2 * 100).toFixed(0)}%`;
    padStat.textContent = input.connected ? "kol bağlı" : "klavye";
  }
  if (run?.won) {
    osdCrash.hidden = resultShown;
    osdCrash.textContent = `GÖREV TAMAM  ·  ${Math.round(run.t)}s  ·  ARM hangar`;
  } else if (run?.lost) {
    osdCrash.hidden = resultShown;
    osdCrash.textContent = `BAŞARISIZ  ·  ${run.reason}  ·  ARM tekrar`;
  } else if (state.crashed) {
    osdCrash.hidden = false;
    osdCrash.textContent = `SIGNAL LOSS  ·  ${state.crashReason}  ·  ARM devam · R baştan`;
  } else osdCrash.hidden = true;
}

requestAnimationFrame(loop);
