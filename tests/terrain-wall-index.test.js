import test from'node:test';import assert from'node:assert/strict';import{applyWorld}from'../src/collide.js';
const api=await import('../src/terrain-wall-index.js').catch(()=>({}));
const wall=(x,z=0)=>({vertices:[[x,0,z],[x,10,z],[x,0,z+10]],contactBounds:[x,x,0,10,z,z+10]});
test('prepared static wall queries preserve original order without duplicate cells and cover a swept path',()=>{
 assert.equal(typeof api.prepareTerrainWallIndex,'function');const walls=[wall(50),wall(0),wall(25)];api.prepareTerrainWallIndex(walls);const found=api.terrainWallCandidates(walls,[-1,51,-1,11]);assert.deepEqual(found,walls);assert.equal(new Set(found).size,found.length);
});
test('oversized geometry and enormous queries stay bounded; appended or unprepared arrays retain full behavior',()=>{
 assert.equal(typeof api.prepareTerrainWallIndex,'function');const huge={a:[-1e9,-1e9],b:[1e9,1e9],height:0,ya:10,yb:10},walls=[huge,wall(0)];api.prepareTerrainWallIndex(walls);assert.ok(api.terrainWallCandidates(walls,[-1,1,-1,1]).includes(huge));assert.deepEqual(api.terrainWallCandidates(walls,[-1e12,1e12,-1e12,1e12]),walls);walls.push(wall(200));assert.equal(api.terrainWallCandidates(walls,[199,201,0,1]),walls);const unprepared=[wall(0)];assert.equal(api.terrainWallCandidates(unprepared,[200,210,200,210]),unprepared);
});
test('spatial candidates yield exactly the same swept and stationary physical state as a full wall scan',()=>{
 assert.equal(typeof api.prepareTerrainWallIndex,'function');const flat=Array.from({length:400},(_,i)=>wall(i*100-20000)),indexed=flat.slice();api.prepareTerrainWallIndex(indexed);
 for(const s of [{x:.1,y:2,z:2,vx:-1,vy:0,vz:0,armed:false},{x:-1,y:2,z:2,vx:-20,vy:0,vz:0,armed:true,motionStart:{x:2,y:2,z:2}},{x:-1,y:12,z:2,vx:-20,vy:0,vz:0,armed:true,motionStart:{x:2,y:12,z:2}}]){const a=structuredClone(s),b=structuredClone(s);applyWorld(a,{size:.5},{terrainWalls:flat});applyWorld(b,{size:.5},{terrainWalls:indexed});assert.deepEqual(b,a);}
});
