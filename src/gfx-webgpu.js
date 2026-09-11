// WebGPU render path. three's WebGPURenderer (it falls back to its own WebGL2
// backend when the browser has no WebGPU) plus the bodycam post stage rewritten
// in TSL, so one pipeline serves both backends and can carry node-based effects
// (bloom, FXAA) that the classic EffectComposer never could. Loaded on demand by
// gfx.js — this module pulls in the separate three/webgpu build, so it must not
// be imported statically from the WebGL path.
import * as W from "three/webgpu";
import { pass, uniform, vec2, vec3, vec4, float, uv, Fn, mix, smoothstep, dot, fract, sin, floor, step, select, max, clamp, screenCoordinate, If, mrt, output, normalView } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { fxaa } from "three/addons/tsl/display/FXAANode.js";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { SkyMesh } from "three/addons/objects/SkyMesh.js";

export async function createWebGPU(canvas, { antialias = true, powerPreference = "high-performance", forceWebGL = false } = {}) {
  const renderer = new W.WebGPURenderer({ canvas, antialias, powerPreference, forceWebGL });
  await renderer.init();
  const backend = renderer.backend?.isWebGPUBackend ? "webgpu" : "webgl2-node";
  return {
    renderer,
    backend,
    PMREMGenerator: W.PMREMGenerator,
    createComposer: (scene, camera, opts) => createComposer(renderer, scene, camera, opts),
    createSky,
  };
}

/**
 * The classic Sky addon is a GLSL ShaderMaterial the node renderer cannot run
 * (it rendered black and poisoned the PMREM environment). SkyMesh is its TSL
 * twin; `skyUniforms` mirrors `material.uniforms` so world.js sets both alike.
 */
export function createSky() {
  const mesh = new SkyMesh();
  mesh.skyUniforms = {
    turbidity: mesh.turbidity,
    rayleigh: mesh.rayleigh,
    mieCoefficient: mesh.mieCoefficient,
    mieDirectionalG: mesh.mieDirectionalG,
    sunPosition: mesh.sunPosition,
  };
  return mesh;
}

/**
 * Same contract as post.js createComposer: { composer.render/setSize,
 * renderPass.camera, bodycam.uniforms.{time,intensity,speed,crash,quality,resolution} }.
 * The uniform objects are TSL uniform nodes, so `.value` writes flow straight in.
 */
