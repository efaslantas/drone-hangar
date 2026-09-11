// Start-line countdown for timed ops. Pure so it is unit-testable; main.js
// holds physics and the run clock while `holding` is true.
export function createCountdown(seconds = 3) {
  return { left: Math.max(0.5, seconds), shown: -1, done: false };
}

/** Returns { holding, show, beep, go }. `beep` is 3/2/1 once each, 0 on GO. */
export function tickCountdown(c, dt) {
  if (!c || c.done) return { holding: false, show: null, beep: null, go: false };
  c.left -= dt;
  if (c.left <= 0) {
    c.done = true;
    return { holding: false, show: "GO", beep: 0, go: true };
  }
  const n = Math.ceil(c.left);
  const beep = n !== c.shown ? n : null;
  c.shown = n;
  return { holding: true, show: String(n), beep, go: false };
}
