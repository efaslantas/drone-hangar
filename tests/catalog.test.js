import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG, droneById, paceScore, paceInfo } from "../src/catalog.js";

test("racer is çok hızlı and ranks above whoop/camera", () => {
  assert.equal(paceInfo(droneById("racer")).label, "Çok hızlı");
  assert.equal(paceInfo(droneById("freestyle")).n, 5);
  assert.ok(paceInfo(droneById("racer")).n > paceInfo(droneById("whoop")).n);
  assert.ok(paceScore(droneById("racer")) > paceScore(droneById("camera")) * 3);
});

test("pace ranks racer above cine and whoop", () => {
  const r = paceScore(droneById("racer"));
  const c = paceScore(droneById("cine5"));
  const w = paceScore(droneById("whoop"));
  assert.ok(r > c && c > w, `racer ${r} cine5 ${c} whoop ${w}`);
});

test("every catalog drone has a pace band 1–5", () => {
  for (const d of CATALOG) {
    const p = paceInfo(d);
    assert.ok(p.n >= 1 && p.n <= 5, `${d.id} n=${p.n}`);
    assert.ok(p.label.length > 0);
  }
});

test("pace band never contradicts measured top speed", () => {
  const rows = CATALOG.map((d) => paceInfo(d)).sort((a, b) => a.score - b.score);
  for (let i = 1; i < rows.length; i++) {
    assert.ok(
      rows[i].n >= rows[i - 1].n,
      `${rows[i].kmh} km/h shows ${rows[i].n}/5 but ${rows[i - 1].kmh} km/h shows ${rows[i - 1].n}/5`,
    );
  }
});

test("pace bands stay spread across all five steps", () => {
  const used = new Set(CATALOG.map((d) => paceInfo(d).n));
  assert.equal(used.size, 5, `only bands ${[...used].sort().join(",")} in use`);
});