export function createComposer(renderer, scene, camera, { bloom: wantBloom = false, aa = true, ao: wantAO = false } = {}) {
  const post = new W.PostProcessing(renderer);
  const scenePass = pass(scene, camera);
  // Ground-truth ambient occlusion: contact shadows under containers, along
  // building feet, inside the hangar — the biggest single step away from the
  // "flat boxes" look. Needs view-space normals alongside colour (MRT).
  let aoPass = null;
  let aoTex = null;
  if (wantAO) {
    scenePass.setMRT(mrt({ output, normal: normalView }));
    aoPass = ao(scenePass.getTextureNode("depth"), scenePass.getTextureNode("normal"), camera);
    aoPass.resolutionScale = 0.75;
    aoPass.radius.value = 0.55;
    aoPass.thickness.value = 1.2;
    aoPass.samples.value = 12;
    aoTex = aoPass.getTextureNode();
  }
  const color = scenePass.getTextureNode("output");
  const u = {
    time: uniform(0),
    intensity: uniform(1),
    speed: uniform(0),
    crash: uniform(0),
    quality: uniform(1),
    resolution: uniform(new W.Vector2(1, 1)),
  };

  const hash = Fn(([p]) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453)));
  const barrel = Fn(([uvIn, k]) => {
    const c = uvIn.mul(2).sub(1);
    const r2 = dot(c, c);
    const s = float(1).add(k.mul(r2)).add(k.mul(0.18).mul(r2).mul(r2));
    return c.mul(s).mul(0.5).add(0.5);
  });
  // Chromatic aberration + rolling-shutter smear, three taps.
  const fetchCA = Fn(([suv, r2, vy]) => {
    const ca = float(0.00065).add(u.crash.mul(0.01)).mul(u.intensity).mul(float(0.35).add(r2));
    const roll = u.speed.mul(0.00055).mul(u.intensity).mul(vy.sub(0.5));
    const r = color.sample(suv.add(vec2(ca.add(roll), 0))).r;
    const g = color.sample(suv.add(vec2(roll.mul(0.35), 0))).g;
    const b = color.sample(suv.sub(vec2(ca.sub(roll.mul(0.5)), 0))).b;
    return vec3(r, g, b);
  });

  const bodycam = Fn(() => {
    const vUv = uv();
    const k = u.intensity.mul(0.055);
    const suv = barrel(vUv.sub(0.5).div(k.mul(2.6).add(1)).add(0.5), k);
    const c = vUv.mul(2).sub(1);
    const r2 = dot(c, c);
    const inside = suv.x.greaterThanEqual(0).and(suv.x.lessThanEqual(1)).and(suv.y.greaterThanEqual(0)).and(suv.y.lessThanEqual(1));
    const fromC = suv.sub(0.5);
    const mb = clamp(u.speed.mul(0.00028).mul(u.intensity), 0, 0.028);
    const col = fetchCA(suv, r2, vUv.y).toVar();
    // Occlusion is sampled through the same lens distortion so it stays glued to geometry.
    if (aoTex) col.mulAssign(aoTex.sample(suv).x);
    const hq = u.quality.greaterThan(0.5);
    If(hq, () => {
      // Radial motion blur, four extra taps along the centre line.
      col.assign(
        col.mul(0.4)
          .add(fetchCA(suv.sub(fromC.mul(mb)), r2, vUv.y).mul(0.15))
          .add(fetchCA(suv.sub(fromC.mul(mb).mul(0.45)), r2, vUv.y).mul(0.15))
          .add(fetchCA(suv.add(fromC.mul(mb).mul(0.45)), r2, vUv.y).mul(0.15))
          .add(fetchCA(suv.add(fromC.mul(mb)), r2, vUv.y).mul(0.15)),
      );
    });
    const px = float(1).div(max(u.resolution, vec2(1, 1)));
    const blur = col.toVar();
    If(hq, () => {
      // Cross blur → unsharp mask; the same blur softens the corners further down.
      const b = color.sample(suv.add(vec2(px.x, 0))).rgb
        .add(color.sample(suv.sub(vec2(px.x, 0))).rgb)
        .add(color.sample(suv.add(vec2(0, px.y))).rgb)
        .add(color.sample(suv.sub(vec2(0, px.y))).rgb)
        .mul(0.25);
      blur.assign(b);
      col.addAssign(col.sub(b).mul(u.intensity.mul(0.16)));
    });
    const lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col.addAssign(col.mul(smoothstep(0.62, 1.15, lum)).mul(u.intensity.mul(0.22)));
    col.assign(max(col, 0));
    col.mulAssign(mix(vec3(0.97, 0.99, 1.02), vec3(1.02, 1.0, 0.97), smoothstep(0.12, 0.72, lum)));
    const gma = dot(col, vec3(0.29, 0.58, 0.13));
    col.assign(mix(vec3(gma), col, 0.86));
    const fc = screenCoordinate.xy;
    const n1 = hash(fc.add(vec2(fract(u.time.mul(19.7)).mul(40), fract(u.time.mul(7.3)).mul(18))));
    const n2 = hash(fc.mul(1.9).add(vec2(fract(u.time.mul(4.1)).mul(90), 3.1)));
    col.addAssign(u.intensity.mul(n1.sub(0.5).mul(float(0.008).add(u.crash.mul(0.09))).add(n2.sub(0.5).mul(0.003).mul(vec3(0.9, 1.0, 1.15)))));
    const vig = smoothstep(1.72, 0.28, r2);
    col.mulAssign(mix(0.82, 1.0, mix(1.0, vig, u.intensity.mul(0.85))));
    // Lens dirt: a few fixed specks, only at full bodycam intensity.
    const dirtOn = u.intensity.greaterThan(0.8);
    const d1 = hash(floor(suv.mul(22).add(1.7))).greaterThan(0.998);
    const d2 = hash(floor(suv.mul(9).add(4.2))).greaterThan(0.998);
    const d3 = hash(floor(suv.mul(vec2(6, 28)))).greaterThan(0.999);
    col.mulAssign(select(dirtOn.and(d1), float(0.97), float(1.0)));
    col.mulAssign(select(dirtOn.and(d2), vec3(0.98, 0.99, 0.97), vec3(1, 1, 1)));
    col.mulAssign(select(dirtOn.and(d3), float(0.98), float(1.0)));
    const soft = smoothstep(0.55, 1.35, r2).mul(u.intensity.mul(0.22));
    col.assign(mix(col, blur, soft));
    // Crash glitch: horizontal bands with the channels rotated.
    const band = step(0.84, hash(vec2(floor(suv.y.mul(56)), floor(u.time.mul(22)))));
    const bandAmt = select(u.crash.greaterThan(0.18), band.mul(u.crash), float(0));
    col.assign(mix(col, col.gbr.mul(1.1), bandAmt));
    col.assign(max(col, 0));
    const processed = select(inside, col, vec3(0, 0, 0));
    // intensity 0 is the pass switched off: hand the frame through untouched.
    return vec4(select(u.intensity.greaterThan(0.0001), processed, color.rgb), 1.0);
  });

  let out = bodycam();
  if (wantBloom) out = out.add(bloom(color, 0.16, 0.35, 1.0));
  if (aa) out = fxaa(out);
  post.outputNode = out;

  const renderPass = { camera };
  let aoCam = camera;
  const composer = {
    render() {
      scenePass.camera = renderPass.camera;
      // FPV ↔ chase: GTAO bound the first camera's projection at build time;
      // re-point its uniforms when the active camera changes (three r179 internals).
      if (aoPass && renderPass.camera !== aoCam) {
        aoCam = renderPass.camera;
        if (aoPass._cameraProjectionMatrix) aoPass._cameraProjectionMatrix.value = aoCam.projectionMatrix;
        if (aoPass._cameraProjectionMatrixInverse) aoPass._cameraProjectionMatrixInverse.value = aoCam.projectionMatrixInverse;
        if (aoPass._cameraNear) aoPass._cameraNear.object = aoCam;
        if (aoPass._cameraFar) aoPass._cameraFar.object = aoCam;
      }
      post.render();
    },
    // Pass targets follow renderer.setSize; nothing to do here.
    setSize() {},
  };
  return { composer, renderPass, bodycam: { enabled: true, uniforms: u }, bloomPass: null };
}
