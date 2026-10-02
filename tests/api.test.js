import { EventEmitter } from "node:events";
import test from "node:test";
import assert from "node:assert/strict";
import { handleApi } from "../server/api.mjs";

function request({ method = "GET", url, headers = {}, body } = {}) {
  const req = Object.assign(new EventEmitter(), {
    method,
    url,
    headers,
    socket: { remoteAddress: "127.0.0.1" },
    destroy() {},
  });
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const res = {
    writeHead(status, responseHeaders = {}) { this.status = status; this.headers = responseHeaders; },
    end(raw = "") { resolve({ status: this.status, headers: this.headers || {}, body: raw ? JSON.parse(raw) : null }); },
  };
  assert.equal(handleApi(req, res, { getOnline: () => [] }), true);
  if (body != null) req.emit("data", Buffer.from(JSON.stringify(body)));
  req.emit("end");
  return done;
}

test("health identifies the running release and legacy query keys never authorize admin", async () => {
  const health = await request({ url: "/api/health" });
  assert.deepEqual(health.body, { ok: true, version: "dev" });

  const rejected = await request({ url: "/api/admin/state?key=test-key" });
  assert.equal(rejected.status, 401);
});

test("admin state requires a short-lived HttpOnly login session and logout revokes it", async () => {
  const login = await request({
    method: "POST",
    url: "/api/admin/login",
    body: { user: "admin", key: "test-key" },
  });
  assert.equal(login.status, 200);
  assert.match(login.headers["set-cookie"], /HttpOnly/);
  const cookie = login.headers["set-cookie"].split(";", 1)[0];

  const state = await request({ url: "/api/admin/state", headers: { cookie } });
  assert.equal(state.status, 200);
  assert.deepEqual(Object.keys(state.body).sort(), ["events", "online"]);

  const logout = await request({ method: "POST", url: "/api/admin/logout", headers: { cookie } });
  assert.equal(logout.status, 200);
  assert.match(logout.headers["set-cookie"], /Max-Age=0/);

  const revoked = await request({ url: "/api/admin/state", headers: { cookie } });
  assert.equal(revoked.status, 401);
});
