import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {buildSile} from '../src/sile-world.js';import {surfaceAt} from '../src/geo-terrain.js';import {cavePoint,insideCave} from '../src/sea-cave-volume.js';import {coastCliffContacts} from '../src/sile-rock-view.js';import {applyWorld} from '../src/collide.js';
const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url))),before=JSON.stringify(data),scene=new THREE.Scene(),play=buildSile(scene,data);scene.updateMatrixWorld(true);const spec={size:.22};
function move(c,from,to,speed=3){const a=cavePoint(c,...from),b=cavePoint(c,...to),v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize().multiplyScalar(speed),s={x:b[0],y:b[1],z:b[2],vx:v.x,vy:v.y,vz:v.z,armed:true,motionStart:{x:a[0],y:a[1],z:a[2]}};applyWorld(s,spec,play);return s;}
test('both photographed sites have open rendered mouths and physical entry, interior and exit paths',()=>{
 assert.equal(play.terrain.seaCaves.length,2);let meshes=0;scene.traverse(o=>{if(o.isMesh)meshes++;});assert.ok(meshes<=51,'both cavities and sand share one extra mesh');for(const c of play.terrain.seaCaves){assert.equal(c.interiorSurveyed,false);assert.ok(c.interiorTriangles>100);if(c.id==='su-icen-fil')assert.ok(c.exteriorTriangles>100,'through passage needs a visible outer rock body');assert.ok(c.roofTriangles>0);
 for(const direction of [1,-1])for(let d=c.minD-2;d<c.maxD-(c.blind?1:-2);d+=.5){const s=move(c,[0,c.sea+1.8,d-direction*.2],[0,c.sea+1.8,d]);assert.equal(s.crashed,undefined,c.id+' '+d);assert.ok(Math.abs(s.y-cavePoint(c,0,c.sea+1.8,d)[1])<1e-6);}
 const start=cavePoint(c,0,c.sea+1.8,c.minD-2),end=cavePoint(c,0,c.sea+1.8,c.blind?c.maxD-1:c.maxD+2),dir=new THREE.Vector3(...end).sub(new THREE.Vector3(...start));const ray=new THREE.Raycaster(new THREE.Vector3(...start),dir.clone().normalize(),0,dir.length());assert.deepEqual(ray.intersectObjects(scene.children,true).map(h=>h.object.name),[],'visible route cannot be a fake opening');
 // Single 36–52 m steps also use swept contacts rather than teleporting.
 if(!c.blind)for(const sign of [1,-1]){const s=move(c,[0,c.sea+1.8,sign*(c.minD-2)],[0,c.sea+1.8,sign*(c.maxD+2)],70);assert.equal(s.crashed,undefined);}
 }assert.equal(JSON.stringify(data),before);
});
test('uploaded cave triangles own collision exactly; side, arched ceiling, blind end and water stop flight',()=>{
 for(const c of play.terrain.seaCaves){const mesh=scene.getObjectByName('sile-sea-caves'),records=play.terrainWalls.filter(w=>w.caveId===c.id&&w.role==='shell');assert.deepEqual(records.map(r=>r.vertices),coastCliffContacts(mesh.geometry).slice(c.meshRange.start/3,(c.meshRange.start+c.meshRange.count)/3).map(r=>r.vertices));
 const d=c.blind?10:0;
 for(const [from,to]of [[[0,c.sea+.6,d],[c.halfWidth+1,c.sea+.6,d]],[[0,c.sea+1,d],[0,c.sea+c.sideHeight+c.rise+2,d]]]){const s=move(c,from,to,25);assert.equal(s.crashed,true,c.id+' shell must intercept high speed motion');assert.equal(s.crashReason,'mağara kayalığına çarptı');}
 if(c.blind){const s=move(c,[0,c.sea+1.8,10],[0,c.sea+1.8,25],25);assert.equal(s.crashed,true);}
 const s=move(c,[0,c.sea+1,d],[0,c.sea-.2,d]);assert.equal(s.crashed,true);assert.equal(s.crashReason,'suya düştü');
 }
});
test('native roof remains visible and blocks falling into a cave; source terrain above and outside stays solid',()=>{
 for(const c of play.terrain.seaCaves){let minimum=Infinity;for(let d=c.minD;d<=c.maxD;d+=.5)for(let u=-c.halfWidth;u<=c.halfWidth;u+=.25){const [x,,z]=cavePoint(c,u,0,d),native=surfaceAt(play,x,z);if(!native.water){const roof=Math.min(...c.planes.filter(p=>p.n[1]>1e-8).map(p=>(p.d-p.n[0]*x-p.n[2]*z)/p.n[1]));minimum=Math.min(minimum,native.height-roof);assert.deepEqual(surfaceAt(play,x,z,native.height+1),native);}}assert.ok(minimum>.5,c.id+' support thickness '+minimum);
 const d=c.blind?10:0,[x,,z]=cavePoint(c,0,0,d),native=surfaceAt(play,x,z);assert.equal(native.water,false);const s=move(c,[0,native.height+10,d],[0,c.sea+1,d],40);assert.equal(s.crashed,true);assert.ok(s.y>native.height-.001,'fast fall stops above original top, not at the cave ceiling');
 const ray=new THREE.Raycaster(new THREE.Vector3(x,native.height+10,z),new THREE.Vector3(0,-1,0));const hits=ray.intersectObjects(scene.children,true).filter(h=>h.object.name==='sile-terrain');assert.ok(hits.length);const roof=play.terrainWalls.filter(w=>w.mesh==='sile-cave-native-roof-'+c.id);const roofMesh=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(roof.flatMap(w=>w.vertices.flat()),3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));roofMesh.updateMatrixWorld();const roofHit=ray.intersectObject(roofMesh);assert.ok(roofHit.length);assert.ok(Math.abs(roofHit[0].point.y-hits[0].point.y)<.0002,'new roof contacts match uploaded original faces');roofMesh.geometry.dispose();roofMesh.material.dispose();
 const [ox,,oz]=cavePoint(c,c.halfWidth+2,0,d);assert.ok(surfaceAt(play,ox,oz,c.sea+1).height>c.sea+1);
 }
});
test('remaining cliff triangle interiors never cover the authored cavity',()=>{
 const g=scene.getObjectByName('sile-coast-cliffs').geometry,p=g.attributes.position,ix=g.index;for(let i=0;i<ix.count;i+=3){const pts=[0,1,2].map(k=>{const j=ix.getX(i+k);return[p.getX(j),p.getY(j),p.getZ(j)]}),v=[0,1,2].map(k=>pts.reduce((s,p)=>s+p[k]/3,0));for(const c of play.terrain.seaCaves)if(insideCave(c,...v)){const wall=c.planes.some(p=>Math.abs(p.n[0]*v[0]+p.n[1]*v[1]+p.n[2]*v[2]-p.d)<.0002);assert.ok(wall,'no drawn face in the void');}}
});

