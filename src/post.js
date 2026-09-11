import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const BodycamShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    intensity: { value: 1 },
    speed: { value: 0 },
    crash: { value: 0 },
    quality: { value: 1 },
    resolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float intensity;
    uniform float speed;
    uniform float crash;
    uniform float quality;
    uniform vec2 resolution;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    vec2 barrel(vec2 uv, float k) {
      vec2 c = uv * 2.0 - 1.0;
      float r2 = dot(c, c);
      c *= 1.0 + k * r2 + k * 0.18 * r2 * r2;
      return c * 0.5 + 0.5;
    }

    vec3 fetchCA(vec2 uv, float r2) {
      float ca = (0.00065 + crash * 0.01) * intensity * (0.35 + r2);
      float roll = speed * 0.00055 * intensity * (vUv.y - 0.5);
      float r = texture2D(tDiffuse, uv + vec2(ca + roll, 0.0)).r;
      float g = texture2D(tDiffuse, uv + vec2(roll * 0.35, 0.0)).g;
      float b = texture2D(tDiffuse, uv - vec2(ca - roll * 0.5, 0.0)).b;
      return vec3(r, g, b);
    }

    void main() {
      float k = 0.055 * intensity;
      vec2 uv = barrel((vUv - 0.5) / (1.0 + k * 2.6) + 0.5, k);
      vec2 c = vUv * 2.0 - 1.0;
      float r2 = dot(c, c);

      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      vec2 fromC = uv - 0.5;
      float mb = clamp(speed * 0.00028 * intensity, 0.0, 0.028);
      vec3 col = fetchCA(uv, r2);
      if (quality > 0.5) {
        col = col * 0.4
          + fetchCA(uv - fromC * mb, r2) * 0.15
          + fetchCA(uv - fromC * mb * 0.45, r2) * 0.15
          + fetchCA(uv + fromC * mb * 0.45, r2) * 0.15
          + fetchCA(uv + fromC * mb, r2) * 0.15;
      }

      vec2 px = 1.0 / max(resolution, vec2(1.0));
      vec3 blur = col;
      if (quality > 0.5) {
        blur =
          texture2D(tDiffuse, uv + vec2(px.x, 0.0)).rgb +
          texture2D(tDiffuse, uv - vec2(px.x, 0.0)).rgb +
          texture2D(tDiffuse, uv + vec2(0.0, px.y)).rgb +
          texture2D(tDiffuse, uv - vec2(0.0, px.y)).rgb;
        blur *= 0.25;
        col += (col - blur) * (0.16 * intensity);
      }

      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col += col * smoothstep(0.62, 1.15, lum) * 0.22 * intensity;

      col = max(col, 0.0);
      vec3 sh = vec3(0.97, 0.99, 1.02);
      vec3 hi = vec3(1.02, 1.0, 0.97);
      col *= mix(sh, hi, smoothstep(0.12, 0.72, lum));
      float gma = dot(col, vec3(0.29, 0.58, 0.13));
      col = mix(vec3(gma), col, 0.86);

      float n1 = hash(gl_FragCoord.xy + vec2(fract(time * 19.7) * 40.0, fract(time * 7.3) * 18.0));
      float n2 = hash(gl_FragCoord.xy * 1.9 + vec2(fract(time * 4.1) * 90.0, 3.1));
      col += intensity * ((n1 - 0.5) * (0.008 + crash * 0.09) + (n2 - 0.5) * 0.003 * vec3(0.9, 1.0, 1.15));

      float vig = smoothstep(1.72, 0.28, r2);
      col *= mix(0.82, 1.0, mix(1.0, vig, 0.85 * intensity));

      float dirt = hash(floor(uv * 22.0 + 1.7));
      if (intensity > 0.8 && dirt > 0.998) col *= 0.97;
      if (intensity > 0.8 && hash(floor(uv * 9.0 + 4.2)) > 0.998) col *= vec3(0.98, 0.99, 0.97);
      float smear = hash(floor(uv * vec2(6.0, 28.0)));
      if (intensity > 0.8 && smear > 0.999) col *= 0.98;

      float soft = smoothstep(0.55, 1.35, r2) * 0.22 * intensity;
      col = mix(col, blur, soft);

      if (crash > 0.18) {
        float band = step(0.84, hash(vec2(floor(uv.y * 56.0), floor(time * 22.0))));
        col = mix(col, col.gbr * 1.1, band * crash);
      }

      col = max(col, 0.0);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createComposer(renderer, scene, camera, { bloom = false, antialias = true } = {}) {
  const composer = new EffectComposer(renderer);
  // Canvas antialiasing does not affect offscreen composer targets.
  const samples = antialias ? Math.min(2, renderer.capabilities.maxSamples || 0) : 0;
  composer.renderTarget1.samples = samples;
  composer.renderTarget2.samples = samples;
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  let bloomPass = null;
  if (bloom) {
    bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.12, 0.4, 1.05);
    composer.addPass(bloomPass);
  }
  const bodycam = new ShaderPass(BodycamShader);
  composer.addPass(bodycam);
  composer.addPass(new OutputPass());
  return { composer, renderPass, bodycam, bloomPass };
}
