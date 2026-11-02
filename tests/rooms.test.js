import { test } from "node:test";
import assert from "node:assert/strict";
import { attachRooms } from "../server/rooms.mjs";
import { getEvents, getLeaderboard } from "../server/store.mjs";

class Sock {
  constructor() {
    this.readyState = 1;
    this._h = {};
    this.peer = null;
    this.inbox = [];
  }
  on(ev, fn) {
    this._h[ev] = fn;
  }
  send(data) {
    this.peer?._h.message?.(data);
  }
  close() {
    this.readyState = 3;
    this._h.close?.();
    if (this.peer && this.peer.readyState === 1) {
      this.peer.readyState = 3;
      this.peer._h.close?.();
    }
  }
}

function openRoom(options) {
  let onconn;
  const wss = { on(ev, fn) { if (ev === "connection") onconn = fn; } };
  attachRooms(wss, options);
  return {
    wss,
    connect() {
      const client = new Sock();
      const server = new Sock();
      client.peer = server;
      server.peer = client;
      client.on("message", (raw) => client.inbox.push(JSON.parse(raw)));
      onconn(server);
      return client;
    },
  };
}

test("a message-rate rejection closes the socket and records the visible reason", () => {
  const hub = openRoom({ allowMessage: () => false });
  const pilot = hub.connect();
  pilot.send(JSON.stringify({ t: "state", x: 1 }));
  assert.equal(pilot.readyState, 3);
  // close() also emits a normal leave event after the rejection; assert the
  // logged rejection itself rather than relying on the last-event ordering.
  const event = getEvents(10).find((entry) => entry.type === "rate-limit" && entry.scope === "ws-message");
  assert.ok(event);
  assert.equal(event.type, "rate-limit");
  assert.equal(event.scope, "ws-message");
});

test("second client sees first in the same room", () => {
  const hub = openRoom();
  const a = hub.connect();
  a.send(JSON.stringify({ t: "join", room: "alpha", name: "ada", drone: "racer" }));
  const b = hub.connect();
  b.send(JSON.stringify({ t: "join", room: "alpha", name: "bob", drone: "whoop" }));
  const helloB = [...b.inbox].reverse().find((m) => m.t === "hello");
  assert.ok(helloB);
  assert.equal(helloB.room, "alpha");
  assert.equal(helloB.peers.length, 1);
  assert.equal(helloB.peers[0].meta.name, "ada");
});

test("online peers expose game data without an IP address or approximate location", () => {
  const hub = openRoom();
  hub.connect();
  const online = hub.wss.getOnline();
  assert.equal(online.length, 1);
  assert.equal(Object.hasOwn(online[0], "ip"), false);
  assert.equal(Object.hasOwn(online[0], "geo"), false);
});

test("state broadcasts to the other pilot only", () => {
  const hub = openRoom();
  const a = hub.connect();
  const b = hub.connect();
  a.send(JSON.stringify({ t: "join", room: "gate", name: "a", drone: "whoop" }));
  b.send(JSON.stringify({ t: "join", room: "gate", name: "b", drone: "whoop" }));
  a.inbox.length = 0;
  b.inbox.length = 0;
  a.send(JSON.stringify({ t: "state", x: 3, y: 2, z: 1, qw: 1, qx: 0, qy: 0, qz: 0, thr: 0.4 }));
  assert.equal(a.inbox.length, 0);
  assert.equal(b.inbox[0].t, "state");
  assert.equal(b.inbox[0].x, 3);
  assert.equal(b.inbox[0].y, 2);
});

test("leave removes peer", () => {
  const hub = openRoom();
  const a = hub.connect();
  const b = hub.connect();
  a.send(JSON.stringify({ t: "join", room: "x", name: "a", drone: "whoop" }));
  b.send(JSON.stringify({ t: "join", room: "x", name: "b", drone: "whoop" }));
  b.inbox.length = 0;
  a.close();
  const leave = b.inbox.filter((m) => m.t === "leave");
  assert.ok(leave.length >= 1);
});

