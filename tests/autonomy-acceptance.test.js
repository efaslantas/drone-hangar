import { test } from "node:test";
import assert from "node:assert/strict";
import { airCommand, surfaceCommand } from "../src/autopilot.js";
import { createAutonomyRun, returnToAutonomy, takeControl, tickAutonomy } from "../src/autonomy.js";
import { droneById } from "../src/catalog.js";
import { AUTONOMY_COAST_RESPONSE } from "../src/missions.js";
import { createState, step } from "../src/physics.js";
import { createSurfaceState, stepSurface } from "../src/surface.js";

const SEA_SPEC = { maxSpeed: 8, acceleration: 3.6, drag: 0.62, turnRate: 1.05, batteryDrain: 0.018 };
const WATER = { contains: (_x, z) => z >= -46 && z <= -40 };

test("coastal UAV-USV operation survives manual takeover and completes end to end", () => {
  const op = AUTONOMY_COAST_RESPONSE;
  const airSpec = droneById(op.drone);
  const air = createState(op.spawn.x, op.spawn.y, op.spawn.z);
  air.armed = true;
  const sea = op.seaVehicles.map((cfg) => {
    const vehicle = createSurfaceState(cfg.id, cfg.x, cfg.z, cfg.heading);
    vehicle.battery = cfg.battery;
    return vehicle;
  });
  const run = createAutonomyRun(op, 0);
  const dt = 1 / 60;
  let now = 0;
  let manualStartedAt = null;
  let manualFinishedAt = null;

  for (let frame = 0; frame < 60 * 180 && run.phase !== "COMPLETE"; frame++) {
    now += dt;
    const airTarget = run.phase === "AIR_SEARCH" || run.phase === "READY"
      ? { ...op.incidentCandidates[0], y: op.spawn.y }
      : { ...run.target, y: op.spawn.y };
    step(air, airCommand(air, airTarget, airSpec), airSpec, dt);

    for (const vehicle of sea) {
      const dispatched = vehicle.id === run.selectedSeaId && ["SEA_DISPATCH", "JOINT_VERIFY"].includes(run.phase);
      const command = dispatched ? surfaceCommand(vehicle, run.target, SEA_SPEC) : { throttle: 0, steer: 0 };
      stepSurface(vehicle, command, SEA_SPEC, dt, WATER);
    }

    tickAutonomy(run, { now, air, sea });

    if (run.phase === "SEA_DISPATCH" && manualStartedAt == null) {
      takeControl(run, run.selectedSeaId);
      manualStartedAt = run.elapsed;
    } else if (run.controlledByVehicle && run.elapsed - manualStartedAt >= 1) {
      manualFinishedAt = run.elapsed;
      returnToAutonomy(run, run.controlledByVehicle);
    }
  }

  assert.ok(manualStartedAt != null, "an İDA should be dispatched");
  assert.ok(manualFinishedAt > manualStartedAt, "the mission clock should continue during manual control");
  assert.equal(run.controlledByVehicle, null);
  assert.equal(run.phase, "COMPLETE");
  assert.equal(run.reason, "görev tamamlandı");
  assert.ok(run.completedAt < 180, `completion=${run.completedAt}`);
});
