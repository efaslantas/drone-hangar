import { audioBus } from "./sfx.js";

// World sound bed, one layer per map: wind (breathes with the map breeze),
// surf on the coast (fades with distance from the shore), hangar hum and
// fluorescent buzz indoors, a distant traffic rumble, songbirds or gulls, and
// the roller-door motor when a door is moving nearby. All synthesized from the
// shared noise buffer and a few oscillators; nothing is loaded.
const PROFILES = {
  yard: { wind: 0.55, sea: 0, hum: 0, traffic: 0.35, birds: 0.5, gulls: false },
  airfield: { wind: 1.0, sea: 0, hum: 0, traffic: 0.15, birds: 0.3, gulls: false },
  coast: { wind: 0.8, sea: 1.0, hum: 0, traffic: 0, birds: 0.2, gulls: true },
  city: { wind: 0.4, sea: 0, hum: 0, traffic: 0.7, birds: 0.15, gulls: false },
  indoor: { wind: 0, sea: 0, hum: 1, traffic: 0, birds: 0, gulls: false },
  forest: { wind: 0.6, sea: 0, hum: 0, traffic: 0, birds: 1.0, gulls: false },
};

const LEVEL = { wind: 0.05, sea: 0.055, hum: 0.012, buzz: 0.0025, traffic: 0.022, door: 0.05 };

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function ambienceProfile(mapId) {
  return PROFILES[mapId] || PROFILES.yard;
}

/**
 * Pure level model, so the mix is testable: returns target gains for the
 * layers given the map profile and the listener situation.
 *   windMag  |play.wind| (0 calm … ~1.4 strong)
 *   shoreDist metres from the water line (coast), Infinity elsewhere
 *   night    songbirds sleep, wind carries
 *   doorDist metres to the nearest MOVING roller door, Infinity if none
 */
export function ambienceLevels(profile, { windMag = 0, shoreDist = Infinity, night = false, doorDist = Infinity } = {}) {
  const gust = clamp(windMag / 1.4, 0, 1);
  return {
    wind: LEVEL.wind * profile.wind * (0.55 + 0.45 * gust) * (night ? 1.1 : 1),
    sea: LEVEL.sea * profile.sea / (1 + Math.max(0, shoreDist) / 30),
    hum: LEVEL.hum * profile.hum,
    buzz: LEVEL.buzz * profile.hum,
    traffic: LEVEL.traffic * profile.traffic * (night ? 0.6 : 1),
    door: LEVEL.door / (1 + (Math.max(0, doorDist) / 9) ** 2) * (Number.isFinite(doorDist) ? 1 : 0),
    birdRate: night ? 0 : profile.birds,
    gulls: !!profile.gulls && !night,
  };
}

let g = null;
let acc = 0;
let birdTimer = 2;
let gullTimer = 5;

function src(bus) {
  const s = bus.ctx.createBufferSource();
  s.buffer = bus.noise;
  s.loop = true;
  return s;
}

function gain(bus, v = 0.0001) {
  const n = bus.ctx.createGain();
  n.gain.value = v;
  n.connect(bus.master);
  return n;
}

function lfo(bus, hz, depth, target) {
  const o = bus.ctx.createOscillator();
  o.type = "sine";
  o.frequency.value = hz;
  const d = bus.ctx.createGain();
  d.gain.value = depth;
  o.connect(d).connect(target);
  o.start();
  return { o, d };
}

function build(bus, profile) {
  const c = bus.ctx;
  const nodes = [];
  const out = {};
  // wind: band-passed noise whose centre wanders (gusts) and whose level swells
  const windBp = c.createBiquadFilter();
  windBp.type = "bandpass";
  windBp.frequency.value = 320;
  windBp.Q.value = 0.55;
  out.wind = gain(bus);
  const windSrc = src(bus);
  windSrc.connect(windBp).connect(out.wind);
  windSrc.start();
  const windSwell = lfo(bus, 0.05, 0, out.wind.gain);
  nodes.push(windSrc, lfo(bus, 0.13, 140, windBp.frequency).o, windSwell.o);
  out.windDepth = windSwell.d;
  // surf: low rumble that swells slowly
  const seaLp = c.createBiquadFilter();
  seaLp.type = "lowpass";
  seaLp.frequency.value = 380;
  out.sea = gain(bus);
  const seaSrc = src(bus);
  seaSrc.connect(seaLp).connect(out.sea);
  seaSrc.start();
  const swell = lfo(bus, 0.11, 0, out.sea.gain);
  nodes.push(seaSrc, swell.o);
  out.seaSwell = swell.d;
  // hangar hum + fluorescent buzz
  out.hum = gain(bus);
  for (const [f, k] of [[100, 1], [200, 0.45]]) {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const w = c.createGain();
    w.gain.value = k;
    o.connect(w).connect(out.hum);
    o.start();
    nodes.push(o);
  }
  out.buzz = gain(bus);
  const buzz = c.createOscillator();
  buzz.type = "sawtooth";
  buzz.frequency.value = 120;
  const buzzHp = c.createBiquadFilter();
  buzzHp.type = "highpass";
  buzzHp.frequency.value = 2400;
  buzz.connect(buzzHp).connect(out.buzz);
  buzz.start();
  nodes.push(buzz);
  // distant traffic
  const trLp = c.createBiquadFilter();
  trLp.type = "lowpass";
  trLp.frequency.value = 160;
  out.traffic = gain(bus);
  const trSrc = src(bus);
  trSrc.connect(trLp).connect(out.traffic);
  trSrc.start();
  const trafficSwell = lfo(bus, 0.07, 0, out.traffic.gain);
  nodes.push(trSrc, trafficSwell.o);
  out.trafficDepth = trafficSwell.d;
  // roller-door motor: gritty low buzz plus air
  out.door = gain(bus);
  const motor = c.createOscillator();
  motor.type = "sawtooth";
  motor.frequency.value = 55;
  const motorLp = c.createBiquadFilter();
  motorLp.type = "lowpass";
  motorLp.frequency.value = 420;
  motor.connect(motorLp).connect(out.door);
  motor.start();
  const doorAir = src(bus);
  const doorBp = c.createBiquadFilter();
  doorBp.type = "bandpass";
  doorBp.frequency.value = 900;
  const doorAirG = c.createGain();
  doorAirG.gain.value = 0.35;
  doorAir.connect(doorBp).connect(doorAirG).connect(out.door);
  doorAir.start();
  const doorChop = lfo(bus, 11, 0, out.door.gain);
  nodes.push(motor, doorAir, doorChop.o);
  out.doorDepth = doorChop.d;
  return { bus, profile, out, nodes, levels: null };
}

