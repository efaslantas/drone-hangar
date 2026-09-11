import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyId, isDailyId, dailyDate, dailyLabel, dailyOp, sortBoards, pruneDailyGhosts, DAILY_MAPS } from "../src/daily.js";
import { opById, OPS, isOpOpen, trackOf, nextInTrack, wantsBots } from "../src/missions.js";
import { briefingModel, objectiveText } from "../src/briefing.js";
import { createRun, tickRun, nextGoal } from "../src/goals.js";
import { CATALOG, droneById } from "../src/catalog.js";
import { emptyProgress } from "../src/progress.js";

// makePlay(minx, maxx, minz, maxz, ceil) per map in world.js.
const BOUNDS = {
  yard: { minx: -40, maxx: 44, minz: -82, maxz: 16, ceil: 42 },
  airfield: { minx: -48, maxx: 48, minz: -88, maxz: 22, ceil: 50 },
  coast: { minx: -44, maxx: 44, minz: -46, maxz: 20, ceil: 40 },
  city: { minx: -34, maxx: 34, minz: -96, maxz: 14, ceil: 46 },
  forest: { minx: -70, maxx: 70, minz: -140, maxz: 30, ceil: 55 },
  indoor: { minx: -40.6, maxx: 40.6, minz: -80.6, maxz: 40.6, ceil: 15.55 },
};
const days = (n, from = Date.UTC(2026, 8, 1)) => Array.from({ length: n }, (_, i) => dailyId(new Date(from + i * 864e5)));

test("the id is the UTC calendar day; labels are Turkish and short", () => {
  assert.equal(dailyId(new Date(Date.UTC(2026, 8, 7, 23, 59))), "daily-2026-09-07");
  assert.equal(dailyId(new Date(Date.UTC(2026, 8, 8, 0, 0, 1))), "daily-2026-09-08");
  assert.equal(isDailyId("daily-2026-09-07"), true);
  assert.equal(isDailyId("daily-2026-9-7"), false);
  assert.equal(isDailyId("school"), false);
  assert.equal(dailyLabel("daily-2026-09-07"), "7 Eyl");
  assert.equal(dailyLabel("daily-2026-01-31", { year: true }), "31 Oca 2026");
  assert.equal(dailyLabel("school"), "");
  assert.equal(dailyDate("daily-2026-09-07").toISOString(), "2026-09-07T00:00:00.000Z");
  assert.equal(dailyOp("nope"), null);
});

test("every pool point sits inside its map's fence and under the ceiling", () => {
  for (const [mapId, m] of Object.entries(DAILY_MAPS)) {
    const b = BOUNDS[mapId];
    assert.ok(b, mapId);
    assert.ok(m.pool.length >= 14, `${mapId}: pool of ${m.pool.length}`);
    for (const d of m.drones) assert.ok(CATALOG.some((c) => c.id === d), `${mapId}: drone ${d}`);
    for (const [x, y, z] of [...m.pool, [m.spawn.x, m.spawn.y, m.spawn.z]]) {
      assert.ok(x > b.minx + 2 && x < b.maxx - 2, `${mapId}: x=${x}`);
      assert.ok(z > b.minz + 2 && z < b.maxz - 2, `${mapId}: z=${z}`);
      assert.ok(y > 0 && y < b.ceil - 1.5, `${mapId}: y=${y} vs ceiling ${b.ceil}`);
    }
    assert.equal(new Set(m.pool.map((p) => `${p[0]},${p[2]}`)).size, m.pool.length, `${mapId}: duplicate pool point`);
  }
});

test("same day → the same course; a month of days → different courses on several maps", () => {
  assert.equal(dailyOp("daily-2026-09-07"), dailyOp("daily-2026-09-07"), "memoised");
  const ids = days(30);
  const sigs = new Set(ids.map((id) => JSON.stringify(dailyOp(id).steps)));
  assert.ok(sigs.size >= 28, `courses repeat too often: ${sigs.size}/30`);
  const maps = new Set(ids.map((id) => dailyOp(id).map));
  assert.ok(maps.size >= 4, `only ${[...maps].join(",")}`);
  const withHover = ids.filter((id) => dailyOp(id).steps.some((s) => s.t === "hover")).length;
  const windy = ids.filter((id) => dailyOp(id).wind).length;
  assert.ok(withHover >= 3 && withHover <= 20, `hover days ${withHover}`);
  assert.ok(windy >= 6, `windy days ${windy}`);
});

