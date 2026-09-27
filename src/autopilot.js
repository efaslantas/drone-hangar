import { yawErrTo } from "./physics.js";

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function wrapPi(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export function surfaceCommand(state, target, spec = {}) {
  const dx = Number(target?.x) - Number(state?.x);
  const dz = Number(target?.z) - Number(state?.z);
  const distance = Math.hypot(dx, dz);
  const desired = Math.atan2(dx, -dz);
  const error = wrapPi(desired - Number(state?.heading || 0));
  const steer = clamp(error / (Math.PI / 3), -1, 1);
  const maxSpeed = Math.max(1, Number(spec.maxSpeed) || 1);
  const desiredSpeed = Math.min(maxSpeed, distance * 0.45);
  const speedError = desiredSpeed - Math.max(0, Number(state?.speed) || 0);
  const alignment = clamp(1 - Math.abs(error) / Math.PI, 0.15, 1);
  const throttle = distance < 0.75 ? 0 : clamp(speedError / Math.max(1, Number(spec.acceleration) || 1), 0, 1) * alignment;
  return { throttle, steer };
}

export function airCommand(state, target) {
  const dx = Number(target?.x) - Number(state?.x);
  const dz = Number(target?.z) - Number(state?.z);
  const horizontal = Math.hypot(dx, dz);
  const altitudeError = Number(target?.y ?? state?.y) - Number(state?.y);
  return {
    lift: clamp(altitudeError * 0.18, -0.45, 0.45),
    r2: 0,
    yaw: clamp(yawErrTo(state, target.x, target.z) * 1.4, -1, 1),
    pitch: horizontal < 1 ? 0 : clamp(horizontal * 0.025, 0, 0.5),
    roll: 0,
    angleMode: true,
  };
}

export function routeProgress(state, target, previous, dt, stuckLimit = 5) {
  const distance = Math.hypot(Number(state?.x) - Number(target?.x), Number(state?.z) - Number(target?.z));
  const priorDistance = typeof previous === "number" ? previous : previous?.distance;
  const priorStuck = typeof previous === "object" && previous ? Number(previous.stuckFor) || 0 : 0;
  const improved = !Number.isFinite(priorDistance) || distance < priorDistance - 0.25;
  const stuckFor = improved ? 0 : priorStuck + Math.max(0, Number(dt) || 0);
  return {
    distance,
    previousDistance: distance,
    stuckFor,
    stuck: stuckFor >= stuckLimit,
  };
}
