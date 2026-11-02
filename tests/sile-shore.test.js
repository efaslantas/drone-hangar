import test from 'node:test';
import assert from 'node:assert/strict';
import {createShoreClipper} from '../src/sile-shore.js';
import {insidePolygon} from '../src/geo-terrain.js';
const area=tri=>Math.abs((tri[1][0]-tri[0][0])*(tri[2][1]-tri[0][1])-(tri[1][1]-tri[0][1])*(tri[2][0]-tri[0][0]))/2;
const sum=tris=>tris.reduce((n,t)=>n+area(t),0);
const vertex=(x,z)=>[x,z,x/5,z/7];
const triangle=[vertex(-10,-10),vertex(10,-10),vertex(0,10)];
const square=[[-1,-1],[1,-1],[1,1],[-1,1]];
function waterOnly(tris,land){for(const t of tris)for(let a=0;a<=8;a++)for(let b=0;b<=8-a;b++){const u=a/8,v=b/8,x=t[0][0]*(1-u-v)+t[1][0]*u+t[2][0]*v,z=t[0][1]*(1-u-v)+t[1][1]*u+t[2][1]*v;assert.ok(!land.some(p=>insidePolygon(x,z,p)),`land spill ${x},${z}`);}}
test('subtracts an island wholly inside a foam triangle and interpolates UVs',()=>{
 const land=[[square]],snapshot=JSON.stringify(land),result=createShoreClipper(land)(triangle);
 assert.ok(Math.abs(sum(result)-196)<.05);waterOnly(result,land);assert.equal(JSON.stringify(land),snapshot);
 for(const t of result)for(const [x,z,u,v] of t){assert.ok(Math.abs(u-x/5)<1e-8);assert.ok(Math.abs(v-z/7)<1e-8);}
});
test('handles concave and reversed land, separate islands and water holes',()=>{
 const outer=[[-5,-5],[5,-5],[5,5],[-5,5]],hole=[[-2,-2],[-2,2],[2,2],[2,-2]],concave=[[12,0],[16,0],[16,4],[14,2],[12,4]];
 const land=[[outer,hole],[concave]],snapshot=JSON.stringify(land);
 const foam=[vertex(-20,-20),vertex(20,-20),vertex(0,40)];
 const result=createShoreClipper(land)(foam);waterOnly(result,land);
 assert.ok(result.some(t=>t.every(p=>Math.abs(p[0])<=2.01&&Math.abs(p[1])<=2.01)),'water inside hole preserved');
 const reversed=land.map(p=>p.map(r=>r.toReversed()));assert.ok(Math.abs(sum(result)-sum(createShoreClipper(reversed)(foam)))<1e-6);assert.equal(JSON.stringify(land),snapshot);
});
test('empty land preserves foam, fully inland and degenerate triangles emit nothing',()=>{
 assert.equal(sum(createShoreClipper([])(triangle)),200);
 assert.deepEqual(createShoreClipper([[square]])([vertex(0,0),vertex(.1,0),vertex(0,.1)]),[]);
 assert.deepEqual(createShoreClipper([])([vertex(0,0),vertex(0,0),vertex(0,0)]),[]);
});

test('land clipper conservatively retains only land and interpolates arbitrary UV payloads',async()=>{
 const {createLandClipper}=await import('../src/sile-shore.js');assert.equal(typeof createLandClipper,'function');
 const land=[[square]],tris=createLandClipper(land)(triangle);assert.ok(sum(tris)>3.9&&sum(tris)<4);
 for(const t of tris)for(const [x,z,u,v] of t){assert.ok(insidePolygon(x,z,land[0]));assert.ok(Math.abs(u-x/5)<1e-8);assert.ok(Math.abs(v-z/7)<1e-8);}
 const reversed=createLandClipper([[square.toReversed()]])(triangle);assert.ok(Math.abs(sum(tris)-sum(reversed))<1e-9);
 assert.deepEqual(createLandClipper([])(triangle),[]);
});
