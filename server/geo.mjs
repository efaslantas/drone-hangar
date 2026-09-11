import geoip from "geoip-lite";

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^::1$/,
  /^::ffff:127\./,
];

export function clientIp(req) {
  const fwd = req?.headers?.["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  const raw = req?.socket?.remoteAddress || "";
  return raw.replace(/^::ffff:/, "");
}

export function geoFor(ip) {
  if (!ip || PRIVATE_RANGES.some((re) => re.test(ip))) return null;
  const g = geoip.lookup(ip);
  if (!g) return null;
  return { city: g.city || "", country: g.country || "" };
}
