import test from "node:test";
import assert from "node:assert/strict";
import { createAdminSessions, parseCookies } from "../server/auth.mjs";

test("admin sessions are opaque, HttpOnly, same-site and expire after inactivity", () => {
  let now = 1_000;
  const sessions = createAdminSessions({ now: () => now, ttlMs: 100 });
  const cookie = sessions.login("admin", "secret", "admin", "secret");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  const token = parseCookies(cookie).dh_admin;
  assert.equal(sessions.authorize(token), true);
  now += 99;
  assert.equal(sessions.authorize(token), true);
  now += 101;
  assert.equal(sessions.authorize(token), false);
});

test("invalid credentials and logout never leave an authorized session", () => {
  const sessions = createAdminSessions({ random: () => "opaque" });
  assert.equal(sessions.login("admin", "wrong", "admin", "secret"), null);
  const token = parseCookies(sessions.login("admin", "secret", "admin", "secret")).dh_admin;
  sessions.logout(token);
  assert.equal(sessions.authorize(token), false);
});
