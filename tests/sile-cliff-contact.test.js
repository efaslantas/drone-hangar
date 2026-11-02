import test from'node:test';import assert from'node:assert/strict';import * as THREE from'three';
import{buildCoast}from'../src/sile-coast.js';import{rockGeometry}from'../src/sile-rock-view.js';import{applyWorld}from'../src/collide.js';
const api=await import('../src/sile-rock-view.js');
const terrain={bounds:[-20,20,-20,20],cols:2,rows:2,datum:0,heights:[10,10,10,10],land:[[[[-10,-10],[0,-10],[0,10],[-10,10]]]]};
function fixture(){assert.equal(typeof api.coastCliffContacts,'function');const c=buildCoast(terrain),g=rockGeometry(c.dryCliffs,c.wetCliffs);return{g,walls:api.coastCliffContacts(g)};}
test('a stationary body touching the drawn cliff is separated while its centre remains over water',()=>{
 const {walls}=fixture(),s={x:.1,y:5,z:0,vx:-.2,vy:0,vz:0,armed:false};applyWorld(s,{size:.5},{terrain,terrainWalls:walls});assert.ok(s.x>.19,'body must leave the visible rock face');assert.ok(Math.abs(s.y-5)<.01);assert.ok(Math.abs(s.vx)<1e-5);assert.equal(s.crashed,undefined);
});
test('cliff records use exact indexed uploaded Float32 vertices, with no inferred landing deck',()=>{
 const {g,walls}=fixture(),p=g.attributes.position,ids=g.index;assert.ok(ids&&walls.length);for(const w of walls){assert.equal(w.authored,'coast-cliff');assert.equal(w.landing,false);for(let j=0;j<3;j++){const i=ids.getX(w.face*3+j);assert.deepEqual(w.vertices[j],[p.getX(i),p.getY(i),p.getZ(i)]);}}
});
test('swept body intercepts the visible coast early and clears a flight above its lip',()=>{
 const {walls}=fixture(),s={x:-.1,y:5,z:0,vx:-20,vy:0,vz:0,armed:true,motionStart:{x:1,y:5,z:0}};applyWorld(s,{size:.5},{terrain,terrainWalls:walls});assert.equal(s.crashed,true);assert.equal(s.crashReason,'kayalığa çarptı');assert.ok(s.x>0&&Math.abs(s.y-5)<.01);
 const miss={x:-.1,y:11,z:0,vx:-20,vy:0,vz:0,armed:true,motionStart:{x:1,y:11,z:0}};applyWorld(miss,{size:.5},{terrain,terrainWalls:walls});assert.equal(miss.crashed,undefined);assert.equal(miss.x,-.1);assert.equal(miss.y,11);
});
test('actual Şile world registers visible rock contacts with unchanged geometry and prevents water-side penetration',async()=>{
 const fs=await import('node:fs'),{buildWorld,clearWorld}=await import('../src/world.js'),{surfaceAt}=await import('../src/geo-terrain.js'),{sileWorldFingerprint}=await import('./helpers/sile-world-fingerprint.js');const ctx=new Proxy({getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url))),before=JSON.stringify(data),s=new THREE.Scene(),p=buildWorld(s,'sile',{sileData:data,props:false,quality:'medium'}),records=p.terrainWalls.filter(w=>w.authored==='coast-cliff'),g=s.getObjectByName('sile-coast-cliffs').geometry;assert.ok(records.length>10000);assert.deepEqual(records,api.coastCliffContacts(g));
 const old=JSON.parse(fs.readFileSync(new URL('../docs/sile-cliff-contact-validation.json',import.meta.url))).fingerprints[0].full;assert.equal(sileWorldFingerprint(s,p).collision,old.collision,'all cliff contacts remain identical');assert.equal(JSON.stringify(data),before);
 let probes=0;for(const w of records){const v=w.vertices.map(p=>new THREE.Vector3(...p)),n=new THREE.Triangle(...v).getNormal(new THREE.Vector3()),c=v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3);if(c.x<800||c.y<2||c.y>18||Math.abs(n.y)>.1)continue;const point=c.clone().addScaledVector(n,.12);if(!surfaceAt(p,point.x,point.z).water)continue;const state={x:point.x,y:point.y,z:point.z,vx:-n.x,vy:0,vz:-n.z,armed:false};applyWorld(state,{size:.5},{terrain:p.terrain,terrainWalls:p.terrainWalls});const shifted=new THREE.Vector3(state.x,state.y,state.z);assert.ok(shifted.distanceTo(point)>.06);assert.ok(Math.abs(state.y-point.y)<.08,'no teleport to a cliff top');if(++probes===20)break;}
 assert.equal(probes,20);clearWorld(s);
});
