import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import * as THREE from'three';
import{surfaceAt}from'../src/geo-terrain.js';import{buildCoast}from'../src/sile-coast.js';
const api=await import('../src/sile-shore-armour.js').catch(()=>({})),data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
test('outer breakwater armour spans the long seaward edge without source mutation or entering navigation land',()=>{
 assert.equal(typeof api.planShoreArmour,'function');const before=JSON.stringify(data),p=api.planShoreArmour(data,{terrain:data.terrain});assert.ok(p.pieces.length>180&&p.pieces.length<=480);assert.ok(p.edges.some(e=>e.len>350));assert.ok(p.pieces.some(p=>p.kind==='block')&&p.pieces.some(p=>p.kind==='rock'));
 for(const e of p.edges.filter(e=>e.len>100)){const distances=p.pieces.filter(p=>p.edge===e.index).map(p=>p.along).sort((a,b)=>a-b);assert.ok(distances[0]<12&&distances.at(-1)>e.len-12);for(let i=1;i<distances.length;i++)assert.ok(distances[i]-distances[i-1]<10,'gap along long shore');}
 for(const piece of p.pieces){assert.ok(piece.vertices.flat().every(Number.isFinite));for(const [x,y,z]of piece.vertices)assert.equal(surfaceAt({terrain:data.terrain},x,z).water,true,'keep paved edge clear');assert.ok(piece.vertices.some(v=>v[1]>-data.terrain.datum));assert.ok(piece.vertices.some(v=>v[1]<-data.terrain.datum),'stone partly below water');}
 assert.equal(JSON.stringify(data),before);assert.deepEqual(api.planShoreArmour(data,{terrain:data.terrain}),p);assert.equal(api.planShoreArmour({...data,id:'yard'},{terrain:data.terrain}).pieces.length,0);
});
test('foam retains offshore clipping and has less alpha inside a sheltered harbour',()=>{
 const terrain={datum:0,cols:2,rows:2,bounds:[-20,20,-20,20],heights:[2,2,2,2],land:[[[[-5,-5],[5,-5],[5,5],[-5,5]]]]},outside=buildCoast(terrain),inside=buildCoast(terrain,{sheltered:[[[[-15,-15],[15,-15],[15,15],[-15,15]]]]});
 assert.ok(outside.foam.colors?.length,'foam needs continuous per-vertex exposure');assert.equal(inside.foam.colors.length,inside.foam.positions.length/3*4);const alpha=p=>p.colors.filter((v,i)=>i%4===3).reduce((s,v)=>s+v,0)/(p.colors.length/4);assert.ok(alpha(inside.foam)<alpha(outside.foam)*.4);for(const p of [inside.foam,outside.foam])assert.ok(p.colors.every(v=>v>=0&&v<=1));
});

const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});globalThis.document={createElement:()=>({getContext:()=>ctx})};
test('shore armour contacts are actual uploaded triangles, stop a descent above water, and release with world',async()=>{
 const {buildWorld,clearWorld}=await import('../src/world.js'),{applyWorld}=await import('../src/collide.js'),scene=new THREE.Scene(),play=buildWorld(scene,'sile',{sileData:data,props:false,quality:'medium'}),mesh=scene.getObjectByName('sile-shore-armour');assert.ok(mesh);const p=mesh.geometry.attributes.position,records=play.terrainWalls.filter(w=>w.mesh===mesh.name);assert.ok(records.length>3000&&records.length<=9600);assert.equal(records.length*3,p.count);assert.equal(mesh.material.length,2);let probes=0;
 for(let i=0;i<records.length;i++){const w=records[i];assert.equal(w.authored,'shore-armour');for(let j=0;j<3;j++)assert.deepEqual(w.vertices[j],[p.getX(i*3+j),p.getY(i*3+j),p.getZ(i*3+j)]);
  if(w.landing&&Math.min(...w.vertices.map(v=>v[1]))>-play.terrain.datum+.3&&probes<20){const c=w.vertices.reduce((a,v)=>a.map((n,k)=>n+v[k]/3),[0,0,0]),s={x:c[0],y:c[1]-.3,z:c[2],motionStart:{x:c[0],y:c[1]+1,z:c[2]},vx:0,vy:-1,vz:0,armed:false};applyWorld(s,{size:.2},{terrainWalls:records,terrain:play.terrain});assert.ok(s.y>c[1]);assert.equal(s.crashed,undefined);probes++;}}
 assert.equal(probes,20);let released=0;const resources=new Set([mesh.geometry,...mesh.material]);for(const m of mesh.material)for(const t of Object.values(m))if(t?.isTexture)resources.add(t);for(const r of resources)r.addEventListener('dispose',()=>released++);clearWorld(scene);assert.equal(released,resources.size);assert.equal(scene.userData.sileShoreArmourStats,null);
});
test('coastal rock fractures retain tonal separation instead of a uniform concrete-like wall',async()=>{
 const {rockTexel}=await import('../src/sile-rock-view.js'),values=[];for(let x=0;x<100;x++)for(let y=0;y<100;y++)values.push(rockTexel(x/100,y/100).color[0]);values.sort((a,b)=>a-b);assert.ok(values[9900]-values[100]>48,'rock fracture contrast at1..99percentile');
});
