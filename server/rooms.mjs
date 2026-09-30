import { logEvent, recordScore } from "./store.mjs";
import { clientIp, geoFor } from "./geo.mjs";
import { isTeamRoom, createMatch, addPlayer, removePlayer, applyHit, tick as tickMatch, snapshot } from "./team.mjs";

const MAX_PEERS = 16;
export const LOBBIES = ["hangar", "training", "team", "race", "cine", "lr", "indoor"];

function num(v, d = 0) {
  const n = +v;
  return Number.isFinite(n) ? n : d;
}

export function plausibleBestLap(laps, seconds) {
  if (!Array.isArray(laps) || !laps.length || laps.length > 20) return null;
  const vals = laps.map((v) => +v);
  if (!vals.every((v) => Number.isFinite(v) && v > 0.5 && v < 3600)) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - seconds) > Math.max(3, seconds * 0.15)) return null;
  return Math.round(Math.min(...vals) * 100) / 100;
}

export function attachRooms(wss, { allowMessage } = {}) {
  const rooms = new Map();
  const sockets = new Set();
  // Team rooms (`team`, `team-*`) carry a server-owned match: sides, HP, scores, clock.
  const matches = new Map();

  wss.getOnline = function getOnline() {
    const list = [];
    for (const [roomId, peers] of rooms) {
      for (const [pid, p] of peers) {
        list.push({
          id: pid,
          room: roomId,
          name: p.meta?.name || "pilot",
          drone: p.meta?.drone || "?",
          team: matches.get(roomId)?.players.get(pid)?.team || null,
          ip: p.ip || "",
          geo: p.geo || null,
        });
      }
    }
    return list;
  };

  function roomMap(name) {
    const key = name || "hangar";
    if (!rooms.has(key)) rooms.set(key, new Map());
    return rooms.get(key);
  }

  function matchFor(roomId) {
    if (!matches.has(roomId)) matches.set(roomId, createMatch(Date.now()));
    return matches.get(roomId);
  }

  /** Peer meta as others see it: the client's name/drone plus the server-assigned side. */
  function metaOf(roomId, pid, p) {
    const team = matches.get(roomId)?.players.get(pid)?.team;
    return team ? { ...p.meta, team } : p.meta;
  }

  function send(ws, msg) {
    if (ws.readyState === 1) ws.send(JSON.stringify(msg));
  }

  function roomList() {
    const seen = new Set(LOBBIES);
    const list = LOBBIES.map((id) => ({ id, n: rooms.get(id)?.size || 0 }));
    for (const [id, peers] of rooms) {
      if (seen.has(id) || peers.size === 0) continue;
      list.push({ id, n: peers.size });
    }
    return list;
  }

  function broadcastRooms() {
    const raw = JSON.stringify({ t: "rooms", list: roomList() });
    for (const ws of sockets) {
      if (ws.readyState === 1) ws.send(raw);
    }
  }

  function broadcast(room, msg, exceptId) {
    const peers = rooms.get(room);
    if (!peers) return;
    const raw = JSON.stringify(msg);
    for (const [id, peer] of peers) {
      if (id === exceptId) continue;
      if (peer.ws.readyState === 1) peer.ws.send(raw);
    }
  }

  // Match clock: start when two pilots are in, end on the timer, revive the fallen.
  function tickTeams(now = Date.now()) {
    for (const [roomId, m] of matches) {
      if (!rooms.has(roomId)) {
        matches.delete(roomId);
        continue;
      }
      for (const ev of tickMatch(m, now)) broadcast(roomId, ev);
    }
  }
  wss.tickTeams = tickTeams;
  const ticker = setInterval(() => tickTeams(), 500);
  ticker.unref?.();

  wss.on("connection", (ws, req) => {
    const id = crypto.randomUUID();
    let room = "hangar";
    let meta = { name: "pilot", drone: "whoop" };
    let activeOp = null;
    let lastResultAt = 0;
    const ip = clientIp(req);
    const geo = geoFor(ip);
    sockets.add(ws);
    logEvent({ type: "connect", id, ip, geo });

    function leave() {
      const peers = rooms.get(room);
      if (!peers) return;
      peers.delete(id);
      broadcast(room, { t: "leave", id });
      logEvent({ type: "leave", id, room, name: meta.name, ip, geo });
      const m = matches.get(room);
      if (m) {
        removePlayer(m, id);
        if (peers.size === 0) matches.delete(room);
        else broadcast(room, snapshot(m, Date.now()));
      }
      if (peers.size === 0) rooms.delete(room);
      broadcastRooms();
    }

    function hello() {
      const peers = rooms.get(room) || new Map();
      const m = matches.get(room);
      send(ws, {
        t: "hello",
        id,
        room,
        team: m?.players.get(id)?.team || null,
        match: m ? snapshot(m, Date.now()) : null,
        peers: [...peers.entries()]
          .filter(([pid]) => pid !== id)
          .map(([pid, p]) => ({ id: pid, meta: metaOf(room, pid, p), state: p.state })),
      });
    }

    function join(nextRoom, nextMeta, silent) {
      const target = (nextRoom || "hangar").slice(0, 24);
      meta = nextMeta || meta;
      const already = rooms.get(room)?.get(id);
      if (already && room === target) {
        already.meta = meta;
        hello();
        broadcast(room, { t: "join", id, meta: metaOf(room, id, already) }, id);
        logEvent({ type: "join", id, room, name: meta.name, drone: meta.drone, ip, geo });
        return;
      }
      // Check capacity BEFORE leaving the current room / reassigning `room` —
      // otherwise a rejected join strands this connection in neither room's
      // peer map while `room` still points at the (full) target, so its next
      // "state" message is silently dropped and its next leave()/join() fires
      // a phantom broadcast+log against a room it was never added to. Read
      // the size without roomMap()'s create-if-absent side effect: creating
      // the target's (still-empty) map here would make leave()'s own
      // delete-room-if-empty cleanup immediately delete it again below.
      if ((rooms.get(target)?.size ?? 0) >= MAX_PEERS) {
        send(ws, { t: "full", room: target });
        return;
      }
      leave();
      room = target;
      const peers = roomMap(room);
      const peer = { ws, meta, state: null, ip, geo };
      peers.set(id, peer);
      if (isTeamRoom(room)) {
        const m = matchFor(room);
        addPlayer(m, id, Date.now());
        // Everyone already in the room learns the new count (waiting → 2/2 etc.).
        broadcast(room, snapshot(m, Date.now()), id);
      }
      hello();
      broadcast(room, { t: "join", id, meta: metaOf(room, id, peer) }, id);
      broadcastRooms();
      if (!silent) logEvent({ type: "join", id, room, name: meta.name, drone: meta.drone, ip, geo });
    }

    join("hangar", meta, true);
    send(ws, { t: "rooms", list: roomList() });

    ws.on("message", (raw) => {
      // State frames can legitimately arrive many times per second during a
      // flight. Keep the ceiling comfortably above that traffic, but close a
      // connection that is clearly being used as a broadcast amplifier.
      if (allowMessage && !allowMessage(ip)) {
        logEvent({ type: "rate-limit", scope: "ws-message", id, ip, geo });
        ws.close(1008, "message rate limit");
        return;
      }
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (!msg || typeof msg !== "object") return;
      if (msg.t === "join") {
        join(String(msg.room || "hangar"), {
          name: String(msg.name || "pilot").slice(0, 18),
          drone: String(msg.drone || "whoop").slice(0, 24),
        });
        return;
      }
      if (msg.t === "state") {
        const peers = rooms.get(room);
        const me = peers?.get(id);
        if (!me) return;
        // Infinity/NaN would serialize back out as JSON null and drag a peer's
        // rendered position toward the origin on every viewer's screen.
        me.state = {
          x: num(msg.x),
          y: num(msg.y),
          z: num(msg.z),
          qw: num(msg.qw, 1),
          qx: num(msg.qx),
          qy: num(msg.qy),
          qz: num(msg.qz),
          thr: num(msg.thr),
          fire: num(msg.fire) ? 1 : 0,
        };
        broadcast(room, { t: "state", id, ...me.state }, id);
        return;
      }
      if (msg.t === "hit") {
        // "My shot reached that pilot." Only meaningful in a team room; the
        // match logic checks sides, range against both last known poses,
        // cadence and whether either pilot is already down.
        const m = matches.get(room);
        const peers = rooms.get(room);
        if (!m || !peers) return;
        const states = {};
        for (const [pid, p] of peers) states[pid] = p.state;
        const r = applyHit(m, id, String(msg.to || "").slice(0, 64), states, Date.now());
        for (const ev of r.events) broadcast(room, ev);
        return;
      }
      if (msg.t === "start") {
        const opId = String(msg.opId || "").slice(0, 32);
        if (opId) activeOp = { opId, startedAt: Date.now() };
        return;
      }
      if (msg.t === "result") {
        const opId = String(msg.opId || "").slice(0, 32);
        if (!opId) return;
        const now = Date.now();
        if (now - lastResultAt < 3000) return;
        lastResultAt = now;
        const opName = String(msg.opName || opId).slice(0, 64);
        // Seconds come from the server's own clock against a matching "start"
        // this same connection sent, not the client's claim — otherwise any
        // WS client can fabricate an instant win with any time it likes and
        // top the public leaderboard without ever playing.
        const started = activeOp?.opId === opId ? activeOp.startedAt : null;
        activeOp = null;
        if (!started) return;
        const seconds = Math.max(0, (now - started) / 1000);
        const won = !!msg.won;
        const ranked = msg.ranked !== false;
        // Lap splits are the client's own stopwatch. They only get stored when
        // they add up to the server-timed run (start→result), so a bogus
        // "0.1 s lap" can't ride in on an otherwise honest finish.
        const bestLap = plausibleBestLap(msg.laps, seconds);
        logEvent({ type: won ? "win" : "lost", id, room, name: meta.name, opId, opName, seconds, bestLap, ranked, ip, geo });
        if (won && ranked) recordScore({ name: meta.name, opId, opName, seconds, ...(bestLap != null ? { bestLap } : {}) });
      }
    });

    ws.on("close", () => {
      sockets.delete(ws);
      leave();
    });
    ws.on("error", () => {
      sockets.delete(ws);
      leave();
    });
  });
}
