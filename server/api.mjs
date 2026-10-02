import { ADMIN_KEY, ADMIN_USER, getEvents, getLeaderboard, logEvent, saveGhostShare, getGhostShare } from "./store.mjs";
import { createAdminSessions, parseCookies } from "./auth.mjs";
import { createRateLimiter } from "./rate-limit.mjs";

const adminSessions = createAdminSessions();
const rateLimit = createRateLimiter();

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(body));
}

const MAX_BODY_BYTES = 260_000; // a little over store.mjs's MAX_GHOST_BYTES, for the JSON wrapper

function readBody(req, cb) {
  let size = 0;
  const chunks = [];
  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", () => cb(size > MAX_BODY_BYTES ? null : Buffer.concat(chunks).toString("utf8")));
  req.on("error", () => cb(null));
}

/**
 * Handles /api/* routes shared by the vite dev server and the production
 * static server. Returns true if the request was handled.
 */
export function handleApi(req, res, wss) {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;
  const limited = (scope, max, windowMs) => {
    // The public API has a process-wide burst cap. It deliberately does not
    // identify, retain, or log client network addresses.
    if (rateLimit.allow(scope, "public", max, windowMs)) return false;
    logEvent({ type: "rate-limit", scope });
    sendJson(res, 429, { error: "cok fazla istek" });
    return true;
  };

  if (p === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true, version: process.env.RELEASE_SHA || "dev" });
    return true;
  }

  if (p === "/api/admin/login" && req.method === "POST") {
    readBody(req, (raw) => {
      try {
        const body = JSON.parse(raw || "null");
        const cookie = adminSessions.login(body?.user, body?.key, ADMIN_USER, ADMIN_KEY);
        if (!cookie) return sendJson(res, 401, { error: "yetkisiz" });
        sendJson(res, 200, { ok: true }, { "set-cookie": cookie });
      } catch { sendJson(res, 400, { error: "gecersiz istek" }); }
    });
    return true;
  }

  if (p === "/api/admin/logout" && req.method === "POST") {
    const cookie = adminSessions.logout(parseCookies(req.headers.cookie).dh_admin);
    sendJson(res, 200, { ok: true }, { "set-cookie": cookie });
    return true;
  }

  if (p === "/api/leaderboard" && req.method === "GET") {
    if (limited("leaderboard", 120, 60_000)) return true;
    sendJson(res, 200, { ops: getLeaderboard() });
    return true;
  }

  if (p === "/api/admin/state" && req.method === "GET") {
    if (!adminSessions.authorize(parseCookies(req.headers.cookie).dh_admin)) {
      sendJson(res, 401, { error: "yetkisiz" });
      return true;
    }
    sendJson(res, 200, {
      online: wss?.getOnline ? wss.getOnline() : [],
      events: getEvents(300),
    });
    return true;
  }

  // "Race my run" links: POST the flight once to get a short id, GET it back
  // to fetch the trace for playback. Same client-trust level as WS results.
  if (p === "/api/ghost" && req.method === "POST") {
    if (limited("ghost-write", 10, 60_000)) return true;
    readBody(req, (raw) => {
      if (raw == null) {
        sendJson(res, 400, { error: "istek cok buyuk" });
        return;
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        sendJson(res, 400, { error: "gecersiz json" });
        return;
      }
      const id = saveGhostShare(body?.op, body?.data, body?.meta);
      if (!id) {
        sendJson(res, 400, { error: "gecersiz veri" });
        return;
      }
      sendJson(res, 200, { id });
    });
    return true;
  }

  if (p.startsWith("/api/ghost/") && req.method === "GET") {
    if (limited("ghost-read", 60, 60_000)) return true;
    const g = getGhostShare(p.slice("/api/ghost/".length));
    if (!g) {
      sendJson(res, 404, { error: "bulunamadi" });
      return true;
    }
    sendJson(res, 200, { op: g.op, data: g.data, meta: g.meta });
    return true;
  }

  return false;
}
