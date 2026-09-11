// Pure description of how each airframe class sounds. No Web Audio here, so it
// runs (and is unit-tested) in Node; sfx.js turns these numbers into nodes.
//
// base/range  : fundamental motor whine in Hz at idle / added at full load
// second      : ratio of the second oscillator (1.5 = fifth, 2 = octave)
// detune      : cents of detune between the two — four motors never spin at
//               exactly the same RPM, the beating is what makes it "a quad"
// cutoff      : lowpass range [idle, full]. Whoops stay bright, lifters stay dull
// drive       : waveshaper amount — the racer's rasp, near zero for cine
// wash        : prop-wash noise mix (ducted / big props push more air)
// chop        : blade-pass amplitude modulation depth (the heavy "thrum")
// inertia     : seconds for pitch to follow the stick — a whoop is instant, a
//               450 mm lifter winds up slowly
const CLASS_VOICES = {
  Indoor:       { base: 430, range: 960, wave: "square",   second: 1.5, detune: 11, cutoff: [2400, 7600], q: 1.4, drive: 0.05, wash: 0.05, washBand: [2400, 5400], sub: 0,    chop: 0,    chopRate: [0, 0],   gainMax: 0.02,  inertia: 0.04 },
  "FPV light":  { base: 260, range: 780, wave: "sawtooth", second: 2,   detune: 8,  cutoff: [1400, 6800], q: 1.1, drive: 0.22, wash: 0.1,  washBand: [1400, 4200], sub: 0,    chop: 0,    chopRate: [0, 0],   gainMax: 0.036, inertia: 0.06 },
  "FPV acro":   { base: 150, range: 580, wave: "sawtooth", second: 2,   detune: 7,  cutoff: [900, 5600],  q: 1.0, drive: 0.38, wash: 0.16, washBand: [900, 3600],  sub: 0.15, chop: 0,    chopRate: [0, 0],   gainMax: 0.05,  inertia: 0.08 },
  "FPV race":   { base: 165, range: 660, wave: "sawtooth", second: 2,   detune: 6,  cutoff: [1000, 6600], q: 1.1, drive: 0.48, wash: 0.14, washBand: [1100, 4200], sub: 0.1,  chop: 0,    chopRate: [0, 0],   gainMax: 0.055, inertia: 0.07 },
  Cine:         { base: 150, range: 400, wave: "triangle", second: 2,   detune: 5,  cutoff: [700, 2800],  q: 0.8, drive: 0.1,  wash: 0.22, washBand: [500, 2200],  sub: 0.25, chop: 0.12, chopRate: [24, 46], gainMax: 0.046, inertia: 0.12 },
  LR:           { base: 112, range: 330, wave: "sawtooth", second: 2,   detune: 5,  cutoff: [600, 2400],  q: 0.8, drive: 0.14, wash: 0.2,  washBand: [420, 2000],  sub: 0.3,  chop: 0.14, chopRate: [22, 42], gainMax: 0.05,  inertia: 0.14 },
  Survey:       { base: 84,  range: 210, wave: "sawtooth", second: 2,   detune: 4,  cutoff: [420, 1500],  q: 0.7, drive: 0.12, wash: 0.3,  washBand: [260, 1400],  sub: 0.5,  chop: 0.36, chopRate: [16, 34], gainMax: 0.06,  inertia: 0.22 },
  Industrial:   { base: 68,  range: 180, wave: "sawtooth", second: 2,   detune: 4,  cutoff: [360, 1200],  q: 0.7, drive: 0.16, wash: 0.36, washBand: [200, 1100],  sub: 0.6,  chop: 0.46, chopRate: [14, 30], gainMax: 0.07,  inertia: 0.28 },
};

