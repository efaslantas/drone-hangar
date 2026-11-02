import test from 'node:test';import assert from 'node:assert/strict';
const api=await import('../src/triangle-surface.js').catch(()=>({}));
const field={positions:[0,0,0,0,0,10,10,2,0,10,2,0,0,0,10,10,5,10]};
test('triangle query shares uploaded planes and normals across a crease, rejects outside and malformed faces',()=>{
 assert.equal(typeof api.sampleTriangleSurface,'function');
 const a=api.sampleTriangleSurface(field,2,2),b=api.sampleTriangleSurface(field,8,8);assert.ok(Math.abs(a.height-.4)<1e-8);assert.ok(Math.abs(b.height-3.4)<1e-8);assert.ok(Math.abs(Math.hypot(...a.normal)-1)<1e-9&&a.normal[1]>0);assert.notDeepEqual(a.normal,b.normal);assert.equal(api.sampleTriangleSurface(field,20,20),null);
 assert.equal(api.sampleTriangleSurface({positions:[0,0,0,0,0,0,0,0,0]},0,0),null);
});
test('edge cuts and draping split at the same physical crease',()=>{
 assert.equal(typeof api.triangleSurfaceCuts,'function');const cuts=api.triangleSurfaceCuts(field,[0,5],[10,5]);assert.ok(cuts.some(t=>Math.abs(t-.5)<1e-7));
});
test('terrain sampling, paint and cliff edges use the same beach face without turning source water into land',async()=>{
 const {terrainHeight,surfaceAt,splitTerrainEdge,drapeTerrainTriangles}=await import('../src/geo-terrain.js');
 const terrain={bounds:[-10,20,-10,20],cols:2,rows:2,datum:0,heights:[0,0,0,0],land:[[[[0,0],[10,0],[10,10],[0,10]]]],beachSurface:field};
 assert.ok(Math.abs(terrainHeight(terrain,8,8)-3.4)<1e-8);assert.equal(surfaceAt({terrain},-1,5).water,true);assert.equal(surfaceAt({terrain},8,8).water,false);
 const p=drapeTerrainTriangles(terrain,[1,0,1,1,0,9,9,0,9],0);assert.ok(p.length>9);
 for(let i=0;i<p.length;i+=9){const x=(p[i]+p[i+3]+p[i+6])/3,z=(p[i+2]+p[i+5]+p[i+8])/3,y=(p[i+1]+p[i+4]+p[i+7])/3;assert.ok(Math.abs(y-terrainHeight(terrain,x,z))<1e-7,'paint cannot bridge a beach crease');}
 assert.ok(splitTerrainEdge(terrain,[0,5],[10,5]).some(p=>Math.abs(p[0]-5)<1e-7));
});
