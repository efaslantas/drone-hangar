import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{sourceCoastPatches}from'../src/sile-coast.js';import{terrainHeight,surfaceAt}from'../src/geo-terrain.js';
const api=await import('../src/sile-beach.js').catch(()=>({}));const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
test('broad source beach grades into water using one uploaded surface while rocky pocket and native sources survive',()=>{
 assert.equal(typeof api.buildBeachApproach,'function');const before=JSON.stringify(data),patch=sourceCoastPatches(data,data.terrain,{exactSand:true}).sand,b=api.buildBeachApproach(data,data.terrain,patch);assert.ok(b.surface.positions.length&&b.stats.changedVertices>0);assert.ok(b.stats.maxCutM<=2.00001);assert.equal(b.stats.unsafe,false);
 const t={...data.terrain,beachSurface:b.surface};assert.ok(terrainHeight(t,-1152.382,487.28593)+t.datum<.06,'dry-mask gap must not retain a false coastal wall');const x=-600.195,z=299.775;assert.ok(terrainHeight(data.terrain,x,z)+t.datum>.1);assert.ok(terrainHeight(t,x,z)+t.datum<.06,'sandy lip reaches sea level');
 assert.equal(surfaceAt({terrain:t},x-3,z-3).water,true,'beach field must not fill source water');
 assert.ok(Math.abs(terrainHeight(t,1420,-221)-terrainHeight(data.terrain,1420,-221))<.001,'high rocky pocket excluded');assert.equal(JSON.stringify(data),before);
 for(let i=0;i<b.surface.positions.length;i+=291){const p=b.surface.positions.slice(i,i+3);if(p.length===3)assert.ok(Math.abs(terrainHeight(t,p[0],p[2])-p[1])<.004);}
});
test('gentle landing and sea-to-beach approach resolve on the rendered sand plane rather than an old raised lip',async()=>{
 const {applyWorld}=await import('../src/collide.js'),patch=sourceCoastPatches(data,data.terrain,{exactSand:true}).sand,b=api.buildBeachApproach(data,data.terrain,patch),t={...data.terrain,beachSurface:b.surface};
 const x=-600.195,z=299.775,ground=terrainHeight(t,x+.5,z+.5),state={x:x+.5,z:z+.5,y:ground+.02,vx:0,vy:-.5,vz:0,armed:false},spec={size:.25};applyWorld(state,spec,{terrain:t});assert.equal(state.crashed,undefined);assert.equal(state.grounded,true);const oldState={x:x+.5,z:z+.5,y:ground+.02,vx:0,vy:-.5,vz:0,armed:false};applyWorld(oldState,spec,{terrain:data.terrain});assert.ok(state.y<oldState.y-.025,'contact must follow repaired sand rather than original surface');
});
test('wet swash stays on the shared low sand surface and road/building ground queries remain native',()=>{
 const b=api.buildBeachApproach(data,data.terrain,sourceCoastPatches(data,data.terrain,{exactSand:true}).sand),t={...data.terrain,beachSurface:b.surface};assert.ok(b.swash.positions.length);
 for(let i=0;i<b.swash.positions.length;i+=39){const [x,y,z]=b.swash.positions.slice(i,i+3);assert.ok(Math.abs(y-terrainHeight(t,x,z)-.004)<.004);assert.ok(y+t.datum<.185);}
 for(const road of data.roads)for(const p of road.points){assert.ok(Math.abs(terrainHeight(t,...p)-terrainHeight(data.terrain,...p))<.001,'road elevation unchanged');}
 for(const item of data.buildings){const p=item.rings[0][0];assert.ok(Math.abs(terrainHeight(t,...p)-terrainHeight(data.terrain,...p))<.001,'building ground unchanged');}
});
test('published world uploads the exact collision sand vertices and offshore/swash batches retain their own surface contracts',async()=>{
 const THREE=await import('three'),{buildWorld,clearWorld}=await import('../src/world.js');const ctx=new Proxy({getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const s=new THREE.Scene(),p=buildWorld(s,'sile',{sileData:data,props:false}),mesh=s.getObjectByName('sile-source-sand');assert.deepEqual(mesh.geometry.attributes.position.array,new Float32Array(p.terrain.beachSurface.positions));
 const aSand=mesh.geometry.attributes.position;
 for(let i=0;i<aSand.count;i++)assert.ok(Math.abs(aSand.getY(i)-terrainHeight(p.terrain,aSand.getX(i),aSand.getZ(i)))<.0002,'every uploaded sand vertex must match its query');
 for(let i=0;i<aSand.count;i+=3){const x=(aSand.getX(i)+aSand.getX(i+1)+aSand.getX(i+2))/3,z=(aSand.getZ(i)+aSand.getZ(i+1)+aSand.getZ(i+2))/3,y=(aSand.getY(i)+aSand.getY(i+1)+aSand.getY(i+2))/3;assert.ok(Math.abs(y-terrainHeight(p.terrain,x,z))<.0002,'every sand centroid must have unique surface ownership');}
 for(const [x,z]of[[1497.9937744140625,-7.166140556335449],[2282.259765625,429.5185852050781]])assert.ok(Math.abs(terrainHeight(p.terrain,x,z)-terrainHeight(data.terrain,x,z))<.0002,'unvalidated eastern beaches retain native source height');
 const foam=s.getObjectByName('sile-shore-foam'),a=foam.geometry.attributes.position,n=foam.userData.offshoreVertexCount;assert.ok(n>0&&n<a.count);
 for(let i=n;i<a.count;i++){assert.ok(Math.abs(a.getY(i)-terrainHeight(p.terrain,a.getX(i),a.getZ(i))-.004)<.001);}
 assert.ok(s.userData.sileBeachStats.changedVertices>0);clearWorld(s);assert.equal(s.userData.sileBeachStats,null);
});
