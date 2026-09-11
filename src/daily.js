// Günün görevi — one course per UTC day, derived from the date alone, so every
// pilot flies the same gates on the same map with the same airframe and the
// leaderboard for `daily-YYYY-MM-DD` is a fair daily board. Pure module: no
// DOM, no Three.js; the map data below is a hand-placed pool of clear points
// (nothing inside a building, container stack or the hangar pillar).
import { CATALOG } from "./catalog.js";

export const DAILY_PREFIX = "daily-";
const AY = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

// Per map: display name, airframes the day can pick from, spawn, and the pool
// of safe waypoints (x, y, z). Bounds and heights match world.js makePlay().
export const DAILY_MAPS = {
  indoor: {
    name: "Kapalı hangar",
    drones: ["whoop", "micro", "toothpick"],
    spawn: { x: 0, y: 2.8, z: 6 },
    pool: [
      [0, 3.4, -8], [0, 3.2, -22], [10, 3.4, -40], [-16, 4.2, -64], [12, 6, -10], [-12, 5, -16],
      [18, 4, -30], [-20, 6, -40], [6, 8, -56], [-6, 3, -70], [22, 5, -60], [-24, 7, -24],
      [0, 10, -36], [16, 3.5, -72], [14, 7, 14], [-14, 7, 10], [0, 6, -60],
    ],
    routes: {
      7: [0, 5, 1, 12, 2, 6, 4],
      8: [0, 4, 6, 2, 12, 1, 5, 15],
      9: [0, 1, 5, 11, 7, 12, 2, 6, 4],
    },
  },
  yard: {
    name: "Depo sahası",
    drones: ["freestyle", "racer", "cinewhoop"],
    spawn: { x: 0, y: 4, z: 6 },
    pool: [
      [0, 4, -8], [4, 3, -30], [0, 6.5, -48], [6, 3, -62], [0, 4, -76], [-24, 6, -44], [-28, 5, -64],
      [20, 7, -56], [26, 5, -70], [-30, 8, -20], [22, 12, -8], [36, 15, -36], [24, 4, -24],
      [-8, 3, -60], [30, 4, -56], [-34, 6, -4], [12, 10, -40],
    ],
    routes: {
      7: [0, 1, 16, 2, 5, 9, 15],
      8: [0, 1, 16, 3, 8, 14, 7, 2],
      9: [0, 1, 16, 7, 3, 13, 5, 9, 15],
    },
  },
  airfield: {
    name: "Pist",
    drones: ["racer", "freestyle", "seven"],
    spawn: { x: 0, y: 4, z: 8 },
    pool: [
      [0, 4, -6], [5, 5, -24], [-6, 4.5, -42], [4, 6, -62], [0, 4, -78], [16, 6, -44], [-16, 6, -44],
      [0, 5, -72], [20, 5, -20], [-20, 5, -60], [30, 7, -50], [-30, 7, -30], [0, 9, -30], [24, 4, -80],
      [-24, 4, -76], [36, 6, -14], [-36, 6, -20], [28, 13, 8], [-26, 11, 6],
    ],
    routes: {
      7: [0, 8, 1, 12, 2, 6, 11],
      8: [0, 1, 12, 2, 6, 9, 7, 3],
      9: [0, 1, 12, 2, 6, 9, 7, 3, 5],
    },
  },
  coast: {
    name: "Kıyı",
    drones: ["racer", "seven", "freestyle"],
    spawn: { x: 0, y: 4, z: 6 },
    pool: [
      [0, 5, -10], [14, 5.5, -22], [0, 5, -36], [-14, 5.5, -22], [24, 6, -30], [-24, 6, -30], [30, 5, -12],
      [-30, 5, -12], [8, 8, -30], [-8, 8, -30], [18, 4, -4], [34, 6, -24], [-34, 6, -24], [0, 9, -24],
      [12, 4, 8], [-16, 4, 10], [26, 8, 0],
    ],
    routes: {
      7: [14, 10, 1, 8, 2, 13, 0],
      8: [14, 10, 1, 8, 2, 9, 13, 0],
      9: [14, 10, 6, 11, 4, 1, 8, 13, 0],
    },
  },
  city: {
    name: "Sanayi kenti",
    drones: ["cinewhoop", "toothpick", "freestyle"],
    spawn: { x: 0, y: 4, z: 8 },
    pool: [
      [0, 4, -4], [8, 5, -20], [-8, 6, -36], [9, 5, -52], [0, 8, -58], [-9, 5, -66], [9, 6, -34], [-9, 6, -34],
      [0, 7, -56], [2, 10, -42], [6, 9, -28], [0, 7, -78], [8, 7, -90], [-8, 7, -90], [0, 21, -66],
      [16, 21, -18], [22, 17, -52], [0, 12, -40],
    ],
    routes: {
      7: [0, 1, 10, 9, 17, 2, 7],
      8: [0, 1, 10, 6, 9, 17, 2, 7],
      9: [0, 1, 10, 6, 3, 9, 17, 2, 7],
    },
  },
  forest: {
    name: "Orman",
    drones: ["toothpick", "freestyle", "seven"],
    spawn: { x: 0, y: 5, z: 6 },
    pool: [
      [6, 6, -14], [20, 7, -44], [-4, 8, -70], [-24.5, 6, -65], [-22, 7, -30], [6, 7, -36], [-12, 8, -56],
      [-16, 8, -86], [30, 9, -100], [-30, 9, -120], [10, 8, -132], [40, 12, -130], [-40, 10, -100],
      [30, 10, -50], [6, 10, -60], [50, 8, -70], [-50, 8, -40], [0, 14, -100], [24, 7, -20], [-36, 9, -10],
    ],
    routes: {
      7: [0, 5, 2, 14, 13, 1, 18],
      8: [0, 5, 14, 2, 6, 1, 13, 18],
      9: [0, 5, 6, 3, 2, 14, 13, 1, 18],
    },
  },
};

