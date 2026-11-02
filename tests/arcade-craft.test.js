import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createArcade} from '../src/arcade.js';
test('detailed fictional objects have finite bounds, explicit surface finishes and bounded mesh counts',async()=>{
 const {makeArcadeObject}=await import('../src/arcade-craft.js');
 for(const t of createArcade().targets){
  const object=makeArcadeObject(t);const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3());
  assert.ok([size.x,size.y,size.z].every(v=>Number.isFinite(v)&&v>0));assert.ok(size.x<7&&size.z<6);
  let meshes=0,finishes=new Set();object.traverse(o=>{if(o.isMesh){meshes++;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));finishes.add(o.material.roughness);}});
  assert.ok(meshes<50);assert.ok(finishes.size>=3,'glass/paint/rubber or metal finishes');
 }
});
