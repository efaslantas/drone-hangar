import { createState, step, rotateVec, yawFromQ } from "./physics.js";

export const SHOT_SPEED = 110;
export const SHOT_LIFE = 1.1;
export const HIT_R = 1.35;
export const PLAYER_HP = 6;
export const BOT_HP = 2;

// Rounds leave along the camera/gun pod axis, not the frame's nose. The pod
// carries the pilot's chosen tilt and the reticle sits on that same axis, so
// firing along body-forward (0,0,-1) put every round `tilt` off the aim point.
// tilt is camTiltRad(): negative tilts the pod down.
export function aimDir(qw, qx, qy, qz, tilt) {
  return rotateVec(qw, qx, qy, qz, 0, Math.sin(tilt), -Math.cos(tilt));
}

export function createShot(x, y, z, dx, dy, dz, owner, speed = SHOT_SPEED) {
  const n = Math.hypot(dx, dy, dz) || 1;
  return {
    x,
    y,
    z,
    vx: (dx / n) * speed,
    vy: (dy / n) * speed,
    vz: (dz / n) * speed,
    life: SHOT_LIFE,
    owner,
    hit: false,
  };
}

export function stepShots(shots, dt) {
  for (const s of shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.z += s.vz * dt;
    s.life -= dt;
  }
  return shots.filter((s) => s.life > 0 && !s.hit && s.y > -2);
}

export function applyHits(shots, targets, radius = HIT_R) {
  const hits = [];
  for (const s of shots) {
    if (s.hit) continue;
    for (const t of targets) {
      if (!t.alive || t.id === s.owner) continue;
      if (Math.hypot(s.x - t.x, s.y - t.y, s.z - t.z) > radius) continue;
      s.hit = true;
      t.hp -= 1;
      if (t.hp <= 0) t.alive = false;
      hits.push({ owner: s.owner, target: t.id });
      break;
    }
  }
  return hits;
}

export function makeBot(id, spec, x, y, z, phase = 0) {
  const st = createState(x, y, z);
  st.armed = true;
  return {
    id,
    spec,
    state: st,
    hp: BOT_HP,
    alive: true,
    phase,
    cooldown: 1 + phase,
    respawn: 0,
  };
}

export function botInput(bot, player, t) {
  const s = bot.state;
  const ox = Math.cos(t * 0.35 + bot.phase) * 16;
  const oz = Math.sin(t * 0.35 + bot.phase) * 16;
  const tx = (player?.x || 0) + ox;
  const tz = (player?.z || -30) + oz;
  const ty = 7 + Math.sin(t * 0.8 + bot.phase) * 3.5;
  const dx = tx - s.x;
  const dz = tz - s.z;
  const dist = Math.hypot(dx, dz);
  const yaw = yawFromQ(s.qw, s.qx, s.qy, s.qz);
  let yawErr = Math.atan2(-dx, -dz) - yaw;
  while (yawErr > Math.PI) yawErr -= Math.PI * 2;
  while (yawErr < -Math.PI) yawErr += Math.PI * 2;
  return {
    lift: Math.max(-0.45, Math.min(0.55, (ty - s.y) * 0.18)),
    yaw: Math.max(-1, Math.min(1, yawErr * 1.1)),
    pitch: Math.max(0, Math.min(0.7, dist * 0.035)),
    roll: Math.max(-0.45, Math.min(0.45, yawErr * 0.35)),
    r2: 0,
    angleMode: true,
  };
}

export function stepBot(bot, player, t, dt, play) {
  if (!bot.alive) {
    if (bot.noRespawn) return null;
    bot.respawn -= dt;
    if (bot.respawn <= 0) {
      bot.alive = true;
      bot.hp = BOT_HP;
      let rx = player.x + 12;
      let rz = player.z - 20;
      const b = play?.bounds;
      if (b) {
        rx = Math.max(b.minx + 4, Math.min(b.maxx - 4, rx));
        rz = Math.max(b.minz + 4, Math.min(b.maxz - 4, rz));
      }
      bot.state = createState(rx, 8, rz);
      bot.state.armed = true;
      bot.cooldown = 1;
    }
    return null;
  }
  step(bot.state, botInput(bot, player, t), bot.spec, dt, play);
  if (bot.state.crashed) {
    bot.alive = false;
    bot.respawn = 4;
    return null;
  }
  bot.cooldown -= dt;
  if (!player || bot.cooldown > 0) return null;
  const [fx, fy, fz] = rotateVec(bot.state.qw, bot.state.qx, bot.state.qy, bot.state.qz, 0, 0, -1);
  const dx = player.x - bot.state.x;
  const dy = player.y - bot.state.y;
  const dz = player.z - bot.state.z;
  const dist = Math.hypot(dx, dy, dz);
  const n = dist || 1;
  const aim = (fx * dx + fy * dy + fz * dz) / n;
  if (dist < 42 && aim > 0.72) {
    bot.cooldown = 0.85;
    return createShot(bot.state.x + fx * 0.6, bot.state.y + fy * 0.6, bot.state.z + fz * 0.6, dx, dy, dz, bot.id, 70);
  }
  return null;
}

export function canFire(cooldown) {
  return cooldown <= 0;
}
