import { test } from "node:test";
import assert from "node:assert/strict";
import { windInfo, suggestDrone, objectiveText, briefingModel, fmtTime } from "../src/briefing.js";
import { OPS, FREE, opById } from "../src/missions.js";
import { droneById } from "../src/catalog.js";

const name = (id) => droneById(id).name;

test("wind is named by where it comes from, graded by strength", () => {
  assert.equal(windInfo(null).label, "Sakin");
  assert.equal(windInfo({ x: 0, z: 0 }).level, 0);
  const race = windInfo(opById("race").wind);
  assert.equal(race.level, 2);
  assert.equal(race.label, "Orta");
  assert.equal(race.from, "B");
  assert.equal(race.detail, "batıdan");
  assert.equal(windInfo({ x: 0, z: -1 }).from, "G", "blowing north comes from the south");
  assert.equal(windInfo({ x: 1, z: 0 }).from, "B");
  assert.equal(windInfo({ x: 0, z: 0.5 }).level, 1);
  assert.equal(windInfo({ x: 2, z: 1 }).label, "Kuvvetli");
  assert.equal(windInfo({ x: 1, z: 0 }, { indoor: true }).label, "Kapalı alan");
  assert.match(windInfo({ x: 1, z: 0 }, { real: true }).detail, /türbülans/);
  assert.match(windInfo(null, { real: true }).detail, /türbülans/);
});

test("recommended drone follows the op, then the map", () => {
  assert.equal(suggestDrone(opById("school"), "coast"), "whoop");
  assert.equal(suggestDrone(FREE, "coast"), "seven");
  assert.equal(suggestDrone(FREE, "indoor"), "whoop");
  assert.equal(suggestDrone(FREE, "nowhere"), "freestyle");
});

test("every op has a numeric objective line", () => {
  for (const op of OPS) assert.match(objectiveText(op), /\d/, op.id);
  assert.equal(objectiveText(opById("race")), "3 tur × 4 kapı");
  assert.equal(objectiveText(opById("school")), "4 kapı → pad'e iniş");
  assert.equal(objectiveText(opById("hover")), "3 hover → pad'e iniş");
  assert.equal(objectiveText(opById("range")), "5 kapı · 1 pil değişimi → pad'e iniş");
  assert.equal(objectiveText(opById("boss")), "2 dalga (1/2 bot)");
  assert.match(objectiveText(FREE), /serbest/i);
});

test("mission briefing: map, mode, wind, recommendation, objective, limit, battery", () => {
  const op = opById("race");
  const m = briefingModel({ op, opIndex: 1, opTotal: 4, trackName: "Yarış", map: { id: "coast", name: "Kıyı" }, drone: droneById("whoop"), droneName: name, night: true, progress: { best: { race: 80 }, bestLap: { race: 24.3 } } });
  assert.equal(m.title, "Uçuş brifingi");
  assert.equal(m.kicker, "Yarış 1/4 · Kıyı GP");
  const by = Object.fromEntries(m.rows.map((r) => [r.k, r]));
  assert.equal(by.Harita.v, "Kıyı");
  assert.equal(by.Harita.sub, "gece");
  assert.equal(by["Oyun modu"].v, "Kıyı GP");
  assert.equal(by["Oyun modu"].sub, "yarış 1/4");
  assert.equal(by["Rüzgâr"].v, "Orta");
  assert.equal(by["Rüzgâr"].tone, "warn");
  assert.equal(by["Önerilen drone"].v, '5" Racer');
  assert.match(by["Önerilen drone"].sub, /Tiny Whoop/);
  assert.equal(by["Görev hedefi"].tone, "accent");
  assert.equal(by["Süre limiti"].v, "25:00");
  assert.match(by["Süre limiti"].sub, /1:20/);
  assert.match(by.Batarya.v, /hover/);
  assert.equal(by["En iyi tur"].v, "24.3 s");
  assert.match(m.note, /Racer/);
  for (const r of m.rows) assert.ok(typeof r.k === "string" && typeof r.v === "string" && r.v.length, r.k);
});

test("matching drone gets a check, not a note", () => {
  const m = briefingModel({ op: opById("school"), opIndex: 2, opTotal: 6, trackName: "Uçuş Okulu", map: { id: "indoor", name: "Kapalı hangar" }, drone: droneById("whoop"), droneName: name });
  const rec = m.rows.find((r) => r.k === "Önerilen drone");
  assert.equal(rec.tone, "ok");
  assert.equal(m.note, "");
  assert.equal(m.rows.find((r) => r.k === "Rüzgâr").v, "Kapalı alan");
  assert.equal(m.kicker, "Uçuş Okulu 2/6 · Kapılar");
  assert.equal(m.rows.find((r) => r.k === "Fizik"), undefined, "arcade lesson: no physics row");
});

test("an op that pins realistic physics says so in the briefing", () => {
  const m = briefingModel({ op: opById("school-acro"), opIndex: 5, opTotal: 6, trackName: "Uçuş Okulu", map: { id: "yard", name: "Depo" }, drone: droneById("freestyle"), droneName: name, real: true });
  const phys = m.rows.find((r) => r.k === "Fizik");
  assert.equal(phys.v, "Gerçekçi acro");
  assert.equal(phys.tone, "warn");
});

test("free flight takes the map breeze, missions keep their own wind", async () => {
  const { MAPS, windFor } = await import("../src/world.js");
  const coast = MAPS.find((m) => m.id === "coast");
  const free = briefingModel({ op: FREE, map: coast, drone: droneById("racer"), droneName: name });
  assert.equal(free.rows.find((r) => r.k === "Rüzgâr").v, "Orta");
  const indoor = briefingModel({ op: FREE, map: MAPS.find((m) => m.id === "indoor"), drone: droneById("whoop"), droneName: name });
  assert.equal(indoor.rows.find((r) => r.k === "Rüzgâr").v, "Kapalı alan");
  assert.deepEqual(windFor(FREE, "airfield"), { x: 0.9, z: 0.35 });
  assert.equal(windFor(FREE, "indoor"), null);
  assert.equal(windFor(opById("waves"), "airfield"), null, "the dogfight op defines no wind, so none");
  assert.deepEqual(windFor(opById("race"), "coast"), opById("race").wind);
  for (const m of MAPS) if (m.id !== "indoor") assert.ok(m.wind && Math.hypot(m.wind.x, m.wind.z) > 0.1, m.id);
});

test("free flight shows a compact conditions card", () => {
  const m = briefingModel({ op: FREE, map: { id: "forest", name: "Orman" }, drone: droneById("toothpick"), droneName: name, real: true });
  assert.equal(m.title, "Uçuş koşulları");
  const keys = m.rows.map((r) => r.k);
  assert.ok(!keys.includes("Görev hedefi") && !keys.includes("Süre limiti"));
  assert.ok(keys.includes("Fizik") && keys.includes("Drone") && keys.includes("Rüzgâr"));
  assert.equal(m.rows.find((r) => r.k === "Fizik").v, "Gerçekçi acro");
  assert.equal(m.rows.find((r) => r.k === "Drone").v, '3" Toothpick');
});

test("time formatting", () => {
  assert.equal(fmtTime(65), "1:05");
  assert.equal(fmtTime(24.34), "24.3 s");
  assert.equal(fmtTime(null), "—");
  assert.equal(fmtTime(1500), "25:00");
});
