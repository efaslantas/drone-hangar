import { test } from "node:test";
import assert from "node:assert/strict";

test("mode guide presents three plain-language quick choices before training", async () => {
  const guide = await import("../src/briefing.js");
  assert.equal(typeof guide.modeGuide, "function", "briefing exports a modeGuide model");

  const model = guide.modeGuide("free", "daily-2026-09-27");
  assert.deepEqual(model.quick.map((choice) => choice.id), [
    "hover",
    "free",
    "daily-2026-09-27",
  ]);
  assert.deepEqual(model.quick.map((choice) => choice.intent), [
    "İlk kez uçuyorum",
    "Serbest uçuş",
    "Günün görevi",
  ]);
  assert.equal(model.quick.find((choice) => choice.id === "free").selected, true);
  assert.equal(model.trainingLabel, "Eğitim programı");
});
