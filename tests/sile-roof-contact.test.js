import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {buildSile} from '../src/sile-world.js';import {applyWorld} from '../src/collide.js';import {buildingRoof} from '../src/sile-roofs.js';
const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const source=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url))),item={id:11,rings:[[[0,0],[12,0],[12,8],[0,8]]],base:50,height:7.5},flat={...item,id:10,rings:[[[30,0],[42,0],[42,8],[30,8]]]},data={...source,buildings:[item,flat],structures:[]},before=JSON.stringify(data),scene=new THREE.Scene(),play=buildSile(scene,data),roof=buildingRoof(item),spec={size:.22},r=spec.size*.48;
function step(from,to,v=[0,0,0],armed=true){const s={x:to[0],y:to[1],z:to[2],vx:v[0],vy:v[1],vz:v[2],armed};if(from)s.motionStart={x:from[0],y:from[1],z:from[2]};applyWorld(s,spec,play);return s;}
test('space above a pitched eave is clear while the visible roof slope stops descent',()=>{
 const free=[6,roof.eaves+.8,.4],s=step(null,free);assert.deepEqual([s.x,s.y,s.z],free,'no invisible flat box up to ridge height');assert.equal(s.grounded,undefined);
 const down=step([6,60,.4],[6,54,.4],[0,-2,0]);assert.equal(down.crashed,undefined);assert.equal(down.grounded,true);const ray=new THREE.Raycaster(new THREE.Vector3(6,60,.4),new THREE.Vector3(0,-1,0)),hit=ray.intersectObject(scene.getObjectByName('sile-buildings-0'))[0];assert.ok(hit);assert.ok(down.y>hit.point.y);assert.ok(down.y-hit.point.y<r*1.1);assert.ok(down.y<item.base+item.height-.5,'land on slope rather than old ridge plane');
});
test('swept contacts stop high speed roof, gable and body crossings at their drawn surface',()=>{
 for(const [from,to,v]of [[[6,65,4],[6,45,4],[0,-40,0]],[[-3,57,4],[15,57,4],[40,0,0]],[[-3,53,4],[15,53,4],[40,0,0]]]){const s=step(from,to,v);assert.equal(s.crashed,true);assert.equal(s.crashReason,'binaya çarptı');assert.ok(s.y>57||s.x<0,'sweep must stop before crossing the shell');}
});
test('pitched roof contacts use the uploaded Float32 roof and gable vertices; source envelope remains intact',()=>{
 const contacts=play.terrainWalls.filter(w=>w.authored==='building-shell'),tops=contacts.filter(w=>w.sourceId===item.id&&w.role==='roof'),gables=contacts.filter(w=>w.sourceId===item.id&&w.role==='gable');assert.equal(tops.length,4);assert.equal(gables.length,2);
 const uploaded=scene.getObjectByName('sile-buildings-0').geometry.attributes.position;assert.deepEqual(tops.flatMap(w=>w.vertices.flat()),Array.from(uploaded.array.slice(0,roof.positions.length)));assert.deepEqual(gables.flatMap(w=>w.vertices.flat()),roof.gables.map(Math.fround));assert.ok(tops.every(w=>w.landing));assert.ok(gables.every(w=>!w.landing));assert.equal(play.prisms[0].maxy,57.5);assert.equal(play.prisms[0].roofEaves,Math.fround(roof.eaves));assert.equal(play.prisms[1].roofEaves,undefined);assert.equal(JSON.stringify(data),before);
});
test('pitched body remains solid below eaves and a flat building keeps its original top contact',()=>{
 const inside=step(null,[6,53,4]);assert.ok(inside.y<50||inside.y>roof.eaves||inside.x<0||inside.x>12||inside.z<0||inside.z>8);
 const flatLanding=step(null,[36,57.55,4],[0,-1,0]);assert.equal(flatLanding.grounded,true);assert.ok(Math.abs(flatLanding.y-(57.5+r))<1e-7);
});

test('successive gravity steps keep tangential movement after a gentle roof touchdown',()=>{
 const landed=step([6,60,1],[6,54,1],[0,-1,0]);assert.equal(landed.grounded,true);let last=landed;
 for(let i=0;i<8;i++){const next=step([last.x,last.y,last.z],[last.x+.1,last.y-.005,last.z],[1,-.1,0]);assert.equal(next.crashed,undefined);assert.equal(next.grounded,true);assert.ok(next.x>last.x+.05,'normal support must not discard tangential displacement');last=next;}
 assert.ok(last.x>landed.x+.6);
});

test('the remaining slide is swept again and cannot pass through an adjacent wall',()=>{
 const landed=step([6,60,1],[6,54,1],[0,-1,0]),s={...landed,x:7,y:landed.y-.005,vx:4,vy:-.1,vz:0,motionStart:{x:landed.x,y:landed.y,z:landed.z}},vertices=[[6.25,55,0],[6.25,60,0],[6.25,55,8]],wall={vertices,reason:'test wall'},second={vertices:[vertices[1],[6.25,60,8],vertices[2]],reason:'test wall'};
 applyWorld(s,spec,{...play,terrainWalls:[...play.terrainWalls,wall,second]});assert.equal(s.crashed,undefined);assert.ok(s.x>6.1&&s.x<=6.25-r+.00001,'projected movement must stop at the new wall');assert.equal(s.grounded,true);
});

test('real Şile building-pad setup preserves every pitched roof contact batch',()=>{
 const s=new THREE.Scene(),p=buildSile(s,source),roofs=source.buildings.filter(b=>buildingRoof(b)),contacts=p.terrainWalls.filter(w=>w.authored==='building-shell');assert.ok(p.terrain.buildingPads.length,'exercise pad installation after building contacts');assert.equal(contacts.filter(w=>w.role==='roof').length,roofs.length*4);assert.equal(contacts.filter(w=>w.role==='gable').length,roofs.length*2);assert.equal(new Set(contacts.map(w=>w.sourceId)).size,roofs.length);
 for(const b of roofs){const c=contacts.filter(w=>w.sourceId===b.id);assert.deepEqual(c.filter(w=>w.role==='roof').flatMap(w=>w.vertices.flat()),buildingRoof(b).positions.map(Math.fround));}
});
