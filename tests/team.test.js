import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createMatch, addPlayer, removePlayer, applyHit, tick, snapshot, isTeamRoom, isRunning,
  TEAM_HP, RESPAWN_MS, MATCH_MS, TARGET, INTERMISSION_MS, HIT_RANGE, HIT_MIN_GAP_MS,
} from "../server/team.mjs";
import { scoreLine, matchStatus, enemyTargets, resultModel, fmtClock, TEAM_SPAWN } from "../src/team.js";
import { TEAM, opById, ROOM_OP, wantsBots, playerCanBeHit, isOpOpen, trackOf } from "../src/missions.js";
import { ROOMS } from "../src/rooms.js";
import { emptyProgress } from "../src/progress.js";
import { briefingModel, objectiveText } from "../src/briefing.js";
import { droneById } from "../src/catalog.js";

const at = (x, y, z) => ({ x, y, z, qw: 1, qx: 0, qy: 0, qz: 0, thr: 0.3 });

function twoSides(now = 1000) {
  const m = createMatch(now);
  const a = addPlayer(m, "a", now);
  const b = addPlayer(m, "b", now);
  tick(m, now); // two pilots → the match starts
  return { m, a, b };
}

test("team rooms and side assignment: emptier side first, red on a tie, a returning id keeps its side", () => {
  assert.equal(isTeamRoom("team"), true);
  assert.equal(isTeamRoom("team-arkadaslar"), true);
  assert.equal(isTeamRoom("hangar"), false);
  assert.equal(isTeamRoom("teamwork"), false);
  const m = createMatch(0);
  assert.deepEqual(["a", "b", "c", "d"].map((id) => addPlayer(m, id, 0).team), ["red", "blue", "red", "blue"]);
  removePlayer(m, "a");
  assert.equal(addPlayer(m, "e", 0).team, "red", "red was down one");
  assert.equal(addPlayer(m, "b", 0).team, "blue", "already in: unchanged");
  assert.equal(m.players.size, 4);
});

test("the match starts only with two pilots, runs 3 minutes, and pays a kill to the shooter's side", () => {
  const m = createMatch(1000);
  addPlayer(m, "a", 1000);
  assert.deepEqual(tick(m, 1000), [], "alone: nothing happens");
  assert.equal(isRunning(m, 1000), false);
  addPlayer(m, "b", 1000);
  const ev = tick(m, 2000);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].t, "match");
  assert.equal(ev[0].running, true);
  assert.equal(ev[0].endsAt, 2000 + MATCH_MS);
  assert.equal(ev[0].n, 2);
  const states = { a: at(0, 5, 0), b: at(30, 5, 0) };
  let r;
  for (let i = 0; i < TEAM_HP; i++) r = applyHit(m, "a", "b", states, 3000 + i * 100);
  assert.equal(r.ok, true);
  assert.equal(r.events[0].t, "hit");
  assert.equal(r.events[0].hp, 0);
  assert.equal(r.events[1].t, "down");
  assert.deepEqual(r.events[1].scores, { red: 1, blue: 0 });
  assert.equal(r.events[1].by, "a");
  const b = m.players.get("b");
  assert.equal(b.alive, false);
  assert.equal(b.deaths, 1);
  assert.equal(m.players.get("a").kills, 1);
  // Down pilots cannot be hit again, and revive after RESPAWN_MS with full HP.
  assert.equal(applyHit(m, "a", "b", states, 4000).reason, "olu");
  assert.deepEqual(tick(m, 3500 + RESPAWN_MS - 1), []);
  const rev = tick(m, 3500 + RESPAWN_MS);
  assert.deepEqual(rev, [{ t: "respawn", id: "b", hp: TEAM_HP }]);
  assert.equal(b.alive, true);
});

