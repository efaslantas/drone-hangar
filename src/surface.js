function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

export function createSurfaceState(id, x = 0, z = 0, heading = 0) {
  return {
    id: String(id),
    x,
    z,
    heading,
    speed: 0,
    turnRate: 0,
    battery: 100,
    blockedFor: 0,
    available: true,
  };
}

function integrate(state, command, spec, dt, water) {
  const throttle = state.battery > 0 ? clamp(Number(command?.throttle) || 0, 0, 1) : 0;
  const steer = clamp(Number(command?.steer) || 0, -1, 1);
  const maxSpeed = Math.max(0, Number(spec?.maxSpeed) || 0);
  const acceleration = Math.max(0, Number(spec?.acceleration) || 0);
  const drag = Math.max(0, Number(spec?.drag) || 0);
  const maxTurn = Math.max(0, Number(spec?.turnRate) || 0);

  state.turnRate = steer * maxTurn;
  state.heading += state.turnRate * dt;
  state.speed = clamp(state.speed + (throttle * acceleration - drag * state.speed) * dt, 0, maxSpeed);

  const nextX = state.x + Math.sin(state.heading) * state.speed * dt;
  const nextZ = state.z - Math.cos(state.heading) * state.speed * dt;
  if (!water || water.contains(nextX, nextZ)) {
    state.x = nextX;
    state.z = nextZ;
    state.blockedFor = 0;
  } else {
    state.speed = 0;
    state.blockedFor += dt;
  }

  state.battery = clamp(state.battery - throttle * Math.max(0, Number(spec?.batteryDrain) || 0) * dt, 0, 100);
}

export function stepSurface(state, command, spec, dt, water) {
  let remaining = Math.max(0, Number(dt) || 0);
  while (remaining > 1e-9) {
    const step = Math.min(0.1, remaining);
    integrate(state, command, spec, step, water);
    remaining -= step;
  }
  return state;
}
