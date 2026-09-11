import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG } from "../src/catalog.js";
import { createState, step } from "../src/physics.js";
import { createShot, stepShots, applyHits, makeBot, stepBot, aimDir } from "../src/combat.js";

test("shot moves forward and expires", () => {
  let shots = [createShot(0, 2, 0, 0, 0, -1, "p", 100)];
  shots = stepShots(shots, 0.2);
  assert.ok(shots[0].z < -15);
  shots = stepShots(shots, 2);
  assert.equal(shots.length, 0);
});

test("aim follows the camera pod tilt, not the nose", () => {
  const tilt = (-30 * Math.PI) / 180; // camTiltRad(), 30 derece asagi
  const [ax, ay, az] = aimDir(1, 0, 0, 0, tilt);
  assert.ok(Math.abs(ay + 0.5) < 1e-6, `ay=${ay}`);
  assert.ok(az < 0 && Math.abs(Math.hypot(ax, ay, az) - 1) < 1e-9);
  const [, ny, nz] = aimDir(1, 0, 0, 0, 0);
  assert.ok(Math.abs(ny) < 1e-9 && Math.abs(nz + 1) < 1e-9);
});

test("shot damages bot in radius", () => {
  const bot = { id: "b1", x: 0, y: 2, z: -10, hp: 2, alive: true };
  const shots = [createShot(0, 2, -10, 0, 0, -1, "p")];
  const hits = applyHits(shots, [bot], 1.5);
  assert.equal(hits.length, 1);
  assert.equal(bot.hp, 1);
  assert.equal(bot.alive, true);
  applyHits([createShot(0, 2, -10, 0, 0, -1, "p")], [bot], 1.5);
  assert.equal(bot.alive, false);
});

test("own shots do not hit owner", () => {
  const me = { id: "p", x: 0, y: 1, z: 0, hp: 5, alive: true };
  const hits = applyHits([createShot(0, 1, 0, 0, 0, -1, "p")], [me], 2);
  assert.equal(hits.length, 0);
  assert.equal(me.hp, 5);
});

test("bot stays airborne for 4s", () => {
  const spec = CATALOG.find((d) => d.id === "racer");
  const bot = makeBot("b", spec, 10, 8, -20, 0);
  const player = { x: 0, y: 6, z: 0 };
  for (let i = 0; i < 240; i++) stepBot(bot, player, i / 60, 1 / 60);
  assert.equal(bot.state.crashed, false);
  assert.ok(bot.state.y > 1.5, `y=${bot.state.y}`);
});

test("racer is much faster than camera quad", () => {
  const racer = CATALOG.find((d) => d.id === "racer");
  const cam = CATALOG.find((d) => d.id === "camera");
  const go = { lift: 0.25, r2: 0, yaw: 0, pitch: 0.75, roll: 0, angleMode: true };
  function dist(spec) {
    const s = createState(0, 10, 0);
    s.armed = true;
    for (let i = 0; i < 120; i++) step(s, go, spec, 1 / 60);
    return Math.hypot(s.x, s.z);
  }
  const rd = dist(racer);
  const cd = dist(cam);
  assert.ok(rd > cd * 2.2, `racer ${rd.toFixed(1)} vs camera ${cd.toFixed(1)}`);
});
