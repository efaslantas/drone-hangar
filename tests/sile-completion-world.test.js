import test from 'node:test';import assert from 'node:assert/strict';
import {coastalSlopeFace,groundedEntryProfile}from '../src/sile-completion-world.js';
test('rock exposure follows steep sea-facing terrain without changing a triangle',()=>{
 const terrain={bounds:[-100,100,-100,100],land:[[[[0,-100],[100,-100],[100,100],[0,100]]]]};
 assert.equal(coastalSlopeFace([0,0,0,10,10,0,0,0,10],terrain),true);
 assert.equal(coastalSlopeFace([0,0,0,10,0,0,0,0,10],terrain),false);
 assert.equal(coastalSlopeFace([80,0,0,90,10,0,80,0,10],terrain),false);
});
test('elevated building entry uses terrain at its facade and enough overhead clearance, with no source mutation',()=>{
 const item={id:1,rings:[[[0,0],[10,0],[10,10],[0,10]]],base:0,height:7.5},profile={entry:[5,-20],eaves:6},terrain={bounds:[-20,20,-20,20],cols:2,rows:2,heights:[10,10,10,10],datum:0,land:[[[[-20,-20],[20,-20],[20,20],[-20,20]]]]},before=JSON.stringify(item),out=groundedEntryProfile(item,profile,terrain);
 assert.equal(out.entryY,10);assert.ok(out.height>=14);assert.equal(out.evidence,'assumed');assert.equal(JSON.stringify(item),before);assert.equal(groundedEntryProfile({...item,base:10},profile,terrain).height,7.5);
});

test('coastal material partition preserves all source vertices and keeps ordinary terrain eligible for metric ground textures',async()=>{
 const THREE=await import('three'),{finishCompletionTerrain}=await import('../src/sile-completion-world.js'),scene=new THREE.Scene(),geometry=new THREE.BufferGeometry(),positions=[0,0,0,10,10,0,0,0,10, 80,0,0,90,0,0,80,0,10];geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(Array(12).fill(0),2));geometry.computeVertexNormals();const ground=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());ground.name='sile-terrain';scene.add(ground);const terrain={bounds:[-100,100,-100,100],land:[[[[0,-100],[100,-100],[100,100],[0,100]]]]};finishCompletionTerrain(scene,{terrain},{completionLayer:1},new THREE.MeshStandardMaterial());assert.ok(!Array.isArray(ground.material));const rock=scene.getObjectByName('sile-coastal-exposure');assert.ok(rock);const drawn=[...ground.geometry.attributes.position.array,...rock.geometry.attributes.position.array];assert.deepEqual(drawn.toSorted((a,b)=>a-b),positions.toSorted((a,b)=>a-b));assert.equal(scene.userData.sileCompletionStats.exposedRockTriangles,1);
});

test('prepared coastal entry corrections preserve raw records and decorative doors sit at the derived ground elevation',async()=>{
 const fs=await import('node:fs'),{completedSileData}=await import('../src/sile-completion-world.js'),{buildingFacade,coastalBuildings}=await import('../src/sile-buildings.js'),raw=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url))),before=JSON.stringify(raw),derived=completedSileData({...raw,completionLayer:1}),profiles=coastalBuildings(derived);let count=0;
 for(const {item,...profile}of profiles.values())if(Number.isFinite(item.entryY)){const f=buildingFacade(item,profile,profile.eaves),door=f.cells.find(c=>c.authoredEntry);assert.ok(door,'entry clearance must leave room for the door overlay');assert.equal(door.y0,item.entryY);assert.ok(door.y1<=profile.eaves);assert.ok(item.height>=raw.buildings.find(b=>b.id===item.id).height);count++;}
 assert.ok(count>0);assert.equal(JSON.stringify(raw),before);assert.equal(completedSileData(raw),raw);
});

test('entrances are reconciled to final terrace terrain, including the three reviewed floating-door sites',async()=>{
 const fs=await import('node:fs'),THREE=await import('three'),{buildSile}=await import('../src/sile-world.js'),{prepareBuildingSupplement}=await import('../src/sile-building-supplement-data.js'),{terrainHeight}=await import('../src/geo-terrain.js'),{buildingFacade}=await import('../src/sile-buildings.js');const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});globalThis.document={createElement:()=>({getContext:()=>ctx})};const raw=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url))),before=JSON.stringify(raw),scene=new THREE.Scene(),play=buildSile(scene,await prepareBuildingSupplement(raw)),profiles=scene.userData.sileNeighbourhood.profiles;let corrected=0;
 for(const id of [550130832,550116788,550130807]){const profile=profiles.get(id),door=buildingFacade(profile.item,profile,profile.eaves).cells.find(c=>c.authoredEntry);assert.ok(door);assert.ok(Math.abs(door.y0-terrainHeight(play.terrain,door.x,door.z))<.02,`door ${id} must meet final terrace`);corrected++;}assert.equal(corrected,3);assert.equal(JSON.stringify(raw),before);
});