test("each daily is a flyable, fair school run: locked airframe, 7-9 waypoints in bounds, landing last", () => {
  for (const id of days(60)) {
    const op = dailyOp(id);
    assert.equal(op.kind, "school", id);
    assert.equal(op.daily, true);
    assert.equal(op.countdown, 3);
    assert.equal(op.lockDrone, true);
    assert.equal(op.lockMap, true);
    assert.equal(op.fire, false);
    assert.equal(wantsBots(op), false);
    assert.ok(DAILY_MAPS[op.map].drones.includes(op.drone), `${id}: ${op.drone} on ${op.map}`);
    const b = BOUNDS[op.map];
    const way = op.steps.filter((s) => s.t !== "land");
    assert.ok(way.length >= 7 && way.length <= 9, `${id}: ${way.length} waypoints`);
    assert.equal(op.steps.at(-1).t, "land");
    for (const p of [...way, op.spawn]) {
      assert.ok(p.x > b.minx + 2 && p.x < b.maxx - 2 && p.z > b.minz + 2 && p.z < b.maxz - 2, `${id}: (${p.x},${p.z}) outside ${op.map}`);
      assert.ok(p.y > 0 && p.y < b.ceil - 1.5, `${id}: y=${p.y}`);
    }
    assert.equal(new Set(way.map((g) => `${g.x},${g.z}`)).size, way.length, `${id}: duplicate waypoint`);
    if (op.wind) {
      assert.notEqual(op.map, "indoor", `${id}: wind indoors`);
      assert.ok(Math.hypot(op.wind.x, op.wind.z) <= 1.25 && Math.hypot(op.wind.x, op.wind.z) >= 0.35, `${id}: wind ${JSON.stringify(op.wind)}`);
    }
    assert.match(objectiveText(op), /kapı → pad'e iniş/);
    assert.match(op.blurb, new RegExp(DAILY_MAPS[op.map].name));
    assert.match(op.blurb, /aynı gövde/);
    const route = DAILY_MAPS[op.map].routes[way.length];
    assert.equal(route.length, way.length, `${id}: missing safe route template`);
    assert.equal(new Set(route).size, route.length, `${id}: route repeats a waypoint`);
    for (const index of route) assert.ok(DAILY_MAPS[op.map].pool[index], `${id}: route index ${index}`);
  }
});

test("missions know the daily: opById synthesises it, it is always open and outside the tracks", () => {
  const id = "daily-2026-09-07";
  const op = opById(id);
  assert.equal(op.id, id);
  assert.equal(op.daily, true);
  assert.equal(isOpOpen(op, emptyProgress()), true);
  assert.equal(trackOf(id), null);
  assert.equal(nextInTrack(id), null);
  assert.ok(!OPS.some((o) => o.id === id), "not part of the flat OPS list");
  assert.equal(opById("daily-x").kind, "free", "a malformed id falls back like any unknown id");
});

test("flying a daily: waypoints in order, the hover holds 3 s, the pad wins", () => {
  const id = days(60).find((d) => dailyOp(d).steps.some((s) => s.t === "hover"));
  assert.ok(id, "no hover day in two months");
  const op = dailyOp(id);
  const run = createRun(op);
  const at = (x, y, z, extra = {}) => ({ x, y, z, vx: 0, vy: 0, vz: 0, armed: true, battery: 1, grounded: false, ...extra });
  tickRun(run, { state: at(op.spawn.x, op.spawn.y, op.spawn.z), dt: 0.02 });
  assert.equal(nextGoal(run).kind, op.steps[0].t);
  for (const st of op.steps) {
    if (st.t === "land") break;
    const ticks = st.t === "hover" ? Math.ceil(st.hold / 0.02) + 3 : 1;
    for (let i = 0; i < ticks; i++) tickRun(run, { state: at(st.x, st.y, st.z), dt: 0.02 });
  }
  assert.equal(op.steps[run.step].t, "land");
  assert.equal(nextGoal(run).kind, "pad");
  tickRun(run, { state: at(0, 0.3, 0, { armed: false, grounded: true }), dt: 0.02 });
  assert.equal(run.won, true);
});

test("briefing: the kicker names the day, the airframe matches, the note explains the shared route", () => {
  const op = dailyOp("daily-2026-09-07");
  const m = briefingModel({ op, map: { id: op.map, name: DAILY_MAPS[op.map].name }, drone: droneById(op.drone), droneName: (i) => droneById(i).name });
  assert.equal(m.kicker, "Günün görevi · 7 Eyl");
  const by = Object.fromEntries(m.rows.map((r) => [r.k, r]));
  assert.equal(by["Oyun modu"].v, "Günün görevi");
  assert.equal(by["Oyun modu"].sub, "günün görevi · 7 eyl");
  assert.equal(by["Önerilen drone"].tone, "ok");
  assert.equal(by["Süre limiti"].v, "5:00");
  assert.match(m.note, /aynı rota/);
});

test("leaderboard order: today first, the campaign rungs, then at most three older dailies", () => {
  const today = "daily-2026-09-07";
  const boards = ["school", "daily-2026-09-01", "race", "daily-2026-09-05", "zzz", today, "daily-2026-09-06", "daily-2026-09-03", "hover"].map((opId) => ({ opId }));
  const out = sortBoards(boards, OPS.map((o) => o.id), today, 3).map((b) => b.opId);
  assert.deepEqual(out, [today, "hover", "school", "race", "daily-2026-09-06", "daily-2026-09-05", "daily-2026-09-03", "zzz"]);
  assert.equal(sortBoards([], OPS.map((o) => o.id), today).length, 0);
});

test("old daily ghosts are pruned; today, yesterday and everything else stay", () => {
  const m = new Map([
    ["efa-hangar-ghost-v1:daily-2026-09-01", "a"],
    ["efa-hangar-ghost-v1:daily-2026-09-05", "b"],
    ["efa-hangar-ghost-v1:daily-2026-09-06", "c"],
    ["efa-hangar-ghost-v1:daily-2026-09-07", "d"],
    ["efa-hangar-ghost-v1:race", "e"],
    ["efa-hangar-ops-v1", "f"],
  ]);
  const st = { get length() { return m.size; }, key: (i) => [...m.keys()][i], removeItem: (k) => m.delete(k), getItem: (k) => m.get(k) };
  assert.equal(pruneDailyGhosts(st, "daily-2026-09-07"), 2);
  assert.deepEqual([...m.keys()], ["efa-hangar-ghost-v1:daily-2026-09-06", "efa-hangar-ghost-v1:daily-2026-09-07", "efa-hangar-ghost-v1:race", "efa-hangar-ops-v1"]);
  assert.equal(pruneDailyGhosts(null), 0);
});
