#!/usr/bin/env node
// Fetch the CC0 Poly Haven props the maps use (1k glTF + textures) into
// public/models/<id>/ and write public/models/manifest.json. Idempotent: files
// whose md5 already matches are skipped. Usage: node tools/fetch-models.mjs [id ...]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { MODELS } from "./models-list.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "models");
const UA = { "User-Agent": "Mozilla/5.0 (Macintosh) drone-hangar-asset-fetch/1.0", Accept: "*/*" };

const ids = process.argv.slice(2).length ? process.argv.slice(2) : MODELS;

async function getJson(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}
function md5Of(file) {
  return crypto.createHash("md5").update(fs.readFileSync(file)).digest("hex");
}
async function download(url, file, md5) {
  if (fs.existsSync(file) && md5 && md5Of(file) === md5) return "cached";
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  if (md5 && md5Of(file) !== md5) throw new Error(`${file}: md5 mismatch`);
  return `${(buf.length / 1e6).toFixed(2)} MB`;
}

const manifestFile = path.join(OUT, "manifest.json");
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, "utf8")) : {};
let total = 0;
for (const id of ids) {
  const files = await getJson(`https://api.polyhaven.com/files/${id}`);
  const g = files.gltf || {};
  const res = "1k" in g ? "1k" : Object.keys(g).sort()[0];
  if (!res) {
    console.log(`${id}: no glTF`);
    continue;
  }
  const entry = g[res].gltf;
  const dir = path.join(OUT, id);
  const mainName = path.basename(new URL(entry.url).pathname);
  let size = entry.size;
  const st = await download(entry.url, path.join(dir, mainName), entry.md5);
  const parts = [`${mainName} ${st}`];
  for (const [rel, inc] of Object.entries(entry.include || {})) {
    const s = await download(inc.url, path.join(dir, rel), inc.md5);
    size += inc.size;
    parts.push(`${rel} ${s}`);
  }
  total += size;
  manifest[id] = { file: `/models/${id}/${mainName}`, res, bytes: size, license: "CC0", source: `https://polyhaven.com/a/${id}` };
  console.log(`${id.padEnd(28)} ${(size / 1e6).toFixed(1).padStart(5)} MB  ${parts.join(" | ")}`);
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1) + "\n");
console.log(`manifest: ${Object.keys(manifest).length} models, ${(total / 1e6).toFixed(1)} MB fetched/checked`);
