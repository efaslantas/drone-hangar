import { test } from "node:test";
import assert from "node:assert/strict";
import { createTrace, recordTrace, sampleTrace, traceCount, traceDuration, encodeTrace, decodeTrace, saveGhost, loadGhost, GHOST_HZ, GHOST_MAX_SAMPLES } from "../src/ghost.js";

function store() {
  const m = {};
  return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, size: () => Object.values(m).join("").length };
}

function fly(seconds, dt = 1 / 60) {
  const tr = createTrace();
  for (let t = 0; t <= seconds; t += dt) {
    recordTrace(tr, t, { x: t * 2, y: 5 + Math.sin(t), z: -t, qw: Math.cos(t / 2), qx: 0, qy: Math.sin(t / 2), qz: 0 });
  }
  return tr;
}

test("records at the ghost rate, not the frame rate", () => {
  const tr = fly(10);
  const n = traceCount(tr);
  assert.ok(n >= 10 * GHOST_HZ - 2 && n <= 10 * GHOST_HZ + 2, `${n} samples`);
  assert.ok(Math.abs(traceDuration(tr) - 10) < 0.1);
});

test("sampling interpolates position and keeps the quaternion unit length", () => {
  const tr = fly(4);
  const p = sampleTrace(tr, 2.025);
  assert.ok(Math.abs(p.x - 4.05) < 0.06, `x ${p.x}`);
  assert.ok(Math.abs(p.z + 2.025) < 0.06);
  assert.ok(Math.abs(Math.hypot(p.qw, p.qx, p.qy, p.qz) - 1) < 1e-6);
  const first = sampleTrace(tr, -5);
  const last = sampleTrace(tr, 99);
  assert.equal(first.x, 0);
  assert.ok(Math.abs(last.t - traceDuration(tr)) < 1e-9);
  assert.equal(sampleTrace(createTrace(), 1), null);
});

test("encode/decode round-trips through base64 within float32 precision", () => {
  const tr = fly(3);
  const s = encodeTrace(tr, { drone: "racer", t: 3 });
  const back = decodeTrace(s);
  assert.equal(traceCount(back), traceCount(tr));
  assert.equal(back.meta.drone, "racer");
  const a = sampleTrace(tr, 1.5);
  const b = sampleTrace(back, 1.5);
  for (const k of ["x", "y", "z", "qw", "qy"]) assert.ok(Math.abs(a[k] - b[k]) < 1e-4, k);
  assert.equal(decodeTrace("garbage"), null);
  assert.equal(decodeTrace(JSON.stringify({ v: 1, data: "AAA" })), null, "odd byte length rejected");
});

test("ghost storage: save, load, quota failure is silent, capped length", () => {
  const st = store();
  const tr = fly(2);
  assert.equal(saveGhost("race", tr, { drone: "racer" }, st), true);
  const g = loadGhost("race", st);
  assert.equal(g.meta.drone, "racer");
  assert.equal(loadGhost("school", st), null);
  assert.equal(saveGhost("race", createTrace(), {}, st), false, "empty trace is not saved");
  const full = { getItem: () => null, setItem: () => { throw new Error("QuotaExceeded"); } };
  assert.equal(saveGhost("race", tr, {}, full), false);
  const long = createTrace();
  for (let i = 0; i < GHOST_MAX_SAMPLES * 3 + 30; i++) recordTrace(long, i / 60, { x: 0, y: 0, z: 0, qw: 1, qx: 0, qy: 0, qz: 0 });
  assert.equal(traceCount(long), GHOST_MAX_SAMPLES);
  assert.equal(long.truncated, true);
  assert.ok(st.size() < 60000, `2 s ghost is ${st.size()} chars`);
});
