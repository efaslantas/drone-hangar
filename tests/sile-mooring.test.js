import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {applyWorld} from '../src/collide.js';import {surfaceAt,insidePolygon} from '../src/geo-terrain.js';
const api=await import('../src/sile-mooring.js').catch(()=>({}));
const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
test('three disconnected source piers receive bounded landed connections without source mutation',()=>{
 assert.equal(typeof api.planMooringLinks,'function');const before=JSON.stringify(data),plan=api.planMooringLinks(data,{terrain:data.terrain});assert.equal(plan.links.length,3);
 for(const p of plan.links){assert.ok(p.length>3&&p.length<55);assert.ok(p.width>=2&&p.width<=4);const pier=data.structures.find(s=>s.id===p.sourceId);assert.ok(pier);for(const v of p.top.slice(0,2))assert.equal(surfaceAt({terrain:data.terrain},v[0],v[2]).water,false);for(const v of p.top.slice(2))assert.ok(insidePolygon(v[0],v[2],pier.rings));assert.ok(p.top.every(v=>v.every(Number.isFinite)));}
 assert.equal(JSON.stringify(data),before);assert.equal(api.planMooringLinks({...data,id:'yard'},{terrain:data.terrain}).links.length,0);
});
const top=[[-2,1,-2],[2,1,-2],[2,2,2],[-2,2,2]],walls=[{vertices:[top[0],top[3],top[1]],reason:'iskele geçidine çarptı'},{vertices:[top[1],top[3],top[2]],reason:'iskele geçidine çarptı'}];
const state=(x,y,z)=>({x,y,z,vx:0,vy:-1,vz:0,armed:false});
test('drawn sloping triangle stops deck contact without an invisible underpass solid',()=>{
 const s=state(.5,1.55,0);applyWorld(s,{size:.5},{terrainWalls:walls});assert.ok(s.y>1.7);assert.ok(s.z<0);
 const below=state(.5,.5,0);applyWorld(below,{size:.5},{terrainWalls:walls});assert.equal(below.y,.5);
 const miss=state(2.3,1.5,0);applyWorld(miss,{size:.5},{terrainWalls:walls});assert.equal(miss.x,2.3);
});
test('fast contact stops on the first actual bridge face from either side',()=>{
 for(const sign of [-1,1]){const s={...state(.5,1.5-sign*2,0),vy:-sign*8,motionStart:{x:.5,y:1.5+sign*2,z:0}};applyWorld(s,{size:.5},{terrainWalls:walls});assert.ok(sign*(s.y-1.5)>.2);assert.equal(s.crashed,undefined);}
});
test('real water under each bridge stays flyable above the sea and below the visible deck',()=>{
 const scene=new THREE.Scene(),play={terrain:data.terrain,terrainWalls:[],boxes:[],prisms:[]},plan=api.addMooringLinks(scene,data,play);
 for(const link of plan.links){const shore=link.top[0].map((v,k)=>(v+link.top[1][k])/2),pier=link.top[2].map((v,k)=>(v+link.top[3][k])/2),point=shore.map((v,k)=>v*.2+pier[k]*.8);const s={...state(point[0],point[1]-.55,point[2]),vy:0};assert.equal(surfaceAt(play,s.x,s.z).water,true);applyWorld(s,{size:.5},play);assert.equal(s.crashed,undefined);assert.ok(Math.abs(s.y-(point[1]-.55))<1e-8);}
});
test('the quay covers the source shoreline behind each disconnected pier',()=>{
 const scene=new THREE.Scene(),play={terrain:data.terrain,terrainWalls:[],boxes:[],prisms:[]},plan=api.addMooringLinks(scene,data,play),quay=play.terrainWalls.filter(w=>w.mesh==='sile-harbour-quay');
 for(const link of plan.links){const [x,z]=link.shorePoint,target=new THREE.Vector3(x,surfaceAt(play,x,z).height-.1,z),nearest=new THREE.Vector3();assert.ok(quay.some(record=>new THREE.Triangle(...record.vertices.map(v=>new THREE.Vector3(...v))).closestPointToPoint(target,nearest).distanceTo(target)<.06),'missing quay behind '+link.sourceId);}
});
test('upward deck contact records landing, with underside contact remaining airborne',()=>{
 for(const swept of [false,true]){const s=state(.5,swept?-.5:1.55,0);s.vy=-2;if(swept)s.motionStart={x:.5,y:3.5,z:0};applyWorld(s,{size:.5},{terrainWalls:walls.map(w=>({...w,landing:true}))});assert.equal(s.grounded,true);assert.ok(s.worldTouchdown.verticalSpeed>0);}
 const below={...state(.5,1.4,0),vy:2};applyWorld(below,{size:.5},{terrainWalls:walls.map(w=>({...w,landing:true}))});assert.equal(below.grounded,undefined);assert.equal(below.worldTouchdown,undefined);
});
test('all rendered mooring and quay triangles match physical records and release with world',async()=>{
 const {buildWorld,clearWorld}=await import('../src/world.js'),scene=new THREE.Scene(),play=buildWorld(scene,'sile',{sileData:data,props:false,quality:'medium'});let disposed=0;
 for(const name of ['sile-mooring-links','sile-harbour-quay']){
  const m=scene.getObjectByName(name);assert.ok(m);const p=m.geometry.attributes.position,records=play.terrainWalls.filter(w=>w.mesh===name);assert.equal(p.count,records.length*3);
  for(let i=0;i<records.length;i++)for(let j=0;j<3;j++){const v=[p.getX(i*3+j),p.getY(i*3+j),p.getZ(i*3+j)];assert.deepEqual(records[i].vertices[j],v);for(let k=0;k<3;k++)assert.ok(v[k]>=records[i].contactBounds[k*2]&&v[k]<=records[i].contactBounds[k*2+1]);}
  if(name==='sile-harbour-quay')for(const record of records){const triangle=new THREE.Triangle(...record.vertices.map(v=>new THREE.Vector3(...v))),normal=triangle.getNormal(new THREE.Vector3()),center=triangle.getMidpoint(new THREE.Vector3());assert.equal(surfaceAt(play,center.x+normal.x*.1,center.z+normal.z*.1).water,true,'quay face must face water');const i=records.indexOf(record)*3,uv=m.geometry.attributes.uv,u=[0,1,2].map(j=>[uv.getX(i+j),uv.getY(i+j)]);assert.ok(Math.abs((u[1][0]-u[0][0])*(u[2][1]-u[0][1])-(u[1][1]-u[0][1])*(u[2][0]-u[0][0]))>1e-8,'vertical quay UV must have area');}
  for(const r of [m.geometry,m.material])r.addEventListener('dispose',()=>disposed++);
 }
 assert.equal(scene.userData.sileMooringStats.links,3);assert.ok(scene.userData.sileMooringStats.quayTriangles>0);clearWorld(scene);assert.equal(disposed,4);assert.equal(scene.userData.sileMooringStats,null);
});
