import {SILE_INSPECTION,createInspectionScenario,createInspection,tickInspection,selectInspectionPoint,stopInspection,attachInspectionImage,inspectionReport,inspectionTrace,saveInspectionReport,readInspectionReport} from './sile-inspection.js';
import {createInspectionView,captureInspectionFrame,inspectionDownloadBlob} from './sile-inspection-view.js';
import {createInspectionNavigation} from './sile-inspection-navigation.js';
import {groundHeight} from './airframe-contact.js';
import {createDroneStudio} from './drone-studio.js';
import {chaseFraming,chaseOffset,fpvNearPlane,cameraClearance} from './airframe-view.js';
import {applyArcadeAssets} from './arcade-assets.js';
import {setArcadeSiteQuality} from './arcade-site.js';
import {ARCADE,renewArcadeDrone} from './arcade.js';
import {createArcadeView} from './arcade-view.js';
import {armPresentation,controlPresentation,paintInputHelp} from './flight-ui.js';
import {pinSourceOne,SOURCE_ONE_PRESET} from './flight-presets.js';
import {createStartupGate,createFlightStartGate} from './startup-gate.js';
import {loadSileData,getSileData} from './sile-data.js';
import {createMapSelector} from './map-selection.js';
import {surfaceAt} from './geo-terrain.js';
import {applyScannedMaterials} from './scanned-materials.js';
import {bindRcSetup} from './rc-setup.js';
import {canArmInput,disarmOnInputLoss,applyRcGroundStart} from './rc-input.js';
import { resetBattery } from './battery-model.js';
import { bindReferenceForm } from "./reference-form.js";
import * as THREE from "three";
import { VISUAL_KEY, readVisualSettings, normalizeVisualSettings, visualProfile, verticalFov, lensIntensity, applySceneDetail } from "./visual-settings.js";
import { readSession, LOADOUT_KEY, isFlightPaused, isLocalOnlyRun, shouldRankRun, advanceWorldTime, getBrowserStorage } from "./session-preferences.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CATALOG, droneById, paceInfo } from "./catalog.js";
import { createState, step, rotateVec, hoverThrottle, yawErrTo, yawFromQ, withPayload } from "./physics.js";
import { getInputSettings, poll, consume, bindStick, bindFlightTouches, bindTap, setControlProfile, setGamepadCalibration, captureGamepadCalibration } from "./input.js";
import { makeDrone, disposeDrone, setDroneOpacity, spinProps, makeNametag, droneSvg, setCamPodTilt } from "./models.js";
import { buildWorld, clearWorld, worldMatches, MAPS, bakeEnv, tickWorld, windFor } from "./world.js";
import { ROOMS } from "./rooms.js";
import { connect } from "./net.js";
import { createGfx, wantsWebGPU, setGpuPreference, hasWebGPU, gfxLabel } from "./gfx.js";
import { startBillboard } from "./billboard.js";
import { TRACKS, FREE, opById, roomOperation, trackOf, trackDone, trackGate, isOpOpen, nextInTrack, firstOpenOp } from "./missions.js";
import { loadProgress, saveWin, saveLap, saveAssessment } from "./progress.js";
import { createRun, tickRun, canSwapBattery, nextGoal } from "./goals.js";
import { sfx } from "./sfx.js";
import { briefingModel, fmtTime, modeGuide } from "./briefing.js";
import { createCountdown, tickCountdown } from "./countdown.js";
import { dailyId, dailyOp, pruneDailyGhosts } from "./daily.js";
import { ambience } from "./ambience.js";
import { createTrace, recordTrace, sampleTrace, traceCount, traceDuration, saveGhost, loadGhost, encodeTrace, decodeTrace } from "./ghost.js";
import { createSimulationClock, advanceSimulationClock, resetSimulationClock } from "./simulation-clock.js";
import { createAssessment, sampleAssessment, finalizeAssessment } from "./assessment.js";
import { resolveOperationLoadout } from "./loadout-selection.js";
import { workshopChoices, workshopComparison } from "./workshop-view.js";
import { BUILD_PARTS, DEFAULT_BUILD, applyFpvBuild, buildFor, buildSummary, normalizeBuilds, setBuildFor } from "./fpv-build.js";
import { emptyPilotStory, completeStoryFlight, loadPilotStory, savePilotStory, storyMission } from "./pilot-story.js";

import { REFERENCE_KEY, REFERENCE_PROFILES, readReferences, normalizeReference, applyReference, referenceMetrics, freshBatteryMetrics } from "./propulsion-reference.js";
const browserStorage = getBrowserStorage();
const rcSetup=bindRcSetup(document.getElementById('rc-setup'),browserStorage);
let referenceSetups = {
  freestyle: normalizeReference({profile:'f60-1750-6s',battery:{mode:'rint'}}),
  racer: normalizeReference({profile:'f60-2550-4s',battery:{mode:'rint'}}),
  ...readReferences(browserStorage),
};
let visualSettings = readVisualSettings(browserStorage);
let currentVisualProfile = visualProfile(visualSettings, devicePixelRatio);
const CALIBRATION_KEY = "efa-hangar-gamepad-calibration-v1";

try {
  setGamepadCalibration(JSON.parse(browserStorage.getItem(CALIBRATION_KEY) || "null"));
} catch {
  setGamepadCalibration(null);
}

const startupGate=createStartupGate();
const q0 = new URLSearchParams(location.search);
if (q0.get("room")) document.getElementById("room").value = /^team(?:-|$)/.test(q0.get("room")) ? "hangar" : q0.get("room");
if (q0.get("name")) document.getElementById("pilot").value = q0.get("name");

// "?ghost=<id>" challenge link: fetch the shared run and, once it resolves
// (well after the rest of this module has finished setting up the hangar
// UI), jump straight to that op's prep screen with the ghost ready to race.
let sharedGhost = null; // { opId, trace, meta }
if (q0.get("ghost")) {
  fetch(`/api/ghost/${encodeURIComponent(q0.get("ghost"))}`)
    .then((r) => (r.ok ? r.json() : null))
    .then(async (rec) => {
      if (!rec) return;
      const tr = decodeTrace(rec.data);
      if (!tr || !traceDuration(tr)) return;
      if (opById(rec.op).id !== rec.op) return; // unknown/garbage op id in the link
      await startupGate.run(()=>{sharedGhost = {opId:rec.op,trace:tr,meta:rec.meta||{}};prepareFlight(rec.op);});
    })
    .catch(() => {});
}

const hangarEl = document.getElementById("hangar");
const flightEl = document.getElementById("flight");
const cardsEl = document.getElementById("cards");
const canvas = document.getElementById("view");
const osdCrash = document.getElementById("osd-crash");

const initialSession = readSession(browserStorage);
let selected = initialSession.drone;
let selectedMap = initialSession.map;
let initialMapError='';
if(selectedMap==='sile')try{await loadSileData();}catch{selectedMap='airfield';initialMapError='Şile verisi yüklenemedi; Pist açıldı. Haritayı yeniden seçerek deneyebilirsin.';}
let preferredLoadout = { drone: selected, map: selectedMap };
const BUILD_KEY = "efa-hangar-fpv-build-v2";
let fpvBuilds = {};
let lastWorkshopDrone = null;
let pilotStory = null;
let progress = loadProgress();
try {
  // Each daily keeps its own ghost (~100 KB); only today's and yesterday's are worth keeping.
  pruneDailyGhosts(browserStorage);
} catch {
  /* storage unavailable */
}
// A room link may select an activity, but it cannot bypass campaign gates.
const defaultOp = "free";
let selectedOp = roomOperation(q0.get("room"), defaultOp, progress).id;
let run = null;
let inspection=null,inspectionView=null,inspectionSaved=false,inspectionTerminalMenu=false;
let inspectionNavigationView=null;
let previousInspectionReport=readInspectionReport(browserStorage),inspectionSaveMessage="",lastInspectionReport=null;
let inspectionCaptures=[];
let arcadeView = null;
let cargo = []; // per parcel: { crate, ring, zone, beam } meshes (cargo op)
let loadedSpec = null; // the selected airframe with the parcel slung under it
let prevCargo = { delivered: 0, carrying: null, dropped: 0 };
let lastWonId = null;
let prevStep = -1;
let prevGates = 0;
let prevMarks = 0;
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
const simClock = createSimulationClock(120, 0.1, 16);
const goalRoot = new THREE.Group();
let myId = "";
let angleOverride = null;
let chase = false;
const chaseHeading={x:0,z:-1};
let netStatus = "bağlanıyor…";
let worldTime = 0;
const remotes = new Map();
const hangarPilots = new Map();
const _lerpP = new THREE.Vector3();
const _lerpQ = new THREE.Quaternion();
const _targetPos = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();
const _tiltQuat = new THREE.Quaternion();
const _xAxis = new THREE.Vector3(1, 0, 0);
function createTrainingRun(op) {
  const next = createRun(op);
  next.assessment = createAssessment();
  next.reference = !!configuredSpec().propulsion;
  return next;
}

// FPV camera uptilt: the pod looks UP from the frame plane, so when the quad
// pitches nose-down to fly forward the view still holds the horizon. One value
// feeds both the camera and its visible model (setCamPodTilt).
function camTiltRad() {
  const tilt = opById(selectedOp).inspection ? 0 : visualSettings.tilt;
  return (tilt * Math.PI) / 180;
}


const touchUi =
  window.matchMedia("(pointer: coarse)").matches ||
  window.matchMedia("(hover: none)").matches ||
  window.matchMedia("(max-width: 600px)").matches ||
  ("ontouchstart" in window && window.matchMedia("(max-width: 1366px)").matches);
// WebGPU when the browser has it (desktop by default, `?gpu=1|0` / Ayarlar
// toggle override); the classic WebGL renderer otherwise. Resolved before the
// world is built so materials know which path they are on.
const gfx = await createGfx(canvas, { touchUi, wantGpu: wantsWebGPU(touchUi) });
const scene = new THREE.Scene();
// The homepage has its own visible billboard. Build the separate flight world
// only after the pilot starts, never while that world is still hidden.
let play=null,loadedMap=null,flightWorldReady=false;
const renderer = gfx.renderer;
renderer.setPixelRatio(currentVisualProfile.pixelRatio);
renderer.shadowMap.enabled = currentVisualProfile.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const fpvCam = new THREE.PerspectiveCamera(118, 1, 0.04, touchUi ? 260 : 520);
// Wide enough to keep both the craft and the elevated FPV camera visible.
const chaseCam = new THREE.PerspectiveCamera(82, 1, 0.1, touchUi ? 260 : 520);
// Node path gets a light bloom (lamps, sun glints) — the classic
// composer keeps its old no-bloom setup.
const { composer, renderPass, bodycam } = gfx.createComposer(scene, fpvCam, { bloom: gfx.node && !touchUi, ao: gfx.node && !touchUi, antialias: !touchUi, aa: !touchUi });
bodycam.uniforms.quality.value = touchUi ? 0 : 1;
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
let helpOpen = false;
const helpEl = document.getElementById("help");

