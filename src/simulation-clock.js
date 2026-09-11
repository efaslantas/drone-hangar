export function createSimulationClock(hz = 120, maxFrame = 0.1, maxSteps = 16) {
  return {
    step: 1 / Math.max(1, hz),
    maxFrame: Math.max(0, maxFrame),
    maxSteps: Math.max(1, maxSteps | 0),
    accumulator: 0,
    dropped: 0,
  };
}

export function resetSimulationClock(clock) {
  clock.accumulator = 0;
  clock.dropped = 0;
}

export function advanceSimulationClock(clock, frameDt, simulate) {
  const accepted = Math.min(Math.max(Number(frameDt) || 0, 0), clock.maxFrame);
  clock.accumulator += accepted;
  let steps = 0;
  while (clock.accumulator + 1e-12 >= clock.step && steps < clock.maxSteps) {
    simulate(clock.step);
    clock.accumulator -= clock.step;
    steps += 1;
  }
  if (clock.accumulator >= clock.step) {
    clock.dropped += clock.accumulator;
    clock.accumulator %= clock.step;
  }
  return { steps, alpha: clock.accumulator / clock.step, dropped: clock.dropped };
}