test("lobby list includes public rooms and counts", () => {
  const hub = openRoom();
  const a = hub.connect();
  a.send(JSON.stringify({ t: "join", room: "race", name: "ada", drone: "racer" }));
  const listing = [...a.inbox].reverse().find((m) => m.t === "rooms");
  assert.ok(listing);
  const race = listing.list.find((r) => r.id === "race");
  assert.ok(race);
  assert.equal(race.n, 1);
  assert.ok(listing.list.some((r) => r.id === "hangar"));
});

test("meta update in the same room is broadcast to peers", () => {
  const hub = openRoom();
  const a = hub.connect();
  const b = hub.connect();
  a.send(JSON.stringify({ t: "join", room: "alpha", name: "ada", drone: "whoop" }));
  b.send(JSON.stringify({ t: "join", room: "alpha", name: "bob", drone: "whoop" }));
  b.inbox.length = 0;
  a.send(JSON.stringify({ t: "join", room: "alpha", name: "ada", drone: "racer" }));
  const update = b.inbox.find((m) => m.t === "join");
  assert.ok(update, "peer should see the meta update, not just the joiner");
  assert.equal(update.meta.drone, "racer");
});

test("result message records a win only after a matching start, and updates the leaderboard", () => {
  const hub = openRoom();
  const a = hub.connect();
  a.send(JSON.stringify({ t: "join", room: "race", name: "Ada", drone: "racer" }));
  a.send(JSON.stringify({ t: "start", opId: "op1", opName: "Kapı" }));
  a.send(JSON.stringify({ t: "result", opId: "op1", opName: "Kapı", seconds: 999, won: true }));
  assert.equal(getEvents(1)[0].type, "win");
  const board = getLeaderboard().find((o) => o.opId === "op1");
  assert.ok(board, "op1 should appear on the leaderboard");
  assert.equal(board.entries[0].name, "Ada");
  assert.ok(board.entries[0].seconds < 999, "seconds must come from the server clock, not the client's claim");
});

test("result without a prior start is ignored — a client can't fabricate a win", () => {
  const hub = openRoom();
  const a = hub.connect();
  a.send(JSON.stringify({ t: "join", room: "race", name: "Hacker", drone: "racer" }));
  a.send(JSON.stringify({ t: "result", opId: "op2", opName: "Kapı", seconds: 0, won: true }));
  assert.equal(getLeaderboard().find((o) => o.opId === "op2"), undefined);
});

test("result for a different op than the one started is ignored", () => {
  const hub = openRoom();
  const a = hub.connect();
  a.send(JSON.stringify({ t: "join", room: "race", name: "Cheater", drone: "racer" }));
  a.send(JSON.stringify({ t: "start", opId: "op3", opName: "Gerçek" }));
  a.send(JSON.stringify({ t: "result", opId: "op3-sahte", opName: "Sahte", seconds: 0, won: true }));
  assert.equal(getLeaderboard().find((o) => o.opId === "op3-sahte"), undefined);
});

test("lost result logs 'lost' and does not touch the leaderboard", () => {
  const hub = openRoom();
  const a = hub.connect();
  a.send(JSON.stringify({ t: "join", room: "race", name: "Cem", drone: "racer" }));
  a.send(JSON.stringify({ t: "start", opId: "op4", opName: "Kapı" }));
  a.send(JSON.stringify({ t: "result", opId: "op4", opName: "Kapı", seconds: 10, won: false }));
  assert.equal(getEvents(1)[0].type, "lost");
  assert.equal(getLeaderboard().find((o) => o.opId === "op4"), undefined);
});

test("unranked practice result is logged but never enters the leaderboard", () => {
  const hub = openRoom();
  const a = hub.connect();
  const opId = `practice-unranked-${Date.now()}`;
  a.send(JSON.stringify({ t: "join", room: "hangar", name: "Ada", drone: "camera" }));
  a.send(JSON.stringify({ t: "start", opId, opName: "Antrenman" }));
  a.send(JSON.stringify({ t: "result", opId, opName: "Antrenman", won: true, ranked: false }));
  assert.equal(getEvents(1)[0].type, "win");
  assert.equal(getEvents(1)[0].ranked, false);
  assert.equal(getLeaderboard().find((o) => o.opId === opId), undefined);
});

