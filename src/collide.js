export function aabbFromBox(x, y, z, w, h, d, yaw = 0) {
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const hx = (w / 2) * c + (d / 2) * s;
  const hz = (w / 2) * s + (d / 2) * c;
  const hy = h / 2;
  return {
    minx: x - hx,
    maxx: x + hx,
    miny: y - hy,
    maxy: y + hy,
    minz: z - hz,
    maxz: z + hz,
  };
}

function crashAt(state, reason) {
  state.crashed = true;
  state.crashReason = reason;
  state.armed = false;
  state.vx = 0;
  state.vy = 0;
  state.vz = 0;
  state.altHold = null;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

const CRASH_V = 7;

function hitNormal(state, nx, ny, nz, pen, reason) {
  state.x += nx * pen;
  state.y += ny * pen;
  state.z += nz * pen;
  const vn = state.vx * nx + state.vy * ny + state.vz * nz;
  if (vn >= 0) return;
  const impact = -vn;
  state.vx -= vn * nx;
  state.vy -= vn * ny;
  state.vz -= vn * nz;
  state.vx *= 0.35;
  state.vy *= 0.35;
  state.vz *= 0.35;
  if (state.armed && impact > CRASH_V) crashAt(state, reason);
}

function hitAabb(state, box, r) {
  const px = clamp(state.x, box.minx, box.maxx);
  const py = clamp(state.y, box.miny, box.maxy);
  const pz = clamp(state.z, box.minz, box.maxz);
  let dx = state.x - px;
  let dy = state.y - py;
  let dz = state.z - pz;
  const d2 = dx * dx + dy * dy + dz * dz;
  if (d2 > r * r && d2 > 1e-10) return;

  let nx;
  let ny;
  let nz;
  let pen;
  if (d2 < 1e-10) {
    const left = state.x - box.minx;
    const right = box.maxx - state.x;
    const down = state.y - box.miny;
    const up = box.maxy - state.y;
    const back = state.z - box.minz;
    const fwd = box.maxz - state.z;
    const m = Math.min(left, right, down, up, back, fwd);
    nx = 0;
    ny = 0;
    nz = 0;
    if (m === left) {
      nx = -1;
      pen = r + left;
    } else if (m === right) {
      nx = 1;
      pen = r + right;
    } else if (m === down) {
      ny = -1;
      pen = r + down;
    } else if (m === up) {
      ny = 1;
      pen = r + up;
    } else if (m === back) {
      nz = -1;
      pen = r + back;
    } else {
      nz = 1;
      pen = r + fwd;
    }
  } else {
    const d = Math.sqrt(d2);
    nx = dx / d;
    ny = dy / d;
    nz = dz / d;
    pen = r - d;
  }
  hitNormal(state, nx, ny, nz, pen, "çarptı");
}

function hitBounds(state, bounds, r) {
  const { minx, maxx, minz, maxz } = bounds;
  if (state.x < minx + r) hitNormal(state, 1, 0, 0, minx + r - state.x, "saha dışı");
  else if (state.x > maxx - r) hitNormal(state, -1, 0, 0, state.x - (maxx - r), "saha dışı");
  if (state.z < minz + r) hitNormal(state, 0, 0, 1, minz + r - state.z, "saha dışı");
  else if (state.z > maxz - r) hitNormal(state, 0, 0, -1, state.z - (maxz - r), "saha dışı");
}

export function applyWorld(state, spec, play) {
  if (!play || state.crashed) return state;
  const r = Math.max(0.06, spec.size * 0.48);
  if (play.ceil != null && state.y + r > play.ceil) {
    const impact = state.vy;
    state.y = play.ceil - r;
    state.vy = Math.min(0, state.vy);
    if (state.armed && impact > CRASH_V) crashAt(state, "tavan");
  }
  if (play.bounds) hitBounds(state, play.bounds, r);
  if (state.crashed) return state;
  const boxes = play.boxes || [];
  for (let i = 0; i < boxes.length; i++) {
    hitAabb(state, boxes[i], r);
    if (state.crashed) return state;
  }
  return state;
}
