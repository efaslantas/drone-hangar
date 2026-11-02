import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import fs from 'node:fs';
import * as api from '../src/sile-world.js';
const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
test('Şile meshes and collision footprints share the snapshot, with finite geometry and a bounded draw budget',()=>{
 const scene=new THREE.Scene();const play=api.buildSile(scene,data);
 assert.equal(play.terrain.heights,data.terrain.heights);assert.equal(play.terrain.land,data.terrain.land);assert.equal(play.prisms.filter(q=>q.authored!=='coastal-foundation').length,data.buildings.length+data.structures.length);assert.equal(play.spawn.x,0);assert.equal(play.spawn.z,0);
 assert.ok(scene.getObjectByName('sile-terrain'));assert.ok(scene.getObjectByName('sile-sea'));assert.ok(scene.getObjectByName('sile-roads'));
 let meshes=0;scene.traverse(o=>{if(o.isMesh){meshes++;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));}});assert.ok(meshes<=51,`draw-budget ${meshes}`);
 for(let i=0;i<data.buildings.length;i++){assert.equal(play.prisms[i].rings,data.buildings[i].rings);const base=data.buildings[i].landmark==='castle'?play.terrain.platforms[0].height:data.buildings[i].base;assert.equal(play.prisms[i].maxy,base+data.buildings[i].height);}
});

test('Şile road and launch paint follow the rendered terrain within one millimetre',async()=>{
 const {terrainHeight}=await import('../src/geo-terrain.js');const scene=new THREE.Scene();api.buildSile(scene,data);
 for(const name of ['sile-roads','sile-launch-pad']){const mesh=scene.getObjectByName(name),p=mesh.geometry.attributes.position;assert.equal(mesh.material.polygonOffset,name==='sile-launch-pad');for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getY(i)-terrainHeight(data.terrain,p.getX(i),p.getZ(i)))<.001,name);}
});
