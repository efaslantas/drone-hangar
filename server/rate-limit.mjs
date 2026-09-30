export function createRateLimiter({ now = () => Date.now() } = {}) {
  const buckets = new Map();
  return {
    allow(scope, key, max, windowMs) {
      const id = `${scope}:${key || "unknown"}`;
      const current = buckets.get(id);
      const time = now();
      if (!current || time - current.started >= windowMs) {
        buckets.set(id, { started: time, count: 1 });
        return true;
      }
      if (current.count >= max) return false;
      current.count++;
      return true;
    },
  };
}
