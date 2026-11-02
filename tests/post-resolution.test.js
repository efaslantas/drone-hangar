import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createComposer } from '../src/post.js';

// No GL context is needed to exercise the actual composer/pass sizing contract.
function renderer(pixelRatio = 1.25) {
  return { capabilities: { maxSamples: 4 }, getPixelRatio: () => pixelRatio,
    getSize: v => v.set(800, 600) };
}
test('camera filter starts with the actual render-target texel dimensions', () => {
  const { composer, bodycam } = createComposer(renderer(), new THREE.Scene(), new THREE.PerspectiveCamera());
  assert.deepEqual(bodycam.uniforms.resolution.value.toArray(), [1000, 750]);
  composer.dispose();
});
test('camera filter follows viewport and quality pixel-ratio changes without caller uniform writes', () => {
  const { composer, bodycam } = createComposer(renderer(), new THREE.Scene(), new THREE.PerspectiveCamera());
  composer.setSize(390, 844);
  assert.deepEqual(bodycam.uniforms.resolution.value.toArray(), [487, 1055]);
  composer.setPixelRatio(2);
  assert.deepEqual(bodycam.uniforms.resolution.value.toArray(), [780, 1688]);
  composer.setSize(1920, 1080);
  assert.deepEqual(bodycam.uniforms.resolution.value.toArray(), [3840, 2160]);
  composer.dispose();
});

test('node-renderer filter reads physical dimensions initially and after DPR/viewport changes', async () => {
  const { createComposer: createNodeComposer } = await import('../src/gfx-webgpu.js');
  let dimensions = [1000, 750];
  const mock = { getDrawingBufferSize: v => v.set(...dimensions) };
  const { composer, bodycam } = createNodeComposer(mock, new THREE.Scene(), new THREE.PerspectiveCamera(), { aa: false });
  assert.deepEqual(bodycam.uniforms.resolution.value.toArray(), dimensions);
  dimensions = [780, 1688];
  composer.setSize(390, 844);
  assert.deepEqual(bodycam.uniforms.resolution.value.toArray(), dimensions);
});
