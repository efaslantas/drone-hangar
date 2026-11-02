import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {buildSile} from '../src/sile-world.js';import {castleSite} from '../src/sile-landmarks.js';import {terrainHeight,terrainSample,surfaceAt,insidePolygon} from '../src/geo-terrain.js';
const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>k in o?o[k]:(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const scene=new THREE.Scene(),before=JSON.stringify(data),play=buildSile(scene,data),site=castleSite(data),top=scene.getObjectByName('sile-castle-island');scene.updateMatrixWorld(true);
test('island has sloping authored relief and green/rock variation with a level source castle foundation',()=>{
 const p=top.geometry.attributes.position;let low=Infinity,high=-Infinity;for(let i=0;i<p.count;i++){low=Math.min(low,p.getY(i));high=Math.max(high,p.getY(i));}assert.ok(high-low>2,'flat slab must become visibly irregular');assert.ok(high-low<8,'bounded authored relief');
 assert.ok(top.geometry.attributes.color,'green cover and pale rock varied over the surface');
 for(const [x,z] of site.castle.rings[0]){assert.ok(Math.abs(terrainHeight(play.terrain,x,z)-2.9)<1e-6);assert.deepEqual(terrainSample(play.terrain,x,z).normal,[0,1,0]);}
 assert.equal(JSON.stringify(data),before);assert.equal(play.prisms.find(p=>p.rings===site.source.rings).miny,2.9);
});
test('visible island triangles and collision heights/normals agree at independent barycentric samples',()=>{
 const ray=new THREE.Raycaster(),p=top.geometry.attributes.position,idx=top.geometry.index;const count=idx?idx.count:p.count;let checked=0;for(let j=0;j<count;j+=Math.max(3,Math.floor(count/250/3)*3)){
  const ids=[0,1,2].map(k=>idx?idx.getX(j+k):j+k);if(ids.some(i=>i>=p.count))continue;
  const [a,b,c]=ids.map(i=>new THREE.Vector3().fromBufferAttribute(p,i)),cross=new THREE.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a));if(cross.lengthSq()<1e-12)continue;assert.ok(cross.y>0,'top faces upward');
  const q=a.clone().multiplyScalar(.2).addScaledVector(b,.3).addScaledVector(c,.5);ray.set(new THREE.Vector3(q.x,30,q.z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(top)[0];assert.ok(hit,'visible top ray');const sample=terrainSample(play.terrain,q.x,q.z);assert.ok(Math.abs(hit.point.y-sample.height)<.0002,'drawn/query height mismatch');assert.ok(cross.normalize().dot(new THREE.Vector3(...sample.normal))>.99999,'drawn/query normal mismatch');checked++;
 }assert.ok(checked>100);
});
test('island coast cliff lips use the same fine grid surface and water outside the source shoreline',()=>{
 assert.ok(site.platform.surface,'a bounded local surface is attached to the platform');const g=site.platform.surface;assert.ok((g.bounds[1]-g.bounds[0])/(g.cols-1)<=3.001);assert.ok((g.bounds[3]-g.bounds[2])/(g.rows-1)<=3.001);
 const p=scene.getObjectByName('sile-coast-cliffs').geometry.attributes.position;let checked=0;for(let i=0;i<p.count;i++)if(p.getY(i)>-data.terrain.datum-.19&&insidePolygon(p.getX(i),p.getZ(i),site.platform.rings)){
  assert.ok(p.getY(i)<=terrainHeight(play.terrain,p.getX(i),p.getZ(i))+.0002,'fracture face stays below its unchanged lip');checked++;
 }assert.ok(checked>100);assert.equal(surfaceAt(play,90,-730).water,true);assert.equal(JSON.stringify(data),before);
});

test('cliff lip interiors follow every island grid diagonal without cracks',()=>{
 const g=scene.getObjectByName('sile-coast-cliffs').geometry,p=g.attributes.position,b=site.platform.bounds;let checked=0;
 // Follow actual triangle indices: smoothing shares vertices and wetting cuts
 // can subdivide a face, so six consecutive position slots are no longer a quad.
 for(let i=0;i<(g.index?.count||p.count);i+=3)for(let edge=0;edge<3;edge++){
  const ids=[i+edge,i+(edge+1)%3].map(n=>g.index?g.index.getX(n):n),[a,c]=ids.map(n=>new THREE.Vector3().fromBufferAttribute(p,n));if([a,c].some(v=>v.x<b[0]-.001||v.x>b[1]+.001||v.z<b[2]-.001||v.z>b[3]+.001))continue;
  if([a,c].some(v=>Math.abs(v.y-terrainHeight(play.terrain,v.x,v.z))>.0002))continue;
  for(const t of [.25,.5,.75]){const q=a.clone().lerp(c,t);assert.ok(Math.abs(q.y-terrainHeight(play.terrain,q.x,q.z))<.0002,'coast lip spans a bend in the physical/rendered grid');checked++;}
 }
 assert.ok(checked>100);
});
