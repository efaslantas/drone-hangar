import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import fs from 'node:fs';
import {buildSile} from '../src/sile-world.js';
import * as visual from '../src/sile-materials.js';
const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
test('facade tiles fit whole bays and floors for reversed and oblique wall quads',()=>{
 for(const [a,b] of [[[0,0],[9,0]],[[9,0],[0,0]],[[2,3],[8,11]]]){
  const p=[...a.slice(0,1),-2,a[1],b[0],-2,b[1],a[0],5.5,a[1],b[0],-2,b[1],b[0],5.5,b[1],a[0],5.5,a[1]];
  const uv=visual.facadeUvs(p,-2,7.5);assert.equal(uv.length,12);assert.ok(uv.every(Number.isFinite));
  const us=uv.filter((_,i)=>i%2===0),vs=uv.filter((_,i)=>i%2===1);
  assert.equal(Math.min(...us),0);assert.equal(Math.max(...us),3);assert.equal(Math.min(...vs),0);assert.equal(Math.max(...vs),3);
 }
});
test('authored building templates add UVs without changing source collision and keep data maps linear',()=>{
 const scene=new THREE.Scene(),play=buildSile(scene,data);
 const walls=scene.getObjectByName('sile-buildings-1');assert.ok(walls.material.map,'window/plaster texture');
 assert.equal(walls.geometry.attributes.uv.count,walls.geometry.attributes.position.count);
 assert.equal(walls.material.map.colorSpace,THREE.SRGBColorSpace);
 assert.equal(walls.material.bumpMap.colorSpace,THREE.NoColorSpace);
 assert.equal(walls.material.roughnessMap.colorSpace,THREE.NoColorSpace);
 assert.ok(scene.getObjectByName('sile-buildings-0').geometry.attributes.color);
 assert.equal(play.prisms[0].rings,data.buildings[0].rings);
 assert.equal(play.prisms[0].maxy,data.buildings[0].base+data.buildings[0].height);
});
test('water motion uses absolute simulation time, remains dielectric, and clears safely',()=>{
 const scene=new THREE.Scene();buildSile(scene,data);const sea=scene.getObjectByName('sile-sea');
 assert.equal(sea.material.metalness,0);assert.ok(sea.material.normalMap);assert.ok(scene.getObjectByName('sile-shore-foam'));
 visual.tickSileWater(scene,10);const first=sea.material.normalMap.offset.clone();visual.tickSileWater(scene,10);assert.ok(first.equals(sea.material.normalMap.offset));
 visual.tickSileWater(scene,12);assert.ok(!first.equals(sea.material.normalMap.offset));
 scene.userData.sileWater=null;assert.doesNotThrow(()=>visual.tickSileWater(scene,13));
});
test('smoothed terrain preserves vertex heights and foam avoids crop-border closures',()=>{
 const scene=new THREE.Scene();buildSile(scene,data);
 const ground=scene.getObjectByName('sile-terrain').geometry;
 assert.ok(ground.index,'shared vertices interpolate lighting only');
 assert.ok(ground.attributes.normal.array.every(Number.isFinite));
 const source=new Set();for(let i=0;i<data.positions.length;i+=3)source.add(data.positions.slice(i,i+3).map(v=>v.toFixed(2)).join(','));
 const p=ground.attributes.position;let retained=0;for(let i=0;i<p.count;i++)if(source.has([p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(2)).join(',')))retained++;assert.ok(retained>1000,'original unmasked terrain vertices retained; sourced beach boundaries may add cut vertices');
 const foam=scene.getObjectByName('sile-shore-foam').geometry.attributes.position;
 assert.ok(foam.count>0);for(let i=0;i<foam.count;i++)assert.ok(Math.abs(foam.getY(i)-(-data.terrain.datum+.025))<.0001);
 const cropped=structuredClone(data);cropped.terrain.land=[[[[cropped.terrain.bounds[0],0],[cropped.terrain.bounds[0],10],[cropped.terrain.bounds[0],20]]]];
 const edgeScene=new THREE.Scene();buildSile(edgeScene,cropped);assert.equal(edgeScene.getObjectByName('sile-shore-foam').geometry.attributes.position.count,0);
});
test('launch marking has transparent grass between the ring and H',()=>{
 const scene=new THREE.Scene();buildSile(scene,data);const pad=scene.getObjectByName('sile-launch-pad');
 assert.ok(pad.material.map,'authored marking texture');assert.equal(pad.material.transparent,true);assert.equal(pad.material.depthWrite,false);
 assert.equal(pad.geometry.attributes.uv.count,pad.geometry.attributes.position.count);
});
test('unused building batches release their authored textures on an empty source subset',()=>{
 const empty={...data,buildings:[],structures:[]};const original=THREE.Texture.prototype.dispose;let disposed=0;
 THREE.Texture.prototype.dispose=function(){disposed++;return original.call(this)};
 try{buildSile(new THREE.Scene(),empty);assert.equal(disposed,19);}finally{THREE.Texture.prototype.dispose=original;}
});
test('all actual foam vertices and triangle interiors remain water after Float32 upload',async()=>{
 const {surfaceAt}=await import('../src/geo-terrain.js');const scene=new THREE.Scene(),play=buildSile(scene,data),p=scene.getObjectByName('sile-shore-foam').geometry.attributes.position;
 let spills=0;for(let i=0;i<p.count;i+=3)for(let a=0;a<=4;a++)for(let b=0;b<=4-a;b++){const u=a/4,v=b/4,x=p.getX(i)*(1-u-v)+p.getX(i+1)*u+p.getX(i+2)*v,z=p.getZ(i)*(1-u-v)+p.getZ(i+1)*u+p.getZ(i+2)*v;if(!surfaceAt(play,x,z).water)spills++;}
 assert.equal(spills,0,'foam must be clipped against land, not classified by midpoint');
});

test('authored gables replace the top cap inside the unchanged collision envelope and existing material batches',()=>{
 const building={id:11,rings:[[[0,0],[12,0],[12,8],[0,8]]],base:3,height:7.5};const small={...data,buildings:[building],structures:[]},before=JSON.stringify(small),scene=new THREE.Scene(),play=buildSile(scene,small);
 const roof=scene.getObjectByName('sile-buildings-0').geometry,p=roof.attributes.position,n=roof.attributes.normal;
 assert.equal(p.count,12,'four slopes triangles without old flat top/bottom caps');
 for(let i=0;i<p.count;i++){assert.ok(p.getY(i)>=9&&p.getY(i)<=10.5);assert.ok(n.getY(i)>0&&n.getY(i)<1,'sloped outward roof');}
 const wall=scene.getObjectByName('sile-buildings-2').geometry,wp=wall.attributes.position,uv=wall.attributes.uv;
 assert.equal(wp.count,30,'four eave walls plus two gables');
 const high=[];for(let i=0;i<wp.count;i++)if(wp.getY(i)>9)high.push(i);
 assert.equal(high.length,2);for(const i of high){assert.ok(Math.abs(uv.getX(i)-.03)<1e-6);assert.ok(Math.abs(uv.getY(i)-.03)<1e-6);}
 assert.equal(JSON.stringify(small),before);assert.equal(play.prisms[0].rings,building.rings);assert.equal(play.prisms[0].maxy,10.5);
 assert.equal(scene.userData.sileRoofStats.gabled,1);let meshes=0;scene.traverse(o=>{if(o.isMesh)meshes++});assert.ok(meshes<15);
});
