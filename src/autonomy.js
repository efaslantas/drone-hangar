const TERMINAL = new Set(["COMPLETE", "FAILED", "ABORTED"]);

function distance(a, b) {
  return Math.hypot(Number(a?.x) - Number(b?.x), Number(a?.z) - Number(b?.z));
}

function emit(run, events, name) {
  if (run.eventsSeen.has(name)) return;
  run.eventsSeen.add(name);
  events.push(name);
}

function transition(run, phase) {
  run.phase = phase;
  run.phaseElapsed = 0;
}

function fail(run, reason, events) {
  run.reason = reason;
  run.completedAt = run.elapsed;
  transition(run, "FAILED");
  emit(run, events, "operation:failed");
}

export function createAutonomyRun(op, now = 0) {
  const target = op?.incidentCandidates?.[0];
  if (!target) throw new Error("otonom görev için olay adayı gerekli");
  return {
    op,
    target: { ...target },
    phase: "READY",
    startedAt: now,
    lastTickAt: now,
    elapsed: 0,
    phaseElapsed: 0,
    paused: false,
    controlledByVehicle: null,
    selectedSeaId: null,
    reassignedSea: false,
    returningSeaIds: [],
    detectedAt: null,
    dispatchedAt: null,
    verifyAt: null,
    completedAt: null,
    reason: "",
    eventsSeen: new Set(),
  };
}

export function selectNearestSeaVehicle(vehicles, target) {
  const minimum = Number(target?.minBattery ?? 0);
  return (vehicles || [])
    .filter((v) => v?.available !== false && Number(v?.battery) >= minimum)
    .map((v) => ({ vehicle: v, distance: distance(v, target) }))
    .filter((x) => Number.isFinite(x.distance))
    .sort((a, b) => a.distance - b.distance || String(a.vehicle.id).localeCompare(String(b.vehicle.id)))[0]?.vehicle || null;
}

export function pauseAutonomy(run, paused) {
  if (!TERMINAL.has(run.phase)) run.paused = !!paused;
  return run;
}

export function takeControl(run, vehicleId) {
  if (!TERMINAL.has(run.phase) && vehicleId) run.controlledByVehicle = String(vehicleId);
  return run;
}

export function returnToAutonomy(run, vehicleId) {
  if (run.controlledByVehicle === vehicleId) run.controlledByVehicle = null;
  return run;
}

export function abortAutonomy(run, reason = "operatör iptali") {
  if (TERMINAL.has(run.phase)) return run;
  run.reason = reason;
  run.completedAt = run.elapsed;
  transition(run, "ABORTED");
  return run;
}

export function tickAutonomy(run, input) {
  const events = [];
  const now = Number(input?.now);
  if (!Number.isFinite(now)) return { events };
  if (TERMINAL.has(run.phase)) return { events };

  const dt = Math.max(0, now - run.lastTickAt);
  run.lastTickAt = now;
  if (run.paused) return { events };
  run.elapsed += dt;
  run.phaseElapsed += dt;

  if (input.air?.crashed || (input.air?.battery != null && Number(input.air.battery) <= 0)) {
    fail(run, "İHA görev dışı", events);
    return { events };
  }

  const timeout = Number(run.op?.phaseTimeouts?.[run.phase]);
  if (Number.isFinite(timeout) && run.phaseElapsed > timeout) {
    fail(run, `${run.phase} zaman aşımı`, events);
    return { events };
  }

  if (run.phase === "READY") {
    transition(run, "AIR_SEARCH");
    emit(run, events, "search:start");
    return { events };
  }

  if (run.phase === "AIR_SEARCH" && distance(input.air, run.target) <= run.op.detectRadius) {
    run.detectedAt = run.elapsed;
    transition(run, "DETECTED");
    emit(run, events, "incident:detected");
    return { events };
  }

  if (run.phase === "DETECTED") {
    const selected = selectNearestSeaVehicle(input.sea, {
      ...run.target,
      minBattery: run.op.minSeaBattery,
    });
    if (!selected) {
      fail(run, "uygun İDA bulunamadı", events);
      return { events };
    }
    run.selectedSeaId = selected.id;
    run.dispatchedAt = run.elapsed;
    transition(run, "SEA_DISPATCH");
    emit(run, events, `dispatch:${selected.id}`);
    return { events };
  }

  let selected = (input.sea || []).find((v) => v.id === run.selectedSeaId);
  const seaHealthy = (vehicle) => vehicle && vehicle.available !== false && Number(vehicle.battery) >= Number(run.op.minSeaBattery || 0);
  if (["SEA_DISPATCH", "JOINT_VERIFY"].includes(run.phase) && !seaHealthy(selected)) {
    const previousId = run.selectedSeaId;
    if (!run.returningSeaIds.includes(previousId)) run.returningSeaIds.push(previousId);
    emit(run, events, `return:${previousId}`);
    if (run.reassignedSea) {
      fail(run, "İDA yeniden atama başarısız", events);
      return { events };
    }
    const replacement = selectNearestSeaVehicle((input.sea || []).filter((v) => v.id !== previousId), {
      ...run.target,
      minBattery: run.op.minSeaBattery,
    });
    if (!replacement) {
      fail(run, "İDA yeniden atama başarısız", events);
      return { events };
    }
    run.reassignedSea = true;
    run.selectedSeaId = replacement.id;
    run.dispatchedAt = run.elapsed;
    transition(run, "SEA_DISPATCH");
    emit(run, events, `dispatch:${replacement.id}`);
    selected = replacement;
  }
  if (run.phase === "SEA_DISPATCH" && selected && distance(selected, run.target) <= run.op.verifyRadius) {
    run.verifyAt = run.elapsed;
    transition(run, "JOINT_VERIFY");
    emit(run, events, "verify:start");
    return { events };
  }

  if (
    run.phase === "JOINT_VERIFY" &&
    selected &&
    distance(selected, run.target) <= run.op.verifyRadius &&
    distance(input.air, run.target) <= run.op.verifyRadius
  ) {
    run.completedAt = run.elapsed;
    run.reason = "görev tamamlandı";
    transition(run, "COMPLETE");
    emit(run, events, "operation:complete");
  }
  return { events };
}

export function autonomyReport(run) {
  const end = run.completedAt ?? run.elapsed;
  return {
    phase: run.phase,
    totalSeconds: end,
    detectionSeconds: run.detectedAt,
    dispatchSeconds: run.detectedAt == null || run.verifyAt == null ? null : run.verifyAt - run.detectedAt,
    interventionSeconds: run.verifyAt == null ? null : end - run.verifyAt,
    selectedSeaId: run.selectedSeaId,
    reason: run.reason,
  };
}