// Typical airframe size for each class: a smaller prop within the same class
// spins faster, so pitch scales with size relative to this reference.
const REF_SIZE = { Indoor: 0.065, "FPV light": 0.14, "FPV acro": 0.22, "FPV race": 0.2, Cine: 0.2, LR: 0.32, Survey: 0.35, Industrial: 0.46 };

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function voiceProfile(spec = {}) {
  const cls = CLASS_VOICES[spec.class] || CLASS_VOICES["FPV acro"];
  const p = { ...cls, id: spec.id || "?", cls: spec.class || "FPV acro", cutoff: [...cls.cutoff], washBand: [...cls.washBand], chopRate: [...cls.chopRate] };
  const ref = REF_SIZE[spec.class] ?? spec.size ?? 0.2;
  const k = clamp((ref / (spec.size || ref)) ** 0.35, 0.8, 1.3);
  p.base *= k;
  p.range *= k;
  if (spec.ducts) {
    // Ducts trap the wash and round off the top end — the cinewhoop "tok" sound.
    p.wash *= 1.35;
    p.cutoff[1] *= 0.9;
    p.q += 0.2;
  }
  if (spec.gimbal) p.chop += 0.05;
  return p;
}

/**
 * Target parameters for the sound graph. `env`:
 *   thr      motor output 0..1 (state.throttleOut — includes real-acro idle)
 *   armed    motors spinning at all
 *   speed    airspeed m/s (wind rush)
 *   alt      height above ground m (ground effect below ~2.5 m)
 *   battery  0..1, sag 0.45..1 (state.sag) — a tired pack spins slower and duller
 *   chase    third-person camera: the craft is a few metres away
 *   dist     (optional) listener distance for somebody else's craft
 */
export function voiceTargets(p, env = {}) {
  const on = !!env.armed && !env.crashed;
  const load = on ? clamp(env.thr ?? 0, 0, 1) : 0;
  const battery = clamp(env.battery ?? 1, 0, 1);
  const sag = clamp(env.sag ?? 1, 0.4, 1);
  const speed = Math.max(0, env.speed || 0);
  const ground = clamp(1 - (env.alt ?? 10) / 2.5, 0, 1);
  const rpm = load ** 0.75;
  // A soft pack can't hold RPM: pitch drops with sag, and a little with charge.
  const pitchK = 1 - (1 - sag) * 0.5 - (1 - battery) * 0.06;
  // Doppler for somebody else's craft: main.js passes 343/(343+radial speed).
  const freq = (p.base + p.range * rpm) * pitchK * clamp(env.doppler ?? 1, 0.7, 1.4);
  let cutoff = (p.cutoff[0] + (p.cutoff[1] - p.cutoff[0]) * rpm) * (0.85 + 0.15 * battery) * (1 + Math.min(speed, 40) * 0.004);
  let gain = on ? p.gainMax * (0.22 + 0.78 * load) * (1 + ground * 0.25) : 0;
  let wash = p.wash * (0.25 + 0.75 * load) * (1 + ground * 1.4) + (Math.min(speed, 45) / 45) * 0.35;
  if (env.chase) {
    gain *= 0.5;
    cutoff *= 0.6;
    wash *= 1.15;
  }
  if (env.dist != null) {
    const d = Math.max(0, env.dist);
    gain *= 0.7 / (1 + (d / 5) ** 2);
    cutoff /= 1 + d / 25;
    wash *= 0.6;
  }
  if (!on) wash = 0;
  const strain = battery < 0.2 ? (0.2 - battery) / 0.2 : 0;
  return {
    gain: clamp(gain, 0, 0.12),
    freq: clamp(freq, 30, 4000),
    cutoff: clamp(cutoff, 120, 12000),
    wash: clamp(wash, 0, 0.7),
    washCutoff: p.washBand[0] + (p.washBand[1] - p.washBand[0]) * clamp(load * 0.6 + speed * 0.01, 0, 1),
    chopRate: p.chopRate[0] + (p.chopRate[1] - p.chopRate[0]) * rpm,
    chopDepth: p.chop * (0.5 + 0.5 * load),
    wobble: strain * 0.35,
    rate: p.inertia,
  };
}

export { CLASS_VOICES };
