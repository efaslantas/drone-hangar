export const DEFAULT_BUILD = {
  frame: "race",
  motors: "2450",
  battery: "6s1100",
  props: "tri",
};

export const BUILD_PARTS = {
  frame: [
    { id: "race", name: "Race X", mass: 0.92, drag: 0.9, rate: 1.06 },
    { id: "freestyle", name: "Freestyle", mass: 1.08, drag: 1.05, rate: 0.96 },
    { id: "longrange", name: "Long Range", mass: 1.03, drag: 0.96, rate: 0.91, endurance: 1.08 },
  ],
  motors: [
    { id: "1750", name: "1750 KV", thrust: 0.88, endurance: 1.18, rate: 0.89 },
    { id: "1900", name: "1900 KV", thrust: 0.95, endurance: 1.08, rate: 0.96 },
    { id: "2450", name: "2450 KV", thrust: 1.06, endurance: 0.94, rate: 1.06 },
  ],
  battery: [
    { id: "4s1500", name: "4S 1500 mAh", mass: 1.06, thrust: 0.94, endurance: 1.14 },
    { id: "6s1100", name: "6S 1100 mAh", mass: 0.94, thrust: 1.06, endurance: 0.93 },
    { id: "6s1300", name: "6S 1300 mAh", mass: 1.08, thrust: 1.01, endurance: 1.12 },
  ],
  props: [
    { id: "bi", name: "İki pal", thrust: 0.92, drag: 0.88, endurance: 1.1 },
    { id: "tri", name: "Üç pal", thrust: 1.04, drag: 1.05, endurance: 0.95 },
    { id: "quad", name: "Dört pal", thrust: 1.1, drag: 1.14, endurance: 0.87 },
  ],
};

function part(type, id) {
  return BUILD_PARTS[type].find((entry) => entry.id === id) || BUILD_PARTS[type][0];
}

export function normalizeBuild(build = {}) {
  return Object.fromEntries(Object.keys(BUILD_PARTS).map((type) => [type, part(type, build?.[type]).id]));
}

export function buildSummary(build) {
  const selected = normalizeBuild(build);
  return Object.keys(BUILD_PARTS).map((type) => part(type, selected[type]).name).join(" · ");
}

export function buildFor(builds, droneId) {
  return normalizeBuild(builds?.[droneId] || DEFAULT_BUILD);
}

export function setBuildFor(builds, droneId, build) {
  return { ...(builds || {}), [droneId]: normalizeBuild(build) };
}

export function normalizeBuilds(value, droneIds = []) {
  if (!value || typeof value !== "object") {
    return Object.fromEntries(droneIds.map((id) => [id, normalizeBuild(DEFAULT_BUILD)]));
  }
  const legacy = value && typeof value === "object" && "frame" in value;
  const source = value;
  return Object.fromEntries(droneIds.map((id) => [id, normalizeBuild(legacy ? source : source[id])]));
}

// Part ranges remain bounded around catalog values so builds stay flyable.
export function applyFpvBuild(spec, build) {
  if (!spec?.fpv) return spec;
  const selected = normalizeBuild(build);
  const pieces = Object.keys(BUILD_PARTS).map((type) => part(type, selected[type]));
  const factor = (key) => pieces.reduce((value, entry) => value * (entry[key] ?? 1), 1);
  const rate = factor("rate");
  return {
    ...spec,
    build: selected,
    mass: spec.mass * factor("mass"),
    drag: spec.drag * factor("drag"),
    maxThrustG: spec.maxThrustG * factor("thrust"),
    endurance: spec.endurance * factor("endurance"),
    maxRate: spec.maxRate * rate,
    yawRate: spec.yawRate * rate,
    rateFollow: spec.rateFollow * rate,
  };
}

export function buildMetrics(spec, build) {
  const tuned = applyFpvBuild(spec, build);
  return {
    thrust: tuned.maxThrustG.toFixed(1),
    endurance: Math.round(tuned.endurance),
    rate: Math.round((tuned.maxRate * 180) / Math.PI),
    mass: Math.round(tuned.mass * 1000),
  };
}