test("a hit is refused when it cannot be real", () => {
  const { m } = twoSides(1000);
  const states = { a: at(0, 5, 0), b: at(30, 5, 0) };
  const c = addPlayer(m, "c", 1000); // red, same side as a
  assert.equal(c.team, "red");
  assert.equal(applyHit(m, "a", "c", { ...states, c: at(5, 5, 0) }, 2000).reason, "takim-arkadasi");
  assert.equal(applyHit(m, "a", "a", states, 2000).reason, "kim");
  assert.equal(applyHit(m, "a", "zzz", states, 2000).reason, "kim");
  assert.equal(applyHit(m, "a", "b", { a: at(0, 5, 0), b: at(HIT_RANGE + 5, 5, 0) }, 2000).reason, "menzil");
  assert.equal(applyHit(m, "a", "b", { a: at(0, 5, 0), b: null }, 2000).reason, "konum-yok");
  assert.equal(applyHit(m, "a", "b", states, 2000).ok, true);
  assert.equal(applyHit(m, "a", "b", states, 2000 + HIT_MIN_GAP_MS - 1).reason, "hizli");
  assert.equal(applyHit(m, "a", "b", states, 2000 + HIT_MIN_GAP_MS).ok, true);
  const idle = createMatch(0);
  addPlayer(idle, "x", 0);
  addPlayer(idle, "y", 0);
  assert.equal(applyHit(idle, "x", "y", { x: at(0, 0, 0), y: at(1, 0, 0) }, 10).reason, "mac-yok", "no match yet");
});

test("first to the target ends the match; after the intermission a new one starts with clean sheets", () => {
  const { m } = twoSides(1000);
  const states = { a: at(0, 5, 0), b: at(10, 5, 0) };
  let now = 2000;
  let last;
  for (let k = 0; k < TARGET; k++) {
    for (let i = 0; i < TEAM_HP; i++) {
      last = applyHit(m, "a", "b", states, now);
      now += HIT_MIN_GAP_MS;
    }
    if (k < TARGET - 1) {
      now += RESPAWN_MS;
      tick(m, now);
    }
  }
  const endEv = last.events.find((e) => e.t === "match");
  assert.ok(endEv, "the winning kill carries the end-of-match snapshot");
  assert.equal(endEv.ended, true);
  assert.equal(endEv.winner, "red");
  assert.deepEqual(endEv.scores, { red: TARGET, blue: 0 });
  assert.equal(isRunning(m, now), false);
  assert.equal(applyHit(m, "a", "b", states, now + RESPAWN_MS + 10).reason, "mac-yok");
  const endedAt = m.endedAt;
  assert.ok(endedAt > 0 && endedAt < now, "ended on the winning hit's clock");
  assert.deepEqual(tick(m, endedAt + INTERMISSION_MS - 1).filter((e) => e.t === "match"), [], "still resting");
  const restart = tick(m, endedAt + INTERMISSION_MS).find((e) => e.t === "match");
  assert.equal(restart.running, true);
  assert.deepEqual(restart.scores, { red: 0, blue: 0 });
  assert.equal(m.players.get("a").kills, 0);
  assert.equal(m.players.get("b").alive, true);
});

test("the timer ends a match; alone after the whistle the room goes back to waiting", () => {
  const { m } = twoSides(1000);
  const end = tick(m, 1000 + MATCH_MS + 1).find((e) => e.t === "match");
  assert.equal(end.ended, true);
  assert.equal(end.winner, "draw");
  removePlayer(m, "b");
  const back = tick(m, 1000 + MATCH_MS + INTERMISSION_MS + 5).find((e) => e.t === "match");
  assert.equal(back.running, false);
  assert.equal(back.ended, false);
  assert.equal(back.n, 1);
  const s = snapshot(m, 0);
  assert.equal(s.t, "match");
  assert.deepEqual(s.players.map((p) => p.id), ["a"]);
});

