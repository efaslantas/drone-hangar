import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {buildSile} from '../src/sile-world.js';import {surfaceAt,terrainHeight,insidePolygon} from '../src/geo-terrain.js';
const coast=await import('../src/sile-coast.js').catch(()=>({}));
const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url))),before=JSON.stringify(data);
test('mapped beaches and the recovered source islet rock drape land without mutating source or colliders',()=>{
 const scene=new THREE.Scene(),play=buildSile(scene,data);for(const kind of ['sand','rock']){
  const mesh=scene.getObjectByName('sile-source-'+kind);assert.ok(mesh,'mapped '+kind+' was previously unused');const p=mesh.geometry.attributes.position;assert.ok(p.count>0);for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);assert.equal(surfaceAt(play,x,z).water,false);assert.ok(Math.abs(p.getY(i)-terrainHeight(play.terrain,x,z)-.0005)<.0002);}
 const ray=new THREE.Raycaster(),ground=scene.getObjectByName('sile-terrain');scene.updateMatrixWorld(true);
  for(let j=0;j<p.count;j+=90){if(j+2>=p.count)continue;const x=(p.getX(j)+p.getX(j+1)+p.getX(j+2))/3,z=(p.getZ(j)+p.getZ(j+1)+p.getZ(j+2))/3;ray.set(new THREE.Vector3(x,100,z),new THREE.Vector3(0,-1,0));assert.equal(ray.intersectObject(ground).length,0,'grass under sourced beach must be removed to avoid triangular depth patches');}
 }assert.ok(scene.getObjectByName('sile-source-rock'),'mapped rock must cover the recovered closed source islet');assert.equal(JSON.stringify(data),before);assert.equal(play.prisms.filter(q=>q.authored!=='coastal-foundation').length,data.buildings.length+data.structures.length);let meshes=0;scene.traverse(o=>{if(o.isMesh)meshes++});assert.ok(meshes<=49);
});
test('new shoreline foam stay completely offshore after Float32 upload',()=>{
 const scene=new THREE.Scene(),play=buildSile(scene,data);for(const name of ['sile-shore-foam']){const mesh=scene.getObjectByName(name);assert.ok(mesh);const p=mesh.geometry.attributes.position;assert.ok(p.count>0);for(let i=0;i<p.count;i+=3)for(const [a,b] of [[0,0],[1,0],[0,1],[.2,.3],[.5,.5]]){const x=p.getX(i)*(1-a-b)+p.getX(i+1)*a+p.getX(i+2)*b,z=p.getZ(i)*(1-a-b)+p.getZ(i+1)*a+p.getZ(i+2)*b;assert.ok(surfaceAt(play,x,z).water);}}
});
test('coast segmentation has continuous metric UVs, variable width and no crop closure foam',()=>{
 assert.equal(typeof coast.buildCoast,'function');const t={bounds:[-20,20,-20,20],cols:2,rows:2,datum:0,heights:[3,3,3,3],land:[[[[-10,-10],[10,-10],[10,10],[-10,10]]]]};const c=coast.buildCoast(t);assert.ok(c.foam.positions.length);assert.ok(c.foam.uv.some(v=>v>1),'UVs do not reset per grid edge');assert.ok(c.cliffs.positions.length>4*18,'fracture subdivision');
 const crop={...t,land:[[[[-20,-20],[-20,20],[-20,10]]]]};assert.equal(coast.buildCoast(crop).foam.positions.length,0);
 for(let i=0;i<c.cliffs.positions.length;i+=3){const [x,y,z]=c.cliffs.positions.slice(i,i+3);assert.ok(x>=-10-.0001&&x<=10.0001&&z>=-10-.0001&&z<=10.0001);assert.ok(y>=-.2001&&y<=3.0001);}
 const reversed=coast.buildCoast({...t,land:t.land.map(r=>r.map(p=>p.toReversed()))});assert.equal(reversed.foam.positions.length,c.foam.positions.length);
});

test('foam faces upward from sea for both source ring windings',()=>{
 const land=[[[-10,-10],[10,-10],[10,10],[-10,10]]],terrain={bounds:[-20,20,-20,20],cols:2,rows:2,datum:0,heights:[3,3,3,3],land:[land]};
 for(const rings of [land,land.map(r=>r.toReversed())]){const p=coast.buildCoast({...terrain,land:[rings]}).foam.positions;for(let i=0;i<p.length;i+=9){const ax=p[i+3]-p[i],az=p[i+5]-p[i+2],bx=p[i+6]-p[i],bz=p[i+8]-p[i+2];assert.ok(az*bx-ax*bz>1e-10,'coast surface must face upward');}}
});
test('closed coast completes an integer number of foam texture periods at its shared start/end join',()=>{
 const terrain={bounds:[-20,20,-20,20],cols:2,rows:2,datum:0,heights:[3,3,3,3],land:[[[[-10,-10],[10,-10],[10,10],[-10,10]]]]},uv=coast.buildCoast(terrain).foam.uv.filter((_,i)=>i%2===0),span=Math.max(...uv)-Math.min(...uv);assert.ok(span>1);assert.ok(Math.abs(span-Math.round(span))<1e-9,'periodic texture phase must meet itself on a closed island');
});

test('short original coast edges meet the same foam outer vertex at the closing join',()=>{
 const terrain={bounds:[-20,20,-20,20],cols:2,rows:2,datum:0,heights:[3,3,3,3],land:[[[[0,0],[.4,0],[.4,10],[-10,10],[-10,0]]]]};
 for(const name of ['foam']){const strip=coast.buildCoast(terrain)[name],us=strip.uv.filter((_,i)=>i%2===0),lo=Math.min(...us),hi=Math.max(...us),ends=[];for(let i=0;i<us.length;i++)if((Math.abs(us[i]-lo)<1e-9||Math.abs(us[i]-hi)<1e-9)&&Math.abs(strip.uv[i*2+1]-1)<1e-9)ends.push(strip.positions.slice(i*3,i*3+3));assert.ok(ends.length>=2);for(const p of ends)assert.ok(Math.hypot(p[0]-ends[0][0],p[2]-ends[0][2])<1e-8,'adjacent short edge altered the shared coastal join');}
});