function setHelp(on) {
  helpOpen = on;
  helpEl.hidden = !on;
  flightEl.classList.toggle("help-open",on);
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
    preferredLoadout = { ...preferredLoadout, drone: selected };
    for (const c of cardsEl.children) c.classList.toggle("on", c.dataset.id === selected);
    hangarPreview?.show(d.id);
    paintFpvWorkshop();
    if (typeof hangarJoin === "function") hangarJoin();
    persistLoadout();
    paintOps();
  };
  cardsEl.appendChild(b);
});

const mapsEl = document.getElementById("maps");
let mapLoading=false;
const mapStatus=document.getElementById('map-load-status');mapStatus.textContent=initialMapError;
const selectMap=createMapSelector({load:loadSileData,busy(active){mapLoading=active;document.querySelectorAll('[data-start]').forEach(b=>b.disabled=active);if(active)mapStatus.textContent='Harita hazırlanıyor…';},error(error){mapStatus.textContent='Şile verisi yüklenemedi. Mevcut harita korundu; yeniden deneyebilirsin.';const feedback=document.getElementById('inspection-save-feedback');feedback.hidden=false;feedback.textContent=mapStatus.textContent;},commit(id,context){
 selectedMap=id;if(!context?.inspection)preferredLoadout={...preferredLoadout,map:id};if(id==='sile'&&opById(selectedOp).kind!=='free')selectedOp=FREE.id;
 mapsEl.classList.toggle('locked',!!opById(selectedOp).lockMap);
 for(const c of mapsEl.children)c.classList.toggle('on',c.dataset.id===id);
 billboard.setMap(id);persistLoadout();paintOpsCards();paintOps();mapStatus.textContent=id==='sile'?'Şile hazır · Serbest uçuş · Bina yükseklikleri çoğunlukla tahmindir.':'';
}});
MAPS.forEach((m) => {
  const b = document.createElement("button");
  b.className = "card map-card" + (m.id === selectedMap ? " on" : "");
  b.dataset.id = m.id;
  b.innerHTML = `<div class="thumb" style="--tint:${m.tint}"></div><div class="cls">Harita</div><h2>${m.name}</h2><p>${m.blurb}</p>`;
  if(m.id==='sile')b.querySelector('.thumb').style.backgroundImage='url(/maps/sile/preview.svg)';
  b.onclick=()=>{if(!opById(selectedOp).lockMap)selectMap(m.id);};
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
        const op = roomOperation(r.id, selectedOp, progress);
        if (op.id !== selectedOp) {
          selectedOp = op.id;
          applyOp(op);
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
  prev.toneMappingExposure = 1.02;
  prev.shadowMap.enabled=true;prev.shadowMap.type=THREE.PCFSoftShadowMap;
  prev.outputColorSpace = THREE.SRGBColorSpace;
  prev.setPixelRatio(Math.min(devicePixelRatio, touchUi ? 1.25 : 2));
  const previewStudio=createDroneStudio({reduced:touchUi});
  const sc=previewStudio.scene;
  const studio = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(prev);
  sc.environment = pmrem.fromScene(studio, .04).texture;
  studio.dispose(); pmrem.dispose();
  const cam = new THREE.PerspectiveCamera(38, 1, 0.02, 8);
  cam.position.set(0.42, 0.32, 0.52);
  cam.lookAt(0, 0, 0);
  let mesh = null;
  let previewPivot=null;
  let previewRadius = .3;
  function show(id) {
    const base = droneById(id);
    const d = configuredSpec(id);
    if (mesh) {
      disposeDrone(mesh);previewPivot?.removeFromParent();
    }
    mesh = makeDrone(d, camTiltRad());
    mesh.rotation.y = 0;
    const s = 0.22 / d.size;
    mesh.scale.setScalar(s);
    const fitted=previewStudio.fit(mesh);previewRadius=fitted.radius;previewPivot=fitted.pivot;
    previewPivot.rotation.y=Math.PI*.8;
    sc.add(previewPivot);
    if (cap) cap.textContent = d.name;
    const visualNote=document.getElementById('airframe-visual-note');if(visualNote){visualNote.textContent=mesh.userData.visual.evidence;visualNote.href=mesh.userData.visual.sourceMarker?'/airframes/source-one-v4/VISUAL-NOTES.txt':'/physics.html';}
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
  const direction = new THREE.Vector3(.42,.32,.52);
  let manualRotation = false;
  let lastPointerX = null;
  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", e => { lastPointerX=e.clientX;manualRotation=true;canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", e => { if(lastPointerX==null||!mesh)return;previewPivot.rotation.y+=(e.clientX-lastPointerX)*.012;lastPointerX=e.clientX; });
  for(const event of ["pointerup","pointercancel","lostpointercapture"]) canvas.addEventListener(event,()=>{lastPointerX=null;});
  for(const button of document.querySelectorAll('[data-preview-view]')) button.addEventListener('click',()=>{
    const view=button.dataset.previewView;
    direction.set(...(view==='top'?[.01,1,.01]:view==='bottom'?[.3,-.8,.4]:[.42,.32,.52]));
    manualRotation=true;
    for(const b of document.querySelectorAll('[data-preview-view]')) b.setAttribute('aria-pressed',String(b===button));
  });
  function tick() {
    requestAnimationFrame(tick);
    if (hangarEl.hidden || !mesh || !canvas.getClientRects().length) return;
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 200;
    prev.setSize(w, h, false);
    cam.aspect = w / Math.max(h, 1);
    const halfFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov*.5)) * Math.min(1,cam.aspect));
    cam.position.copy(direction).normalize().multiplyScalar(previewRadius / Math.sin(halfFov) * 1.15 / Number(document.getElementById("preview-zoom")?.value || 1));
    cam.lookAt(0,0,0);
    cam.updateProjectionMatrix();
    if(!manualRotation)previewPivot.rotation.y+=.003;
    // Stationary propellers expose the blade shape and motor hardware in the showroom.
    for (const disc of mesh.userData.discs || []) disc.visible = false;
    prev.render(sc, cam);
  }
  tick();
  return { show };
}
const hangarPreview = createHangarPreview();
const billboard = startBillboard(document.getElementById("hangar-live"), { reduced: touchUi });
if(selectedMap!=='airfield')billboard.setMap(selectedMap);

function applyOp(op) {
  selectMap.cancel();
  const loadout = resolveOperationLoadout(preferredLoadout, op);
  if (selectedMap !== loadout.map) {
    selectedMap = loadout.map;
    for (const c of mapsEl.children) c.classList.toggle("on", c.dataset.id === selectedMap);
    billboard.setMap(selectedMap);
  }
  if (selected !== loadout.drone) {
    selected = loadout.drone;
    for (const c of cardsEl.children) c.classList.toggle("on", c.dataset.id === selected);
    hangarPreview?.show(selected);
    paintFpvWorkshop();
  }
  cardsEl.classList.toggle("locked", !!op.lockDrone);
  mapsEl.classList.toggle("locked", !!op.lockMap);
}

function paintOpsCards() {
  const el = document.getElementById("ops");
  if (!el) return;
  progress = loadProgress();
  el.innerHTML = "";
  const card = (op, cls, extra = "", parent = el, intent = "") => {
    const open = isOpOpen(op, progress);
    const b = document.createElement("button");
    b.className = "card" + extra + (op.id === selectedOp ? " on" : "") + (open ? "" : " lock");
    b.dataset.id = op.id;
    const best = progress.best[op.id];
    const done = progress.done[op.id];
    const tag = done ? `bitti · ${Math.round(best ?? done.t)}s` : open ? "açık" : "kilit";
    b.innerHTML = `<div class="cls">${esc(cls)}</div><h2>${esc(intent || op.name)}</h2><p>${esc(intent ? `${op.name} · ${op.blurb}` : op.blurb)}</p><div class="best">${tag}</div>`;
    b.onclick = () => {
      if (!open) return;
      selectedOp = op.id;
      applyOp(op);
      paintOpsCards();
      paintOps();
    };
    parent.appendChild(b);
  };
  card(ARCADE, "Oyun · 4 hareketli nesne", " quick");
  const daily = dailyOp(dailyId());
  const schoolId = firstOpenOp("school", progress)?.id || "hover";
  const guide = modeGuide(selectedOp, daily.id, schoolId);
  const title = document.createElement("div");
  title.className = "ops-section-title";
  title.innerHTML = `<span>${esc(guide.quickLabel)}</span><small>Amacına göre seç</small>`;
  el.appendChild(title);
  const quickOps = new Map([
    [schoolId, opById(schoolId)],
    [FREE.id, FREE],
    [daily.id, daily],
  ]);
  for (const choice of guide.quick) {
    const quickOp = quickOps.get(choice.id);
    const extra = quickOp.daily ? " daily" : "";
    card(quickOp, choice.detail, extra + " quick", el, choice.intent);
  }
  const trainingTitle = document.createElement("div");
  trainingTitle.className = "ops-section-title training";
  trainingTitle.innerHTML = `<span>${esc(guide.trainingLabel)}</span><small>Bölümü aç, dersini seç</small>`;
  el.appendChild(trainingTitle);
  for (const track of TRACKS) {
    const done = trackDone(track, progress);
    const complete = done === track.ops.length;
    const gate = trackGate(track, progress);
    const group = document.createElement("details");
    group.className = "ops-track" + (complete ? " complete" : "") + (gate ? " locked" : "");
    group.open = track.ops.some((op) => op.id === selectedOp);
    group.innerHTML =
      `<summary><span class="cls">${esc(track.kicker)}</span><strong>${esc(track.name)}</strong>` +
      `<em>${done}/${track.ops.length}${complete ? " · DİPLOMA" : ""}</em></summary>` +
      `<p>${esc(track.blurb)}${gate ? ` <b>Kilit: önce ${esc(gate.name)}.</b>` : ""}</p>`;
    const cards = document.createElement("div");
    cards.className = "ops-track-cards";
    group.appendChild(cards);
    el.appendChild(group);
    track.ops.forEach((op, i) => card(op, `${track.short} ${i + 1}/${track.ops.length}`, "", cards));
  }
}
paintOpsCards();
applyOp(opById(selectedOp));

