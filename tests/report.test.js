import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeVisitors } from "../server/store.mjs";

const TR = { city: "Istanbul", country: "TR" };
const DE = { city: "Berlin", country: "DE" };

test("groups the event log per IP with counts, names and first/last seen", () => {
  const r = summarizeVisitors([
    { type: "connect", ip: "1.1.1.1", geo: TR, ts: 100 },
    { type: "join", ip: "1.1.1.1", geo: TR, name: "EFA", ts: 120 },
    { type: "win", ip: "1.1.1.1", geo: TR, name: "EFA", seconds: 42, ts: 300 },
    { type: "connect", ip: "2.2.2.2", geo: DE, ts: 200 },
    { type: "join", ip: "2.2.2.2", geo: DE, name: "pilot", ts: 210 },
    { type: "lost", ip: "2.2.2.2", geo: DE, name: "pilot", ts: 220 },
  ]);

  // Sorted by last seen, newest first.
  assert.deepEqual(r.ips.map((x) => x.ip), ["1.1.1.1", "2.2.2.2"]);
  const [a, b] = r.ips;
  assert.deepEqual({ visits: a.visits, joins: a.joins, wins: a.wins }, { visits: 1, joins: 1, wins: 1 });
  assert.deepEqual({ first: a.first, last: a.last }, { first: 100, last: 300 });
  assert.deepEqual(a.names, ["EFA"]);
  assert.deepEqual({ visits: b.visits, joins: b.joins, wins: b.wins }, { visits: 1, joins: 1, wins: 0 });
  assert.deepEqual(r.totals, { ips: 2, pilots: 2, visits: 2, joins: 2, wins: 1, since: 100 });
});

test("a pilot's names are de-duplicated and sorted per IP", () => {
  const r = summarizeVisitors([
    { type: "join", ip: "1.1.1.1", name: "zeta", ts: 1 },
    { type: "join", ip: "1.1.1.1", name: "alfa", ts: 2 },
    { type: "join", ip: "1.1.1.1", name: "zeta", ts: 3 },
  ]);
  assert.deepEqual(r.ips[0].names, ["alfa", "zeta"]);
});

test("the same pilot name from two IPs counts once in the pilot total", () => {
  const r = summarizeVisitors([
    { type: "join", ip: "1.1.1.1", name: "EFA", ts: 1 },
    { type: "join", ip: "2.2.2.2", name: "efa", ts: 2 },
  ]);
  assert.equal(r.totals.pilots, 1);
  assert.equal(r.totals.ips, 2);
});

test("a later event without geo does not blank out a known location", () => {
  const r = summarizeVisitors([
    { type: "connect", ip: "1.1.1.1", geo: TR, ts: 1 },
    { type: "leave", ip: "1.1.1.1", geo: null, name: "EFA", ts: 2 },
  ]);
  assert.deepEqual(r.ips[0].geo, TR);
});

test("events without an IP are skipped", () => {
  const r = summarizeVisitors([
    { type: "connect", ts: 1 },
    { type: "connect", ip: "", ts: 2 },
    { type: "connect", ip: "1.1.1.1", ts: 3 },
  ]);
  assert.equal(r.totals.ips, 1);
});

test("countries roll up unique IPs and visits, unknown geo as '?'", () => {
  const r = summarizeVisitors([
    { type: "connect", ip: "1.1.1.1", geo: TR, ts: 1 },
    { type: "connect", ip: "1.1.1.1", geo: TR, ts: 2 },
    { type: "connect", ip: "3.3.3.3", geo: TR, ts: 3 },
    { type: "connect", ip: "2.2.2.2", geo: DE, ts: 4 },
    { type: "connect", ip: "10.0.0.5", geo: null, ts: 5 },
  ]);
  assert.deepEqual(r.countries, [
    { country: "TR", ips: 2, visits: 3 },
    { country: "DE", ips: 1, visits: 1 },
    { country: "?", ips: 1, visits: 1 },
  ]);
});

test("an empty log reports zeros, not NaN or Infinity", () => {
  const r = summarizeVisitors([]);
  assert.deepEqual(r.ips, []);
  assert.deepEqual(r.countries, []);
  assert.deepEqual(r.totals, { ips: 0, pilots: 0, visits: 0, joins: 0, wins: 0, since: 0 });
});