test("different rooms are isolated", () => {
  const hub = openRoom();
  const a = hub.connect();
  const b = hub.connect();
  a.send(JSON.stringify({ t: "join", room: "one", name: "a", drone: "whoop" }));
  b.send(JSON.stringify({ t: "join", room: "two", name: "b", drone: "whoop" }));
  a.inbox.length = 0;
  b.inbox.length = 0;
  a.send(JSON.stringify({ t: "state", x: 9, y: 1, z: 0, qw: 1, qx: 0, qy: 0, qz: 0, thr: 0 }));
  assert.equal(b.inbox.length, 0);
});

test("lap splits are stored only when they add up to the server-timed run", async () => {
  const { plausibleBestLap } = await import("../server/rooms.mjs");
  assert.equal(plausibleBestLap([24.3, 22.9, 25.1], 72.4), 22.9);
  assert.equal(plausibleBestLap([24.3, 22.9, 25.1], 72.4 + 2.5), 22.9, "network latency tolerated");
  assert.equal(plausibleBestLap([0.1, 0.1, 0.1], 72.4), null, "fabricated splits rejected");
  assert.equal(plausibleBestLap([40, 40, 40], 72.4), null, "splits longer than the run rejected");
  assert.equal(plausibleBestLap([], 10), null);
  assert.equal(plausibleBestLap("nope", 10), null);
  assert.equal(plausibleBestLap([NaN, 3], 10), null);
  const hub = openRoom();
  const a = hub.connect();
  a.send(JSON.stringify({ t: "join", room: "race", name: "Lap", drone: "racer" }));
  a.send(JSON.stringify({ t: "start", opId: "op-lap", opName: "Yarış" }));
  a.send(JSON.stringify({ t: "result", opId: "op-lap", opName: "Yarış", seconds: 0, won: true, laps: [0.01, 0.01, 0.01] }));
  const board = getLeaderboard().find((o) => o.opId === "op-lap");
  assert.ok(board, "the win itself still counts");
  assert.equal(board.entries[0].bestLap, undefined, "but the impossible splits are dropped");
});

test('retired battle room links join the flight lobby without combat protocol', () => {
  for (const room of ['team', 'team-friends']) {
    const hub = openRoom();
    const a = hub.connect();
    const b = hub.connect();
    a.send(JSON.stringify({ t: 'join', room, name: 'a' }));
    b.send(JSON.stringify({ t: 'join', room, name: 'b' }));
    const hello = b.inbox.findLast(m => m.t === 'hello');
    assert.equal(hello.room, 'hangar');
    assert.equal(Object.hasOwn(hello, 'team'), false);
    assert.equal(Object.hasOwn(hello, 'match'), false);
    b.inbox.length = 0;
    a.send(JSON.stringify({ t: 'state', x: 3, y: 8, z: 1, fire: 1 }));
    assert.equal(b.inbox[0].x, 3);
    assert.equal(Object.hasOwn(b.inbox[0], 'fire'), false);
    b.inbox.length = 0;
    a.send(JSON.stringify({ t: 'hit', to: hello.id }));
    assert.deepEqual(b.inbox, []);
    assert.ok(!hub.wss.getOnline().some(p => Object.hasOwn(p, 'team')));
  }
});

test('old clients cannot submit new retired activity results', () => {
  for (const opId of ['patrol', 'waves', 'final', 'arena', 'boss', 'team', 'autonomy-coast-response']) {
    const hub = openRoom();
    const a = hub.connect();
    a.send(JSON.stringify({ t: 'start', opId }));
    a.send(JSON.stringify({ t: 'result', opId, won: true }));
    assert.equal(getLeaderboard().some(board => board.opId === opId), false, opId);
  }
});
