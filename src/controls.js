// DualSense sticks normally rest within roughly 2–5%. An 18% deadzone made
// small corrections disappear; 8% still masks ordinary wear without making
// the centre feel numb.
export const DEAD = 0.08;
export const EXPO = 0.28;
export const R2_ENGAGE = 0.28;
export const KEY_CLIMB = 0.55;
export const KEY_DESCEND = 1;
export const CONTROL_PROFILES = {
  training: { dead: 0.08, expo: 0.38, rate: 0.78, punch: false },
  standard: { dead: 0.08, expo: 0.28, rate: 1, punch: true },
  race: { dead: 0.06, expo: 0.18, rate: 1, punch: true },
};

export function profileFor(name) {
  return CONTROL_PROFILES[name] || CONTROL_PROFILES.training;
}

export function deadzone(v, d = DEAD) {
  if (Math.abs(v) < d) return 0;
  const s = Math.sign(v);
  return s * (Math.abs(v) - d) / (1 - d);
}

export function radialDeadzone(x, y, d = DEAD) {
  const rawMag = Math.hypot(x, y);
  if (rawMag < d || rawMag === 0) return [0, 0];
  const mag = Math.min(1, rawMag);
  const out = (mag - d) / (1 - d);
  return [(x / rawMag) * out, (y / rawMag) * out];
}

export function expo(v, e = EXPO) {
  return (1 - e) * v + e * v * v * v;
}

export function clamp(v, a = -1, b = 1) {
  return Math.max(a, Math.min(b, v));
}

export function calibratedAxis(value, axis = {}) {
  const v = Number(value) || 0;
  const center = Number(axis.center) || 0;
  const lo = Number.isFinite(axis.min) ? axis.min : -1;
  const hi = Number.isFinite(axis.max) ? axis.max : 1;
  const span = v >= center ? hi - center : center - lo;
  if (span < 0.15) return clamp(v - center);
  const out = clamp((v - center) / span);
  return axis.invert ? -out : out;
}

export function rightStickAxes(axes) {
  const a = axes || [];
  if (a.length >= 6 && Math.abs(a[3] || 0) < 0.02 && Math.abs(a[5] || 0) > 0.02) {
    return [a[2] || 0, a[5] || 0];
  }
  return [a[2] || 0, a[3] || 0];
}

export function triggerValue(gp) {
  if (!gp) return 0;
  const b = gp.buttons?.[7];
  const v = typeof b === "object" ? Number(b.value) || 0 : Number(b) || 0;
  if (v > 0.02) return Math.min(1, v);
  if (b && b.pressed) return 1;
  const a4 = gp.axes?.[4];
  if (typeof a4 === "number" && a4 > 0.05) return Math.min(1, a4);
  return 0;
}
