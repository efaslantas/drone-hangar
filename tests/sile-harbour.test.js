import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {buildSile} from '../src/sile-world.js';import {terrainHeight,surfaceAt,insidePolygon} from '../src/geo-terrain.js';
import * as shore from '../src/sile-shore.js';
const api=await import('../src/sile-harbour.js').catch(()=>({})),data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
const ctx=new Proxy({getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const area=t=>Math.abs((t[1][0]-t[0][0])*(t[2][1]-t[0][1])-(t[1][1]-t[0][1])*(t[2][0]-t[0][0]))/2;
const total=triangles=>triangles.reduce((s,t)=>s+area(t),0);
test('surface partition conserves area and attributes across overlapping masks, holes and reversed winding',()=>{
 assert.equal(typeof shore.createSurfacePartition,'function');
 const rings=[[[0,0],[8,0],[8,8],[0,8]],[[2,2],[2,4],[4,4],[4,2]]],overlap=[[[5,0],[10,0],[10,8],[5,8]]],triangles=[[[0,0,0],[10,0,20],[0,10,30]],[[10,0,20],[10,10,50],[0,10,30]]];
 for(const masks of [[rings,overlap],[rings.map(r=>r.toReversed()),overlap.map(r=>r.toReversed())]]){
  const split=shore.createSurfacePartition(masks),inside=[],outside=[];for(const t of triangles){const p=split(t);inside.push(...p.inside);outside.push(...p.outside);}
  assert.ok(Math.abs(total(inside)-76)<1e-7,'union80 minus4m² hole, no doubled overlap');assert.ok(Math.abs(total(inside)+total(outside)-100)<1e-7);
  for(const t of [...inside,...outside])for(const [x,z,y]of t)assert.ok(Math.abs(y-(2*x+3*z))<1e-7);
  for(const t of inside){const x=t.reduce((s,p)=>s+p[0],0)/3,z=t.reduce((s,p)=>s+p[1],0)/3;assert.ok(masks.some(r=>insidePolygon(x,z,r)));}
 }
});
test('harbour hardscape replaces soil once on source land and follows the physical terrain at every vertex',()=>{
 assert.equal(typeof api.harbourSurfaces,'function');const before=JSON.stringify(data),scene=new THREE.Scene(),play=buildSile(scene,data),paved=scene.getObjectByName('sile-harbour-paved');assert.ok(paved,'harbour must visibly replace brown ground');const p=paved.geometry.attributes.position;let areaSum=0,west=0;
 for(let i=0;i<p.count;i+=3){const tri=[];for(let j=0;j<3;j++){const x=p.getX(i+j),y=p.getY(i+j),z=p.getZ(i+j);assert.ok(Math.abs(y-terrainHeight(play.terrain,x,z))<.0001);tri.push([x,z]);}areaSum+=area(tri);const x=tri.reduce((s,p)=>s+p[0],0)/3,z=tri.reduce((s,p)=>s+p[1],0)/3;assert.equal(surfaceAt(play,x,z).water,false);if(x< -200&&z< -350)west++;}
 assert.ok(areaSum>8000&&west>10,'western arm and harbour edges have hardscape');assert.equal(JSON.stringify(data),before);assert.equal(play.prisms.filter(q=>q.authored!=='coastal-foundation').length,data.buildings.length+data.structures.length);
});
test('inset harbour rock armour stays on land, clear of roads and visible bounds share actual colliders',()=>{
 const scene=new THREE.Scene(),play=buildSile(scene,data),rocks=scene.getObjectByName('sile-harbour-armour');assert.ok(rocks);assert.ok(rocks.count>100&&rocks.count<=800);scene.updateMatrixWorld(true);rocks.geometry.computeBoundingBox();const matrix=new THREE.Matrix4();
 for(let i=0;i<rocks.count;i++){rocks.getMatrixAt(i,matrix);const b=rocks.geometry.boundingBox.clone().applyMatrix4(matrix),c=rocks.userData.harbourBoxes[i];assert.ok(play.boxes.includes(c));for(const [axis,lo,hi]of [['x','minx','maxx'],['y','miny','maxy'],['z','minz','maxz']]){assert.ok(b.min[axis]>=c[lo]-.0001);assert.ok(b.max[axis]<=c[hi]+.0001);}for(const x of [b.min.x,b.max.x])for(const z of [b.min.z,b.max.z])assert.equal(surfaceAt(play,x,z).water,false);assert.ok(Math.hypot((b.min.x+b.max.x)/2,(b.min.z+b.max.z)/2)>14);}
 let meshes=0;scene.traverse(o=>{if(o.isMesh)meshes++});assert.ok(meshes<=50);
});
test('stale harbour input skips features rather than painting unrelated terrain',()=>{
 assert.equal(typeof api.harbourSurfaces,'function');const pos=[0,0,0,1,0,0,0,0,1],p=api.harbourSurfaces({...data,projection:{...data.projection,lon:0}},pos);assert.equal(p.valid,false);assert.deepEqual(p.ground,pos);assert.deepEqual(p.paved,[]);const empty=api.harbourSurfaces({...data,terrain:{...data.terrain,land:[]}},pos);assert.equal(empty.valid,false);assert.deepEqual(empty.ground,pos);
});


test('harbour rock colliders remain deterministic across rebuilds and clear metadata follows world lifecycle',async()=>{
 const {buildWorld,clearWorld}=await import('../src/world.js'),scene=new THREE.Scene();let baseline;
 for(let cycle=0;cycle<3;cycle++){
  const play=buildWorld(scene,'sile',{sileData:data,props:false}),rocks=scene.getObjectByName('sile-harbour-armour'),boxes=JSON.stringify(rocks.userData.harbourBoxes);if(baseline)assert.equal(boxes,baseline);else baseline=boxes;
  let released=0;for(const item of [rocks.geometry,rocks.material])item.addEventListener('dispose',()=>released++);clearWorld(scene);assert.equal(released,2);assert.equal(scene.userData.sileHarbourStats,null);
 }
});


test('real harbour replacement retains land coverage across internal land triangulation edges',async()=>{
 const {coastGround}=await import('../src/sile-coast.js'),input=coastGround(data,data.positions),result=api.harbourSurfaces(data,input);
 const projected=positions=>{let sum=0;for(let i=0;i<positions.length;i+=9)sum+=area([0,3,6].map(k=>[positions[i+k],positions[i+k+2]]));return sum;};
 const missing=projected(input)-projected(result.ground)-projected(result.paved);
 // The original rounded centimetre coastline has <.2m² outside actual land.
 // Cutting replacement at interior land-triangle edges previously lost19m².
 assert.ok(missing>=-.001&&missing<.25,`soil+pavement lose${missing}m²`);
});
