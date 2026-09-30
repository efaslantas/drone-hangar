import { randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE = "dh_admin";

function same(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function parseCookies(header = "") {
  return Object.fromEntries(String(header).split(";").map((part) => part.trim().split(/=(.*)/s, 2)).filter(([key]) => key));
}

export function createAdminSessions({ now = () => Date.now(), ttlMs = 8 * 60 * 60 * 1000, random = () => randomBytes(32).toString("base64url") } = {}) {
  const sessions = new Map();
  const cookie = (token, maxAge = Math.floor(ttlMs / 1000)) => `${COOKIE}=${token}; Path=/api/admin; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
  return {
    login(user, key, expectedUser, expectedKey) {
      if (!same(user, expectedUser) || !same(key, expectedKey)) return null;
      const token = random();
      sessions.set(token, now() + ttlMs);
      return cookie(token);
    },
    authorize(token) {
      const expires = sessions.get(token);
      if (!expires || expires <= now()) {
        sessions.delete(token);
        return false;
      }
      sessions.set(token, now() + ttlMs);
      return true;
    },
    logout(token) {
      sessions.delete(token);
      return cookie("", 0);
    },
  };
}

export { COOKIE };
