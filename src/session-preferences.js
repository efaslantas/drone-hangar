import { CATALOG } from './catalog.js';
const MAP_IDS = new Set(['yard', 'airfield', 'coast', 'city', 'indoor', 'forest', 'sile']);
export const LOADOUT_KEY = 'efa-hangar-loadout-v1';
export function readSession(storage) {
  let saved;
  try { saved = JSON.parse(storage.getItem(LOADOUT_KEY) || 'null'); } catch { /* private browsing or old data */ }
  return {
    drone: CATALOG.some(d => d.id === saved?.drone) ? saved.drone : 'freestyle',
    map: MAP_IDS.has(saved?.map) ? saved.map : 'airfield',
  };
}

export function isFlightPaused({ menuOpen=false, touchMenuOpen=false, helpOpen=false, resultOpen=false }) {
  return Boolean(menuOpen || touchMenuOpen || helpOpen || resultOpen);
}

export function isLocalOnlyRun(run) {
  return Boolean(run && (run.reference || run.op?.kind === 'arcade'));
}

export function shouldRankRun(run) {
  return Boolean(run && run.op.ranked !== false && !run.paused && !isLocalOnlyRun(run));
}
export function advanceWorldTime(time, dt, paused=false) {
  return paused ? time : time + Math.max(0, dt);
}
export function getBrowserStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}
