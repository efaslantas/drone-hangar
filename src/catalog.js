import { createState, step } from "./physics.js";

function fpv(extra) {
  return {
    defaultMode: "acro",
    holdAlt: false,
    fpv: true,
    throttleExpo: 2.2,
    brakeIdle: 0.2,
    brakeMove: 0.06,
    ...extra,
  };
}

function cine(extra) {
  return {
    defaultMode: "angle",
    holdAlt: true,
    fpv: false,
    brakeIdle: 1.35,
    brakeMove: 0.22,
    ...extra,
  };
}

export const CATALOG = [
  cine({
    id: "micro",
    name: "75mm Micro",
    class: "Indoor",
    span: "75 mm",
    blurb: "Kapalı alan, yavaş, affedici.",
    endurance: 210,
    mass: 0.028,
    maxThrustG: 2.6,
    drag: 0.48,
    maxRate: 7,
    yawRate: 4,
    maxAngle: 0.52,
    angleKp: 10,
    angleRate: 2.4,
    rateFollow: 8,
    camLag: 18,
    color: 0x5c6064,
    accent: 0xd4a017,
    size: 0.055,
    ducts: true,
    arms: 0.032,
  }),
  cine({
    id: "whoop",
    name: "Tiny Whoop",
    class: "Indoor",
    span: "65 mm",
    blurb: "Kanallı whoop. Salon / koridor.",
    endurance: 200,
    mass: 0.032,
    maxThrustG: 2.8,
    drag: 0.42,
    maxRate: 8,
    yawRate: 4.2,
    maxAngle: 0.55,
    angleKp: 10,
    angleRate: 2.6,
    rateFollow: 9,
    camLag: 22,
    color: 0x6a6e68,
    accent: 0xb42318,
    size: 0.065,
    ducts: true,
    arms: 0.038,
  }),
  cine({
    id: "cinewhoop",
    name: "Cinewhoop",
    class: "Cine",
    span: '3"',
    blurb: "Kanallı 3 inç. Yumuşak çekim.",
    endurance: 260,
    mass: 0.28,
    maxThrustG: 3.2,
    drag: 0.32,
    maxRate: 7,
    yawRate: 3.6,
    maxAngle: 0.48,
    angleKp: 10,
    angleRate: 2.5,
    rateFollow: 8,
    camLag: 18,
    color: 0x1b1f24,
    accent: 0x8a5a2a,
    size: 0.18,
    ducts: true,
    arms: 0.11,
  }),
  fpv({
    id: "toothpick",
    name: "3\" Toothpick",
    class: "FPV light",
    span: '3"',
    blurb: "Hafif, keskin, park / orman.",
    endurance: 300,
    mass: 0.18,
    maxThrustG: 7.5,
    drag: 0.18,
    maxRate: 16,
    yawRate: 12,
    maxAngle: 0.7,
    angleKp: 14,
    angleRate: 8,
    rateFollow: 20,
    camLag: 26,
    color: 0x1a1c16,
    accent: 0x3d7a4a,
    size: 0.14,
    ducts: false,
    arms: 0.1,
  }),
  fpv({
    id: "freestyle",
    name: "5\" Freestyle",
    class: "FPV acro",
    span: '5"',
    blurb: "Punch, flip, yakın mesafe.",
    endurance: 320,
    mass: 0.55,
    maxThrustG: 8.5,
    drag: 0.11,
    maxRate: 14,
    yawRate: 11,
    maxAngle: 0.72,
    angleKp: 14,
    angleRate: 8,
    rateFollow: 22,
    camLag: 28,
    color: 0x161616,
    accent: 0x3a3a3a,
    size: 0.22,
    ducts: false,
    arms: 0.16,
  }),
  fpv({
    id: "racer",
    name: "5\" Racer",
    class: "FPV race",
    span: '5"',
    blurb: "İnce kasa, düşük sürüklenme.",
    endurance: 260,
    mass: 0.4,
    maxThrustG: 13,
    drag: 0.07,
    maxRate: 18,
    yawRate: 14,
    maxAngle: 0.82,
    angleKp: 16,
    angleRate: 10,
    throttleExpo: 2.35,
    brakeIdle: 0.12,
    brakeMove: 0.04,
    rateFollow: 24,
    camLag: 32,
    color: 0x1a1210,
    accent: 0x6b1d1d,
    size: 0.2,
    ducts: false,
    arms: 0.15,
  }),
  cine({
    id: "cine5",
    name: "5\" Cine",
    class: "Cine",
    span: '5"',
    blurb: "Stabilize 5 inç. Kamera uçuşu.",
    endurance: 380,
    mass: 0.62,
    maxThrustG: 3.8,
    drag: 0.2,
    maxRate: 7,
    yawRate: 3.6,
    maxAngle: 0.48,
    angleKp: 11,
    angleRate: 3,
    rateFollow: 10,
    camLag: 16,
    color: 0x1c2228,
    accent: 0xc7a24a,
    size: 0.24,
    ducts: false,
    arms: 0.17,
  }),
  fpv({
    id: "seven",
    name: "7\" Long Range",
    class: "LR",
    span: '7"',
    blurb: "Menzil, rüzgâr, seyir.",
    endurance: 800,
    mass: 0.78,
    maxThrustG: 5.5,
    drag: 0.14,
    maxRate: 10,
    yawRate: 7,
    maxAngle: 0.55,
    angleKp: 12,
    angleRate: 5,
    defaultMode: "angle",
    holdAlt: true,
    throttleExpo: 2.25,
    rateFollow: 12,
    camLag: 20,
    color: 0x1a1e18,
    accent: 0x4a6a38,
    size: 0.32,
    ducts: false,
    arms: 0.22,
  }),
  cine({
    id: "camera",
    name: "Kamera Quad",
    class: "Survey",
    span: "350 mm",
    blurb: "Gimbal, yavaş yaw, irtifa kilidi.",
    endurance: 540,
    mass: 0.9,
    maxThrustG: 2.4,
    drag: 0.28,
    maxRate: 4,
    yawRate: 2.2,
    maxAngle: 0.38,
    angleKp: 9,
    angleRate: 1.8,
    rateFollow: 6,
    camLag: 16,
    color: 0x2a3340,
    accent: 0x4a5560,
    size: 0.35,
    ducts: false,
    arms: 0.22,
    gimbal: true,
  }),
  cine({
    id: "heavy",
    name: "Heavy Lift",
    class: "Industrial",
    span: "450 mm",
    blurb: "Yük, yavaş, kararlı platform.",
    endurance: 420,
    mass: 1.4,
    maxThrustG: 2.6,
    drag: 0.3,
    maxRate: 3.4,
    yawRate: 1.8,
    maxAngle: 0.32,
    angleKp: 8,
    angleRate: 1.5,
    brakeIdle: 1.8,
    brakeMove: 0.4,
    rateFollow: 5,
    camLag: 14,
    color: 0x2c2a26,
    accent: 0xb8860b,
    size: 0.46,
    ducts: false,
    arms: 0.28,
    gimbal: true,
  }),
];