test('source ownership and applicability: runtime caves cannot mutate or carve a different map',async()=>{
 const {sileSeaCaves,addSeaCaveInteriors}=await import('../src/sile-sea-caves.js');const other={...data,projection:{...data.projection,lon:data.projection.lon+.01}};assert.deepEqual(sileSeaCaves(other.terrain,other),[],'fixed local coordinates require matching source projection');
 const cropped={...data,terrain:{...data.terrain,bounds:[-10,10,-10,10]}};assert.deepEqual(sileSeaCaves(cropped.terrain,cropped),[],'mouths must lie inside covered source');
 const t={...data.terrain},p={terrain:t},empty={positions:[]},s=new THREE.Scene();addSeaCaveInteriors(s,empty,p,[],new THREE.MeshBasicMaterial());assert.equal(t.seaCaves,undefined,'runtime metadata must not enter caller-owned terrain');assert.notEqual(p.terrain,t);
});

test('new seaward rock has a sealed visible and collidable tunnel lining before the original coast',()=>{
 const c=play.terrain.seaCaves.find(c=>c.id==='su-icen-fil');for(const d of [-12,-10,-7.5,-5]){const s=move(c,[0,c.sea+1,d],[3.4,c.sea+1,d],25);assert.equal(s.crashed,true,'seaward lining '+d);const a=cavePoint(c,0,c.sea+1,d),b=cavePoint(c,3.4,c.sea+1,d),dir=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),ray=new THREE.Raycaster(new THREE.Vector3(...a),dir.clone().normalize(),0,dir.length());assert.ok(ray.intersectObject(scene.getObjectByName('sile-sea-caves')).length,'visible lining '+d);}
});

test('authored outer rock reaches below water and does not penetrate existing solid objects',()=>{
 const c=play.terrain.seaCaves.find(c=>c.exterior),p=scene.getObjectByName('sile-sea-caves').geometry.attributes.position,start=c.meshRange.start+c.meshRange.count-c.exteriorTriangles*3,end=c.meshRange.start+c.meshRange.count,points=[];for(let i=start;i<end;i++)points.push([p.getX(i),p.getY(i),p.getZ(i)]);assert.ok(Math.min(...points.map(v=>v[1]))<c.sea-.5,'seaward body has submerged anchoring geometry');
 const bounds=[0,2].flatMap(k=>[Math.min(...points.map(v=>v[k])),Math.max(...points.map(v=>v[k]))]),boxes=play.boxes.filter(b=>b.minx<bounds[1]&&b.maxx>bounds[0]&&b.minz<bounds[3]&&b.maxz>bounds[2]);for(const [x,y,z]of points)for(const b of boxes)assert.ok(!(x>b.minx+.001&&x<b.maxx-.001&&y>b.miny+.001&&y<b.maxy-.001&&z>b.minz+.001&&z<b.maxz-.001),'outer rock intersects an existing box');
});
