import { step } from "./physics.js";
import { createSurfaceState, stepSurface } from "./surface.js";
import { createState } from "./physics.js";
import { routeCommand } from "./autopilot.js";
import { advanceRoute, createRoute } from "./route-editor.js";
import {
  VEHICLE_MODES,
  createConsoleSession,
  emergencyStop,
  handleControlLoss,
  reenableConsole,
  setVehicleMode,
} from "./operations-console.js";
import { consoleInput } from "./input.js";

const AIR_HOLD = Object.freeze({ lift: 0, r2: 0, yaw: 0, pitch: 0, roll: 0, angleMode: true });
const SEA_HOLD = Object.freeze({ throttle: 0, steer: 0 });

export function createOperationsRuntime({ air, sea, water, routes = {} }) {
  const vehicles = [air, ...(sea || [])];
  if (!air || air.id !== "iha-1" || air.kind !== "air" || vehicles.length !== 3
    || vehicles.filter((vehicle) => vehicle?.kind === "sea").length !== 2) {
    throw new TypeError("Operasyon filosu bir İHA ve iki İDA içermeli");
  }
  return {
    session: createConsoleSession(vehicles.map(({ id, kind }) => ({ id, kind })), "iha-1"),
    vehicles,
    water,
    routes: Object.fromEntries(vehicles.map((vehicle) => [vehicle.id, routes[vehicle.id] || createRoute(vehicle.id)])),
    routeError: "",
  };
}

export function handleOperationsControlLoss(runtime) {
  runtime.session = handleControlLoss(runtime.session);
  return runtime;
}

export function setOperationsEmergency(runtime, stopped) {
  runtime.session = stopped ? emergencyStop(runtime.session) : reenableConsole(runtime.session);
  if (stopped) {
    for (const vehicle of runtime.vehicles) {
      vehicle.state.vx = vehicle.state.vy = vehicle.state.vz = 0;
      vehicle.state.speed = 0;
    }
  }
  return runtime;
}

function commandFor(runtime, vehicle, rawInput) {
  const mode = runtime.session.vehicles.find((item) => item.id === vehicle.id)?.mode;
  if (mode === VEHICLE_MODES.MANUAL) return consoleInput(rawInput, vehicle.kind).command;
  if (mode === VEHICLE_MODES.ROUTE) return routeCommand(vehicle, runtime.routes[vehicle.id], vehicle.spec);
  return vehicle.kind === "sea" ? SEA_HOLD : AIR_HOLD;
}

export function stepOperationsRuntime(runtime, rawInput, dt, play = {}) {
  const selected = runtime.vehicles.find((vehicle) => vehicle.id === runtime.session.selectedId);
  const routed = selected ? consoleInput(rawInput, selected.kind) : { manualIntent: false };
  const selectedMode = runtime.session.vehicles.find((vehicle) => vehicle.id === runtime.session.selectedId)?.mode;
  if (!runtime.session.emergency && selectedMode === VEHICLE_MODES.ROUTE && routed.manualIntent) {
    runtime.session = setVehicleMode(runtime.session, runtime.session.selectedId, VEHICLE_MODES.MANUAL);
  }

  for (const vehicle of runtime.vehicles) {
    const command = commandFor(runtime, vehicle, rawInput);
    if (vehicle.kind === "air") step(vehicle.state, command, vehicle.spec, dt, play);
    else stepSurface(vehicle.state, command, vehicle.spec, dt, runtime.water);
    const mode = runtime.session.vehicles.find((item) => item.id === vehicle.id)?.mode;
    if (mode === VEHICLE_MODES.ROUTE) {
      const next = advanceRoute(runtime.routes[vehicle.id], vehicle.state, vehicle.kind === "air" ? 2.5 : 1.5);
      runtime.routes[vehicle.id] = next;
      if (next.mode === VEHICLE_MODES.HOLD) runtime.session = setVehicleMode(runtime.session, vehicle.id, VEHICLE_MODES.HOLD);
    }
  }
  return runtime;
}

export function rebuildOperationsRuntime(runtime, scenario) {
  const templates = new Map(runtime.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const vehicles = scenario.vehicles.map((saved) => {
    const template = templates.get(saved.id);
    const state = saved.kind === "air"
      ? createState(saved.start.x, saved.start.y, saved.start.z)
      : createSurfaceState(saved.id, saved.start.x, saved.start.z, saved.start.heading);
    if (saved.kind === "air") state.armed = true;
    return { ...template, id: saved.id, kind: saved.kind, state };
  });
  return createOperationsRuntime({ air: vehicles.find((vehicle) => vehicle.kind === "air"), sea: vehicles.filter((vehicle) => vehicle.kind === "sea"), water: runtime.water, routes: scenario.routes });
}

export function projectOperationsPoint(point, bounds) {
  const width = bounds.maxx - bounds.minx;
  const depth = bounds.maxz - bounds.minz;
  return {
    x: (point.x - bounds.minx) / width,
    y: (point.z - bounds.minz) / depth,
  };
}
