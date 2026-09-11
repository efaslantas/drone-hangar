import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp, geoFor } from "../server/geo.mjs";

test("clientIp prefers x-forwarded-for over the socket address", () => {
  const req = {
    headers: { "x-forwarded-for": "203.0.113.9, 172.17.0.1" },
    socket: { remoteAddress: "172.17.0.1" },
  };
  assert.equal(clientIp(req), "203.0.113.9");
});

test("clientIp falls back to the socket address, stripping ::ffff: prefix", () => {
  const req = { headers: {}, socket: { remoteAddress: "::ffff:203.0.113.9" } };
  assert.equal(clientIp(req), "203.0.113.9");
});

test("clientIp tolerates a missing request (test doubles, direct calls)", () => {
  assert.equal(clientIp(undefined), "");
});

test("geoFor returns null for private/local ranges instead of guessing", () => {
  for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.20", "172.17.0.1", "::1"]) {
    assert.equal(geoFor(ip), null, ip);
  }
});

test("geoFor returns null for an empty ip", () => {
  assert.equal(geoFor(""), null);
});
