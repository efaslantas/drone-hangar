import { test } from "node:test";
import assert from "node:assert/strict";
import { saveGhostShare, getGhostShare } from "../server/store.mjs";

test("saveGhostShare round-trips through getGhostShare", () => {
  const id = saveGhostShare("school-wind", "encoded-trace-data", { name: "pilot", t: 12.3 });
  assert.ok(id);
  const rec = getGhostShare(id);
  assert.equal(rec.op, "school-wind");
  assert.equal(rec.data, "encoded-trace-data");
  assert.equal(rec.meta.name, "pilot");
});

test("saveGhostShare rejects missing op or data", () => {
  assert.equal(saveGhostShare("", "data"), null);
  assert.equal(saveGhostShare("op", ""), null);
  assert.equal(saveGhostShare(null, "data"), null);
});

test("saveGhostShare rejects an oversized payload", () => {
  const huge = "x".repeat(300_000);
  assert.equal(saveGhostShare("op", huge), null);
});

test("saveGhostShare defaults meta to an object when given a non-object", () => {
  const id = saveGhostShare("op", "data", null);
  assert.deepEqual(getGhostShare(id).meta, {});
});

test("getGhostShare returns null for an unknown id", () => {
  assert.equal(getGhostShare("does-not-exist"), null);
});
