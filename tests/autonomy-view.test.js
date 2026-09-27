import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  autonomyViewModel,
  clearAutonomyPanel,
  renderAutonomyPanel,
} from "../src/autonomy-view.js";

const vehicles = [
  { id: "iha-1", role: "İHA", speed: 12.34, battery: 81.2 },
  { id: "ida-1", role: "İDA", speed: 4.56, battery: 72.8 },
];

test("view model translates every phase and exposes vehicle control state", () => {
  const labels = {
    READY: "Hazır",
    AIR_SEARCH: "İHA keşifte",
    DETECTED: "Olay tespit edildi",
    SEA_DISPATCH: "İDA sevk edildi",
    JOINT_VERIFY: "Ortak doğrulama",
    COMPLETE: "Görev tamamlandı",
    FAILED: "Görev başarısız",
    ABORTED: "Görev iptal edildi",
  };
  for (const [phase, label] of Object.entries(labels)) {
    const model = autonomyViewModel({ phase, elapsed: 12.4, paused: false, controlledByVehicle: null, reason: phase === "FAILED" ? "rota kapalı" : "" }, vehicles);
    assert.equal(model.phaseLabel, label);
    assert.equal(model.elapsed, "00:12");
    assert.equal(model.vehicles[0].mode, "OTONOM");
    assert.equal(model.vehicles[1].speed, "4.6 m/s");
    assert.equal(model.vehicles[1].battery, "73%");
    if (phase === "FAILED") assert.equal(model.reason, "rota kapalı");
  }
  const manual = autonomyViewModel({ phase: "SEA_DISPATCH", elapsed: 2, paused: false, controlledByVehicle: "ida-1", reason: "" }, vehicles);
  assert.equal(manual.vehicles.find((v) => v.id === "ida-1").mode, "MANUEL");
  assert.equal(manual.actions.returnToAutonomy, true);
  assert.equal(manual.actions.takeAir, false);
  assert.equal(manual.actions.takeSea, false);
});

test("terminal view hides live controls while pause exposes resume", () => {
  const paused = autonomyViewModel({ phase: "AIR_SEARCH", elapsed: 1, paused: true, controlledByVehicle: null, reason: "" }, vehicles);
  assert.equal(paused.actions.pause, false);
  assert.equal(paused.actions.resume, true);
  assert.equal(paused.actions.abort, true);
  const done = autonomyViewModel({ phase: "COMPLETE", elapsed: 9, paused: false, controlledByVehicle: null, reason: "görev tamamlandı" }, vehicles);
  assert.deepEqual(done.actions, { pause: false, resume: false, takeAir: false, takeSea: false, returnToAutonomy: false, abort: false });
});

function fakePanel() {
  const nodes = new Map();
  for (const selector of ["#autonomy-status", "#autonomy-time", "#autonomy-reason", "#autonomy-vehicles"]) {
    nodes.set(selector, { textContent: "", innerHTML: "", hidden: false });
  }
  for (const action of ["pause", "resume", "take-air", "take-sea", "return", "abort"]) {
    nodes.set(`[data-action="${action}"]`, { hidden: false });
  }
  const classes = new Set(["active"]);
  return {
    hidden: true,
    innerHTML: "kept",
    classList: { add: (x) => classes.add(x), remove: (x) => classes.delete(x), contains: (x) => classes.has(x) },
    querySelector: (selector) => nodes.get(selector) || null,
    querySelectorAll: () => [...nodes.values()],
    nodes,
  };
}

test("panel renderer paints live state and cleanup removes all operation state", () => {
  const root = fakePanel();
  const model = autonomyViewModel({ phase: "AIR_SEARCH", elapsed: 12, paused: false, controlledByVehicle: null, reason: "" }, vehicles);
  renderAutonomyPanel(root, model);
  assert.equal(root.hidden, false);
  assert.equal(root.classList.contains("active"), true);
  assert.equal(root.nodes.get("#autonomy-status").textContent, "İHA keşifte");
  assert.match(root.nodes.get("#autonomy-vehicles").innerHTML, /ida-1/);
  clearAutonomyPanel(root);
  assert.equal(root.hidden, true);
  assert.equal(root.classList.contains("active"), false);
  assert.equal(root.nodes.get("#autonomy-vehicles").innerHTML, "");
});

test("flight page exposes the complete autonomous operation control contract", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  for (const id of ["autonomy-panel", "autonomy-status", "autonomy-time", "autonomy-reason", "autonomy-vehicles"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  for (const action of ["pause", "resume", "take-air", "take-sea", "return", "abort"]) {
    assert.match(html, new RegExp(`data-action=["']${action}["']`));
  }
});

test("runtime wires vehicle camera selection, terminal hold, and mobile manual controls", () => {
  const main = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../src/style.css", import.meta.url), "utf8");
  assert.match(main, /closest\?\.\(\s*["']\[data-vehicle\]/);
  assert.match(main, /cameraVehicleId/);
  assert.match(main, /\["COMPLETE", "FAILED", "ABORTED"\]\.includes\(autonomy\.task\.phase\)\) return/);
  assert.match(css, /autonomy-active:not\(\.autonomy-manual\)/);
  assert.match(css, /#flight-bar #autonomy-panel/);
});
