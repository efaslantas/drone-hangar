import {terrainHeight} from '../src/geo-terrain.js';
import test from 'node:test';import assert from 'node:assert/strict';
import * as geo from '../src/geo-terrain.js';
import {applyWorld} from '../src/collide.js';import {createState,step} from '../src/physics.js';import {droneById} from '../src/catalog.js';
const t={cols:2,rows:2,bounds:[0,10,0,10],heights:[0,10,20,40],datum:10,land:[[[[0,0],[10,0],[10,10],[0,10]]]]};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('terrain height uses the rendered triangle diagonal, datum and bounded sampling',()=>{
 near(geo.terrainHeight(t,2.5,2.5),-2.5);near(geo.terrainHeight(t,7.5,7.5),17.5);near(geo.terrainHeight(t,-10,-10),-10);
 const s=geo.surfaceAt({terrain:t},7.5,7.5);assert.equal(s.water,false);near(Math.hypot(...s.normal),1);
});
test('land rings include their boundary and exclude courtyards/water holes',()=>{
 const rings=[[[0,0],[10,0],[10,10],[0,10]],[[3,3],[7,3],[7,7],[3,7]]];
 assert.equal(geo.insidePolygon(1,1,rings),true);assert.equal(geo.insidePolygon(0,5,rings),true);assert.equal(geo.insidePolygon(5,5,rings),false);
 assert.equal(geo.surfaceAt({terrain:{...t,land:[rings]}},5,5).water,true);
});
test('geographic projection roundtrips and preserves declared metric scale',()=>{
 const p={lat:41,lon:29,metresLat:111000,metresLon:84000,offsetX:100,offsetZ:-50};
 const v=geo.projectCoordinate(p,29.01,41.01);near(v[0],740);near(v[1],-1060);
 const ll=geo.unprojectCoordinate(p,...v);near(ll[0],29.01);near(ll[1],41.01);
});
test('building prism collision follows concave footprints and supports roof contact',()=>{
 const prism={rings:[[[0,0],[4,0],[4,1],[1,1],[1,4],[0,4]]],miny:0,maxy:10,bounds:[0,4,0,4]};const spec={size:.4};
 const gap={x:2,y:2,z:2,vx:0,vy:0,vz:0,armed:true};applyWorld(gap,spec,{prisms:[prism]});assert.equal(gap.crashed,undefined);
 const wall={x:-.1,y:2,z:2,vx:1,vy:0,vz:0,armed:true};applyWorld(wall,spec,{prisms:[prism]});near(wall.x,-.192);near(wall.vx,0);
 const roof={x:.5,y:10.1,z:2,vx:0,vy:-1,vz:0,armed:true};applyWorld(roof,spec,{prisms:[prism]});near(roof.y,10.192);assert.ok(roof.worldTouchdown);
 const hard={x:.5,y:10.1,z:2,vx:0,vy:-8,vz:0,armed:true};applyWorld(hard,spec,{prisms:[prism]});assert.equal(hard.crashed,true);
});
test('negative geographic terrain replaces the legacy zero plane; water contact cuts motors',()=>{
 const flat={cols:2,rows:2,bounds:[-20,20,-20,20],heights:[5,5,5,5],datum:25,land:[[[[-20,-20],[20,-20],[20,20],[-20,20]]]]};
 const d=droneById('freestyle'),s=createState(0,-19,0);step(s,{throttle:0},d,.01,{terrain:flat});assert.ok(s.y< -19);assert.equal(s.crashed,false);
 const sea=createState(0,-24.99,0);sea.armed=true;step(sea,{throttle:0},d,.01,{terrain:{...flat,land:[]}});assert.equal(sea.crashed,true);assert.equal(sea.crashReason,'suya düştü');assert.equal(sea.currentA,0);
});
test('a sphere exactly on a prism wall is separated instead of receiving a zero normal',()=>{
 const state={x:0,y:2,z:2,vx:1,vy:0,vz:0,armed:true};
 applyWorld(state,{size:.4},{prisms:[{rings:[[[0,0],[4,0],[4,4],[0,4]]],miny:0,maxy:10,bounds:[0,4,0,4]}]});assert.ok(state.x<-.19);
});
test('crossing from sea into a raised coast hits its cliff instead of teleporting to the top',()=>{
 const terrain={cols:2,rows:2,bounds:[-10,10,-10,10],heights:[20,20,20,20],datum:0,land:[[[[0,-10],[10,-10],[10,10],[0,10]]]]};
 const s={x:.3,y:5,z:0,vx:20,vy:0,vz:0,armed:true,motionStart:{x:-.2,y:5,z:0}};
 applyWorld(s,{size:.4},{terrain});assert.equal(s.crashed,true);assert.equal(s.crashReason,'kıyıya çarptı');assert.ok(s.x<0);assert.equal(s.y,5);
});
test('subdivided coastline segments follow every terrain grid triangle at their midpoint',()=>{
 const t={cols:3,rows:3,bounds:[0,20,0,20],heights:[0,10,3,20,40,5,2,4,8],datum:0};
 const points=geo.splitTerrainEdge(t,[1,2],[19,18]);assert.ok(points.length>2);
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];near((geo.terrainHeight(t,...a)+geo.terrainHeight(t,...b))/2,geo.terrainHeight(t,...mid));
 }
});

test('terrain overlays split on grid triangles and stay flush at vertices and interior points',()=>{
 assert.equal(typeof geo.drapeTerrainTriangles,'function');
 const terrain={cols:3,rows:3,bounds:[0,20,0,20],heights:[0,10,3,20,40,5,2,4,8],datum:0};
 const positions=geo.drapeTerrainTriangles(terrain,[1,0,2,19,0,3,18,0,18],.0005);assert.ok(positions.length>9);
 for(let i=0;i<positions.length;i+=9){const p=[];for(let j=0;j<9;j+=3){p.push([positions[i+j],positions[i+j+1],positions[i+j+2]]);near(p.at(-1)[1]-geo.terrainHeight(terrain,p.at(-1)[0],p.at(-1)[2]),.0005);}const x=p.reduce((s,v)=>s+v[0],0)/3,y=p.reduce((s,v)=>s+v[1],0)/3,z=p.reduce((s,v)=>s+v[2],0)/3;near(y-geo.terrainHeight(terrain,x,z),.0005);}
});

test('authored local platforms apply only inside their exact boundary and preserve holes and source heights',()=>{
 const terrain={cols:2,rows:2,bounds:[0,20,0,20],heights:[1,1,1,1],datum:0,land:[[[[0,0],[20,0],[20,20],[0,20]]]],platforms:[{bounds:[2,10,2,10],height:4.5,rings:[[[2,2],[10,2],[10,10],[2,10]],[[4,4],[6,4],[6,6],[4,6]]]}]};
 assert.equal(terrainHeight(terrain,3,3),4.5);assert.equal(terrainHeight(terrain,2,3),4.5);assert.equal(terrainHeight(terrain,1.99,3),1);assert.equal(terrainHeight(terrain,5,5),1);assert.equal(terrainHeight(terrain,15,15),1);assert.deepEqual(terrain.heights,[1,1,1,1]);
});
