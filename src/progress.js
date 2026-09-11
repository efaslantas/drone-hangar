const KEY = "efa-hangar-ops-v1";

function mem() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function emptyProgress() {
  return { done: {}, best: {}, bestLap: {}, assessments: {} };
}

export function loadProgress(storage = mem()) {
  if (!storage) return emptyProgress();
  try {
    const raw = JSON.parse(storage.getItem(KEY));
    if (!raw || typeof raw !== "object") return emptyProgress();
    return { done: raw.done || {}, best: raw.best || {}, bestLap: raw.bestLap || {}, assessments: raw.assessments || {} };
  } catch {
    return emptyProgress();
  }
}

export function saveAssessment(id, report, storage = mem()) {
  const p = loadProgress(storage);
  if (!id || !report || typeof report !== "object") return p;
  const prior = p.assessments[id];
  if (!prior || Number(report.total) >= Number(prior.total || 0)) {
    p.assessments[id] = { ...report, at: Date.now() };
    if (storage) storage.setItem(KEY, JSON.stringify(p));
  }
  return p;
}

export function saveWin(id, seconds, storage = mem(), lap = null) {
  const p = loadProgress(storage);
  const t = Math.max(0, Number(seconds) || 0);
  p.done[id] = { at: Date.now(), t };
  if (p.best[id] == null || t < p.best[id]) p.best[id] = t;
  bestLapInto(p, id, lap);
  if (storage) storage.setItem(KEY, JSON.stringify(p));
  return p;
}

function bestLapInto(p, id, lap) {
  const l = Number(lap);
  if (!(l > 0)) return false;
  if (p.bestLap[id] != null && l >= p.bestLap[id]) return false;
  p.bestLap[id] = l;
  return true;
}

/** A lap record stands even when the race itself was lost (time-out, dead pack). */
export function saveLap(id, seconds, storage = mem()) {
  const p = loadProgress(storage);
  const improved = bestLapInto(p, id, seconds);
  if (improved && storage) storage.setItem(KEY, JSON.stringify(p));
  return { progress: p, improved };
}

export function isUnlocked(ops, id, progress) {
  // A win never re-locks: the ladder may gain rungs before it between releases.
  if (progress?.done?.[id]) return true;
  const i = ops.findIndex((o) => o.id === id);
  if (i <= 0) return true;
  const prev = ops[i - 1];
  if (!prev || prev.optional) return true;
  return !!progress?.done?.[prev.id];
}
