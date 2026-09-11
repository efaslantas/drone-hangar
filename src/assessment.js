const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export function createAssessment() {
  return {
    samples: 0,
    time: 0,
    distance: 0,
    stableTime: 0,
    controlTravel: 0,
    maxSpeed: 0,
    maxRate: 0,
    previous: null,
  };
}

export function sampleAssessment(a, state, input, dt) {
  if (!a || !state || !(dt > 0)) return a;
  const speed = Math.hypot(state.vx || 0, state.vy || 0, state.vz || 0);
  const rate = Math.hypot(state.wx || 0, state.wy || 0, state.wz || 0);
  const controls = [input?.lift || 0, input?.yaw || 0, input?.pitch || 0, input?.roll || 0];
  if (a.previous) {
    a.controlTravel += controls.reduce((sum, v, i) => sum + Math.abs(v - a.previous[i]), 0);
  }
  a.previous = controls;
  a.samples += 1;
  a.time += dt;
  a.distance += speed * dt;
  a.maxSpeed = Math.max(a.maxSpeed, speed);
  a.maxRate = Math.max(a.maxRate, rate);
  if (speed < 4 && Math.abs(state.vy || 0) < 0.8 && rate < 0.7) a.stableTime += dt;
  return a;
}

function completion(run) {
  if (run.won) return 1;
  if (run.op.kind === "school") return run.step / Math.max(1, run.op.steps?.length || 1);
  if (run.op.kind === "race") return run.gatesDone / Math.max(1, (run.op.gates?.length || 1) * (run.op.laps || 1));
  if (run.op.kind === "recon") return (run.marks?.filter((m) => m.done).length || 0) / Math.max(1, run.marks?.length || 1);
  if (run.op.kind === "cargo") return run.delivered / Math.max(1, run.parcels?.length || 1);
  return 0;
}

export function finalizeAssessment(a, run, state) {
  const route = Math.round(clamp(completion(run) * 100));
  const movementPerSample = a?.samples > 1 ? a.controlTravel / (a.samples - 1) : 0;
  const control = Math.round(clamp(100 - movementPerSample * 180));
  const stableRatio = a?.time > 0 ? a.stableTime / a.time : 0;
  const stability = Math.round(clamp(45 + stableRatio * 55 - Math.max(0, (a?.maxRate || 0) - 5) * 3));
  const td = state?.lastTouchdown;
  let landing = run.won && state?.grounded ? 80 : 25;
  if (td) landing = clamp(100 - td.verticalSpeed * 14 - td.horizontalSpeed * 10);
  if (!state?.grounded) landing = Math.min(landing, 35);
  if (state?.crashed) landing = 0;
  landing = Math.round(landing);
  const total = Math.round(route * 0.4 + control * 0.2 + stability * 0.2 + landing * 0.2);
  return {
    total,
    passed: !!run.won && !state?.crashed,
    route,
    control,
    stability,
    landing,
    maxSpeed: Math.round((a?.maxSpeed || 0) * 3.6),
    distance: Math.round(a?.distance || 0),
  };
}
