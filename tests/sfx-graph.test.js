import { test } from "node:test";
import assert from "node:assert/strict";

// A minimal Web Audio stand-in: records the last target every AudioParam was
// asked to reach, so the graph's control logic can be checked without a DSP.
function param(v = 0) {
  return {
    value: v,
    target: null,
    setTargetAtTime(t) { this.target = t; },
    setValueAtTime(t) { this.value = t; },
    exponentialRampToValueAtTime() {},
  };
}
function node(extra = {}) {
  return { connect(d) { return d; }, disconnect() {}, start() {}, stop() {}, ...extra };
}
class FakeAudioContext {
  constructor() {
    this.state = "running";
    this.currentTime = 0;
    this.sampleRate = 48000;
    this.destination = node();
    this.made = { osc: 0 };
  }
  resume() {}
  createGain() { return node({ gain: param(1) }); }
  createOscillator() { this.made.osc += 1; return node({ type: "sine", frequency: param(440), detune: param(0) }); }
  createBiquadFilter() { return node({ type: "lowpass", frequency: param(350), Q: param(1) }); }
  createWaveShaper() { return node({ curve: null, oversample: "none" }); }
  createBufferSource() { return node({ buffer: null, loop: false }); }
  createBuffer(ch, n) { return { getChannelData: () => new Float32Array(n) }; }
}
globalThis.AudioContext = FakeAudioContext;
const { sfx } = await import("../src/sfx.js");
const { droneById } = await import("../src/catalog.js");

test("disarming silences the blade-pass and wobble modulators, not just the master gain", () => {
  sfx.setVoice(droneById("heavy"));
  sfx.motor(0.7, true, { alt: 5, battery: 0.1, sag: 0.6 });
  const v = sfx._voice();
  assert.ok(v.chopG.gain.target > 0, "heavy lift chops while armed");
  assert.ok(v.wobG.gain.target > 0, "dying pack wobbles while armed");
  sfx.motor(0, false);
  assert.ok(v.out.gain.target <= 0.0001);
  assert.equal(v.chopG.gain.target, 0);
  assert.equal(v.wobG.gain.target, 0);
});

test("changing airframe rebuilds the voice once; the same airframe reuses it", () => {
  sfx.setVoice(droneById("whoop"));
  sfx.motor(0.5, true);
  const a = sfx._voice();
  sfx.motor(0.6, true);
  assert.equal(sfx._voice(), a);
  sfx.setVoice(droneById("racer"));
  sfx.motor(0.5, true);
  assert.notEqual(sfx._voice(), a);
  assert.equal(sfx._voice().p.id, "racer");
});

test("nearby craft flipping between airframes within half a second does not rebuild the graph", () => {
  const ctx = sfx._ctx();
  sfx.nearby(droneById("racer"), 0.6, 10);
  const before = ctx.made.osc;
  ctx.currentTime += 0.1;
  sfx.nearby(droneById("whoop"), 0.6, 9);
  ctx.currentTime += 0.1;
  sfx.nearby(droneById("racer"), 0.6, 8);
  assert.equal(ctx.made.osc, before, "no rebuild within the hold window");
  ctx.currentTime += 1;
  sfx.nearby(droneById("whoop"), 0.6, 9);
  ctx.currentTime += 0.6;
  sfx.nearby(droneById("whoop"), 0.6, 9);
  assert.ok(ctx.made.osc > before, "a stable new airframe does get its own voice");
  assert.equal(sfx._other().p.id, "whoop");
  sfx.nearby(null);
  assert.equal(sfx._other().chopG.gain.target, 0);
});

test("ambience builds on the shared bus, retargets levels, and stops cleanly", async () => {
  const { ambience } = await import("../src/ambience.js");
  const ctx = sfx._ctx();
  const before = ctx.made.osc;
  assert.equal(ambience.start("coast", { night: false }), true);
  assert.ok(ctx.made.osc > before, "layers were built");
  for (let i = 0; i < 12; i++) ambience.tick(0.05, { wind: { x: 1.1, z: 0.4 }, shoreDist: 2 });
  assert.ok(ambience.active());
  ambience.stop();
  assert.equal(ambience.active(), false);
  assert.equal(ambience.start("indoor"), true);
  ambience.stop();
});

test("ambience modulation depths follow the level: a silent layer stays silent", async () => {
  const { ambience } = await import("../src/ambience.js");
  ambience.start("indoor");
  for (let i = 0; i < 4; i++) ambience.tick(0.05, {});
  const g = ambience._graph();
  assert.equal(g.out.doorDepth.gain.target, 0, "no moving door: no chop");
  assert.equal(g.out.windDepth.gain.target, 0, "indoor: no wind swell");
  assert.equal(g.out.door.gain.target, 0.0001);
  ambience.stop();
  ambience.start("city");
  for (let i = 0; i < 4; i++) ambience.tick(0.05, { wind: { x: 1, z: 0 }, doorDist: 3 });
  const c = ambience._graph();
  assert.ok(c.out.doorDepth.gain.target > 0 && c.out.doorDepth.gain.target < c.out.door.gain.target, "depth below level");
  assert.ok(c.out.windDepth.gain.target > 0 && c.out.windDepth.gain.target < c.out.wind.gain.target);
  assert.ok(c.out.trafficDepth.gain.target < c.out.traffic.gain.target);
  ambience.stop();
});
