import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as api from '../src/sile-neighbourhood.js';
import {coastalBuildings} from '../src/sile-buildings.js';
const road=(points,width=6)=>({points,width});
test('road lookup retains inclusive negative boundaries, widths and zero length segments',()=>{
 const roads=[road([[-60,-48],[-48,-48]],18),road([[0,0],[0,0]],2),road([[100,100],[110,100]],80)];
 const before=JSON.stringify(roads),query=api.roadFieldIndex(roads);
 for(let x=-90;x<=160;x+=1.5)for(let z=-90;z<=160;z+=1.5){
  const found=query(x,z);
  for(const r of roads){const [a,b]=r.points,reach=r.width/2+3;
   if(x>=Math.min(a[0],b[0])-reach&&x<=Math.max(a[0],b[0])+reach&&z>=Math.min(a[1],b[1])-reach&&z<=Math.max(a[1],b[1])+reach)assert.ok(found.some(s=>s.a===a&&s.b===b));
  }
 }
 assert.equal(JSON.stringify(roads),before);assert.ok(Object.isFrozen(query(0,0)));assert.throws(()=>query(0,0).push({}),TypeError);
});
test('overflow segments merge with local segments in source order without duplicates',()=>{
 const roads=[road([[-1e12,0],[1e12,0]]),road([[0,0],[1,0]]),road([[1e30,0],[1e30,1]]),road([[NaN,0],[0,0]]),road([[0,0],[2,0]],NaN)];
 const query=api.roadFieldIndex(roads),found=query(0,0);
 assert.deepEqual(found.map(s=>roads.findIndex(r=>r.points[0]===s.a)),[0,1,2,3,4]);assert.equal(new Set(found).size,found.length);
 assert.ok(query(1e30,0).some(s=>s.a===roads[2].points[0]));
});
test('many distant roads produce a local bounded candidate set',()=>{
 const roads=Array.from({length:2000},(_,i)=>road([[i*100,0],[i*100+5,0]]));
 const query=api.roadFieldIndex(roads);assert.ok(query(0,0).length<5);assert.equal(query(-1000,0).length,0);
 // Enough individually acceptable segments to exhaust the aggregate grid budget.
 const broad=Array.from({length:200},(_,i)=>road([[i,0],[i+1000,1000]]));
 const lookup=api.roadFieldIndex(broad),candidates=lookup(500,500),overflow=lookup(-100000,-100000);assert.equal(candidates.length,200);assert.equal(new Set(candidates).size,200);assert.ok(overflow.length>0&&overflow.length<200);assert.deepEqual(candidates.map(s=>s.order),Array.from({length:200},(_,i)=>i));assert.deepEqual(overflow.map(s=>s.order),overflow.map(s=>s.order).toSorted((a,b)=>a-b));
});
test('real Şile field preserves all 83025 baseline Float64 samples',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url))),field=api.neighbourhoodField(data,coastalBuildings(data)),values=[];
 for(let x=-250;x<=900;x+=3.125)for(let z=-700;z<=0;z+=3.125)values.push(field(x,z));
 assert.equal(values.length,83025);assert.equal(createHash('sha256').update(Buffer.from(new Float64Array(values).buffer)).digest('hex'),'b0be888b19f304edd9a696a75c4ac4c8feb0eae341cdb41b63f7403767212673');
});

test('west-expanded base world has a stable source mesh and collision fingerprint',async()=>{
 const THREE=await import('three'),{buildWorld,clearWorld}=await import('../src/world.js'),{sileWorldFingerprint}=await import('./helpers/sile-world-fingerprint.js');
 const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:20})},{get:(o,k)=>k in o?o[k]:()=>{}});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};

 const scene=new THREE.Scene(),play=buildWorld(scene,'sile',{sileData:data,props:false,quality:'medium'});
 const added=scene.children.filter(o=>['sile-mooring-links','sile-harbour-quay','sile-source-footbridges','sile-shore-armour'].includes(o.name));assert.equal(added.length,4);scene.remove(...added);
 assert.deepEqual(sileWorldFingerprint(scene,{...play,terrainWalls:play.terrainWalls.filter(w=>!['harbour-link','shore-armour'].includes(w.authored))}),JSON.parse(fs.readFileSync(new URL('./helpers/sile-current-fingerprint.json',import.meta.url))).base);scene.add(...added);clearWorld(scene);
});
