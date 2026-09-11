export function inSphere(s, x, y, z, r) {
  return Math.hypot(s.x - x, s.y - y, s.z - z) <= r;
}

export function onPad(s, pad = { x: 0, z: 0, r: 5.5 }) {
  return Math.hypot(s.x - pad.x, s.z - pad.z) < pad.r && s.y < 1.5;
}

export function landedSoft(s) {
  const touchdown = s.lastTouchdown;
  const touchdownOk = !touchdown || (touchdown.verticalSpeed <= 3.5 && touchdown.horizontalSpeed <= 2.2);
  return !!s.grounded && onPad(s) && !s.armed && touchdownOk && Math.hypot(s.vx, s.vy, s.vz) < 0.8;
}

export function canSwapBattery(s) {
  return !!s.grounded && !s.armed && onPad(s) && Math.hypot(s.vx, s.vz) < 0.8;
}

/** Hovering low and slow over a cargo point (pickup or drop): within r, under ~2 m above it, under 2.5 m/s. */
export function atPoint(s, p) {
  const r = p.r || 2.4;
  if (Math.hypot(s.x - p.x, s.z - p.z) > r) return false;
  const dy = s.y - (p.y || 0);
  if (dy > 1.8 || dy < -0.6) return false;
  return Math.hypot(s.vx, s.vy, s.vz) < 2.5;
}

export function segmentHitsSphere(ax, ay, az, bx, by, bz, cx, cy, cz, r) {
  const r2 = r * r;
  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const acx = ax - cx;
  const acy = ay - cy;
  const acz = az - cz;
  if (acx * acx + acy * acy + acz * acz <= r2) return true;
  const bcx = bx - cx;
  const bcy = by - cy;
  const bcz = bz - cz;
  if (bcx * bcx + bcy * bcy + bcz * bcz <= r2) return true;
  const ab2 = abx * abx + aby * aby + abz * abz;
  if (ab2 < 1e-12) return false;
  let t = -((acx * abx + acy * aby + acz * abz) / ab2);
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const dx = ax + abx * t - cx;
  const dy = ay + aby * t - cy;
  const dz = az + abz * t - cz;
  return dx * dx + dy * dy + dz * dz <= r2;
}

export function crossedRing(s, g, prev, from) {
  if (!prev || !from) return false;
  let nx = g.x - from.x;
  let ny = g.y - from.y;
  let nz = g.z - from.z;
  const nl = Math.hypot(nx, ny, nz);
  if (nl < 1e-6) return false;
  nx /= nl;
  ny /= nl;
  nz /= nl;

  const d0 = (prev.x - g.x) * nx + (prev.y - g.y) * ny + (prev.z - g.z) * nz;
  const d1 = (s.x - g.x) * nx + (s.y - g.y) * ny + (s.z - g.z) * nz;
  // The centre must cross the gate plane from the route's approach side.
  if (d0 >= -1e-4 || d1 < 0 || d1 <= d0) return false;
  const t = d0 / (d0 - d1);
  const ix = prev.x + (s.x - prev.x) * t - g.x;
  const iy = prev.y + (s.y - prev.y) * t - g.y;
  const iz = prev.z + (s.z - prev.z) * t - g.z;
  const along = ix * nx + iy * ny + iz * nz;
  const radial = Math.hypot(ix - along * nx, iy - along * ny, iz - along * nz);
  return radial <= (g.r || 2.4) + 0.35;
}

export function crossedVolume(s, point, prev) {
  const r = (point.r || 2.4) + 0.35;
  if (inSphere(s, point.x, point.y, point.z, r)) return true;
  if (!prev) return false;
  return segmentHitsSphere(prev.x, prev.y, prev.z, s.x, s.y, s.z, point.x, point.y, point.z, r);
}

function schoolGateFrom(run) {
  for (let i = run.step - 1; i >= 0; i -= 1) {
    const st = run.op.steps?.[i];
    if (Number.isFinite(st?.x) && Number.isFinite(st?.y) && Number.isFinite(st?.z)) return st;
  }
  return run.op.spawn || run.prev;
}

function raceGateFrom(run, gates) {
  if (run.gatesDone === 0) return run.op.spawn;
  return gates[(run.gatesDone - 1) % gates.length];
}