const LOAD_KEY = LOADOUT_KEY;
(function restoreFpvBuild() {
  try {
    const stored = JSON.parse(browserStorage.getItem(BUILD_KEY) || browserStorage.getItem("efa-hangar-fpv-build-v1") || "null");
    fpvBuilds = normalizeBuilds(stored, CATALOG.filter((drone) => drone.fpv).map((drone) => drone.id));
  } catch {
    fpvBuilds = {};
  }
})();
pilotStory = loadPilotStory(browserStorage, { progress, fpvBuilds });
function persistFpvBuild() {
  try {
    browserStorage.setItem(BUILD_KEY, JSON.stringify(fpvBuilds));
  } catch {
    /* storage unavailable */
  }
}
function configuredSpec(id=selected) {
  const base=droneById(id);
  const reference=applyReference(base, referenceSetups[id]);
  return reference.propulsion ? reference : applyFpvBuild(base, buildFor(fpvBuilds,id));
}
const dynamicsFields={wheelbaseMm:'dyn-wheelbase',inertiaX:'dyn-inertia-x',inertiaY:'dyn-inertia-y',inertiaZ:'dyn-inertia-z',motorTauMs:'dyn-tau',yawTorqueM:'dyn-yaw',centerRateDps:'dyn-center',kp:'dyn-kp',ki:'dyn-ki',kd:'dyn-kd'};
function paintReferenceWorkshop() {
  const supported=['freestyle','racer'].includes(selected);
  const settings=normalizeReference(referenceSetups[selected]);
  document.getElementById('reference-panel').hidden=!supported;
  document.getElementById('reference-profile').value=settings.profile;
  document.getElementById('reference-mass').value=settings.massG;
  document.getElementById('reference-capacity').value=settings.capacityMah;
  document.getElementById('reference-usable').value=Math.round(settings.usableFraction*100);
  document.getElementById('reference-electronics').value=settings.electronicsA;
  const battery=settings.battery;
  document.getElementById('battery-mode').value=battery.mode;
  for(const [id,value] of [['battery-resistance',battery.cellResistanceMohm],['battery-soc',battery.initialSoc*100],['battery-cutoff',battery.cutoffCellV]]) {
    document.getElementById(id).value=value;document.getElementById(id).disabled=battery.mode!=='rint';
  }
  document.getElementById('battery-summary').textContent=battery.mode==='rint'?`Model varsayımı: ${battery.cellResistanceMohm} mΩ / hücre · başlangıç SOC %${Math.round(battery.initialSoc*100)} · ${battery.cutoffCellV} V/hücre kesme. Gerilim tezgâh değerini aşsa bile itki artırılmaz.`:'Tezgâh modu: kaynak besleme eğrisi korunur; batarya sag modeli kapalıdır.';
  const aero=settings.aerodynamics;
  for(const [key,id] of Object.entries({density:'aero-density',cdaX:'aero-x',cdaY:'aero-y',cdaZ:'aero-z'}))document.getElementById(id).value=aero[key];
  const pinned=settings.airframe===SOURCE_ONE_PRESET.id;
  document.getElementById('source-one-status').innerHTML=pinned?`SOURCE ONE v4 tabanlı referans etkin · 226 mm kaynak ölçüsü; etkin geometri ${settings.dynamics.wheelbaseMm} mm / ${settings.massG} g. Simetrik X yerleşimi, kütle, atalet ve aerodinamik katsayılar varsayım. <a href="${SOURCE_ONE_PRESET.source}" target="_blank" rel="noopener">Resmî açık tasarım ↗</a>`:'Açık tasarımlı gövde + ölçülmüş motor eğrisi. Tam drone uçuş ölçümü değildir.';
  const dynamics=settings.dynamics;
  document.getElementById('dyn-inertia-mode').value=dynamics.inertiaMode;
  for(const [key,id] of Object.entries(dynamicsFields)) {
    document.getElementById(id).value=key.startsWith('inertia')?dynamics[key].toFixed(6):dynamics[key];
    document.getElementById(id).disabled=key.startsWith('inertia')&&dynamics.inertiaMode!=='manual';
  }
  document.getElementById('dynamics-summary').textContent=`Dört ayrı motor · ${dynamics.motorTauMs} ms motor modeli · J ${dynamics.inertiaMode==='manual'?'elle girildi':'geometriden tahmin'} · PID ${dynamics.kp} / ${dynamics.ki} / ${dynamics.kd}. D filtresi 25 Hz; integral sınırlı. Bunlar model ayarlarıdır.`;
  const tuned=configuredSpec(),metrics=referenceMetrics(tuned);
  const profile=REFERENCE_PROFILES[tuned.propulsion?.profile];
  const operating=battery.mode==='rint'&&metrics?freshBatteryMetrics(tuned):metrics;
  document.getElementById('reference-inputs').hidden=!metrics;
  document.getElementById('reference-apply').hidden=!metrics;
  document.getElementById('dynamics-panel').hidden=!metrics;
  document.getElementById('battery-panel').hidden=!metrics;
  document.getElementById('reference-parts').hidden=!metrics;
  if(metrics) {
    const motorArt=workshopChoices('motors')[profile.cells===6?0:2].svg.replace('2450 KV','2550 KV');
    const batteryArt=workshopChoices('battery')[profile.cells===6?1:0].svg.replace(/6S 1100|4S 1500/g,profile.cells+'S '+settings.capacityMah);
    document.getElementById('reference-parts').innerHTML=[[motorArt,profile.motor],[workshopChoices('props')[1].svg,'HQ 5×4 · üç pal'],[batteryArt,profile.cells+'S · kapasite girdisi']].map(([svg,name])=>`<div><span class="part-art">${svg}</span><small>${name}</small></div>`).join('');
  }
  document.getElementById('workshop-parts').hidden=!!metrics;
  document.getElementById('build-reset').hidden=!!metrics;
  document.getElementById('reference-evidence').innerHTML=metrics?`<p class="evidence-tag">Statik tezgâh verisine bağlı · antrenman</p><p>${profile.motor} ×4 · ${profile.source.propeller} · ${profile.cells}S</p><dl><div><dt>${battery.mode==='rint'?'Başlangıç pil modeli':'Tezgâh'} hover gazı</dt><dd>${operating.hoverThrottle==null?'—':(operating.hoverThrottle*100).toFixed(1)}%</dd></div><div><dt>Hover toplam akımı</dt><dd>${operating.hoverCurrentA?.toFixed(2)??'—'} A</dd></div><div><dt>Tezgâh tepe akımı · 4 motor + aviyonik</dt><dd>${metrics.peakCurrentA.toFixed(2)} A</dd></div></dl><a href="${profile.source.url}" target="_blank" rel="noopener">Kaynak: DroneHiTech · 23 Mayıs 2020 ↗</a> · <a href="/physics.html" target="_blank" rel="noopener">Model kapsamı ve açık kaynaklar ↗</a><p class="why">AIKON 35A BLHeli32 ESC; ${profile.cells===6?'25.2':'16.8'} V ayarlı tezgâh beslemesi. ${battery.mode==='rint'?'Motorun tezgâh eğrisi ölçümdür; üzerine eklenen Rint, OCV ve gerilim ölçeklemesi varsayımdır.':'Gerilim eğrisi testten gelir; batarya sag modeli kapalıdır.'} Isı ve ileri uçuşta pervane verimi hesaplanmaz. %0–30 gaz ölçülmedi, uzatma kullanılır. Tepe akım, seçtiğin bataryanın bunu verebildiğini kanıtlamaz. Sonuçlar genel sıralamaya veya eski rekorlara yazılmaz.</p>`:'<p class="evidence-tag approximate">Genel profil · elle ayarlanmış çarpanlar, ölçüm doğrulaması yok</p>';
  document.getElementById('build-comparison-title').textContent=metrics?'Referans kurulum hesapları':'Bu kurulum neyi değiştiriyor?';
  document.getElementById('build-comparison-note').textContent=metrics?'Tezgâh eğrisinden türetilir; tam uçuş doğrulaması değildir. Süre sabit hover tahminidir.':'Aynı drone’un standart kurulumuna göre fark. Süreler simülasyon tahminidir.';
  if(metrics) {
    const rows=[['Tezgâh tepe itiş / ağırlık',metrics.peakThrustToWeight.toFixed(1)+':1','4 × ölçülen tek motor / girilen ağırlık'],['Tahmini hover süresi',(operating.hoverSeconds==null?'Yetersiz itki':Math.round(operating.hoverSeconds)+' sn'),'Başlangıç hover akımından tahmin · uçuş süresi değildir'],['Rate ayarı',Math.round(tuned.maxRate*180/Math.PI)+'°/sn','Kontrol ayarı · ölçüm değildir'],['Toplam ağırlık',settings.massG+' g','Kullanıcı girdisi · örnek varsayılan']];
    document.getElementById('build-stats').innerHTML=rows.map(([k,v,n])=>`<div><dt>${k}</dt><dd>${v}</dd><small>${n}</small></div>`).join('');
    document.getElementById('build-summary').textContent=profile.name;
  }
}
function saveReferenceSettings() {
  const manualRequested=document.getElementById('dyn-inertia-mode').value==='manual';
  const previous=normalizeReference(referenceSetups[selected]);
  const profile=document.getElementById('reference-profile').value;
  referenceSetups[selected]=normalizeReference({airframe:previous.airframe,aerodynamics:Object.fromEntries(Object.entries({density:'aero-density',cdaX:'aero-x',cdaY:'aero-y',cdaZ:'aero-z'}).map(([key,id])=>[key,Number(document.getElementById(id).value)])),battery:{mode:document.getElementById('battery-mode').value,cellResistanceMohm:Number(document.getElementById('battery-resistance').value),initialSoc:Number(document.getElementById('battery-soc').value)/100,cutoffCellV:Number(document.getElementById('battery-cutoff').value)},profile,massG:Number(document.getElementById('reference-mass').value),capacityMah:profile!==previous.profile?REFERENCE_PROFILES[profile]?.capacityMah:Number(document.getElementById('reference-capacity').value),usableFraction:Number(document.getElementById('reference-usable').value)/100,electronicsA:Number(document.getElementById('reference-electronics').value),dynamics:{inertiaMode:document.getElementById('dyn-inertia-mode').value,...Object.fromEntries(Object.entries(dynamicsFields).map(([key,id])=>[key,Number(document.getElementById(id).value)]))}});
  try{browserStorage?.setItem(REFERENCE_KEY,JSON.stringify(referenceSetups));}catch{}
  paintFpvWorkshop();
  const validation=document.getElementById('dynamics-validation');
  validation.textContent=document.getElementById('dyn-inertia-mode').value==='estimated'&&manualRequested?'Manuel J geçersiz: pozitif değerler ve üçgen eşitsizliği gerekir. Geometrik tahmin uygulandı.':'Ayarlar uygulandı.';
}
bindReferenceForm(document,saveReferenceSettings);
document.getElementById('source-one-preset').addEventListener('click',()=>{
 const result=pinSourceOne(browserStorage,referenceSetups);referenceSetups=result.setups;
 selectedOp="free";applyOp(opById("free"));paintOpsCards();
 cardsEl.querySelector('[data-id="freestyle"]').click();
 document.getElementById('real').checked=true;
 persistLoadout();paintFpvWorkshop();paintOps();
 document.getElementById('source-one-status').textContent=result.saved?'SOURCE ONE v4 referansın kaydedildi. 6S / 1750KV / HQ 5×4×3 · 650 g varsayımı. Gerçekçi Acro açık.':'Kurulum bu oturumda uygulandı; tarayıcı kaydı başarısız, yeniden açılışta korunmayabilir.';
});
document.getElementById('reference-use-generic').addEventListener('click',()=>{
  referenceSetups[selected]=normalizeReference({...referenceSetups[selected],profile:'generic'});
  try{browserStorage?.setItem(REFERENCE_KEY,JSON.stringify(referenceSetups));}catch{}
  paintFpvWorkshop();
});
function paintFpvWorkshop() {
  const workshop = document.getElementById("fpv-workshop");
  const isFpv = !!droneById(selected).fpv;
  workshop.hidden = !isFpv;
  document.getElementById('reference-flight-note').hidden=!configuredSpec().propulsion;

  document.querySelector('.workshop-comparison').hidden = !isFpv;
  document.getElementById('workshop-unavailable').hidden = isFpv;
  if(lastWorkshopDrone!==selected)document.getElementById('workshop-feedback').textContent='';
  lastWorkshopDrone=selected;
  if (!isFpv) return;
  const build = buildFor(fpvBuilds, selected);
  const labels = { frame:"Çerçeve", motors:"Motor", battery:"Batarya", props:"Pervane" };
  document.getElementById("workshop-parts").innerHTML = Object.keys(BUILD_PARTS).map(type=>`<fieldset class="part-group"><legend>${labels[type]}</legend><div class="part-choices">${workshopChoices(type).map(choice=>`<button type="button" class="part-choice ${build[type]===choice.id?'selected':''}" data-build-type="${type}" data-build-id="${choice.id}" aria-pressed="${build[type]===choice.id}"><span class="part-art">${choice.svg}</span><strong>${choice.name}</strong><small>${choice.description}</small><span class="part-state">${build[type]===choice.id?'✓ Takılı':'Seç'}</span></button>`).join('')}</div></fieldset>`).join('');
  document.getElementById("build-stats").innerHTML = workshopComparison(droneById(selected),build).map(row=>`<div><dt>${row.label}</dt><dd id="build-${row.key}">${row.value}${row.unit}</dd><small>${row.delta===0?'Standart ile aynı':`${row.delta>0?'+':''}${row.delta}${row.unit} fark`}</small></div>`).join('');
  document.getElementById("build-summary").textContent = buildSummary(build);
  paintReferenceWorkshop();
  hangarPreview.show(selected);
  const note = document.getElementById("story-workshop-note");
  if (note) {
    const mission = storyMission(pilotStory);
    note.hidden = !opById(selectedOp).story || !mission || selected !== "freestyle";
    note.textContent = mission ? `Kayıp çekim · sıradaki uçuş: ${mission.name}` : "";
  }
}
document.getElementById("workshop-parts").addEventListener("click", event => {
  const button=event.target.closest('[data-build-type]');
  if(!button)return;
  const {buildType:type,buildId:id}=button.dataset;
  fpvBuilds = setBuildFor(fpvBuilds, selected, { ...buildFor(fpvBuilds, selected), [type]: id });
  if (!pilotStory?.complete && selected === "freestyle") pilotStory = savePilotStory({ ...pilotStory, build: buildFor(fpvBuilds, selected) }, browserStorage);
  persistFpvBuild();
  paintFpvWorkshop();
  document.querySelector(`[data-build-type="${type}"][data-build-id="${id}"]`)?.focus({preventScroll:true});
  const choice=workshopChoices(type).find(c=>c.id===id);
  document.getElementById("workshop-feedback").textContent=`${choice.name} takıldı. ${choice.description}${type==='motors'?' KV iç sargı özelliğidir; dış motor görünümü aynı kalır.':''}`;
});
document.getElementById("build-reset")?.addEventListener("click", () => {
  fpvBuilds = setBuildFor(fpvBuilds, selected, DEFAULT_BUILD);
  persistFpvBuild();
  paintFpvWorkshop();
  document.getElementById("workshop-feedback").textContent="Standart kurulum geri yüklendi.";
});
(function restoreLoadout() {
  try {
    const o = JSON.parse(browserStorage.getItem(LOAD_KEY) || "null");
    if (!o) return;
    const night = document.getElementById("night");
    const real = document.getElementById("real");
    const cam = document.getElementById("cam-tilt");
    const look = document.getElementById("camera-look");
    const control = document.getElementById("control-profile");
    if (night) night.checked = !!o.night;
    // Existing players get the training default once; later choices persist.
    if (real) real.checked = o.trainingVersion ? !!o.real : true;
    if (cam && o.cam) cam.value = String(o.cam);
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
paintFpvWorkshop();
setControlProfile(document.getElementById("control-profile")?.value || "training");
function persistLoadout() {
  try {
    browserStorage.setItem(
      LOAD_KEY,
      JSON.stringify({
        drone: preferredLoadout.drone,
        map: preferredLoadout.map,
        night: !!document.getElementById("night")?.checked,
        real: !!document.getElementById("real")?.checked,
        mute: !!document.getElementById("mute")?.checked,
        cam: document.getElementById("cam-tilt")?.value || "30",
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
for (const id of ["night", "real", "cam-tilt", "camera-look", "control-profile", "pilot"]) {
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
    browserStorage.setItem(CALIBRATION_KEY, JSON.stringify(calibration));
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
function showPreparationTab(tab) {
  hangarEl.dataset.tab = tab;
  const preview=document.querySelector('.preview-column');
  const target=tab==='atolye'?document.getElementById('workshop-preview'):document.querySelector('.preparation-layout');
  if(preview && target && preview.parentElement!==target)target.prepend(preview);
  if(tab==='atolye')paintFpvWorkshop();
  for (const button of document.querySelectorAll("#hangar-tabs [data-tab]")) {
    button.classList.toggle("on", button.dataset.tab === tab);
    button.setAttribute("aria-pressed", String(button.dataset.tab === tab));
  }
  for (const panel of document.querySelectorAll(".hangar-tabpanels > [data-tab]")) {
    panel.hidden = panel.dataset.tab !== tab;
  }
}
function prepareFlight(op, friends = false) {
  hangarEl.classList.remove("more-open");
  document.querySelector(".hangar-inner").scrollTop = 0;
  billboard.pause();
  hangarEl.dataset.screen = "prepare";
  hangarEl.classList.toggle("with-friends", friends);
  document.getElementById("home-back").hidden = false;
  selectedOp = op; applyOp(opById(op)); paintOpsCards(); paintOps();
  document.querySelector('#hangar-tabs [data-tab="platform"]').click();
}
function paintStoryHome() {
  const mission = storyMission(pilotStory);
  document.getElementById("home-rebuild-sub").textContent = mission ? mission.name : "Üç kısa çekim uçuşu";
}
bindTap(document.getElementById("home-rebuild"), () => {
  if (pilotStory.complete) pilotStory = emptyPilotStory();
  const mission = storyMission(pilotStory);
  if (mission) prepareFlight(mission.id);
});
bindTap(document.getElementById("home-inspection"),async()=>{if(await selectMap("sile",{inspection:true}))prepareFlight(SILE_INSPECTION.id);});
bindTap(document.getElementById("home-fly"), () => prepareFlight("free"));
bindTap(document.getElementById("home-quick"), () => { selectedOp = "free"; startFlight(); });
bindTap(document.getElementById("home-more"), () => {
  const open = hangarEl.classList.toggle("more-open");
  document.getElementById("home-more").setAttribute("aria-expanded", String(open));
});
bindTap(document.getElementById("home-freestyle"), () => prepareFlight("freestyle"));
bindTap(document.getElementById("home-arcade"), () => prepareFlight(ARCADE.id));
bindTap(document.getElementById("home-race"), () => prepareFlight("race-practice"));
bindTap(document.getElementById("home-workshop"), () => {
  prepareFlight("free");
  if (!droneById(selected).fpv) cardsEl.querySelector('[data-id="freestyle"]').click();
  showPreparationTab("atolye");
});
bindTap(document.getElementById("home-settings"), () => { prepareFlight("free"); showPreparationTab("ayarlar"); });
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
  document.querySelector(".hangar-inner").scrollTop = 0;
  billboard.resume();
  document.getElementById("home-back").hidden = true;
});
paintStoryHome();
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
bindTap(document.getElementById("btn-arm-touch"), () => {
  consume("arm");
  toggleArm();
});
if (!helpOpen) document.getElementById("help").hidden = true;

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
    paintOps();
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
  if(opById(selectedOp).inspection)return;
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
  const d = configuredSpec();
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
  set("ops-map", opById(selectedOp).mapName||m.name);
  document.getElementById('geo-map-note').hidden=selectedMap!=='sile';
  const caption=document.querySelector('.scene-caption h2');if(caption)caption.textContent=m.name;
  const captionText=document.querySelector('.scene-caption p');if(captionText)captionText.textContent=m.id==='sile'?'Gerçek yerleşim. Temsili yapılar.':m.blurb;
  document.getElementById('hangar-live')?.setAttribute('aria-label',m.name+' alanının temsili 3B önizlemesi');
  set("ops-room", r.name);
  set("ops-room-n", `${n} kişi`);
  set("ops-op", opById(selectedOp).name);
  set("home-last-setup", `${configuredSpec(preferredLoadout.drone).name} · ${MAPS.find(map => map.id === preferredLoadout.map)?.name || m.name}`);
  set("preparation-title", opById(selectedOp).name);
  const where = document.getElementById("go-where");
  const op = opById(selectedOp);
  if (where) where.textContent = `${op.name} · ${op.mapName||m.name}`;
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
    map: {...(MAPS.find((x) => x.id === selectedMap) || MAPS[0]),...(op.mapName?{name:op.mapName}:{})},
    drone: op.inspection ? configuredSpec() : droneById(selected),
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
  mesh.visible=!inspection;
  mesh.add(makeNametag(meta?.name || "pilot"));
  scene.add(mesh);
  remotes.set(id, { mesh, spec: dspec, target: st, meta });
}

function dropRemote(id) {
  const r = remotes.get(id);
  if (!r) return;
  disposeDrone(r.mesh);
  remotes.delete(id);
}

function snapCam() {
  _targetQuat.set(state.qx, state.qy, state.qz, state.qw);
  if (!chase) _targetQuat.multiply(_tiltQuat.setFromAxisAngle(_xAxis, camTiltRad()));
  const mount=craft?.userData.fpvAnchor||[0,spec.size*.55,spec.size*.12];
  const [ox,oy,oz]=rotateVec(state.qw,state.qx,state.qy,state.qz,...mount);
  fpvCam.position.set(state.x + ox, state.y + oy, state.z + oz);
  fpvCam.quaternion.copy(_targetQuat);
}

function clearGoals() {
  arcadeView?.dispose();arcadeView=null;
  scene.remove(goalRoot);
  while (goalRoot.children.length) goalRoot.remove(goalRoot.children[0]);
  for (const c of cargo) for (const m of [c.crate, c.ring, c.zone, c.beam]) scene.remove(m);
  cargo = [];
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
  if (op?.kind === "arcade") {arcadeView=createArcadeView(scene,run.arcade,{guides:document.getElementById('arcade-guides').checked});arcadeView.paint(run.arcade,fpvCam);return;}
  if (!op || op.kind === "free" || op.kind === "arcade" || configuredSpec().propulsion) return;
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

function spawn() {
  finishInspection("reset");
  inspectionView?.dispose();inspectionView=null;inspection=null;
  inspectionNavigationView?.dispose();inspectionNavigationView=null;
  const op = opById(selectedOp);
  spec = configuredSpec();
  loadedSpec = op.kind === "cargo" ? withPayload(spec, op.payload) : null;
  sfx.setVoice(spec);
  hideResult();
  if (craft)disposeDrone(craft);
  craft = makeDrone(spec, camTiltRad());
  spec={...spec,contactBounds:craft.userData.contactBounds};
  if(loadedSpec)loadedSpec={...loadedSpec,contactBounds:spec.contactBounds};
  scene.add(craft);
  let sp = play.spawn&&op.kind==='free'?{...play.spawn,y:surfaceAt(play,play.spawn.x,play.spawn.z).height+.12}:op.spawn || { x: 0, y: 8, z: -14 };
  state = createState(sp.x, sp.y, sp.z);
  if (op.startGrounded) {
    state.y = groundHeight(spec,state,surfaceAt(play,state.x,state.z,state.y));
    state.grounded = true;
    state.groundedFor = 1;
  }
  state.armed = !op.startGrounded&&!play.terrain;
  state.motor = state.armed ? hoverThrottle(spec) : 0;
  state.throttleOut = state.motor;
  state.altHold = state.armed ? state.y : null;
  applyRcGroundStart(state,poll(),groundHeight(spec,state,surfaceAt(play,state.x,state.z,state.y)));
  angleOverride = op.requiredFlightMode ? op.requiredFlightMode === "angle" : spec.defaultMode === "angle";
  resetSimulationClock(simClock);
  chase = false;chaseHeading.x=0;chaseHeading.z=-1;
  crashFade = 0;
  osdCrash.hidden = true;
  fpvCam.fov = verticalFov(visualSettings.fov, fpvCam.aspect);
  fpvCam.updateProjectionMatrix();
  snapCam();
  if(op.inspection){
    previousInspectionReport=lastInspectionReport||readInspectionReport(browserStorage)||previousInspectionReport;
    const scenario=createInspectionScenario(getSileData(),play);scenario.spawn={x:state.x,y:state.y,z:state.z};
    inspection=createInspection(scenario,{createdAt:new Date().toISOString(),appVersion:document.querySelector('meta[name="app-version"]')?.content||'2.35',vehicle:JSON.parse(JSON.stringify(spec)),environment:{map:'sile',night:!!document.getElementById('night').checked,wind:play.wind,real:play.real},inputs:{profile:getInputSettings(),cameraTiltDegrees:0,savedTiltDegrees:visualSettings.tilt},ilkeVehicleValidated:false});
    inspectionView=createInspectionView(scene,inspection);
    inspectionNavigationView=createInspectionNavigation({hud:document.getElementById('inspection-hud'),map:document.getElementById('inspection-map'),route:document.getElementById('inspection-route')},inspection,getSileData());
    inspectionSaved=false;inspectionTerminalMenu=false;inspectionCaptures=[];inspectionSaveMessage='';paintInspection();
  }else paintInspection();
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
  fpvCam.fov = verticalFov(visualSettings.fov, fpvCam.aspect);
  chaseCam.aspect = w / h;
  fpvCam.updateProjectionMatrix();
  chaseCam.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
window.visualViewport?.addEventListener("resize", resize);
window.visualViewport?.addEventListener("scroll", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 280));
screen.orientation?.addEventListener?.("change", () => setTimeout(resize, 280));
gfx.canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
gfx.canvas.addEventListener("webglcontextrestored", resize);

const flightLoading=document.getElementById('flight-loading');
let flightStartFocus=null;
const startPreparedFlight=createFlightStartGate({
  paint:()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))),
  busy(active){
    if(active)flightStartFocus=document.activeElement;
    flightLoading.hidden=!active;hangarEl.inert=active;
    hangarEl.setAttribute('aria-busy',String(active));
    if(active){
      const op=opById(selectedOp),loadout=resolveOperationLoadout(preferredLoadout,op);
      const label=op.mapName||MAPS.find(m=>m.id===loadout.map)?.name||'Uçuş alanı';
      flightLoading.querySelector('strong').textContent=`${label} hazırlanıyor…`;
      flightLoading.focus();billboard.pause();
    }else{
      if(!flying){
        const home=hangarEl.dataset.screen==='home';
        if(home)billboard.resume();
        const fallback=document.getElementById(home?'home-quick':'go-dock');
        const target=[flightStartFocus,fallback].find(el=>el&&el!==document.body&&el.isConnected&&el.getClientRects().length&&!el.matches(':disabled'));
        target?.focus({preventScroll:true});
      }
      flightStartFocus=null;
    }
  },
  start:()=>startFlightNow(),
  error(cause){
    console.error('[flight] Uçuş alanı hazırlanamadı:',cause);
    if(flying)backHangar();
    flightWorldReady=false;play=null;loadedMap=null;clearWorld(scene);
    mapStatus.textContent='Uçuş alanı hazırlanamadı. Yeniden Uçuşa başla seçerek deneyebilirsin.';
    const feedback=document.getElementById('inspection-save-feedback');feedback.hidden=false;feedback.textContent=mapStatus.textContent;
  },
});
function startFlight(){
  if(mapLoading||flying)return;
  // Retain user activation for audio before yielding to paint the loading UI.
  sfx.unlock();return startPreparedFlight();
}
function startFlightNow() {
  if(mapLoading)return;
  if(opById(selectedOp).inspection&&!getSileData()){mapStatus.textContent="Şile yüklenmeden inceleme başlayamaz.";return;}
  const op = opById(selectedOp);
  // Use the same lock-aware rule as the preparation screen. A suggested
  // airframe must not replace the pilot's choice unless the op locks it.
  const loadout = resolveOperationLoadout(preferredLoadout, op);
  selectedMap = loadout.map;
  selected = loadout.drone;
  // An op can pin night / realistic physics (night nav lesson, acro lesson).
  const nightOn = op.night ?? !!document.getElementById("night")?.checked;
  renderer.toneMappingExposure = nightOn ? 1.04 : selectedMap === "indoor" ? .88 : .93;
  const name = document.getElementById("pilot").value || "pilot";
  const room = document.getElementById("room").value || "hangar";
  const u = new URL(location.href);
  u.searchParams.set("room", room);
  u.searchParams.set("name", name);
  history.replaceState(null, "", u);
  prevStep = -1;
  prevGates = 0;
  prevMarks = 0;
  swapChirp = false;
  lowChirp = false;
  if (!flightWorldReady||!worldMatches(scene,selectedMap,{night:nightOn,variant:op.worldVariant})) {
    flightWorldReady=false;
    for (const id of [...remotes.keys()]) dropRemote(id);
    clearWorld(scene);
    play = buildWorld(scene, selectedMap, { lite: touchUi, night: nightOn, variant:op.worldVariant, gpu: gfx.node, sky: gfx.createSky, props: !touchUi, quality:visualSettings.quality });
    if (!touchUi) bakeEnv(renderer, scene, gfx.PMREMGenerator);
    loadedMap = selectedMap;
    flightWorldReady=true;
  }
  if(!op.inspection)net.join(room, name, selected);
  for(const camera of [fpvCam,chaseCam]){camera.far=play.terrain?6500:(touchUi?260:520);camera.near=play.terrain ? .1 : camera===fpvCam ? .04 : .1;camera.updateProjectionMatrix();}
  document.getElementById('map-attribution').hidden=!play.terrain;
  play.drain = op.drain ?? 1;
  play.wind = windFor(op, selectedMap);
  play.real = op.real ?? !!document.getElementById("real")?.checked;
  play.assists = op.assists || null;
  run = op.kind === "free" ? null : createTrainingRun(op);
  prevLap = 0;
  countdown = run && op.countdown ? createCountdown(op.countdown) : null;
  goFlash = 0;
  showCountdown(null);
  if (run && !countdown && !run.arcade) net.sendStart(op.id, op.name);
  replay = null;
  lastResult = null;
  trace = run && !countdown && !run.arcade ? createTrace() : null;
  loadGhostFor(run ? op : null);
  buildGoals(op);
  hangarEl.hidden = true;
  flightEl.hidden = false;
  flying = true;
  billboard.pause();
  setHelp(false);
  setPlayMenu(false);
  sfx.unlock();
  ambience.start(op.worldVariant==='aftermath'?'aftermath':selectedMap==='sile'?'coast':selectedMap, { night: nightOn });
  lockWake();
  spawn();
  applyVisualSettings();
  resize();
  requestAnimationFrame(resize);
  document.getElementById("rotate-hint")?.classList.remove("open");
}

function inspectionTerminal(session){return session&&['completed','stopped','failed'].includes(session.status);}
function finishInspection(reason){
  if(!inspection)return;
  if(!inspectionTerminal(inspection))stopInspection(inspection,reason||'operator');
  if(!inspectionSaved){
    const report=inspectionReport(inspection);lastInspectionReport=report;const saved=saveInspectionReport(report,browserStorage);
    inspectionSaveMessage=saved?'Son rapor bu tarayıcıya kaydedildi.':'Tarayıcı kaydı başarısız; geçerli JSON indirerek raporu koru.';
    // Keep an in-memory fallback when localStorage is unavailable.
    const feedback=document.getElementById('inspection-save-feedback');feedback.hidden=false;feedback.textContent=inspectionSaveMessage;
    inspectionSaved=true;paintInspection();
  }
}
function paintInspection(){
  const hud=document.getElementById('inspection-hud'),menu=document.getElementById('inspection-menu');hud.hidden=menu.hidden=!inspection;
  if(!inspection)return;
  const statusLabel={ready:"Hazır",active:"Kayıt sürüyor",returning:"Başlangıca dön",completed:"Tamamlandı",stopped:"Durduruldu",failed:"Başarısız"}[inspection.status]||inspection.status;
  const status=`${statusLabel} · ${inspection.observations.length}/3 · ${inspection.t.toFixed(1)} sn`;
  inspectionNavigationView?.paint(state,{replaying:!!replay?.inspection});
  document.getElementById('inspection-status').textContent=`${status} · ${inspection.reason||inspection.hint||''} ${inspectionSaveMessage}`;
  const select=document.getElementById('inspection-point'),pending=inspection.scenario.points.filter(p=>!inspection.observations.some(o=>o.pointId===p.id));
  if(select.dataset.points!==pending.map(p=>p.id).join(',')){select.replaceChildren(...pending.map(p=>new Option(p.label,p.id)));select.dataset.points=pending.map(p=>p.id).join(',');}
  select.value=inspection.activePointId||'';select.disabled=inspectionTerminal(inspection)||!pending.length;
  document.getElementById('inspection-stop').disabled=inspectionTerminal(inspection);
  document.getElementById('inspection-replay').disabled=!inspectionTerminal(inspection)||inspection.samples.length<2;
  document.getElementById('inspection-previous').disabled=!previousInspectionReport;
}
function downloadInspection(report){
  if(!report)return;const blob=inspectionDownloadBlob(report);
  if(!blob){inspectionSaveMessage='JSON indirilemedi: rapor 2,5 MB sınırını aşıyor veya serileştirilemiyor.';paintInspection();return;}
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=url;anchor.download='ilke-sile-inspection.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
bindTap(document.getElementById('inspection-stop'),()=>{finishInspection('operator');inspectionTerminalMenu=true;paintInspection();});
document.getElementById('inspection-point').addEventListener('change',event=>{if(inspection)selectInspectionPoint(inspection,event.target.value);paintInspection();});
bindTap(document.getElementById('inspection-export'),()=>{if(inspection)downloadInspection(inspectionReport(inspection));});
bindTap(document.getElementById('inspection-previous'),()=>downloadInspection(previousInspectionReport));
bindTap(document.getElementById('inspection-replay'),()=>{
  if(!inspectionTerminal(inspection))return;const localTrace=inspectionTrace(inspection);if(localTrace.data.length<16)return;
  replay={inspection:true,trace:localTrace,t:0,dur:traceDuration(localTrace),chaseBefore:chase,savedState:structuredClone(state),worldTime,heading:{...chaseHeading},fpvPosition:fpvCam.position.clone(),fpvQuaternion:fpvCam.quaternion.clone(),chasePosition:chaseCam.position.clone(),chaseQuaternion:chaseCam.quaternion.clone()};
  document.getElementById('flight-menu').close();chase=true;sfx.nearby(null);
});
window.addEventListener('pagehide',()=>finishInspection('leave'));

function dropGhost(){if(ghost?.mesh)disposeDrone(ghost.mesh);ghost=null;}

// The pilot's best run on this op (or a shared "race my run" link's trace,
// when one is loaded and matches), flown again as a translucent craft.
function loadGhostFor(op) {
  dropGhost();
  if (!op || op.kind === "free" || op.kind === "arcade" || configuredSpec().propulsion) return;
  const shared = sharedGhost?.opId === op.id ? sharedGhost : null;
  const tr = shared ? shared.trace : loadGhost(op.id);
  if (!tr || !traceDuration(tr)) return;
  const mesh = makeDrone(droneById(tr.meta?.drone || selected), camTiltRad());
  setDroneOpacity(mesh,.32);
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
  sfx.nearby(null); // remote pilots are not stepped during the replay
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
  if(replay.inspection){
    state=replay.savedState;worldTime=replay.worldTime;Object.assign(chaseHeading,replay.heading);
    fpvCam.position.copy(replay.fpvPosition);fpvCam.quaternion.copy(replay.fpvQuaternion);chaseCam.position.copy(replay.chasePosition);chaseCam.quaternion.copy(replay.chaseQuaternion);
    replay=null;applyPose(craft,state);craft.visible=chase;resetSimulationClock(simClock);document.getElementById('flight-menu').showModal();paintInspection();return;
  }
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
  worldTime = advanceWorldTime(worldTime, dt);
  tickWorld(scene, worldTime, dt, state);
  for (const action of ["cam", "mode", "help", "mute"]) consume(action);
  if (replay.t > replay.dur + 1 || consume("arm") || consume("reset") || consume("hangar")) {
    endReplay();
    return;
  }
  bodycam.uniforms.time.value = now * 0.001;
  bodycam.uniforms.intensity.value = lensIntensity(visualSettings, true);
  bodycam.enabled = bodycam.uniforms.intensity.value > 0;
  bodycam.uniforms.speed.value = 0;
  bodycam.uniforms.crash.value = 0;
  renderPass.camera = chaseCam;
  composer.render();
  drawHud(input, 0);
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
  if (helpOpen) { setHelp(false); return; }
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
  resetFlightDrone();
});
bindTap(document.getElementById("flight-prepare"), () => {
  const activity = selectedOp;
  document.getElementById("flight-menu").close();
  backHangar(); prepareFlight(activity);
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
  const record = won && !isLocalOnlyRun(r) && (prevBest == null || r.t < prevBest);
  card.classList.toggle("lost", !won);
  document.getElementById("result-kicker").textContent = won ? "GÖREV TAMAM" : "BAŞARISIZ";
  document.getElementById("result-title").textContent = r.op.name;
  document.getElementById("result-time").innerHTML = `${esc(fmtTime(r.t))}${record ? "<small>KİŞİSEL REKOR</small>" : ""}`;
  const rows = [];
  if(r.reference && !r.arcade)rows.push({k:"Tezgâh referansı",v:"Antrenman · rekor/ilerleme/sıralama dışı"});
  if (r.paused) rows.push({ k: "Duraklatıldı", v: "Kişisel antrenman · sıralama dışı" });
  if(r.arcade)rows.push({k:"Arcade",v:`${r.arcade.targets.filter(t=>t.done).length}/4 nesne · ${r.arcade.drones} drone · yerel oyun`});
  rows.push({ k: "Sonuç", v: won ? "Tamamlandı" : r.reason || "başarısız" });
  const best = isLocalOnlyRun(r) ? null : progress.best?.[opId];
  if(!r.arcade)rows.push({ k: "En iyi süre", v: best != null ? fmtTime(best) : "—", cls: record ? "record" : "" });
  if (won && prevBest != null) {
    const d = r.t - prevBest;
    rows.push({ k: "Rekora fark", v: `${d >= 0 ? "+" : "−"}${fmtTime(Math.abs(d))}` });
  }
  if (r.op.kind === "race") {
    rows.push({ k: "Kapı", v: `${r.gatesDone}/${(r.op.gates?.length || 0) * (r.op.laps || 3)}` });
    const bl = isLocalOnlyRun(r) ? null : progress.bestLap?.[opId];
    rows.push({ k: "En iyi tur", v: bl != null ? fmtTime(bl) : "—", cls: r.bestLap != null && bl != null && r.bestLap <= bl ? "record" : "" });
  } else if (r.op.kind === "school") rows.push({ k: "Adım", v: `${Math.min(r.step, r.op.steps.length)}/${r.op.steps.length}` });
  else if (r.op.kind === "recon") rows.push({ k: "İşaret", v: `${r.marks.filter((m) => m.done).length}/${r.marks.length}` });
  else if (r.op.kind === "cargo") {
    rows.push({ k: "Koli", v: `${r.delivered}/${r.parcels.length}` });
    if (r.dropped) rows.push({ k: "Düşen", v: String(r.dropped) });
  }
  if (r.report) {
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
    sb.hidden = isLocalOnlyRun(r) || !(trace && traceCount(trace) > 1);
    sb.disabled = false;
    sb.textContent = "Uçuşu paylaş";
  }
  lastResult = { run: r, prevBest };
  card.hidden = false;
  // Touch layer (sticks and ARM button, compass) steps aside while the card is up.
  flightEl.classList.add("has-result");
  resultShown = true;
}
bindTap(document.getElementById("result-retry"), () => retryOp());
bindTap(document.getElementById("result-home"), () => backHangar());
bindTap(document.getElementById("result-replay"), () => startReplay());
bindTap(document.getElementById("result-share"), () => shareResult());


function backHangar() {
  if(replay?.inspection)endReplay();
  finishInspection("leave");inspectionView?.dispose();inspectionView=null;inspection=null;inspectionNavigationView?.dispose();inspectionNavigationView=null;paintInspection();
  flying = false;
  document.querySelector(".hangar-inner").scrollTop = 0;
  hangarEl.dataset.screen = "home";
  document.getElementById("home-back").hidden = true;
  document.getElementById("flight-menu").close();
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
  clearGoals();
  run = null;
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

const flightBar = document.getElementById("flight-bar");
const menuFab = document.getElementById("menu-fab");
function setPlayMenu(on) {
  flightBar.classList.toggle("open", on);
  // The open ☰ column sits where the ARM button and sticks are on a phone.
  flightEl.classList.toggle("menu-open", on);
  menuFab.textContent = on ? "×" : "☰";
}
bindTap(menuFab, () => setPlayMenu(!flightBar.classList.contains("open")));

document.getElementById('arcade-guides').addEventListener('change',e=>arcadeView?.setGuides(e.target.checked));
function resetFlightDrone() {
  if(run?.arcade && !run.won && !run.lost){renewArcadeDrone(run.arcade);spawn();}
  else if(run)retryOp();else spawn();
}
function retryOp() {
  const op = opById(selectedOp);
  run = op.kind === "free" ? null : createTrainingRun(op);
  prevLap = 0;
  countdown = run && op.countdown ? createCountdown(op.countdown) : null;
  goFlash = 0;
  showCountdown(null);
  if (run && !countdown && !run.arcade) net.sendStart(op.id, op.name);
  replay = null;
  lastResult = null;
  trace = run && !countdown && !run.arcade ? createTrace() : null;
  loadGhostFor(run ? op : null);
  prevStep = -1;
  prevGates = 0;
  prevMarks = 0;
  swapChirp = false;
  lowChirp = false;
  buildGoals(op);
  spawn();
}

function toggleArm() {
  if(run?.arcade && (run.arcade.wait>0 || run.arcade.needsSpawn))return;
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
    spawn();
    return;
  }
  if(state.packCutoff)return;
  if(!state.armed&&!canArmInput(poll()))return;
  state.armed = !state.armed;
}

function applyPose(obj, s) {
  obj.position.set(s.x, s.y, s.z);
  obj.quaternion.set(s.qx, s.qy, s.qz, s.qw);
}

function followCam(dt, now) {
  const mount=craft?.userData.fpvAnchor||[0,spec.size*.55,spec.size*.12];
  const [ox,oy,oz]=rotateVec(state.qw,state.qx,state.qy,state.qz,...mount);
  _targetPos.set(state.x + ox, state.y + oy, state.z + oz);
  _targetQuat.set(state.qx, state.qy, state.qz, state.qw);
  // Tilt is baked into the slerp TARGET, not re-applied to the camera's own
  // (already-tilted) local axes every frame — the latter compounded the
  // selected angle frame after frame with no steady state, so the visible
  // tilt never actually settled at the chosen 15/30/45°.
  if (!chase) _targetQuat.multiply(_tiltQuat.setFromAxisAngle(_xAxis, camTiltRad()));
  const nextNear=fpvNearPlane(cameraClearance(play,_targetPos),!!play.terrain);
  if(Math.abs(fpvCam.near-nextNear)>1e-4){fpvCam.near=nextNear;fpvCam.updateProjectionMatrix();}
  const lag = spec.camLag || 10;
  const k = 1 - Math.exp(-lag * dt);
  if (chase) {
    fpvCam.position.lerp(_targetPos, k);
    fpvCam.quaternion.slerp(_targetQuat, k);
  } else {
    // Keep the FPV camera aligned with the current craft attitude.
    fpvCam.position.copy(_targetPos);
    fpvCam.quaternion.copy(_targetQuat);
  }

  const thr = state.armed ? state.throttleOut : 0;
  const vib = visualSettings.vibration ? (0.00025 + thr * 0.001) * (state.crashed ? 6 : 1) : 0;
  const t = now * 0.001;
  fpvCam.rotateX(Math.sin(t * 91.3) * vib);
  fpvCam.rotateZ(Math.sin(t * 118.7) * vib * 0.7);
  fpvCam.rotateY(Math.sin(t * 37.1) * vib * 0.35);

  if(chase){
    const forward=rotateVec(state.qw,state.qx,state.qy,state.qz,0,0,-1);
    const offset=chaseOffset(chaseFraming(spec,chaseCam.aspect),forward,chaseHeading);
    chaseHeading.x=offset.heading.x;chaseHeading.z=offset.heading.z;
    chaseCam.position.set(state.x+offset.x,state.y+offset.y,state.z+offset.z);
    chaseCam.lookAt(state.x,state.y,state.z);
  }
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
  rcSetup.update(now);
  const controls=controlPresentation(getInputSettings(),input,state||{});
  if(!flying){
    const hint=document.getElementById('home-input-status'),text=controls.title+' · '+controls.detail;
    if(hint.textContent!==text)hint.textContent=text;
    hint.dataset.tone=controls.tone;
  }
  if(flying&&!replay)disarmOnInputLoss(state,input);

  if (flying) {
    if (!fpsAt) fpsAt = now;
    fpsN += 1;
    if (now - fpsAt >= 500) {
      const el = document.getElementById("hud-fps");
      if (el) el.textContent = `${Math.round((fpsN * 1000) / (now - fpsAt))} fps${gfx.kind === "webgpu" ? " · gpu" : ""}`;
      fpsAt = now;
      fpsN = 0;
    }
    if (consume("hangar")){if(replay?.inspection){endReplay();return;}requestExit();}
    if (consume("help")) setHelp(!helpOpen);
    const menuOpen = document.getElementById("flight-menu").open;
    const touchMenuOpen = flightBar.classList.contains("open");
    if (resultShown && !menuOpen && !helpOpen) {
      if (consume("arm")) toggleArm();
      if (consume("reset")) retryOp();
      if (!flying) return;
    }
    if (isFlightPaused({ menuOpen, touchMenuOpen, helpOpen, resultOpen: resultShown })) {
      for (const action of ["arm", "reset", "cam", "mode"]) consume(action);
      if (consume("mute")) toggleMute();
      if (run && run.t > 0 && !run.won && !run.lost) run.paused = true;
      resetSimulationClock(simClock);
      sfx.motor(0, false); sfx.nearby(null);
      drawHud(input,Math.hypot(state.vx,state.vy,state.vz));
      renderPass.camera = chase ? chaseCam : fpvCam;
      composer.render();
      return;
    }
    if (replay) { replayTick(dt, now, input); return; }
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
      Object.assign(input, { lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0 });
      consume("arm");
      consume("mode");
    }
    if (consume("arm")) toggleArm();
    if (consume("reset")) resetFlightDrone();
    if (consume("cam")) chase = !chase;
    if (consume("mode") && !opById(selectedOp).requiredFlightMode) angleOverride = !angleOverride;
    if (consume("mute")) toggleMute();

    input.angleMode = angleOverride;
    if (!state.armed && state.grounded) {
      input.lift = -1;
      input.r2 = 0;
    }
    let inspectionDt=0;
    // With a parcel slung underneath the airframe flies its loaded profile.
    if (!holding && !(run?.arcade && (run.arcade.wait>0 || run.arcade.needsSpawn))) {
      const activeSpec = loadedSpec && run?.carrying != null ? loadedSpec : spec;
      advanceSimulationClock(simClock, dt, (simDt) => {
        step(state, input, activeSpec, simDt, play);
        inspectionDt+=simDt;
      });
    } else {
      resetSimulationClock(simClock);
    }
    if (!inspection && canSwapBattery(state) && (state.battery < 0.995 || state.packCutoff)) {
      if (!swapChirp) {
        sfx.gate();
        swapChirp = true;
      }
      if(spec.propulsion?.battery?.mode==='rint')resetBattery(state);
      else state.battery = Math.min(1, state.battery + dt * 0.75);
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
    worldTime = advanceWorldTime(worldTime, dt);
  tickWorld(scene, worldTime, dt, state);
    applyPose(craft, state);
    spinProps(craft,state.armed?state.throttleOut:0,dt,state.armed?state.rotorThrottle:null);
    craft.visible = chase;
    followCam(dt, now);
    if(inspection){
      const count=inspection.observations.length;
      if(inspectionDt>0)tickInspection(inspection,{state,dt:inspectionDt,sensor:inspectionView.sensor(fpvCam,!chase),flightMode:angleOverride?"angle":"acro",input});
      inspectionCaptures=inspection.observations.slice(count).map(o=>o.pointId);inspectionView.paint();
    }
    let nearSpec = null;
    let nearD = 45;
    let nearThr = 0.6;
    let nearKey = null;
    for (const [rid, r] of remotes) {
      r.mesh.visible = !inspection && (!run || run.op.kind === "free");
      if (!r.mesh.visible || !r.target) continue;
      _lerpP.set(r.target.x, r.target.y, r.target.z);
      _lerpQ.set(r.target.qx, r.target.qy, r.target.qz, r.target.qw);
      r.mesh.position.lerp(_lerpP, 0.25);
      r.mesh.quaternion.slerp(_lerpQ, 0.25);
      spinProps(r.mesh, r.target.thr || 0.1, dt);
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

    if (run && !run.won && !run.lost && !holding) {
      if (trace) recordTrace(trace, run.t, state);
      if(!run.arcade)sampleAssessment(run.assessment, state, input, dt);
      tickRun(run, {
        state,
        dt,
        flightMode: angleOverride ? "angle" : "acro",
      });
      if(run.arcade){
        const a=run.arcade;
        if(a.wait>0 || a.needsSpawn || run.won){state.armed=false;state.vx=state.vy=state.vz=0;state.motor=state.throttleOut=0;}
        if(a.needsSpawn){renewArcadeDrone(a);spawn();}
        arcadeView?.paint(a,chase?chaseCam:fpvCam);
      }
      if (!run.arcade && (run.won || run.lost) && !run.report) {
        run.report = finalizeAssessment(run.assessment, run, state);
        if (run.won && run.op.academy && run.report.total < 70) {
          run.won = false;
          run.lost = true;
          run.reason = `yeterlilik puanı ${run.report.total}/100 · gereken 70`;
          run.report.passed = false;
        }
        if (!run.op.story && !isLocalOnlyRun(run)) progress = saveAssessment(run.op.id, run.report);
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
      if (run.op.kind === "cargo") {
        if (run.carrying != null && prevCargo.carrying == null) sfx.gate();
        if (run.delivered > prevCargo.delivered) sfx.lap();
        if (run.dropped > prevCargo.dropped) sfx.hit();
        prevCargo = { delivered: run.delivered, carrying: run.carrying, dropped: run.dropped };
        paintCargo();
      }
      if (run.won) {
        lastWonId = run.op.id;
        const prevBest = isLocalOnlyRun(run) ? null : progress.best?.[run.op.id];
        if (run.op.story && !isLocalOnlyRun(run)) {
          pilotStory = savePilotStory(completeStoryFlight(pilotStory, run.op.id), browserStorage);
          persistFpvBuild();
          paintStoryHome();
        } else if(!isLocalOnlyRun(run)) progress = saveWin(run.op.id, run.t, undefined, run.bestLap);
        if(!run.arcade)net.sendResult(run.op.id, run.op.name, true, run.t, run.lapTimes, { ranked: shouldRankRun(run) });
        paintOpsCards();
        sfx.win();
        // A new personal best (or the first finish) becomes the ghost to chase next time.
        if (!run.op.story && !isLocalOnlyRun(run) && trace && (prevBest == null || run.t < prevBest)) saveGhost(run.op.id, trace, { drone: selected, t: run.t, at: Date.now() });
        if (ghost) ghost.mesh.visible = false;
        showResult(run, prevBest);
      }
      if (run.lost) {
        if (!run.op.story && !isLocalOnlyRun(run) && run.bestLap != null) progress = saveLap(run.op.id, run.bestLap).progress;
        if(!run.arcade)net.sendResult(run.op.id, run.op.name, false, run.t, run.lapTimes, { ranked: shouldRankRun(run) });
        sfx.fail();
        if (ghost) ghost.mesh.visible = false;
        showResult(run, progress.best?.[run.op.id]);
      }
    }

    const spd = Math.hypot(state.vx, state.vy, state.vz);
    crashFade = THREE.MathUtils.lerp(crashFade, state.crashed ? 1 : 0, 1 - Math.exp(-6 * dt));
    bodycam.uniforms.time.value = now * 0.001;
    bodycam.uniforms.intensity.value = lensIntensity(visualSettings, chase);
    bodycam.enabled = bodycam.uniforms.intensity.value > 0;
    bodycam.uniforms.speed.value = spd;
    bodycam.uniforms.crash.value = crashFade;
    renderPass.camera = chase ? chaseCam : fpvCam;
    composer.render();
    if(inspection){
      for(const id of inspectionCaptures)attachInspectionImage(inspection,id,captureInspectionFrame(canvas));
      inspectionCaptures=[];paintInspection();
      if(inspectionTerminal(inspection)&&!inspectionTerminalMenu){finishInspection();inspectionTerminalMenu=true;const menu=document.getElementById('flight-menu');if(!menu.open)menu.showModal();}
    }
    drawHud(input, spd);

    netAcc += dt;
    if (netAcc > 0.05) {
      netAcc = 0;
      if(!inspection)net.sendState(state);
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

function wantsPad() {
  if (state?.battery < 0.3 && !state.crashed) return true;
  if (!run || run.won || run.lost) return false;
  if (run.op.kind === "school") {
    const t = run.op.steps?.[run.step]?.t;
    return t === "land" || t === "pad";
  }
  if (run.op.kind === "recon") return run.marks?.every((m) => m.done);
  if (run.op.kind === "cargo") return run.carrying == null && run.parcels.every((p) => p.done);
  return false;
}

function drawHud(input, spd) {
  const control=controlPresentation(getInputSettings(),input,state),panel=document.getElementById('input-status');
  flightEl.dataset.input=control.rc?'rc':'gamepad';
  panel.hidden=!control.rc||!!replay||!!state.crashed||!!state.packCutoff||!!run?.won||!!run?.lost;
  panel.dataset.tone=control.tone;
  for(const [id,text] of [['input-status-title',control.title],['input-status-detail',control.detail]]){const el=document.getElementById(id);if(el.textContent!==text)el.textContent=text;}
  const action=armPresentation({input,state,run,replay,countdown:countdown||(run?.arcade&&(run.arcade.wait>0||run.arcade.needsSpawn))});
  for(const id of ['btn-arm','btn-arm-touch']){const button=document.getElementById(id),label=id==='btn-arm-touch'?action.touchLabel:action.label;if(button.textContent!==label)button.textContent=label;if(button.getAttribute('aria-label')!==action.label)button.setAttribute('aria-label',action.label);if(button.title!==action.label)button.title=action.label;button.disabled=action.disabled;}
  document.getElementById('flight-session').textContent=`${spec.name} · ${opById(selectedOp).mapName||MAPS.find(m=>m.id===selectedMap)?.name||selectedMap} · ${angleOverride?'ANGLE':'ACRO'}${spec.propulsion?' · referans antrenmanı':''}`;
  if(helpOpen){paintInputHelp(document,input);document.getElementById('help-lead').textContent='Uçuş duraklatıldı. Giriş göstergeleri canlı; fizik ve dünya zamanı durdu.';document.getElementById('help-rc-detail').textContent=control.help;}

  const realOn = !!play?.real && !angleOverride;
  const locked = !!opById(selectedOp).requiredFlightMode;
  const mode = `${spec?.propulsion ? (realOn ? "REF 4M · " : "REF · ") : ""}${angleOverride ? "ANGLE" : realOn ? "ACRO · REAL" : "ACRO"}${locked ? opById(selectedOp).academy ? " · DERS" : " · SABİT" : ""}`;
  const motors=document.getElementById('motor-hud');
  const rint=spec?.propulsion?.battery?.mode==='rint';
  motors.hidden=(!state.rotorThrottle&&!rint)||!!replay;
  motors.querySelector('b').textContent=rint?'Motorlar ve batarya · model':'4 motor · model komutu';
  if(!motors.hidden) {
    document.getElementById('motor-values').textContent=state.rotorThrottle?.map((value,i)=>`M${i+1} ${Math.round(value*100)}%`).join(' · ')||'';
    document.getElementById('battery-values').textContent=rint&&state.packVoltageV!=null?`${state.packVoltageV.toFixed(2)} V · ${state.packCellV.toFixed(2)} V/hücre · ${(state.currentA||0).toFixed(1)} A\nSOC %${Math.round(state.packSoc*100)} · harcanan ${(state.packUsedMah||0).toFixed(0)} mAh\n${(state.packEnergyWh||0).toFixed(2)} Wh · kayıp ${(state.packLossWh||0).toFixed(3)} Wh`:'';
    document.getElementById('motor-state').textContent=state.rateController?.saturated?'Motor sınırı · tork/collective tahsisi sınırlı':state.rotorThrottle?'Motorlar ayrı hesaplanıyor':'Ortak gaz modeli · Angle / Acro';
  }
  const hs = document.getElementById("hud-speed");
  const ha = document.getElementById("hud-alt");
  const hm = document.getElementById("hud-mode");
  if (hs) hs.textContent = `${(spd * 3.6).toFixed(0)} km/h`;
  if (ha) ha.textContent = play.terrain?`${Math.max(0,state.y-surfaceAt(play,state.x,state.z,state.y).height).toFixed(0)} m AGL`:`${state.y.toFixed(0)} m`;
  if (hm) hm.textContent = mode;
  const haArm = document.getElementById("hud-arm");
  if (haArm) {
    haArm.textContent = state.crashed ? "CRASH" : state.packCutoff ? "LOW V" : state.armed ? "ARM" : "DISARM";
    haArm.classList.toggle("off", !state.armed || state.crashed);
  }
  inspectionNavigationView?.paint(state,{replaying:!!replay?.inspection});
  const goal = inspection ? (!replay&&['ready','active','returning'].includes(inspection.status) ? (inspection.status==='returning' ? inspection.scenario.spawn : inspection.scenario.points.find(p=>p.id===inspection.activePointId)?.position) : null) : nextGoal(run);
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
  document.getElementById("op-hud").hidden = !run;
  if (ot) ot.textContent = op.name;
  if (oh) oh.textContent = run?.hint || op.blurb || "";
  if (oti) {
    if (run && op.limit) {
      const left = Math.max(0, op.limit - run.t);
      oti.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")}`;
    } else oti.textContent = "";
  }
  if (opg) opg.textContent = run?.arcade && !run.won ? `${run.arcade.targets.filter(t=>t.done).length}/4 · DRONE ${run.arcade.drones}` : run?.won ? "TAMAM" : run?.lost ? "BAŞARISIZ" : "";
  document.getElementById('arcade-guides-control').hidden=!run?.arcade;
  const arena=document.getElementById('arcade-objects');arena.hidden=!run?.arcade||resultShown;
  if(run?.arcade){
    const labels=run.arcade.targets.map(t=>`${t.done?'✓':'○'} ${t.name}`).join(' · ');
    arena.querySelector('span').textContent=labels;
    document.getElementById('arcade-notice').hidden=!(run.arcade.wait>0||run.arcade.needsSpawn);
  }else document.getElementById('arcade-notice').hidden=true;
  const ol = document.getElementById("op-lap");
  if (ol) {
    if (run && run.op.kind === "race" && !run.won && !run.lost) {
      ol.hidden = false;
      const bestLap = run.bestLap ?? (isLocalOnlyRun(run) ? null : progress.bestLap?.[run.op.id]);
      ol.textContent = `TUR ${fmtTime(run.t - (run.lapStart || 0))} · SON ${run.lastLap != null ? fmtTime(run.lastLap) : "—"} · EN İYİ ${bestLap != null ? fmtTime(bestLap) : "—"}`;
    } else ol.hidden = true;
  }
  const padHint = scene.getObjectByName("padHint");
  if (padHint?.material) {
    const hot = wantsPad();
    padHint.material.opacity = hot ? 0.55 + Math.sin(worldTime * 8) * 0.35 : 0.28;
    padHint.material.color.setHex(hot ? 0xffee55 : 0xc9a227);
  }
  if (run?.won) {
    osdCrash.hidden = resultShown;
    osdCrash.textContent = `GÖREV TAMAM  ·  ${Math.round(run.t)}s  ·  ARM hangar`;
  } else if (run?.lost) {
    osdCrash.hidden = resultShown;
    osdCrash.textContent = `BAŞARISIZ  ·  ${run.reason}  ·  ARM tekrar`;
  } else if (state.crashed) {
    osdCrash.hidden = false;
    osdCrash.textContent = `UÇUŞ DURDU  ·  ${state.crashReason}  ·  R veya Yeniden kur ile baştan`;
  } else if(state.packCutoff) {
    osdCrash.hidden=false;osdCrash.textContent="DÜŞÜK GERİLİM · GÜÇ KESİLDİ · Padde yeni pil veya R ile baştan";
  } else osdCrash.hidden = true;
}

function applyVisualSettings() {
  currentVisualProfile = visualProfile(visualSettings, devicePixelRatio);
  renderer.setPixelRatio(currentVisualProfile.pixelRatio);
  composer.setPixelRatio?.(currentVisualProfile.pixelRatio);
  renderer.shadowMap.enabled = currentVisualProfile.shadows;
  for (const target of [composer.renderTarget1, composer.renderTarget2]) {
    if (target && target.samples !== currentVisualProfile.samples) {
      target.samples = Math.min(currentVisualProfile.samples, renderer.capabilities?.maxSamples || 0);
      target.dispose();
    }
  }
  scene.traverse(object => {
    if (object.isDirectionalLight) {
      object.castShadow = currentVisualProfile.shadows;
      const size = currentVisualProfile.shadowSize;
      if (object.shadow.mapSize.x !== size) {
        object.shadow.map?.dispose(); object.shadow.map = null;
        object.shadow.mapSize.set(size, size);
      }
    }
  });
  applySceneDetail(scene, currentVisualProfile.detailCount);
  setArcadeSiteQuality(scene,visualSettings.quality);
  applyArcadeAssets(scene,{quality:visualSettings.quality});
  applyScannedMaterials(scene,{quality:visualSettings.quality});
  bodycam.uniforms.quality.value = visualSettings.quality === "low" ? 0 : 1;
  bodycam.uniforms.intensity.value = lensIntensity(visualSettings, chase);
  bodycam.enabled = bodycam.uniforms.intensity.value > 0;
  flightEl.dataset.hud = visualSettings.hud;
  for (const input of document.querySelectorAll("[data-visual]")) {
    const value = visualSettings[input.dataset.visual];
    if (input.type === "checkbox") input.checked = value;
    else input.value = String(value);
  }
  document.getElementById("fov-value").textContent = `${visualSettings.fov}°`;
  document.getElementById("tilt-value").textContent = `${visualSettings.tilt}°`;
  document.getElementById("scale-value").textContent = `${Math.round(visualSettings.renderScale * 100)}%`;
  setCamPodTilt(craft, camTiltRad());
  resize();
}
for (const input of document.querySelectorAll("[data-visual]")) {
  input.addEventListener("input", () => {
    const value = input.type === "checkbox" ? input.checked : input.value;
    visualSettings = normalizeVisualSettings({ ...visualSettings, [input.dataset.visual]: value });
    try { browserStorage.setItem(VISUAL_KEY, JSON.stringify(visualSettings)); } catch { /* session still works */ }
    applyVisualSettings();
  });
}
applyVisualSettings();
startupGate.complete();

requestAnimationFrame(loop);
