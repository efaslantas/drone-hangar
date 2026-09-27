export const SCENARIO_STORAGE_KEY = "efa-hangar-operations-v1";
export const SCENARIO_VERSION = 1;
export const MAX_SCENARIO_BYTES = 128_000;
export const MAX_SCENARIOS = 20;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function slug(value) {
  return String(value || "senaryo")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "senaryo";
}

function finitePose(pose, kind) {
  const keys = kind === "air" ? ["x", "y", "z", "heading"] : ["x", "z", "heading"];
  return pose && keys.every((key) => typeof pose[key] === "number" && Number.isFinite(pose[key]));
}

function validRoutes(routes, vehicles) {
  if (!routes || typeof routes !== "object" || Array.isArray(routes)) return false;
  return vehicles.every((vehicle) => {
    const route = routes[vehicle.id];
    if (!route || route.vehicleId !== vehicle.id || !Array.isArray(route.points)) return false;
    return route.points.every((point) => {
      const common = typeof point?.x === "number" && Number.isFinite(point.x)
        && typeof point?.z === "number" && Number.isFinite(point.z);
      if (!common) return false;
      const x = Number(point.x);
      const z = Number(point.z);
      if (vehicle.kind === "sea") return x >= -42 && x <= 42 && z >= -140 && z <= -40;
      const y = point.y;
      return typeof y === "number" && Number.isFinite(y) && x >= -44 && x <= 44 && z >= -46 && z <= 20 && y >= 2 && y <= 39;
    });
  });
}

export function scenarioFromSession(name, session) {
  const createdAt = Date.now();
  const cleanName = String(name || "Adsız senaryo").trim() || "Adsız senaryo";
  return {
    version: SCENARIO_VERSION,
    id: `${slug(cleanName)}-${createdAt}`,
    name: cleanName,
    createdAt,
    updatedAt: createdAt,
    map: clone(session?.map || {}),
    vehicles: (session?.vehicles || []).map(({ id, kind, start }) => ({ id, kind, start: clone(start) })),
    routes: clone(session?.routes || {}),
    camera: clone(session?.camera || {}),
  };
}

export function validateScenario(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Senaryo geçersiz" };
  if (value.version !== SCENARIO_VERSION) return { ok: false, error: "Senaryo sürümü desteklenmiyor" };
  if (typeof value.id !== "string" || !value.id || typeof value.name !== "string" || !value.name.trim()) {
    return { ok: false, error: "Senaryo kimliği eksik" };
  }
  if (!Number.isFinite(value.createdAt) || !Number.isFinite(value.updatedAt)) {
    return { ok: false, error: "Senaryo tarihi geçersiz" };
  }
  if (!value.map || value.map.id !== "coast" || !["day", "night"].includes(value.map.time)) {
    return { ok: false, error: "Harita ayarı desteklenmiyor" };
  }
  if (!Array.isArray(value.vehicles) || value.vehicles.length === 0) return { ok: false, error: "Araç listesi eksik" };
  const ids = new Set();
  for (const vehicle of value.vehicles) {
    if (!vehicle || typeof vehicle.id !== "string" || !["air", "sea"].includes(vehicle.kind)
      || ids.has(vehicle.id) || !finitePose(vehicle.start, vehicle.kind)) {
      return { ok: false, error: "Araç başlangıcı geçersiz" };
    }
    ids.add(vehicle.id);
    const { x, y, z } = vehicle.start;
    const safe = vehicle.kind === "sea"
      ? Number(x) >= -42 && Number(x) <= 42 && Number(z) >= -140 && Number(z) <= -40
      : Number(x) >= -44 && Number(x) <= 44 && Number(z) >= -46 && Number(z) <= 20 && Number(y) >= 2 && Number(y) <= 39;
    if (!safe) return { ok: false, error: "Araç başlangıcı alan dışında" };
  }
  const expected = new Map([["iha-1", "air"], ["ida-1", "sea"], ["ida-2", "sea"]]);
  if (value.vehicles.length !== expected.size
    || value.vehicles.some((vehicle) => expected.get(vehicle.id) !== vehicle.kind)) {
    return { ok: false, error: "Filo yapısı geçersiz" };
  }
  if (!validRoutes(value.routes, value.vehicles)) return { ok: false, error: "Rota noktası geçersiz" };
  if (!value.camera || !expected.has(value.camera.vehicleId) || !["deck", "follow", "chase"].includes(value.camera.view)) {
    return { ok: false, error: "Kamera tercihi geçersiz" };
  }
  return { ok: true, scenario: clone(value) };
}

function readAll(storage) {
  try {
    const raw = storage?.getItem(SCENARIO_STORAGE_KEY);
    if (raw == null || raw === "") return { ok: true, scenarios: [] };
    if (new TextEncoder().encode(raw).byteLength > MAX_SCENARIO_BYTES * MAX_SCENARIOS) {
      return { ok: false, error: "Senaryo arşivi çok büyük", scenarios: [] };
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { ok: false, error: "Senaryo arşivi bozuk", scenarios: [] };
    const scenarios = [];
    for (const item of parsed) {
      const checked = validateScenario(item);
      if (!checked.ok) return { ok: false, error: checked.error, scenarios: [] };
      scenarios.push(checked.scenario);
    }
    return { ok: true, scenarios };
  } catch {
    return { ok: false, error: "Senaryo arşivi okunamadı", scenarios: [] };
  }
}

export function listScenarios(storage) {
  const result = readAll(storage);
  if (!result.ok) return result;
  return { ok: true, scenarios: result.scenarios.sort((a, b) => b.updatedAt - a.updatedAt) };
}

export function saveScenario(storage, scenario) {
  const checked = validateScenario(scenario);
  if (!checked.ok) return checked;
  let serialized;
  try {
    serialized = JSON.stringify(checked.scenario);
  } catch {
    return { ok: false, error: "Senaryo kaydedilemedi" };
  }
  if (new TextEncoder().encode(serialized).byteLength > MAX_SCENARIO_BYTES) {
    return { ok: false, error: "Senaryo çok büyük" };
  }
  const current = readAll(storage);
  if (!current.ok) return current;
  const nextScenario = checked.scenario;
  const next = current.scenarios.filter((item) => item.id !== nextScenario.id);
  next.push(nextScenario);
  next.sort((a, b) => b.updatedAt - a.updatedAt);
  try {
    storage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(next.slice(0, MAX_SCENARIOS)));
    return { ok: true, scenario: nextScenario };
  } catch {
    return { ok: false, error: "Depolama alanı dolu" };
  }
}

export function loadScenario(storage, id) {
  const current = readAll(storage);
  if (!current.ok) return current;
  const scenario = current.scenarios.find((item) => item.id === id);
  return scenario ? { ok: true, scenario: clone(scenario) } : { ok: false, error: "Senaryo bulunamadı" };
}

export function deleteScenario(storage, id) {
  const current = readAll(storage);
  if (!current.ok) return current;
  const next = current.scenarios.filter((item) => item.id !== id);
  if (next.length === current.scenarios.length) return { ok: false, error: "Senaryo bulunamadı" };
  try {
    storage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(next));
    return { ok: true };
  } catch {
    return { ok: false, error: "Senaryo silinemedi" };
  }
}
