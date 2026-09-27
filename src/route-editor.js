function finitePoint(point, dimensions) {
  return dimensions.every((key) => Number.isFinite(Number(point?.[key])));
}

function normalizePoint(point, context) {
  if (context?.kind === "air") {
    if (!finitePoint(point, ["x", "z"])) return { ok: false, error: "Geçersiz hava noktası" };
    const bounds = context.bounds || {};
    const x = Number(point.x);
    const y = point.y == null ? 8 : Number(point.y);
    const z = Number(point.z);
    if (![bounds.minx, bounds.maxx, bounds.minz, bounds.maxz, bounds.ceiling].every(Number.isFinite)) {
      return { ok: false, error: "Harita sınırı bulunamadı" };
    }
    if (x < bounds.minx || x > bounds.maxx || z < bounds.minz || z > bounds.maxz) {
      return { ok: false, error: "Nokta uçuş alanı dışında" };
    }
    if (!Number.isFinite(y) || y < 2 || y > bounds.ceiling - 1) {
      return { ok: false, error: "İrtifa sınırı aşıldı" };
    }
    return { ok: true, point: { x, y, z } };
  }

  if (context?.kind === "sea") {
    if (!finitePoint(point, ["x", "z"])) return { ok: false, error: "Geçersiz su noktası" };
    const x = Number(point.x);
    const z = Number(point.z);
    if (typeof context.water?.contains !== "function" || !context.water.contains(x, z)) {
      return { ok: false, error: "Nokta su alanı dışında" };
    }
    return { ok: true, point: { x, z } };
  }

  return { ok: false, error: "Araç türü bilinmiyor" };
}

export function createRoute(vehicleId) {
  return { vehicleId, points: [], currentIndex: 0, mode: "HOLD" };
}

export function validateRoute(route, context) {
  if (!route || !Array.isArray(route.points)) return { ok: false, error: "Rota geçersiz" };
  const points = [];
  for (const point of route.points) {
    const normalized = normalizePoint(point, context);
    if (!normalized.ok) return { ...normalized, route };
    points.push(normalized.point);
  }
  const currentIndex = Math.min(Math.max(0, Number(route.currentIndex) || 0), points.length);
  return {
    ok: true,
    route: {
      ...route,
      points,
      currentIndex,
      mode: currentIndex < points.length ? "ROUTE" : "HOLD",
    },
  };
}

export function appendWaypoint(route, point, context) {
  return replaceRoute(route, [...route.points, point], context);
}

export function replaceRoute(route, points, context) {
  const result = validateRoute({ ...route, points, currentIndex: 0 }, context);
  return result.ok ? result : { ...result, route };
}

export function removeWaypoint(route, index) {
  if (!Number.isInteger(index) || index < 0 || index >= route.points.length) return route;
  const points = route.points.filter((_, pointIndex) => pointIndex !== index);
  const currentIndex = Math.min(
    index < route.currentIndex ? route.currentIndex - 1 : route.currentIndex,
    points.length,
  );
  return { ...route, points, currentIndex, mode: currentIndex < points.length ? "ROUTE" : "HOLD" };
}

export function clearRoute(route) {
  return { ...route, points: [], currentIndex: 0, mode: "HOLD" };
}

export function advanceRoute(route, position, radius = 1) {
  const point = route.points[route.currentIndex];
  if (!point) return { ...route, mode: "HOLD" };
  const dy = point.y == null ? 0 : Number(position?.y) - point.y;
  const distance = Math.hypot(Number(position?.x) - point.x, dy, Number(position?.z) - point.z);
  if (!Number.isFinite(distance) || distance > Math.max(0, Number(radius) || 0)) return route;
  const currentIndex = route.currentIndex + 1;
  return { ...route, currentIndex, mode: currentIndex < route.points.length ? "ROUTE" : "HOLD" };
}
