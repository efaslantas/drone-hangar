import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG, droneById } from "../src/catalog.js";
import { voiceProfile, voiceTargets } from "../src/motor-voice.js";
import { sfx } from "../src/sfx.js";

const P = (id) => voiceProfile(droneById(id));
const hover = (id, env = {}) => voiceTargets(P(id), { thr: 0.4, armed: true, alt: 10, battery: 1, sag: 1, speed: 0, ...env });

test("class character: whoop thin and high, racer strong and raspy, heavy lift low and mechanical", () => {
  const whoop = P("whoop");
  const racer = P("racer");
  const cine = P("cinewhoop");
  const heavy = P("heavy");
  assert.ok(whoop.base > racer.base && racer.base > heavy.base, `base ${whoop.base} > ${racer.base} > ${heavy.base}`);
  assert.ok(whoop.cutoff[1] > racer.cutoff[1] && racer.cutoff[1] > cine.cutoff[1] && cine.cutoff[1] > heavy.cutoff[1], "brightness order");
  assert.ok(racer.drive > cine.drive && racer.drive > whoop.drive, "racer rasp");
  assert.ok(racer.gainMax > whoop.gainMax, "racer louder than whoop");
  assert.ok(heavy.wash > cine.wash && cine.wash > racer.wash, "big/ducted props push more wash");
  assert.ok(heavy.chop > 0 && racer.chop === 0 && whoop.chop === 0, "blade-pass thrum only on lifters");
  assert.ok(heavy.inertia > cine.inertia && cine.inertia > whoop.inertia, "spool-up inertia");
});

test("ducted cinewhoop is rounder and washier than the open 5\" cine on the same class", () => {
  const cw = P("cinewhoop");
  const c5 = P("cine5");
  assert.ok(cw.wash > c5.wash);
  assert.ok(cw.cutoff[1] < c5.cutoff[1]);
});

test("throttle raises pitch, brightness and level; nothing plays disarmed", () => {
  for (const d of CATALOG) {
    const lo = voiceTargets(P(d.id), { thr: 0.1, armed: true, alt: 10 });
    const hi = voiceTargets(P(d.id), { thr: 0.9, armed: true, alt: 10 });
    assert.ok(hi.freq > lo.freq && hi.cutoff > lo.cutoff && hi.gain > lo.gain, d.id);
    const off = voiceTargets(P(d.id), { thr: 0.9, armed: false });
    assert.equal(off.gain, 0);
    assert.equal(off.wash, 0);
    const crashed = voiceTargets(P(d.id), { thr: 0.9, armed: true, crashed: true });
    assert.equal(crashed.gain, 0);
  }
});

test("airspeed adds wind rush, ground proximity adds wash and level", () => {
  const still = hover("racer");
  const fast = hover("racer", { speed: 30 });
  assert.ok(fast.wash > still.wash && fast.cutoff > still.cutoff);
  const high = hover("cinewhoop", { alt: 12 });
  const low = hover("cinewhoop", { alt: 0.4 });
  assert.ok(low.wash > high.wash && low.gain > high.gain);
});

test("chase camera hears the craft from outside: quieter and duller", () => {
  const fpv = hover("freestyle");
  const chase = hover("freestyle", { chase: true });
  assert.ok(chase.gain < fpv.gain * 0.7);
  assert.ok(chase.cutoff < fpv.cutoff);
});

test("tired pack sags pitch, empty pack wobbles", () => {
  const fresh = hover("racer", { battery: 1, sag: 1 });
  const sagging = hover("racer", { battery: 0.3, sag: 0.7 });
  const dying = hover("racer", { battery: 0.05, sag: 0.5 });
  assert.ok(sagging.freq < fresh.freq && dying.freq < sagging.freq);
  assert.equal(fresh.wobble, 0);
  assert.ok(dying.wobble > 0.2);
  assert.ok(dying.cutoff < fresh.cutoff);
});

test("another craft fades with distance and loses its top end", () => {
  const near = hover("racer", { dist: 3 });
  const far = hover("racer", { dist: 40 });
  assert.ok(near.gain > far.gain * 10, `near ${near.gain} far ${far.gain}`);
  assert.ok(near.cutoff > far.cutoff);
});

