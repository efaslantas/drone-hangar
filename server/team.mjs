// Team deathmatch state for one room. Pure and clock-injected so it is unit
// tested without sockets: the server owns HP, deaths, scores and the match
// clock; clients only report "my shot reached that pilot" and the server
// decides whether that is plausible.

export const TEAM_HP = 6;
export const RESPAWN_MS = 4000;
export const MATCH_MS = 180000;
export const TARGET = 20;
export const INTERMISSION_MS = 8000;
// Player shots fly 160 m/s for 1.1 s (~176 m); anything claimed beyond this is noise or cheating.
export const HIT_RANGE = 190;
export const HIT_MIN_GAP_MS = 60;
export const TEAMS = ["red", "blue"];

export function isTeamRoom(id) {
  return id === "team" || /^team-/.test(String(id || ""));
}

export function createMatch(now = Date.now()) {
  return {
    players: new Map(),
    scores: { red: 0, blue: 0 },
    endsAt: null,
    endedAt: null,
    winner: null,
    target: TARGET,
    createdAt: now,
  };
}

function count(m, team) {
  let n = 0;
  for (const p of m.players.values()) if (p.team === team) n += 1;
  return n;
}

export function playerCount(m) {
  return m.players.size;
}

/** Join the emptier side (red on a tie). A returning id keeps its team. */
export function addPlayer(m, id, now = Date.now()) {
  const existing = m.players.get(id);
  if (existing) return existing;
  const team = count(m, "red") <= count(m, "blue") ? "red" : "blue";
  const p = { id, team, hp: TEAM_HP, alive: true, downUntil: 0, kills: 0, deaths: 0, lastHitAt: 0, joinedAt: now };
  m.players.set(id, p);
  return p;
}

export function removePlayer(m, id) {
  return m.players.delete(id);
}

export function isRunning(m, now = Date.now()) {
  return m.endsAt != null && now < m.endsAt;
}

export function snapshot(m, now = Date.now()) {
  return {
    t: "match",
    scores: { ...m.scores },
    endsAt: m.endsAt,
    endedAt: m.endedAt,
    winner: m.winner,
    target: m.target,
    running: isRunning(m, now),
    ended: m.endedAt != null && m.endsAt == null,
    n: m.players.size,
    players: [...m.players.values()].map((p) => ({ id: p.id, team: p.team, hp: p.hp, alive: p.alive, kills: p.kills, deaths: p.deaths })),
  };
}

function start(m, now) {
  m.scores = { red: 0, blue: 0 };
  m.endsAt = now + MATCH_MS;
  m.endedAt = null;
  m.winner = null;
  for (const p of m.players.values()) {
    p.hp = TEAM_HP;
    p.alive = true;
    p.downUntil = 0;
    p.kills = 0;
    p.deaths = 0;
  }
}

function end(m, now) {
  m.endsAt = null;
  m.endedAt = now;
  m.winner = m.scores.red > m.scores.blue ? "red" : m.scores.blue > m.scores.red ? "blue" : "draw";
}

/**
 * A client says its shot reached `to`. `states` maps id → last known pose.
 * Returns { ok, reason, events } where events are ready-to-broadcast messages.
 */
export function applyHit(m, from, to, states, now = Date.now()) {
  const a = m.players.get(from);
  const b = m.players.get(to);
  const no = (reason) => ({ ok: false, reason, events: [] });
  if (!a || !b || from === to) return no("kim");
  if (a.team === b.team) return no("takim-arkadasi");
  if (!isRunning(m, now)) return no("mac-yok");
  if (!a.alive || !b.alive) return no("olu");
  const sa = states?.[from];
  const sb = states?.[to];
  if (!sa || !sb) return no("konum-yok");
  const d = Math.hypot((sa.x || 0) - (sb.x || 0), (sa.y || 0) - (sb.y || 0), (sa.z || 0) - (sb.z || 0));
  if (!(d <= HIT_RANGE)) return no("menzil");
  if (now - a.lastHitAt < HIT_MIN_GAP_MS) return no("hizli");
  a.lastHitAt = now;
  b.hp -= 1;
  const events = [{ t: "hit", from, to, hp: b.hp }];
  if (b.hp <= 0) {
    b.alive = false;
    b.hp = 0;
    b.downUntil = now + RESPAWN_MS;
    b.deaths += 1;
    a.kills += 1;
    m.scores[a.team] += 1;
    events.push({ t: "down", id: to, by: from, team: a.team, scores: { ...m.scores } });
    if (m.scores[a.team] >= m.target) {
      end(m, now);
      events.push(snapshot(m, now));
    }
  }
  return { ok: true, reason: "", events };
}

/** Clock work: start when two pilots are in, end on the timer, revive the fallen. */
export function tick(m, now = Date.now()) {
  const events = [];
  const enough = m.players.size >= 2;
  if (m.endsAt != null && now >= m.endsAt) {
    end(m, now);
    events.push(snapshot(m, now));
  }
  if (m.endsAt == null) {
    const restAfterEnd = m.endedAt == null || now - m.endedAt >= INTERMISSION_MS;
    if (enough && restAfterEnd) {
      start(m, now);
      events.push(snapshot(m, now));
    } else if (!enough && m.endedAt != null && restAfterEnd) {
      // Everyone left after the whistle: back to waiting, no stale scoreboard.
      m.endedAt = null;
      m.winner = null;
      m.scores = { red: 0, blue: 0 };
      events.push(snapshot(m, now));
    }
  }
  for (const p of m.players.values()) {
    if (!p.alive && now >= p.downUntil) {
      p.alive = true;
      p.hp = TEAM_HP;
      events.push({ t: "respawn", id: p.id, hp: p.hp });
    }
  }
  return events;
}