function chirp(bus, gullish) {
  const c = bus.ctx;
  const t = c.currentTime;
  const o = c.createOscillator();
  const e = c.createGain();
  o.type = "sine";
  e.gain.value = 0.0001;
  o.connect(e).connect(bus.master);
  if (gullish) {
    o.frequency.setValueAtTime(1150, t);
    o.frequency.exponentialRampToValueAtTime(720, t + 0.55);
    const vib = lfo(bus, 7, 40, o.frequency);
    e.gain.setTargetAtTime(0.018, t, 0.04);
    e.gain.setTargetAtTime(0.0001, t + 0.45, 0.08);
    o.start(t);
    o.stop(t + 0.8);
    vib.o.stop(t + 0.8);
    return;
  }
  const notes = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < notes; i++) {
    const t0 = t + i * 0.14;
    const f = 2400 + Math.random() * 1400;
    o.frequency.setValueAtTime(f, t0);
    o.frequency.exponentialRampToValueAtTime(f * (0.7 + Math.random() * 0.6), t0 + 0.1);
    e.gain.setTargetAtTime(0.011, t0, 0.01);
    e.gain.setTargetAtTime(0.0001, t0 + 0.08, 0.02);
  }
  o.start(t);
  o.stop(t + notes * 0.14 + 0.2);
}

export const ambience = {
  profile: ambienceProfile,
  levels: ambienceLevels,
  active() {
    return !!g;
  },
  /** Test hook: the live graph (null when stopped). */
  _graph() {
    return g;
  },
  start(mapId, { night = false } = {}) {
    const bus = audioBus();
    if (!bus) return false;
    this.stop();
    g = build(bus, ambienceProfile(mapId));
    g.night = !!night;
    acc = 0;
    birdTimer = 1.5;
    gullTimer = 4;
    return true;
  },
  /**
   * Call every frame. `env`: { wind, shoreDist, doorDist, muted } — the mix
   * is only re-targeted ten times a second, the rest is free.
   */
  tick(dt, env = {}) {
    if (!g) return;
    acc += dt;
    const lv = ambienceLevels(g.profile, {
      windMag: env.wind ? Math.hypot(env.wind.x || 0, env.wind.z || 0) : 0,
      shoreDist: env.shoreDist ?? Infinity,
      night: g.night,
      doorDist: env.doorDist ?? Infinity,
    });
    if (acc >= 0.1) {
      acc = 0;
      const c = g.bus.ctx;
      const t = c.currentTime;
      const set = (node, v, tc = 0.25) => node.gain.setTargetAtTime(Math.max(v, 0.0001), t, tc);
      set(g.out.wind, lv.wind);
      set(g.out.sea, lv.sea);
      set(g.out.hum, lv.hum);
      set(g.out.buzz, lv.buzz);
      set(g.out.traffic, lv.traffic);
      set(g.out.door, lv.door, 0.12);
      // Modulation depths scale with the level (they are summed onto the gain
      // param), so a silent layer stays silent and gain never goes negative.
      g.out.windDepth.gain.setTargetAtTime(lv.wind * 0.4, t, 0.25);
      g.out.seaSwell.gain.setTargetAtTime(lv.sea * 0.5, t, 0.25);
      g.out.trafficDepth.gain.setTargetAtTime(lv.traffic * 0.3, t, 0.25);
      g.out.doorDepth.gain.setTargetAtTime(lv.door * 0.25, t, 0.12);
      g.levels = lv;
    }
    if (lv.birdRate > 0) {
      birdTimer -= dt * lv.birdRate;
      if (birdTimer <= 0) {
        birdTimer = 2.5 + Math.random() * 5;
        chirp(g.bus, false);
      }
    }
    if (lv.gulls) {
      gullTimer -= dt;
      if (gullTimer <= 0) {
        gullTimer = 6 + Math.random() * 9;
        chirp(g.bus, true);
      }
    }
  },
  stop() {
    if (!g) return;
    const { bus, out, nodes } = g;
    const t = bus.ctx.currentTime;
    for (const k of ["wind", "sea", "hum", "buzz", "traffic", "door"]) out[k].gain.setTargetAtTime(0.0001, t, 0.08);
    for (const k of ["windDepth", "seaSwell", "trafficDepth", "doorDepth"]) out[k].gain.setTargetAtTime(0, t, 0.08);
    const old = g;
    g = null;
    setTimeout(() => {
      for (const n of nodes) {
        try {
          n.stop();
        } catch {
          /* already stopped */
        }
      }
      for (const k of ["wind", "sea", "hum", "buzz", "traffic", "door"]) {
        try {
          old.out[k].disconnect();
        } catch {
          /* detached */
        }
      }
    }, 400);
  },
};
