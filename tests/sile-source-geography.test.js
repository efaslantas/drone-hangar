import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {insidePolygon,surfaceAt} from '../src/geo-terrain.js';
const api=await import('../src/sile-mooring.js'),data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url))),raw=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/source-osm.json',import.meta.url)));
const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});globalThis.document={createElement:()=>({getContext:()=>ctx})};
test('all source street IDs and names survive conversion, including the missing main-road link',()=>{
 const ways=raw.elements.filter(e=>e.type==='way'&&e.tags?.highway),ids=new Set(data.roads.map(r=>r.id));assert.equal(ways.length,381);assert.equal(ids.size,381);assert.equal(data.roads.length,383);for(const e of ways){assert.ok(ids.has(e.id),'missing road '+e.id);for(const r of data.roads.filter(r=>r.id===e.id))assert.equal(r.name,e.tags.name);}
 assert.equal(data.roads.find(r=>r.id===1025872605).kind,'primary_link');assert.equal(data.roads.find(r=>r.id===1531132593).bridge,true);
});
test('closed concave source islet is present in the physical coastline',()=>{
 assert.equal(data.terrain.land.length,5);assert.ok(data.terrain.land.some(r=>insidePolygon(304.1507591069844,-675.0377169661515,r)));
});
test('source water footbridge follows every original source point and has full-width land support',()=>{
 assert.equal(typeof api.planSourceFootbridges,'function');const play={terrain:data.terrain},plan=api.planSourceFootbridges(data,play);assert.equal(plan.bridges.length,1);const b=plan.bridges[0],road=data.roads.find(r=>r.id===b.sourceId);assert.equal(b.sourceId,1531132593);assert.equal(b.width,road.width);
 for(const p of road.points)assert.ok(b.sections.some(s=>Math.hypot((s.left[0]+s.right[0])/2-p[0],(s.left[2]+s.right[2])/2-p[1])<1e-7));
 for(const section of [b.sections[0],b.sections.at(-1)])for(const p of [section.left,section.right])assert.equal(surfaceAt(play,p[0],p[2]).water,false);assert.ok(b.sections.flatMap(s=>[...s.left,...s.right]).every(Number.isFinite));assert.equal(api.planSourceFootbridges({...data,id:'yard'},play).bridges.length,0);
});
test('water footbridge is rendered with the exact uploaded triangle contacts and cleaned with world',async()=>{
 const {buildWorld,clearWorld}=await import('../src/world.js'),scene=new THREE.Scene(),play=buildWorld(scene,'sile',{sileData:data,props:false,quality:'medium'}),m=scene.getObjectByName('sile-source-footbridges');assert.ok(m,'source bridge over sea cannot be silently clipped away');const p=m.geometry.attributes.position,records=play.terrainWalls.filter(w=>w.mesh===m.name);assert.equal(records.length*3,p.count);assert.ok(records.some(w=>w.landing));for(let i=0;i<records.length;i++)for(let j=0;j<3;j++)assert.deepEqual(records[i].vertices[j],[p.getX(i*3+j),p.getY(i*3+j),p.getZ(i*3+j)]);let disposed=0;for(const r of [m.geometry,m.material])r.addEventListener('dispose',()=>disposed++);clearWorld(scene);assert.equal(disposed,2);assert.equal(scene.userData.sileSourceBridgeStats,null);
});
