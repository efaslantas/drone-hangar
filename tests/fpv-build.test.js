import test from "node:test";
import assert from "node:assert/strict";
import { applyFpvBuild, buildFor, buildMetrics, buildSummary, normalizeBuild, normalizeBuilds, setBuildFor } from "../src/fpv-build.js";
import { droneById } from "../src/catalog.js";

test("invalid workshop selections fall back to a complete safe build", () => {
  assert.deepEqual(normalizeBuild({ frame: "nope" }), {
    frame: "race", motors: "1750", battery: "4s1500", props: "bi",
  });
  assert.deepEqual(normalizeBuild(null), {
    frame: "race", motors: "1750", battery: "4s1500", props: "bi",
  });
});

test("FPV workshop parts change the racer flight profile", () => {
  const racer = droneById("racer");
  const race = applyFpvBuild(racer, { frame: "race", motors: "2450", battery: "6s1100", props: "tri" });
  const efficient = applyFpvBuild(racer, { frame: "freestyle", motors: "1900", battery: "4s1500", props: "bi" });
  assert.ok(race.maxThrustG > efficient.maxThrustG);
  assert.ok(race.endurance < efficient.endurance);
  assert.ok(race.maxRate > efficient.maxRate);
  assert.match(buildSummary(race.build), /2450 KV/);
});

test("workshop never changes non-FPV airframes", () => {
  const whoop = droneById("whoop");
  assert.equal(applyFpvBuild(whoop, { motors: "2450" }), whoop);
});

test("each FPV airframe keeps an independent persisted build", () => {
  const builds = setBuildFor({}, "racer", { motors: "2450" });
  const next = setBuildFor(builds, "seven", { motors: "1750", props: "bi" });
  assert.equal(buildFor(next, "racer").motors, "2450");
  assert.equal(buildFor(next, "seven").motors, "1750");
  assert.equal(buildFor(next, "seven").props, "bi");
  assert.equal(buildMetrics(droneById("racer"), buildFor(next, "racer")).thrust > 0, true);
});

test("legacy single-build storage becomes a build for every FPV airframe", () => {
  const builds = normalizeBuilds({ frame: "freestyle", motors: "1900" }, ["racer", "seven"]);
  assert.equal(builds.racer.frame, "freestyle");
  assert.equal(builds.seven.motors, "1900");
});