test("client helpers: scoreboard line, clock/status, enemy targets, result card", () => {
  assert.equal(scoreLine({ scores: { red: 7, blue: 5 } }), "KIRMIZI 7 : 5 MAVİ");
  assert.equal(scoreLine(null), "KIRMIZI 0 : 0 MAVİ");
  assert.equal(fmtClock(150999), "2:31");
  assert.equal(fmtClock(-5), "0:00");
  const running = matchStatus({ running: true, endsAt: 100000, target: 20, n: 3 }, 40000, "red");
  assert.equal(running.phase, "running");
  assert.equal(running.clock, "1:00");
  assert.match(running.line, /Sen: KIRMIZI/);
  const waiting = matchStatus({ running: false, ended: false, n: 1 }, 0, "blue");
  assert.equal(waiting.phase, "waiting");
  assert.match(waiting.line, /1\/2/);
  const ended = matchStatus({ running: false, ended: true, winner: "blue" }, 0, "red");
  assert.equal(ended.phase, "ended");
  assert.match(ended.line, /Mavi kazandı/);
  assert.equal(matchStatus(null, 0, null).phase, "waiting");

  const remotes = new Map([
    ["e1", { team: "blue", alive: true, mesh: { position: { x: 1, y: 2, z: 3 } } }],
    ["e2", { team: "blue", alive: false, mesh: { position: { x: 4, y: 5, z: 6 } } }],
    ["f1", { team: "red", alive: true, mesh: { position: { x: 7, y: 8, z: 9 } } }],
    ["n0", { team: null, alive: true, mesh: { position: { x: 0, y: 0, z: 0 } } }],
  ]);
  assert.deepEqual(enemyTargets(remotes, "red"), [{ id: "e1", x: 1, y: 2, z: 3, hp: 1, alive: true }]);
  assert.deepEqual(enemyTargets(remotes, null), []);

  const won = resultModel({ scores: { red: 20, blue: 14 }, winner: "red" }, "red", 6, 2);
  assert.equal(won.won, true);
  assert.equal(won.title, "Kırmızı kazandı");
  assert.equal(won.score, "20 : 14");
  assert.deepEqual(won.rows.map((r) => r.v).slice(0, 3), ["Kırmızı", "6", "2"]);
  const lost = resultModel({ scores: { red: 20, blue: 14 }, winner: "red" }, "blue");
  assert.equal(lost.won, false);
  assert.equal(lost.kicker, "MAÇ KAYBEDİLDİ");
  const draw = resultModel({ scores: { red: 3, blue: 3 }, winner: "draw" }, "blue");
  assert.equal(draw.won, null);
  assert.equal(draw.title, "Berabere");
  assert.ok(TEAM_SPAWN.red.x < 0 && TEAM_SPAWN.blue.x > 0);
});

test("the team op: room-bound, always open, no bots, no run clock", () => {
  assert.equal(opById("team"), TEAM);
  assert.equal(ROOM_OP.team, "team");
  assert.ok(ROOMS.some((r) => r.id === "team"));
  assert.equal(TEAM.kind, "team");
  assert.equal(TEAM.fire, true);
  assert.equal(TEAM.limit, 0);
  assert.equal(wantsBots(TEAM), false);
  assert.equal(playerCanBeHit(TEAM), false, "damage arrives from the server, not the local shot test");
  assert.equal(isOpOpen(TEAM, emptyProgress()), true);
  assert.equal(trackOf("team"), null);
  // Briefing: no "Görev 0/0" for a mode outside the tracks.
  const m = briefingModel({ op: TEAM, opIndex: 0, opTotal: 0, trackName: "Görev", map: { id: "airfield", name: "Pist" }, drone: droneById("racer"), droneName: (i) => droneById(i).name });
  assert.equal(m.kicker, "Çok oyunculu · Takım savaşı");
  const by = Object.fromEntries(m.rows.map((r) => [r.k, r]));
  assert.equal(by["Oyun modu"].sub, "team odası · en az 2 pilot");
  assert.equal(by["Görev hedefi"].v, "20 sayı · 3 dakika · rakip pilotları vur");
  assert.match(objectiveText(TEAM), /20 sayı/);
});
