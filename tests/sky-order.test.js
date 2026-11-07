import test from 'node:test';
import assert from 'node:assert/strict';
import {createSky} from '../src/gfx-webgpu.js';
import {Mesh,BoxGeometry,MeshBasicMaterial,BackSide,Vector3} from 'three';

test('node sky paints behind opaque scenery without writing depth at distant foliage scale',()=>{
 const sky=createSky(),near=new Mesh(new BoxGeometry(),new MeshBasicMaterial());
 // A sky sphere may intersect the depth range of kilometre-wide instanced
 // scenery. Its colour must already be behind that scenery before any leaves
 // write depth, independent of material/distance sorting within the opaque list.
 assert.ok(sky.renderOrder<near.renderOrder,'sky cannot paint over an opaque crown');
 assert.equal(sky.material.depthWrite,false);assert.equal(sky.material.side,BackSide);
 const sun=new Vector3(.1,.8,.3);sky.skyUniforms.sunPosition.value.copy(sun);assert.deepEqual(sky.sunPosition.value.toArray(),sun.toArray());
 sky.geometry.dispose();sky.material.dispose();near.geometry.dispose();near.material.dispose();
});