test("every airframe yields finite, bounded targets across the envelope", () => {
  for (const d of CATALOG) {
    const p = P(d.id);
    for (const thr of [0, 0.3, 0.7, 1]) for (const battery of [1, 0.5, 0.1, 0]) for (const alt of [0, 1, 30]) for (const speed of [0, 20, 50]) {
      const t = voiceTargets(p, { thr, armed: true, battery, sag: 0.5 + battery * 0.5, alt, speed, chase: speed > 20 });
      for (const [k, v] of Object.entries(t)) assert.ok(Number.isFinite(v), `${d.id} ${k}=${v}`);
      assert.ok(t.gain >= 0 && t.gain <= 0.12, `${d.id} gain ${t.gain}`);
      assert.ok(t.freq >= 30 && t.freq <= 4000, `${d.id} freq ${t.freq}`);
      assert.ok(t.wash >= 0 && t.wash <= 0.7);
    }
  }
});

test("sfx facade is a safe no-op without an AudioContext", () => {
  assert.equal(typeof globalThis.AudioContext, "undefined");
  assert.doesNotThrow(() => {
    sfx.setVoice(droneById("heavy"));
    sfx.motor(0.5, true, { speed: 3, alt: 2, battery: 0.9, sag: 1 });
    sfx.nearby(droneById("racer"), 0.6, 12);
    sfx.nearby(null);
    sfx.count(3);
    sfx.count(0);
    sfx.lap();
    sfx.motor(0, false);
    sfx.setMuted(true);
    sfx.setMuted(false);
  });
  assert.equal(sfx.voiceId(), "heavy");
});

test("doppler shifts another craft's pitch up when closing, down when receding", () => {
  const near = hover("racer", { dist: 12, doppler: 1.06 });
  const still = hover("racer", { dist: 12 });
  const away = hover("racer", { dist: 12, doppler: 0.94 });
  assert.ok(near.freq > still.freq && away.freq < still.freq);
  assert.ok(hover("racer", { doppler: 9 }).freq <= still.freq * 1.4 + 1e-9, "clamped");
});

test("ambience mix: map profiles and the listener situation", async () => {
  const { ambienceProfile, ambienceLevels, ambience } = await import("../src/ambience.js");
  const coast = ambienceLevels(ambienceProfile("coast"), { windMag: 1.2, shoreDist: 0 });
  const inland = ambienceLevels(ambienceProfile("coast"), { windMag: 1.2, shoreDist: 60 });
  assert.ok(coast.sea > inland.sea * 2, "surf fades inland");
  assert.ok(coast.gulls && !ambienceLevels(ambienceProfile("forest"), {}).gulls);
  const indoor = ambienceLevels(ambienceProfile("indoor"), {});
  assert.ok(indoor.hum > 0 && indoor.wind === 0 && indoor.birdRate === 0);
  const calm = ambienceLevels(ambienceProfile("airfield"), { windMag: 0 });
  const windy = ambienceLevels(ambienceProfile("airfield"), { windMag: 1.4 });
  assert.ok(windy.wind > calm.wind);
  assert.equal(ambienceLevels(ambienceProfile("forest"), { night: true }).birdRate, 0);
  assert.ok(ambienceLevels(ambienceProfile("city"), { doorDist: 4 }).door > ambienceLevels(ambienceProfile("city"), { doorDist: 40 }).door * 5);
  assert.equal(ambienceLevels(ambienceProfile("city"), {}).door, 0, "no moving door, no motor");
  for (const id of ["yard", "airfield", "coast", "city", "indoor", "forest"]) {
    const lv = ambienceLevels(ambienceProfile(id), { windMag: 1, shoreDist: 5, doorDist: 3 });
    for (const [k, v] of Object.entries(lv)) if (typeof v === "number" && k !== "birdRate") assert.ok(v >= 0 && v <= 0.1, `${id} ${k}=${v}`);
  }
  assert.equal(ambience.start("coast"), false, "no AudioContext in Node");
  assert.doesNotThrow(() => { ambience.tick(0.016, {}); ambience.stop(); });
});
