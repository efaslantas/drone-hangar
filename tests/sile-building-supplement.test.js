import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import * as api from '../src/sile-building-supplement-data.js';import {buildSile} from '../src/sile-world.js';import {applyWorld} from '../src/collide.js';import {createSileLoader} from '../src/sile-data.js';import {coastCliffContacts} from '../src/sile-rock-view.js';
const raw=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url))),snapshot=JSON.stringify(raw),ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});globalThis.document={createElement:()=>({getContext:()=>ctx})};
test('supplement is pinned to the unchanged base map and explicitly carries no height measurements',async()=>{
 const e=await api.prepareBuildingSupplement(raw);assert.notEqual(e,raw);assert.equal(e.buildings,raw.buildings);assert.equal(JSON.stringify(raw),snapshot);assert.equal(e.supplementalBuildings.length,14);assert.ok(e.supplementalBuildings.every(b=>b.height===7.5&&b.heightSource==='assumed-7.5m'&&b.sourceHeightAvailable===false&&b.confidence>=.99));await assert.rejects(api.prepareBuildingSupplement({...raw,buildings:raw.buildings.slice(1)}),/kaynak/);
});
test('loader shares one preparation and does not expose the raw map before preparation finishes',async()=>{
 let count=0;const loader=createSileLoader(async()=>({ok:true,json:async()=>raw}),async d=>{count++;return api.prepareBuildingSupplement(d)});const a=loader.load(),b=loader.load();assert.equal(loader.get(),null);assert.equal(await a,await b);assert.equal(loader.get(),await a);assert.equal(count,1);assert.ok(loader.get().supplementalBuildings);
});
test('added footprints own visible and swept physical shell while the source map remains intact',async()=>{
 const e=await api.prepareBuildingSupplement(raw),scene=new THREE.Scene(),p=buildSile(scene,e),m=scene.getObjectByName('sile-supplemental-buildings');assert.ok(m);const records=p.terrainWalls.filter(w=>w.authored==='overture-building');assert.deepEqual(records.map(w=>w.vertices),coastCliffContacts(m.geometry).map(w=>w.vertices));const prism=p.prisms.find(q=>q.authored==='overture-building');assert.ok(prism);const top=records.find(w=>w.sourceId===prism.sourceId&&w.landing),v=top.vertices,c=v.reduce((s,p)=>s.map((n,k)=>n+p[k]/3),[0,0,0]);const state={x:c[0],y:c[1]-2,z:c[2],motionStart:{x:c[0],y:c[1]+5,z:c[2]},vx:0,vy:-30,vz:0,armed:true};applyWorld(state,{size:.22},p);assert.equal(state.crashed,true);assert.equal(state.crashReason,'binaya çarptı');assert.ok(state.y>c[1]);assert.equal(JSON.stringify(raw),snapshot);assert.ok(scene.userData.sileSupplementStats.buildings>0);
});

test('plain HTTP LAN contexts without Web Crypto still load the same pinned source layer',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');Object.defineProperty(globalThis,'crypto',{value:{},configurable:true});try{const e=await api.prepareBuildingSupplement(raw);assert.equal(e.supplementalBuildings.length,14);await assert.rejects(api.prepareBuildingSupplement({...raw,roads:[]}),/kaynak/);}finally{Object.defineProperty(globalThis,'crypto',descriptor);}
});

test('a preparation failure resets the inflight loader and permits a clean retry',async()=>{
 let fail=true,count=0;const loader=createSileLoader(async()=>({ok:true,json:async()=>raw}),async d=>{count++;if(fail)throw Error('prepare failed');return api.prepareBuildingSupplement(d)});await assert.rejects(loader.load(),/prepare failed/);assert.equal(loader.get(),null);fail=false;const e=await loader.load();assert.ok(e.supplementalBuildings);assert.equal(count,2);
});
test('world cleanup disposes the extra geometry and shared materials once and clears supplement metadata',async()=>{
 const {buildWorld,clearWorld}=await import('../src/world.js'),e=await api.prepareBuildingSupplement(raw),s=new THREE.Scene();buildWorld(s,'sile',{sileData:e,props:false,quality:'medium'});const mesh=s.getObjectByName('sile-supplemental-buildings');assert.ok(mesh);let disposed=0;const resources=new Set([mesh.geometry,...mesh.material]);assert.equal(resources.size,3);for(const r of resources)r.addEventListener('dispose',()=>disposed++);clearWorld(s);assert.equal(disposed,3);assert.equal(s.userData.sileSupplementStats,null);
});
