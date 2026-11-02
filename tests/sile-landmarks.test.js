import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import * as site from '../src/sile-landmarks.js';import {insidePolygon,terrainHeight,surfaceAt} from '../src/geo-terrain.js';import {buildSile} from '../src/sile-world.js';
function boundaryDistance(x,z,ring){return Math.min(...ring.map((a,i)=>{const b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}));}
const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>k in o?o[k]:(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
test('castle site uses its actual bounded island and a labelled runtime plateau without changing source',()=>{
 const before=JSON.stringify(data),s=site.castleSite(data);assert.ok(s);assert.equal(s.reliefM,4.5);assert.equal(s.platform.height,2.9);assert.equal(s.castle.height,12);assert.equal(s.castle.base,s.platform.height);assert.equal(s.platform.authored,true);assert.ok(data.terrain.land.includes(s.platform.rings));assert.ok(s.source.rings[0].every(p=>insidePolygon(...p,s.platform.rings)));assert.equal(JSON.stringify(data),before);
 for(const [x,z] of s.castle.rings[0])assert.equal(terrainHeight(s.terrain,x,z),s.platform.height);
 const play={terrain:s.terrain};assert.equal(surfaceAt(play,157.3,-715.46).height,s.platform.height);assert.equal(surfaceAt(play,0,0).height,surfaceAt({terrain:data.terrain},0,0).height);assert.deepEqual(surfaceAt(play,157.3,-715.46).normal,[0,1,0]);
 const absent={...data,buildings:data.buildings.filter(b=>!b.landmark)};assert.equal(site.castleSite(absent),null);
});
test('castle walls, recessed openings and merlons stay in source footprint and12m tower envelope',()=>{
 const s=site.castleSite(data),mesh=site.castleModel(s.castle);assert.equal(mesh.name,'sile-castle');let count=0,top=-Infinity,bottom=Infinity;
 mesh.traverse(o=>{if(!o.isMesh)return;count++;const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;assert.ok(o.geometry.attributes.uv);assert.ok(p.array.every(Number.isFinite));assert.ok(n.array.every(Number.isFinite));for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);assert.ok(insidePolygon(x,z,s.castle.rings)||boundaryDistance(x,z,s.castle.rings[0])<.0001);top=Math.max(top,y);bottom=Math.min(bottom,y);assert.ok(y>=s.castle.base-.0001&&y<=s.castle.base+12.0001);}});
 assert.equal(count,2);assert.ok(Math.abs(top-s.castle.base-12)<.0001);assert.ok(Math.abs(bottom-s.castle.base)<.0001);assert.ok(mesh.userData.decorativeOpenings);assert.ok(mesh.userData.merlons>=20);
});
test('rendered rock platform and castle collider agree while all other buildings remain unchanged',()=>{
 const before=JSON.stringify(data),scene=new THREE.Scene(),play=buildSile(scene,data),s=site.castleSite(data);assert.ok(scene.getObjectByName('sile-castle'));const rock=scene.getObjectByName('sile-castle-island');assert.ok(rock);
 const p=rock.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getY(i)-terrainHeight(play.terrain,p.getX(i),p.getZ(i)))<.0001);
 const i=data.buildings.findIndex(b=>b.landmark==='castle');assert.equal(play.prisms[i].miny,s.castle.base);assert.equal(play.prisms[i].maxy,s.castle.base+12);assert.equal(play.prisms.filter(q=>q.authored!=='coastal-foundation').length,data.buildings.length+data.structures.length);
 for(let j=0;j<data.buildings.length;j++)if(j!==i){assert.equal(play.prisms[j].miny,data.buildings[j].base);assert.equal(play.prisms[j].maxy,data.buildings[j].base+data.buildings[j].height);}
 assert.equal(JSON.stringify(data),before);let meshes=0;scene.traverse(o=>{if(o.isMesh)meshes++});assert.ok(meshes<=49);
});

test('unsupported castle bodies retain the generic fallback instead of building invalid detail geometry',()=>{
 for(const patch of [{height:1},{height:NaN},{rings:[[[0,0],[1,0],[1,1],[0,1]]]},{rings:[[[164,-712],[155,-708],[157,-713],[159,-723]]]}]){const d=structuredClone(data),i=d.buildings.findIndex(b=>b.landmark==='castle');Object.assign(d.buildings[i],patch);assert.equal(site.castleSite(d),null);}
});

test('islands with holes retain original terrain until inner cliffs can match raised geometry',()=>{
 const d=structuredClone(data);d.terrain.land=[[[[100,-830],[230,-830],[230,-630],[100,-630]],[[150,-760],[155,-760],[155,-755],[150,-755]]]];assert.equal(site.castleSite(d),null);
});
