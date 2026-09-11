// Flight trace recording, ghost playback and local ghost storage. Pure JS —
// main.js owns the mesh and the clock, this owns the data.
//
// A trace is a flat array of samples: [t, x, y, z, qw, qx, qy, qz, ...], t in
// seconds since GO, sampled at GHOST_HZ.
export const GHOST_HZ = 20;
export const GHOST_MAX_SAMPLES = 20000; // ~16.7 min at 20 Hz; a record run is never that long
const STRIDE = 8;
const KEY = "efa-hangar-ghost-v1:";

export function createTrace() {
  return { next: 0, data: [], truncated: false };
}

/** Record `s` at time `t` if a sample is due. Returns true when one was stored. */
export function recordTrace(tr, t, s) {
  if (!tr || t < tr.next) return false;
  if (tr.data.length / STRIDE >= GHOST_MAX_SAMPLES) {
    tr.truncated = true;
    return false;
  }
  // Advance the schedule, not "now + period": frame times land a hair after
  // each slot, and rescheduling from them would drift the rate down.
  tr.next = Math.max(tr.next + 1 / GHOST_HZ, t);
  tr.data.push(t, s.x, s.y, s.z, s.qw, s.qx, s.qy, s.qz);
  return true;
}

export function traceCount(tr) {
  return tr ? Math.floor(tr.data.length / STRIDE) : 0;
}

export function traceDuration(tr) {
  const n = traceCount(tr);
  return n ? tr.data[(n - 1) * STRIDE] : 0;
}

/** Pose at time t (clamped to the trace ends), interpolated between samples. */
export function sampleTrace(tr, t, out = {}) {
  const n = traceCount(tr);
  if (!n) return null;
  const d = tr.data;
  if (t <= d[0]) return poseAt(d, 0, out);
  if (t >= d[(n - 1) * STRIDE]) return poseAt(d, n - 1, out);
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (d[mid * STRIDE] <= t) lo = mid;
    else hi = mid;
  }
  const t0 = d[lo * STRIDE];
  const t1 = d[hi * STRIDE];
  const k = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
  const a = lo * STRIDE;
  const b = hi * STRIDE;
  out.x = d[a + 1] + (d[b + 1] - d[a + 1]) * k;
  out.y = d[a + 2] + (d[b + 2] - d[a + 2]) * k;
  out.z = d[a + 3] + (d[b + 3] - d[a + 3]) * k;
  // nlerp is plenty at 20 Hz; flip the sign when the two quaternions are on opposite hemispheres
  let qw = d[b + 4];
  let qx = d[b + 5];
  let qy = d[b + 6];
  let qz = d[b + 7];
  if (d[a + 4] * qw + d[a + 5] * qx + d[a + 6] * qy + d[a + 7] * qz < 0) {
    qw = -qw;
    qx = -qx;
    qy = -qy;
    qz = -qz;
  }
  let w = d[a + 4] + (qw - d[a + 4]) * k;
  let x = d[a + 5] + (qx - d[a + 5]) * k;
  let y = d[a + 6] + (qy - d[a + 6]) * k;
  let z = d[a + 7] + (qz - d[a + 7]) * k;
  const norm = Math.hypot(w, x, y, z) || 1;
  out.qw = w / norm;
  out.qx = x / norm;
  out.qy = y / norm;
  out.qz = z / norm;
  out.t = t;
  return out;
}

function poseAt(d, i, out) {
  const a = i * STRIDE;
  out.t = d[a];
  out.x = d[a + 1];
  out.y = d[a + 2];
  out.z = d[a + 3];
  out.qw = d[a + 4];
  out.qx = d[a + 5];
  out.qy = d[a + 6];
  out.qz = d[a + 7];
  return out;
}

function b64encode(u8) {
  if (typeof Buffer !== "undefined") return Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString("base64");
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}

function b64decode(str) {
  if (typeof Buffer !== "undefined") {
    const b = Buffer.from(str, "base64");
    return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
  }
  const s = atob(str);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}

/** Compact string form (Float32 + base64) for localStorage. */
export function encodeTrace(tr, meta = {}) {
  const f32 = Float32Array.from(tr.data);
  return JSON.stringify({ v: 1, hz: GHOST_HZ, meta: { ...meta, truncated: !!tr.truncated }, data: b64encode(new Uint8Array(f32.buffer)) });
}

export function decodeTrace(str) {
  try {
    const o = JSON.parse(str);
    if (!o || o.v !== 1 || typeof o.data !== "string") return null;
    const u8 = b64decode(o.data);
    if (u8.byteLength % 4) return null;
    const f32 = new Float32Array(u8.buffer, u8.byteOffset, u8.byteLength / 4);
    if (f32.length % STRIDE) return null;
    if (!f32.every(Number.isFinite)) return null;
    return { next: 0, data: Array.from(f32), truncated: !!o.meta?.truncated, meta: o.meta || {} };
  } catch {
    return null;
  }
}

function mem() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function saveGhost(opId, tr, meta = {}, storage = mem()) {
  if (!storage || !traceCount(tr)) return false;
  try {
    storage.setItem(KEY + opId, encodeTrace(tr, meta));
    return true;
  } catch {
    return false; // quota — the ghost is a nicety, never worth failing the run for
  }
}

export function loadGhost(opId, storage = mem()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(KEY + opId);
    return raw ? decodeTrace(raw) : null;
  } catch {
    return null;
  }
}

export function clearGhost(opId, storage = mem()) {
  try {
    storage?.removeItem(KEY + opId);
  } catch {
    /* ignore */
  }
}
