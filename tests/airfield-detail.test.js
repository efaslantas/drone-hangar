import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const api = await import('../src/airfield-detail.js').catch(() => ({}));
const context = new Proxy({ createImageData: (w,h) => ({ data: new Uint8ClampedArray(w*h*4) }), createRadialGradient: () => ({ addColorStop() {} }) }, { get: (o,k) => k in o ? o[k] : () => {} });
globalThis.document = { createElement: () => ({ getContext: () => context }) };

test('airfield detail keeps the flight collision contract identical across quality', () => {
  assert.equal(typeof api.addAirfieldDetail, 'function');
  for (const lite of [false,true]) for (const night of [false,true]) {
    const scene = new THREE.Scene();
    scene.userData = { lite, night };
    const boxes = [{ minx: 10, maxx: 46 }];
    const play = { bounds: { minx:-48,maxx:48,minz:-88,maxz:22 }, boxes };
    api.addAirfieldDetail(scene, play);
    assert.equal(play.boxes, boxes);
    assert.deepEqual(play.boxes, [{ minx:10,maxx:46 }]);
    assert.ok(scene.getObjectByName('airfield-runway-markings'));
    assert.ok(scene.getObjectByName('airfield-horizon'));
    scene.traverse(o => {
      if (o.geometry?.attributes.position) assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));
      if (o.userData.solidDetail) {
        const box = new THREE.Box3().setFromObject(o);
        assert.ok(box.max.x < -9 || box.min.x > 9 || box.min.z > 20, `${o.name}: clear runway`);
      }
    });
  }
});
