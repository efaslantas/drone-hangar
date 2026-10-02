import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

// Tests import rooms.mjs -> store.mjs directly; keep them from touching real
// event/score/admin-key files on disk.
const IS_TEST = process.env.NODE_ENV === "test";

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "data");
const eventsFile = path.join(dataDir, "events.json");
const scoresFile = path.join(dataDir, "scores.json");
const keyFile = path.join(dataDir, "admin.key");
const ghostsFile = path.join(dataDir, "ghosts.json");

const MAX_EVENTS = 2000;
const MAX_SCORES = 5000;
const MAX_GHOSTS = 300; // shared replays; oldest dropped first, same policy as events/scores
const MAX_GHOST_BYTES = 220_000; // encodeTrace() JSON string cap — guards disk + a public unauthenticated POST

function ensureDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readJson(file, fallback) {
  if (IS_TEST) return fallback;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  if (IS_TEST) return;
  ensureDir();
  try {
    fs.writeFileSync(file, JSON.stringify(data));
  } catch (err) {
    console.error("[store] yazma hatasi", file, err.message);
  }
}

function loadOrCreateAdminKey() {
  if (IS_TEST) return "test-key";
  if (process.env.ADMIN_KEY) return process.env.ADMIN_KEY;
  ensureDir();
  try {
    const existing = fs.readFileSync(keyFile, "utf8").trim();
    if (existing) return existing;
  } catch {}
  const key = randomBytes(9).toString("base64url");
  try {
    fs.writeFileSync(keyFile, key);
  } catch (err) {
    console.error("[store] admin key yazilamadi", err.message);
  }
  return key;
}

if (!IS_TEST) ensureDir();
const events = readJson(eventsFile, []);
const scores = readJson(scoresFile, []);
const ghosts = readJson(ghostsFile, []);
export const ADMIN_KEY = loadOrCreateAdminKey();
export const ADMIN_USER = process.env.ADMIN_USER || "admin";

export function logEvent(evt) {
  events.push({ ...evt, ts: Date.now() });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  writeJson(eventsFile, events);
}

export function getEvents(limit = 200) {
  const n = Math.max(1, Math.min(1000, Number(limit) || 200));
  return events.slice(-n).reverse();
}

export function recordScore(entry) {
  scores.push({ ...entry, ts: Date.now() });
  if (scores.length > MAX_SCORES) scores.splice(0, scores.length - MAX_SCORES);
  writeJson(scoresFile, scores);
}

export function getLeaderboard() {
  const byOp = new Map();
  for (const s of scores) {
    if (!byOp.has(s.opId)) byOp.set(s.opId, []);
    byOp.get(s.opId).push(s);
  }
  const ops = [];
  for (const [opId, list] of byOp) {
    const bestByName = new Map();
    for (const s of list) {
      const key = String(s.name || "pilot").toLowerCase();
      const prev = bestByName.get(key);
      if (!prev || s.seconds < prev.seconds) bestByName.set(key, s);
    }
    // A pilot's best lap may come from a different run than their best time.
    const lapByName = new Map();
    for (const s of list) {
      if (s.bestLap == null) continue;
      const key = String(s.name || "pilot").toLowerCase();
      const prev = lapByName.get(key);
      if (prev == null || s.bestLap < prev) lapByName.set(key, s.bestLap);
    }
    const entries = [...bestByName.values()]
      .sort((a, b) => a.seconds - b.seconds)
      .slice(0, 20)
      .map((s) => {
        const lap = lapByName.get(String(s.name || "pilot").toLowerCase());
        return { name: s.name, seconds: s.seconds, ts: s.ts, ...(lap != null ? { bestLap: lap } : {}) };
      });
    ops.push({ opId, opName: list[list.length - 1].opName || opId, entries, runs: list.length });
  }
  return ops;
}

/**
 * Stores one shared ghost run (op id + ghost.js's encodeTrace() string) under
 * a short random id for a "race my run" link. No auth — same trust level as
 * the score/result reporting already accepted over the WS connection — but
 * capped in size and count so a bad actor can't grow the data file unbounded.
 */
export function saveGhostShare(op, data, meta = {}) {
  if (typeof op !== "string" || !op || typeof data !== "string" || !data) return null;
  if (data.length > MAX_GHOST_BYTES) return null;
  const id = randomBytes(6).toString("base64url");
  ghosts.push({ id, op, data, meta: meta && typeof meta === "object" ? meta : {}, ts: Date.now() });
  if (ghosts.length > MAX_GHOSTS) ghosts.splice(0, ghosts.length - MAX_GHOSTS);
  writeJson(ghostsFile, ghosts);
  return id;
}

export function getGhostShare(id) {
  return ghosts.find((g) => g.id === id) || null;
}
