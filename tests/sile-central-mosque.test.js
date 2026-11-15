import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import * as api from '../src/sile-central-mosque.js';
import {applyWorld} from '../src/collide.js';
const data={...JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url))),completionLayer:1};
test('only the identified compatible completed-world mosque receives a profile and raw source remains unchanged',()=>{
 const before=JSON.stringify(data),site=api.mosqueSite(data);assert.equal(site.item.id,342519904);assert.ok(site.width>20&&site.width<22);assert.ok(site.depth>25&&site.depth<28);assert.equal(site.measured,false);assert.deepEqual(site.rings,site.item.rings);assert.equal(JSON.stringify(data),before);
 assert.equal(api.mosqueSite({...data,completionLayer:0}),null);assert.equal(api.mosqueSite({...data,buildings:data.buildings.filter(b=>b.id!==342519904)}),null);assert.equal(api.mosqueSite({...data,projection:{...data.projection,lon:0}}),null);
 const broken=structuredClone(data);broken.buildings.find(b=>b.id===342519904).rings[0][1][0]=NaN;assert.equal(api.mosqueSite(broken),null);
});
test('mosque surfaces have finite Float32 geometry, bounded complexity and only one minaret',()=>{
 const site=api.mosqueSite(data),built=api.mosqueGeometry(site,site.item.base),g=built.geometry,p=g.attributes.position;assert.ok(p.array instanceof Float32Array);assert.ok(p.array.every(Number.isFinite));assert.ok(p.count/3>1000&&p.count/3<16000);assert.equal(built.parts.filter(p=>p.role==='minaret').length,1);g.computeBoundingBox();assert.ok(Math.abs(g.boundingBox.max.y-(site.item.base+site.minaretHeight))<.001);assert.ok(g.groups.length<=6);assert.ok(built.parts.some(p=>p.role==='main-dome'));assert.ok(built.parts.some(p=>p.role==='lower-dome'));g.dispose();
});
test('authored stone/arched glazing and lead seams are deterministic with valid separate data channels',()=>{
 const wall=api.mosqueTexel('stone',.05,.2),glass=api.mosqueTexel('stone',.5,.5),lead=api.mosqueTexel('lead',.2,.4);assert.equal(wall.kind,'stone');assert.equal(glass.kind,'window');assert.ok(glass.roughness<wall.roughness);assert.ok(glass.height<wall.height);assert.equal(lead.kind,'lead');
 for(const material of ['stone','lead'])for(let x=0;x<24;x++)for(let y=0;y<24;y++){const t=api.mosqueTexel(material,x/23,y/23);assert.deepEqual(t,api.mosqueTexel(material,x/23,y/23));for(const n of [...t.color,t.height,t.roughness])assert.ok(Number.isInteger(n)&&n>=0&&n<=255);}
});
function fixture(){const site=api.mosqueSite(data),base=site.item.base,terrain={bounds:[-2000,3000,-1000,2000],cols:2,rows:2,heights:[base,base,base,base],datum:0,land:[[[[-2000,-1000],[3000,-1000],[3000,2000],[-2000,2000]]]]},original={rings:site.rings,miny:base,maxy:base+site.item.height,bounds:[157.1,183.38,103.73,134.04]},other={rings:[[[900,900],[910,900],[910,910],[900,910]]],miny:0,maxy:10,bounds:[900,910,900,910]},scene=new THREE.Scene(),play={terrain,bounds:{minx:-2000,maxx:3000,minz:-1000,maxz:2000},ceil:200,prisms:data.buildings.map(b=>b===site.item?original:other),boxes:[],terrainWalls:[]};api.addCompletedMosque(scene,play,data,site);return {scene,play,site,original,other,base};}
test('only owned body changes, all shell contacts exactly reference uploaded visible Float32 triangles and world owns resources',()=>{
 const f=fixture(),mesh=f.scene.getObjectByName('sile-central-mosque'),p=mesh.geometry.attributes.position;assert.ok(mesh);assert.ok(f.original.maxy>f.base+10);assert.equal(f.other.maxy,10);assert.equal(f.scene.userData.sileMosqueStats.measured,false);assert.ok(f.play.terrainWalls.length>1000);for(const c of f.play.terrainWalls){assert.equal(c.sourceId,342519904);assert.equal(c.authored,'central-mosque-shell');assert.deepEqual(c.vertices.flat(),Array.from(p.array.slice(c.face*9,c.face*9+9)));}
 assert.equal(api.addCompletedMosque(f.scene,f.play,data,f.site),undefined);assert.equal(f.scene.children.length,1,'idempotent');const textures=new Set(mesh.material.flatMap(m=>Object.values(m).filter(t=>t?.isTexture)));assert.equal(textures.size,6);for(const t of textures)assert.equal(t.image.width,256);
});
test('dome landing and swept minaret impacts occur at the drawn surface while adjacent sky stays clear',()=>{
 const f=fixture(),spec={size:.22},world=f.play,at=(x,y,z)=>{const p=f.site.point(x,z);return [p[0],f.base+y,p[1]];},step=(a,b,v)=>{const s={x:b[0],y:b[1],z:b[2],vx:v[0],vy:v[1],vz:v[2],armed:true,motionStart:{x:a[0],y:a[1],z:a[2]}};applyWorld(s,spec,world);return s;};
 const x=f.site.minaret[0],z=f.site.minaret[1],hit=step(at(x-5,22,z),at(x+5,22,z),[50*f.site.u[0],0,50*f.site.u[1]]);assert.equal(hit.crashed,true);assert.equal(hit.crashReason,'camiye çarptı');
 const clear=at(8.8,20,0),free=step(clear,clear,[0,0,0]);assert.deepEqual([free.x,free.y,free.z],clear);assert.equal(free.crashed,undefined);
 const start=at(2,26,0),end=at(2,13,0),landing=step(start,end,[0,-1,0]);assert.equal(landing.crashed,undefined);assert.equal(landing.grounded,true);const ray=new THREE.Raycaster(new THREE.Vector3(...start),new THREE.Vector3(0,-1,0)),surface=ray.intersectObject(f.scene.getObjectByName('sile-central-mosque'))[0];assert.ok(surface);assert.ok(Math.abs(landing.y-surface.point.y)<.2);
});

test('sourced navigation names central mosque without styling unrelated erroneous mosque tags',()=>{const nav=JSON.parse(fs.readFileSync(new URL('../src/data/sile-navigation.json',import.meta.url)));assert.equal(nav.landmarks.filter(p=>p.id==='way/342519904').length,1);assert.equal(nav.landmarks.find(p=>p.id==='way/342519904').name,'Hüseyin Keçici Şile Merkez Camii');assert.equal(nav.landmarks.find(p=>p.id==='way/342519904').kind,'mosque');assert.equal(nav.landmarks.some(p=>p.id==='way/549993675'),false);});
