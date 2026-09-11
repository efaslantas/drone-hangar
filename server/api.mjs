import { ADMIN_KEY, ADMIN_USER, getEvents, getLeaderboard, getVisitorReport, saveGhostShare, getGhostShare } from "./store.mjs";

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
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

  if (p === "/api/leaderboard" && req.method === "GET") {
    sendJson(res, 200, { ops: getLeaderboard() });
    return true;
  }

  if (p === "/api/admin/state" && req.method === "GET") {
    if (url.searchParams.get("user") !== ADMIN_USER || url.searchParams.get("key") !== ADMIN_KEY) {
      sendJson(res, 401, { error: "yetkisiz" });
      return true;
    }
    sendJson(res, 200, {
      online: wss?.getOnline ? wss.getOnline() : [],
      events: getEvents(300),
      report: getVisitorReport(),
    });
    return true;
  }

  // "Race my run" links: POST the flight once to get a short id, GET it back
  // to fetch the trace for playback. Same client-trust level as WS results.
  if (p === "/api/ghost" && req.method === "POST") {
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