export function nextGoal(run, extra = {}) {
  if (!run || run.won || run.lost) return null;
  const op = run.op;
  const pad = { x: 0, y: 0, z: 0, kind: "pad" };
  if (op.kind === "school") {
    const st = op.steps?.[run.step];
    if (!st || st.t === "land" || st.t === "pad") return pad;
    if (!Number.isFinite(st.x) && st.t === "takeoff") return { x: run.op.spawn?.x || 0, y: st.y, z: run.op.spawn?.z || 0, kind: st.t };
    return { x: st.x, y: st.y, z: st.z, kind: st.t };
  }
  if (op.kind === "race") {
    const gates = op.gates || [];
    const g = gates[run.gatesDone % Math.max(gates.length, 1)];
    return g ? { x: g.x, y: g.y, z: g.z, kind: "gate" } : null;
  }
  if (op.kind === "recon") {
    const m = (run.marks || []).find((x) => !x.done);
    return m ? { x: m.x, y: m.y, z: m.z, kind: "mark" } : pad;
  }
  if (op.kind === "patrol") {
    const t = (extra.targets || []).find((x) => x.alive);
    return t ? { x: t.x, y: t.y, z: t.z, kind: "target" } : pad;
  }
  if (op.kind === "cargo") {
    if (run.carrying != null) {
      const p = run.parcels[run.carrying];
      return { x: p.to.x, y: p.to.y || 0, z: p.to.z, kind: "drop" };
    }
    const p = (run.parcels || []).find((x) => !x.done);
    return p ? { x: p.from.x, y: p.from.y || 0, z: p.from.z, kind: "pickup" } : pad;
  }
  if (op.kind === "final") return (extra.score || 0) >= (op.scoreNeed || 8) ? pad : null;
  if (op.kind === "waves") return run.waveBreak > 0 ? pad : null;
  return null;
}

export function createRun(op) {
  return {
    op,
    t: 0,
    step: 0,
    hoverAcc: 0,
    gatesDone: 0,
    lap: 0,
    lapTimes: [],
    lapStart: 0,
    lastLap: null,
    bestLap: null,
    shot: 0,
    marks: (op.marks || []).map((m) => ({ ...m, done: false })),
    parcels: (op.parcels || []).map((p) => ({ ...p, done: false })),
    carrying: null,
    delivered: 0,
    dropped: 0,
    wave: 0,
    waveBreak: 0,
    waveClear: false,
    recall: false,
    won: false,
    lost: false,
    reason: "",
    hint: op.steps?.[0]?.hint || op.blurb || "",
    prev: null,
    takeoffSeenGround: false,
  };
}

export function nextStep(run) {
  run.step += 1;
  run.hoverAcc = 0;
  const st = run.op.steps?.[run.step];
  run.hint = st?.hint || (run.step >= (run.op.steps?.length || 0) ? "Tamam" : run.op.blurb);
}

export function win(run, reason = "tamam") {
  run.won = true;
  run.lost = false;
  run.reason = reason;
  run.hint = "Görev tamam";
}

export function fail(run, reason) {
  run.lost = true;
  run.won = false;
  run.reason = reason;
  run.hint = reason;
}

export function tickRun(run, ctx) {
  if (!run || run.won || run.lost) return run;
  const dt = ctx.dt || 0;
  run.t += dt;
  const op = run.op;
  if (op.requiredFlightMode && ctx.flightMode && ctx.flightMode !== op.requiredFlightMode) {
    fail(run, `bu ders ${op.requiredFlightMode.toUpperCase()} modu gerektiriyor`);
    return run;
  }
  if (op.limit && run.t > op.limit) {
    fail(run, "süre doldu");
    return run;
  }

  const kind = op.kind;
  const s = ctx.state;
  if (!s) return run;

  tickKind(run, ctx, kind, s, dt);

  // Checked AFTER the kind dispatch, and only as a fallback: a gate/mark/
  // score that completes the mission, or a wave-clear that's about to
  // teleport+refuel the player (run.recall), on the very same tick the pack
  // empties must win/recall, not lose to a stale battery check that ran first.
  if (!run.won && !run.lost && !run.recall && s.battery <= 0 && !onPad(s)) {
    fail(run, "batarya bitti");
  }
  return run;
}

