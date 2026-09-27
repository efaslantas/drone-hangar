import { step, yawFromQ } from "./physics.js";
import { createSurfaceState, stepSurface } from "./surface.js";
import { createState } from "./physics.js";
import { routeCommand, routeProgress } from "./autopilot.js";
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

function clamp(value, low = -1, high = 1) {
  return Math.max(low, Math.min(high, value));
}

function wrapPi(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function airHoldCommand(state, target) {
  const yaw = yawFromQ(state.qw, state.qx, state.qy, state.qz);
  const ax = clamp((target.x - state.x) * 0.08 - state.vx * 0.16, -0.5, 0.5);
  const az = clamp((target.z - state.z) * 0.08 - state.vz * 0.16, -0.5, 0.5);
  return {
    lift: clamp((target.y - state.y) * 0.24 - state.vy * 0.12, -0.4, 0.55),
    r2: 0,
    yaw: clamp(-wrapPi(target.heading - yaw) * 1.2),
    pitch: clamp(-ax * Math.sin(yaw) - az * Math.cos(yaw), -0.5, 0.5),
    roll: clamp(ax * Math.cos(yaw) - az * Math.sin(yaw), -0.5, 0.5),
    angleMode: true,
  };
}

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
    routeProgress: {},
    holdTargets: {},
    routeError: "",
    starts: Object.fromEntries(vehicles.map((vehicle) => [vehicle.id, vehicle.kind === "air"
      ? { x: vehicle.state.x, y: vehicle.state.y, z: vehicle.state.z, heading: yawFromQ(vehicle.state.qw, vehicle.state.qx, vehicle.state.qy, vehicle.state.qz) }
      : { x: vehicle.state.x, z: vehicle.state.z, heading: vehicle.state.heading }])),
  };
}

export function resetOperationsVehicle(runtime, vehicleId = runtime.session.selectedId) {
  if (runtime.session.emergency) return runtime;
  const vehicle = runtime.vehicles.find((item) => item.id === vehicleId);
  const start = runtime.starts[vehicleId];
  if (!vehicle || !start) return runtime;
  if (vehicle.kind === "air") {
    const fresh = createState(start.x, start.y, start.z);
    fresh.armed = false;
    Object.assign(vehicle.state, fresh);
  } else {
    Object.assign(vehicle.state, createSurfaceState(vehicle.id, start.x, start.z, start.heading));
    vehicle.enabled = true;
  }
  runtime.routes[vehicleId] = { ...runtime.routes[vehicleId], currentIndex: 0, mode: "HOLD" };
  runtime.session = setVehicleMode(runtime.session, vehicleId, VEHICLE_MODES.MANUAL);
  delete runtime.routeProgress[vehicleId];
  return runtime;
}

export function toggleOperationsPower(runtime) {
  if (runtime.session.emergency) return runtime;
  const vehicle = runtime.vehicles.find((item) => item.id === runtime.session.selectedId);
  if (!vehicle) return runtime;
  if (vehicle.kind === "air") vehicle.state.armed = !vehicle.state.armed;
  else vehicle.enabled = vehicle.enabled === false;
  return runtime;
}

export function toggleOperationsProfile(runtime) {
  if (runtime.session.emergency) return runtime;
  const vehicle = runtime.vehicles.find((item) => item.id === runtime.session.selectedId);
  if (!vehicle || vehicle.kind !== "sea") return runtime;
  vehicle.speedProfile = vehicle.speedProfile === "precision" ? "cruise" : "precision";
  return runtime;
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
  if (vehicle.kind === "sea" && vehicle.enabled === false) return SEA_HOLD;
  const mode = runtime.session.vehicles.find((item) => item.id === vehicle.id)?.mode;
  if (mode === VEHICLE_MODES.MANUAL) {
    const command = consoleInput(rawInput, vehicle.kind).command;
    if (vehicle.kind === "air") command.angleMode = rawInput.angleMode;
    if (vehicle.kind === "sea" && vehicle.speedProfile === "precision") command.throttle *= 0.45;
    return command;
  }
  if (mode === VEHICLE_MODES.ROUTE) return routeCommand(vehicle, runtime.routes[vehicle.id], vehicle.spec);
  if (mode === VEHICLE_MODES.HOLD && vehicle.kind === "air") {
    runtime.holdTargets[vehicle.id] ||= {
      x: vehicle.state.x,
      y: vehicle.state.y,
      z: vehicle.state.z,
      heading: yawFromQ(vehicle.state.qw, vehicle.state.qx, vehicle.state.qy, vehicle.state.qz),
    };
    return airHoldCommand(vehicle.state, runtime.holdTargets[vehicle.id]);
  }
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
    const currentMode = runtime.session.vehicles.find((item) => item.id === vehicle.id)?.mode;
    if (currentMode !== VEHICLE_MODES.HOLD) delete runtime.holdTargets[vehicle.id];
    const command = commandFor(runtime, vehicle, rawInput);
    if (vehicle.kind === "air") step(vehicle.state, command, vehicle.spec, dt, play);
    else stepSurface(vehicle.state, command, vehicle.spec, dt, runtime.water);
    const mode = runtime.session.vehicles.find((item) => item.id === vehicle.id)?.mode;
    if (mode === VEHICLE_MODES.ROUTE) {
      const route = runtime.routes[vehicle.id];
      const targetIndex = route?.currentIndex || 0;
      const target = route?.points?.[targetIndex];
      if (target) {
        const prior = runtime.routeProgress[vehicle.id];
        const progress = routeProgress(vehicle.state, target, prior?.targetIndex === targetIndex ? prior : undefined, dt);
        runtime.routeProgress[vehicle.id] = { ...progress, targetIndex };
        if (progress.stuck) {
          runtime.session = setVehicleMode(runtime.session, vehicle.id, VEHICLE_MODES.HOLD);
          runtime.routeError = `${vehicle.id.toLocaleUpperCase("tr-TR")} rota üzerinde sıkıştı`;
          continue;
        }
      }
      const next = advanceRoute(runtime.routes[vehicle.id], vehicle.state, vehicle.kind === "air" ? 2.5 : 1.5);
      if (next.currentIndex !== targetIndex) delete runtime.routeProgress[vehicle.id];
      runtime.routes[vehicle.id] = next;
      if (next.mode === VEHICLE_MODES.HOLD) {
        delete runtime.routeProgress[vehicle.id];
        runtime.session = setVehicleMode(runtime.session, vehicle.id, VEHICLE_MODES.HOLD);
      }
    } else {
      delete runtime.routeProgress[vehicle.id];
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
    if (saved.kind === "air") {
      state.armed = true;
      state.qw = Math.cos(saved.start.heading / 2);
      state.qy = Math.sin(saved.start.heading / 2);
    }
    return {
      ...template,
      id: saved.id,
      kind: saved.kind,
      state,
      ...(saved.kind === "sea" ? { enabled: true, speedProfile: "cruise" } : {}),
    };
  });
  const routes = Object.fromEntries(Object.entries(scenario.routes).map(([id, route]) => [id, {
    ...route,
    currentIndex: 0,
    mode: "HOLD",
  }]));
  return createOperationsRuntime({ air: vehicles.find((vehicle) => vehicle.kind === "air"), sea: vehicles.filter((vehicle) => vehicle.kind === "sea"), water: runtime.water, routes });
}

export function projectOperationsPoint(point, bounds) {
  const width = bounds.maxx - bounds.minx;
  const depth = bounds.maxz - bounds.minz;
  return {
    x: (point.x - bounds.minx) / width,
    y: (point.z - bounds.minz) / depth,
  };
}
