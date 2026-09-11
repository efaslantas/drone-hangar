// Which renderer flies the game. The WebGPU path is still experimental, so
// WebGL stays the default for everyone; WebGPU runs only when the pilot asks
// for it with `?gpu=1` (one session) or the Ayarlar toggle (persisted). The
// WebGPU module is loaded on demand so the WebGL path never pays for the
// second three build; if it fails to come up the canvas is swapped for a
// fresh one and WebGL takes over.
import * as THREE from "three";
import { createComposer as createWebGLComposer } from "./post.js";

export const GPU_KEY = "efa-hangar-gpu";

export function gpuPreference() {
  try {
    const q = new URLSearchParams(location.search).get("gpu");
    if (q === "1") return true;
    if (q === "0") return false;
    const v = localStorage.getItem(GPU_KEY);
    if (v === "on") return true;
    if (v === "off") return false;
  } catch {
    /* no storage */
  }
  return null;
}

export function setGpuPreference(on) {
  try {
    localStorage.setItem(GPU_KEY, on ? "on" : "off");
  } catch {
    /* no storage */
  }
}

export function hasWebGPU() {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

export function wantsWebGPU(touchUi) {
  void touchUi;
  const pref = gpuPreference();
  // No default flip while the path is experimental: an explicit ask only.
  return pref === true && hasWebGPU();
}

export function gfxLabel(kind) {
  return kind === "webgpu" ? "WebGPU" : kind === "webgl2-node" ? "WebGL2 (node)" : "WebGL";
}

export async function createGfx(canvas, { touchUi = false, wantGpu = false } = {}) {
  const powerPreference = touchUi ? "low-power" : "high-performance";
  if (wantGpu) {
    try {
      const mod = await import("./gfx-webgpu.js");
      const g = await mod.createWebGPU(canvas, { antialias: !touchUi, powerPreference });
      return { kind: g.backend, node: true, canvas, renderer: g.renderer, PMREMGenerator: g.PMREMGenerator, createComposer: g.createComposer, createSky: g.createSky };
    } catch (err) {
      console.warn("[gfx] WebGPU yolu açılamadı, WebGL'e dönülüyor:", err);
      // A canvas that already handed out a webgpu context can't open WebGL.
      const fresh = canvas.cloneNode(false);
      canvas.replaceWith(fresh);
      canvas = fresh;
    }
  }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touchUi, powerPreference });
  return {
    kind: "webgl",
    node: false,
    canvas,
    renderer,
    PMREMGenerator: THREE.PMREMGenerator,
    createComposer: (scene, camera, opts) => createWebGLComposer(renderer, scene, camera, opts),
    createSky: null, // world.js uses the classic Sky addon
  };
}