function tickKind(run, ctx, kind, s, dt) {
  const op = run.op;
  if (kind === "school") {
    const steps = op.steps;
    const st = steps[run.step];
    if (!st) {
      win(run);
      return;
    }
    if (st.t === "takeoff") {
      if (s.grounded && !s.armed) run.takeoffSeenGround = true;
      if (run.takeoffSeenGround && s.armed && !s.grounded && s.y >= st.y) nextStep(run);
    } else if (st.t === "hover" || st.t === "altitude" || st.t === "speed" || st.t === "heading") {
      let inside = inSphere(s, st.x, st.y, st.z, st.r || 3);
      if (st.t === "altitude") inside = inside && Math.abs(s.y - st.y) <= (st.tolerance || 0.6);
      if (st.t === "speed") {
        const speed = Math.hypot(s.vx || 0, s.vz || 0);
        inside = inside && speed >= (st.min || 0) && speed <= (st.max || Infinity);
      }
      if (st.t === "heading") {
        const yaw = Math.atan2(2 * (s.qw * s.qy + s.qx * s.qz), 1 - 2 * (s.qx * s.qx + s.qy * s.qy));
        let err = yaw - (st.heading || 0);
        while (err > Math.PI) err -= Math.PI * 2;
        while (err < -Math.PI) err += Math.PI * 2;
        inside = inside && Math.abs(err) <= (st.tolerance || 0.18) && Math.hypot(s.vx || 0, s.vz || 0) < 1.5;
      }
      if (inside) run.hoverAcc += dt;
      else run.hoverAcc = 0;
      run.hint = `${st.hint} · ${run.hoverAcc.toFixed(1)}/${st.hold}s`;
      if (run.hoverAcc >= st.hold) nextStep(run);
    } else if (st.t === "gate") {
      if (crossedRing(s, st, run.prev, schoolGateFrom(run))) nextStep(run);
    } else if (st.t === "pad") {
      // Pit stop mid-run: touch the pad slow and low (main.js refills the pack there).
      if (canSwapBattery(s)) nextStep(run);
    } else if (st.t === "land") {
      if (landedSoft(s)) win(run);
    }
    run.prev = { x: s.x, y: s.y, z: s.z };
    return;
  }

  if (kind === "patrol") {
    const need = op.need || 6;
    run.hint = `Hedef ${run.shot}/${need} · pade batarya`;
    if (run.shot >= need && landedSoft(s)) win(run);
    return;
  }

  if (kind === "waves") {
    const waves = op.waves || [3, 5, 7];
    if (run.wave >= waves.length) {
      win(run);
      return;
    }
    if (run.waveBreak > 0) {
      run.waveBreak -= dt;
      run.hint = `Dalga ${run.wave + 1} bitti · ARM ${Math.ceil(run.waveBreak)}s`;
      if (run.waveBreak <= 0) {
        run.wave += 1;
        run.waveClear = false;
        if (run.wave >= waves.length) win(run);
        else run.hint = `Dalga ${run.wave + 1}/${waves.length}`;
      }
      return;
    }
    const alive = ctx.aliveBots ?? 0;
    run.hint = `Dalga ${run.wave + 1}/${waves.length} · bot ${alive}`;
    if (!run.waveClear && alive === 0 && ctx.waveSpawned) {
      run.waveClear = true;
      run.waveBreak = op.waveBreak || 20;
      run.recall = true;
    }
    return;
  }

  if (kind === "race") {
    const gates = op.gates || [];
    const laps = op.laps || 3;
    const g = gates[run.gatesDone % gates.length];
    if (g && crossedRing(s, g, run.prev, raceGateFrom(run, gates))) {
      run.gatesDone += 1;
      if (run.gatesDone % gates.length === 0) {
        run.lap += 1;
        // A lap closes on the last gate; the first lap includes the run-in from spawn.
        const lapTime = run.t - (run.lapStart || 0);
        run.lapTimes.push(lapTime);
        run.lastLap = lapTime;
        run.lapStart = run.t;
        if (run.bestLap == null || lapTime < run.bestLap) run.bestLap = lapTime;
      }
      if (run.lap >= laps) win(run);
    }
    run.hint = `Tur ${Math.min(laps, run.lap + 1)}/${laps} · kapı ${(run.gatesDone % gates.length) + 1}/${gates.length}`;
    run.prev = { x: s.x, y: s.y, z: s.z };
    return;
  }

  if (kind === "recon") {
    let n = 0;
    for (const m of run.marks) {
      if (!m.done && crossedVolume(s, m, run.prev)) m.done = true;
      if (m.done) n += 1;
    }
    run.hint = `İşaret ${n}/${run.marks.length}`;
    if (n >= run.marks.length && landedSoft(s)) win(run);
    else if (n >= run.marks.length) run.hint = "Pade in, görevi bitir";
    run.prev = { x: s.x, y: s.y, z: s.z };
    return;
  }

  if (kind === "cargo") {
    const ps = run.parcels;
    run.prev = { x: s.x, y: s.y, z: s.z };
    if (run.carrying != null) {
      const p = ps[run.carrying];
      if (s.crashed) {
        // The sling lets go on impact; the parcel is back where it was picked up.
        run.carrying = null;
        run.dropped += 1;
        run.hint = `Kargo düştü — ${p.name} yeniden al`;
        return;
      }
      run.hint = `Taşınıyor: ${p.name} → ${p.toName}`;
      if (atPoint(s, p.to)) {
        p.done = true;
        run.delivered += 1;
        run.carrying = null;
        run.hint = run.delivered >= ps.length ? "Hepsi teslim · pade in" : `Teslim ${run.delivered}/${ps.length}`;
      }
      return;
    }
    const i = ps.findIndex((x) => !x.done);
    if (i < 0) {
      run.hint = `Koli ${ps.length}/${ps.length} · pade in, ARM kapat`;
      if (landedSoft(s)) win(run);
      return;
    }
    const p = ps[i];
    run.hint = `Koli ${i + 1}/${ps.length} · al: ${p.name}${run.dropped ? ` (düşen ${run.dropped})` : ""}`;
    if (s.armed && !s.crashed && atPoint(s, p.from)) {
      run.carrying = i;
      run.hint = `Taşınıyor: ${p.name} → ${p.toName}`;
    }
    return;
  }

  run.prev = { x: s.x, y: s.y, z: s.z };

  if (kind === "final") {
    const need = op.scoreNeed || 8;
    const sc = ctx.score || 0;
    run.hint = `Skor ${sc}/${need} · pade dön`;
    if (sc >= need && landedSoft(s)) win(run);
  }
}
