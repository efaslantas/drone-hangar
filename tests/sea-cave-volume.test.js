import test from'node:test';import assert from'node:assert/strict';
import{surfaceAt}from'../src/geo-terrain.js';import{applyWorld}from'../src/collide.js';import{cameraClearance}from'../src/airframe-view.js';
const api=await import('../src/sea-cave-volume.js').catch(()=>({}));
const terrain={bounds:[-30,30,-30,30],cols:2,rows:2,datum:0,heights:[15,15,15,15],land:[[[[-30,-30],[30,-30],[30,30],[-30,30]]]]};
function fixture(){assert.equal(typeof api.caveVolume,'function');const cave=api.caveVolume({id:'fixture',origin:[0,0],axis:[0,1],halfWidth:4,sideHeight:1,rise:4,minD:-10,maxD:10,sea:0,blind:false});return {cave,play:{terrain:{...terrain,seaCaves:[cave]}}};}
test('cave query selects a real lower surface only below the arched roof; omitted height and top stay native',()=>{
 const{cave,play}=fixture();assert.equal(surfaceAt(play,0,0).height,15);assert.equal(surfaceAt(play,0,0,2).height,0);assert.equal(surfaceAt(play,0,0,2).water,true);assert.equal(surfaceAt(play,0,0,6).height,15);assert.ok(Math.abs(surfaceAt(play,5,0,2).height-15)<1e-10);assert.equal(surfaceAt(play,0,0,-3).height,0);assert.equal(api.caveColumnAt(cave,0,2,0),true);
});
test('convex subtraction removes a mouth centre and preserves outside triangles with interpolated payloads',()=>{
 const{cave}=fixture();assert.equal(typeof api.subtractCave,'function');const face=[[-8,-1,0,0],[8,-1,0,1],[0,10,0,.5]],out=api.subtractCave(face,cave);assert.ok(out.length);for(const poly of out)for(const p of poly){assert.equal(p.length,4);assert.ok(Math.abs(p[3]-(p[0]+8)/16)<1e-8);}for(const poly of out){const c=[0,1,2].map(k=>poly.reduce((s,p)=>s+p[k]/poly.length,0));assert.equal(api.insideCave(cave,...c),false);}
});
test('flying within a cavity is not snapped onto the old terrain and camera near plane sees floor and roof',()=>{
 const{play}=fixture(),s={x:0,y:2,z:0,vx:0,vy:0,vz:3,armed:true};applyWorld(s,{size:.22},play);assert.equal(s.y,2);assert.equal(s.crashed,undefined);assert.ok(cameraClearance(play,{x:0,y:2,z:0})>1);assert.ok(cameraClearance(play,{x:0,y:4.95,z:0})<.1);
});

test('authored irregular tapered sections share the same exact boundary in geometry and point queries',()=>{
 const c=api.caveVolume({id:'taper',origin:[10,20],axis:[.6,.8],halfWidth:4,sideHeight:1,rise:4,minD:-5,maxD:10,sea:-2,taper:-.02,profile:[[-4,-1.2],[4,-1.2],[4,.5],[2,3],[0,4],[-3,2],[-4,.5]]});
 assert.equal(c.section.length,7);for(const d of [-5,0,10])for(const [u,y]of c.section){const p=api.cavePoint(c,u,y,d);assert.equal(api.insideCave(c,...p),true);assert.ok(c.planes.some(plane=>Math.abs(api.planeDistance(plane,p))<1e-8));}
 const a=api.cavePoint(c,4,c.sea+1,-5),b=api.cavePoint(c,4,c.sea+1,10);assert.ok(Math.hypot(a[0]-10,a[2]-20)>0);assert.ok(Math.abs((a[0]-10)*c.side[0]+(a[2]-20)*c.side[1])>Math.abs((b[0]-10)*c.side[0]+(b[2]-20)*c.side[1]));
 assert.equal(api.insideCave(c,...api.cavePoint(c,4.2,c.sea+1,0)),false);
});