export function droneById(id) {
  return CATALOG.find((d) => d.id === id) || CATALOG[0];
}

const PACE_DT = 1 / 120;
const PACE_ALT = 30;
const PACE_SECS = 20;
const PACE_LABELS = ["Çok yavaş", "Yavaş", "Orta", "Hızlı", "Çok hızlı"];
const paceCache = new Map();
let paceRanking = null;

// Altitude and battery are pinned so the number describes the airframe, not the
// run: what it tops out at holding max tilt on full throttle, in m/s.
function measureTopSpeed(spec) {
  const s = createState(0, PACE_ALT, 0);
  s.armed = true;
  const input = { roll: 0, pitch: 1, yaw: 0, lift: 1, r2: 1, angleMode: true };
  let peak = 0;
  for (let i = 0; i < PACE_SECS / PACE_DT; i++) {
    step(s, input, spec, PACE_DT, null);
    s.y = PACE_ALT;
    s.vy = 0;
    s.battery = 1;
    const v = Math.hypot(s.vx, s.vz);
    if (v > peak) peak = v;
  }
  return peak;
}

/** Measured top speed in m/s, simulated against the real flight model. */
export function paceScore(spec) {
  let v = paceCache.get(spec.id);
  if (v == null) {
    v = measureTopSpeed(spec);
    paceCache.set(spec.id, v);
  }
  return v;
}

// Bands are positional, not absolute: the hangar bar answers "which of these is
// the fast one", and staying relative keeps all five bands populated when the
// flight model is retuned.
function paceRank(spec) {
  if (!paceRanking) {
    paceRanking = CATALOG.slice()
      .sort((a, b) => paceScore(a) - paceScore(b))
      .map((d) => d.id);
  }
  const i = paceRanking.indexOf(spec.id);
  return i < 0 ? (CATALOG.length - 1) / 2 : i;
}

export function paceInfo(spec) {
  const score = paceScore(spec);
  const n = Math.min(5, 1 + Math.floor((paceRank(spec) * 5) / CATALOG.length));
  return { n, label: PACE_LABELS[n - 1], score, kmh: Math.round(score * 3.6) };
}
