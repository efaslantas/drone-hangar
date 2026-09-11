#!/usr/bin/env node
// Turn the raw Poly Haven downloads (glTF + JPG textures, ~2–5 MB each) into
// single .glb files with meshopt-compressed geometry and WebP textures (~5x
// smaller), then drop the raw files and point manifest.json at the .glb.
// Needs network once for `npx @gltf-transform/cli`. Usage: node tools/optimize-models.mjs [id ...]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "models");
const manifestFile = path.join(OUT, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(manifest);
const size = Number(process.env.TEXTURE_SIZE || 1024);

let before = 0;
let after = 0;
for (const id of ids) {
  const dir = path.join(OUT, id);
  const raw = fs.readdirSync(dir).find((f) => f.endsWith(".gltf"));
  const glb = path.join(dir, `${id}.glb`);
  if (!raw) {
    if (fs.existsSync(glb)) console.log(`${id}: already .glb`);
    else console.log(`${id}: nothing to optimize`);
    continue;
  }
  const rawBytes = manifest[id]?.bytes || 0;
  execFileSync("npx", ["--yes", "@gltf-transform/cli@4", "optimize", path.join(dir, raw), glb, "--compress", "meshopt", "--texture-compress", "webp", "--texture-size", String(size)], { stdio: ["ignore", "ignore", "inherit"] });
  const glbBytes = fs.statSync(glb).size;
  // Prune the raw set: the .glb embeds geometry + textures.
  for (const f of fs.readdirSync(dir)) if (f !== `${id}.glb`) fs.rmSync(path.join(dir, f), { recursive: true, force: true });
  manifest[id] = { ...manifest[id], file: `/models/${id}/${id}.glb`, bytes: glbBytes, raw: rawBytes, encoding: "meshopt+webp" };
  before += rawBytes;
  after += glbBytes;
  console.log(`${id.padEnd(28)} ${(rawBytes / 1e6).toFixed(2).padStart(5)} MB → ${(glbBytes / 1e6).toFixed(2)} MB`);
}
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1) + "\n");
console.log(`total ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB`);