export function dailyId(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${DAILY_PREFIX}${y}-${m}-${day}`;
}

export function isDailyId(id) {
  return typeof id === "string" && /^daily-\d{4}-\d{2}-\d{2}$/.test(id);
}

/** UTC midnight of the day the id names, or null. */
export function dailyDate(id) {
  if (!isDailyId(id)) return null;
  const [y, m, d] = id.slice(DAILY_PREFIX.length).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** "7 Eyl" / "7 Eyl 2026". */
export function dailyLabel(id, { year = false } = {}) {
  const d = dailyDate(id);
  if (!d) return "";
  return `${d.getUTCDate()} ${AY[d.getUTCMonth()]}${year ? ` ${d.getUTCFullYear()}` : ""}`;
}

// FNV-1a → mulberry32: small, deterministic, good enough for shuffles.
function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const cache = new Map();

/** The day's op. Same id → identical object every time (memoised). */
export function dailyOp(id = dailyId()) {
  if (!isDailyId(id)) return null;
  if (cache.has(id)) return cache.get(id);
  const rnd = mulberry32(hash32(id));
  const mapIds = Object.keys(DAILY_MAPS);
  const mapId = mapIds[Math.floor(rnd() * mapIds.length)];
  const m = DAILY_MAPS[mapId];
  const drone = m.drones[Math.floor(rnd() * m.drones.length)];
  const n = 7 + Math.floor(rnd() * 3); // 7–9 waypoints
  // Each template is a collider-tested corridor from the spawn to the pad.
  // Keeping its authored direction also protects the final descent path.
  const route = m.routes[n];
  const altitudeBias = Math.floor(rnd() * 3) * 0.35;
  const picked = route.map((i) => {
    const [x, y, z] = m.pool[i];
    return [x, y + altitudeBias, z];
  });
  const hoverAt = rnd() < 0.35 ? Math.floor(picked.length / 2) : -1;
  const steps = picked.map(([x, y, z], i) =>
    i === hoverAt
      ? { t: "hover", x, y, z, r: 2.4, hold: 3, hint: `${i + 1}. küre — 3 sn tut` }
      : { t: "gate", x, y, z, r: 2.8, hint: `${i + 1}. kapı` },
  );
  steps.push({ t: "land", hint: "Pade dön, iniş" });
  const indoor = mapId === "indoor";
  let wind = null;
  if (!indoor && rnd() >= 0.3) {
    const mag = 0.4 + rnd() * 0.8;
    const ang = rnd() * Math.PI * 2;
    wind = { x: Math.round(Math.cos(ang) * mag * 100) / 100, z: Math.round(Math.sin(ang) * mag * 100) / 100 };
  }
  const night = rnd() < 0.25;
  const gates = steps.filter((s) => s.t === "gate").length;
  const droneName = CATALOG.find((d) => d.id === drone)?.name || drone;
  const op = {
    id,
    kind: "school",
    daily: true,
    name: "Günün görevi",
    dateLabel: dailyLabel(id),
    blurb: `${m.name} · ${droneName} · ${gates} kapı${hoverAt >= 0 ? " + hover" : ""}${wind ? " · rüzgâr" : ""}${night ? " · gece" : ""}. Herkes aynı rota, aynı gövde.`,
    map: mapId,
    drone,
    lockMap: true,
    lockDrone: true,
    fire: false,
    bots: 0,
    academy: true,
    startGrounded: true,
    requiredFlightMode: "angle",
    countdown: 3,
    limit: 300,
    drain: 0.6,
    wind,
    spawn: m.spawn,
    steps,
  };
  if (night) op.night = true; // otherwise the pilot's own night checkbox applies
  cache.set(id, op);
  return op;
}

/**
 * Leaderboard order: today's daily first, then the campaign rungs in `order`,
 * then at most `keepOld` older dailies (newest first). Anything else last.
 */
export function sortBoards(boards, order, today = dailyId(), keepOld = 3) {
  const rank = (id) => {
    if (id === today) return -1;
    const i = order.indexOf(id);
    if (i >= 0) return i;
    if (isDailyId(id)) return 1000 + (Date.UTC(2100, 0, 1) - dailyDate(id).getTime()) / 864e5;
    return 1e7;
  };
  const sorted = boards.slice().sort((a, b) => rank(a.opId) - rank(b.opId));
  let old = 0;
  return sorted.filter((b) => {
    if (!isDailyId(b.opId) || b.opId === today) return true;
    old += 1;
    return old <= keepOld;
  });
}

/** Drop stored ghosts of dailies older than yesterday (each is ~100 KB of localStorage). */
export function pruneDailyGhosts(storage, today = dailyId(), prefix = "efa-hangar-ghost-v1:") {
  if (!storage) return 0;
  const cutoff = today.slice(DAILY_PREFIX.length);
  const yesterday = dailyId(new Date(dailyDate(today).getTime() - 864e5)).slice(DAILY_PREFIX.length);
  const gone = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (!k || !k.startsWith(prefix + DAILY_PREFIX)) continue;
    const day = k.slice((prefix + DAILY_PREFIX).length);
    if (day < yesterday && day !== cutoff) gone.push(k);
  }
  for (const k of gone) storage.removeItem(k);
  return gone.length;
}
