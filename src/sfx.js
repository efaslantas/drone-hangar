import { voiceProfile, voiceTargets } from "./motor-voice.js";

let ctx = null;
let master = null;
let noiseBuf = null;

function ac() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function unlockAudio() {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") c.resume();
  try {
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(0);
  } catch {
    /* Safari already unlocked */
  }
}

let muted = false;

function beep(freq, dur, type = "square", vol = 0.05) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g);
  g.connect(master);
  o.start();
  o.stop(c.currentTime + dur);
}

/** Shared context + master bus for other audio layers (ambience.js). Null until audio exists. */
export function audioBus() {
  const c = ac();
  if (!c) return null;
  return { ctx: c, master, noise: noise(c) };
}

function noise(c) {
  if (!noiseBuf) {
    const n = Math.floor(c.sampleRate * 2);
    noiseBuf = c.createBuffer(1, n, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function shaperCurve(drive) {
  const n = 256;
  const curve = new Float32Array(n);
  const k = 1 + drive * 9;
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * k) / norm;
  }
  return curve;
}

// One quad's worth of motors: two detuned oscillators (four ESCs never agree
// on RPM), an optional sub for the big props, a waveshaper for the racer's
// rasp, prop-wash noise through a bandpass, and two amplitude modulators —
// blade-pass "thrum" for the lifters and a slow wobble for a dying pack.
function buildVoice(c, p) {
  const out = c.createGain();
  out.gain.value = 0.0001;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = p.cutoff[0];
  filter.Q.value = p.q;
  const shaper = c.createWaveShaper();
  shaper.curve = shaperCurve(p.drive);
  const tone = c.createGain();
  tone.gain.value = 0.5;
  const o1 = c.createOscillator();
  o1.type = p.wave;
  o1.frequency.value = p.base;
  const o2 = c.createOscillator();
  o2.type = p.wave === "square" ? "square" : "sawtooth";
  o2.frequency.value = p.base * p.second;
  o2.detune.value = p.detune;
  const g2 = c.createGain();
  g2.gain.value = p.wave === "square" ? 0.35 : 0.45;
  const o3 = c.createOscillator();
  o3.type = "sawtooth";
  o3.frequency.value = p.base * 0.5;
  const g3 = c.createGain();
  g3.gain.value = p.sub;
  o1.connect(tone);
  o2.connect(g2).connect(tone);
  o3.connect(g3).connect(tone);
  tone.connect(shaper).connect(filter).connect(out);
  const src = c.createBufferSource();
  src.buffer = noise(c);
  src.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = p.washBand[0];
  bp.Q.value = 0.7;
  const wash = c.createGain();
  wash.gain.value = 0.0001;
  src.connect(bp).connect(wash).connect(out);
  const chop = c.createOscillator();
  chop.type = "sine";
  chop.frequency.value = p.chopRate[0] || 20;
  const chopG = c.createGain();
  chopG.gain.value = 0;
  chop.connect(chopG).connect(out.gain);
  const wob = c.createOscillator();
  wob.type = "sine";
  wob.frequency.value = 4.7;
  const wobG = c.createGain();
  wobG.gain.value = 0;
  wob.connect(wobG).connect(out.gain);
  out.connect(master);
  const nodes = [o1, o2, o3, src, chop, wob];
  for (const n of nodes) n.start();
  return { p, out, filter, o1, o2, o3, bp, wash, chop, chopG, wob, wobG, nodes };
}

function killVoice(v, c) {
  v.out.gain.setTargetAtTime(0.0001, c.currentTime, 0.03);
  v.chopG.gain.setTargetAtTime(0, c.currentTime, 0.03);
  v.wobG.gain.setTargetAtTime(0, c.currentTime, 0.03);
  setTimeout(() => {
    for (const n of v.nodes) {
      try {
        n.stop();
      } catch {
        /* already stopped */
      }
    }
    try {
      v.out.disconnect();
    } catch {
      /* detached */
    }
  }, 250);
}

function driveVoice(v, c, target) {
  const t = c.currentTime;
  const rate = target.rate || 0.08;
  v.out.gain.setTargetAtTime(Math.max(target.gain, 0.0001), t, 0.05);
  v.o1.frequency.setTargetAtTime(target.freq, t, rate);
  v.o2.frequency.setTargetAtTime(target.freq * v.p.second, t, rate);
  v.o3.frequency.setTargetAtTime(target.freq * 0.5, t, rate);
  v.filter.frequency.setTargetAtTime(target.cutoff, t, 0.08);
  v.wash.gain.setTargetAtTime(Math.max(target.wash, 0.0001), t, 0.1);
  v.bp.frequency.setTargetAtTime(target.washCutoff, t, 0.15);
  v.chop.frequency.setTargetAtTime(Math.max(target.chopRate, 1), t, rate);
  v.chopG.gain.setTargetAtTime(target.gain * target.chopDepth * 0.5, t, 0.1);
  v.wobG.gain.setTargetAtTime(target.gain * target.wobble, t, 0.2);
}

let profile = voiceProfile({ class: "Indoor", size: 0.065, id: "whoop" });
let voice = null;
let otherProfile = null;
let other = null;

function silence(v, c) {
  if (!v) return;
  const t = c.currentTime;
  v.out.gain.setTargetAtTime(0.0001, t, 0.05);
  v.chopG.gain.setTargetAtTime(0, t, 0.05);
  v.wobG.gain.setTargetAtTime(0, t, 0.05);
}

// Two craft trading places at similar range would otherwise tear down and
// rebuild the "other" graph on every flip; hold the current one briefly.
let otherWant = { id: null, at: 0 };

export const sfx = {
  unlock: unlockAudio,
  /** Test hooks: the live graph objects (null until a context exists). */
  _voice: () => voice,
  _other: () => other,
  _ctx: () => ctx,
  setMuted(on) {
    muted = !!on;
    const c = ctx;
    if (!c) return;
    master.gain.setTargetAtTime(muted ? 0.0001 : 1, c.currentTime, 0.03);
  },
  isMuted() {
    return muted;
  },
  /** Pick the airframe whose motors the pilot hears. Takes effect on the next motor() call. */
  setVoice(spec) {
    profile = voiceProfile(spec || {});
  },
  voiceId() {
    return profile.id;
  },
  gate() {
    beep(880, 0.09, "square", 0.045);
  },
  hit() {
    beep(180, 0.11, "sawtooth", 0.06);
  },
  win() {
    beep(523, 0.1, "square", 0.05);
    setTimeout(() => beep(784, 0.18, "square", 0.05), 90);
  },
  fail() {
    beep(140, 0.28, "triangle", 0.06);
  },
  low() {
    beep(240, 0.14, "square", 0.04);
  },
  lap() {
    beep(988, 0.07, "square", 0.04);
    setTimeout(() => beep(1319, 0.12, "square", 0.04), 80);
  },
  /** Race countdown: 3, 2, 1 are short, 0 is the long GO tone. */
  count(n) {
    if (n > 0) beep(740, 0.1, "square", 0.05);
    else beep(1175, 0.42, "square", 0.055);
  },
  /**
   * Own craft. `env` (optional) = { speed, alt, battery, sag, chase, crashed }.
   * With no AudioContext (Node, old browsers) this is a no-op.
   */
  motor(thr, armed, env = {}) {
    const c = ac();
    if (!c) return;
    if (muted || !armed) {
      silence(voice, c);
      if (!armed) silence(other, c);
      return;
    }
    if (!voice || voice.p.id !== profile.id) {
      if (voice) killVoice(voice, c);
      voice = buildVoice(c, profile);
    }
    driveVoice(voice, c, voiceTargets(voice.p, { ...env, thr, armed }));
  },
  /**
   * Nearest other craft (bot or remote pilot): `spec` its airframe, `thr` its
   * motor output, `dist` metres from the listener. `spec` null fades it out.
   */
  nearby(spec, thr = 0.6, dist = 100, doppler = 1) {
    const c = ac();
    if (!c) return;
    if (!spec || muted) {
      silence(other, c);
      return;
    }
    if (other && other.p.id !== spec.id) {
      if (otherWant.id !== spec.id) otherWant = { id: spec.id, at: c.currentTime };
      if (c.currentTime - otherWant.at < 0.5) {
        driveVoice(other, c, voiceTargets(other.p, { thr, armed: true, dist, alt: 10, doppler }));
        return;
      }
      killVoice(other, c);
      other = null;
    }
    if (!other) {
      if (!otherProfile || otherProfile.id !== spec.id) otherProfile = voiceProfile(spec);
      other = buildVoice(c, otherProfile);
    }
    driveVoice(other, c, voiceTargets(other.p, { thr, armed: true, dist, alt: 10, doppler }));
  },
};
