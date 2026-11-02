import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {buildSile}from '../src/sile-world.js';import {terrainHeight,surfaceAt,insidePolygon}from '../src/geo-terrain.js';
const api=await import('../src/sile-buildings.js').catch(()=>({})),data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
const ctx=new Proxy({getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const areaXZ=(a,b,c)=>Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;
test('coastal selection uses non-crop shore distance and existing source building type deterministically',()=>{
 assert.equal(typeof api.coastalBuildings,'function');const before=JSON.stringify(data),profiles=api.coastalBuildings(data);assert.ok(profiles.size>70&&profiles.size<200);assert.deepEqual(api.coastalBuildings(data),profiles);assert.equal(JSON.stringify(data),before);
 for(const [id,p]of profiles){assert.equal(p.item.id,id);assert.ok(p.distance<=100&&p.distance>=0);assert.equal(p.item.landmark,undefined);assert.ok(p.eaves>p.item.base);assert.equal(p.commercial,['commercial','retail'].includes(p.type));}
 assert.equal(api.coastalBuildings({...data,projection:{...data.projection,lon:0}}).size,0);assert.equal(api.coastalBuildings({...data,buildings:[]}).size,0);
});
test('oblique and reversed facade cells cover each wall exactly with outward normals and bounded atlas tiles',()=>{
 assert.equal(typeof api.buildingFacade,'function');
 for(const reverse of [false,true]){const ring=[[0,0],[12,0],[12,8],[0,8]].map(([x,z])=>[100+x*.6-z*.8,-70+x*.8+z*.6]);if(reverse)ring.reverse();const item={id:11,base:3,height:7.5,rings:[ring]},f=api.buildingFacade(item,{paint:0xd1c5b5,commercial:false},9);let area=0;
  for(let i=0;i<f.positions.length;i+=9){const [a,b,c]=[0,3,6].map(k=>new THREE.Vector3(...f.positions.slice(i+k,i+k+3))),n=new THREE.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a));area+=n.length()/2;const p=a.clone().add(b).add(c).divideScalar(3),center=new THREE.Vector3(100+6*.6-4*.8,p.y,-70+6*.8+4*.6);assert.ok(n.dot(p.sub(center))>0);}
  assert.ok(Math.abs(area-240)<1e-7);assert.equal(f.uv.length,f.positions.length/3*2);assert.ok(f.uv.every(v=>v>0&&v<1));assert.equal(f.colors.length,f.positions.length);
  for(const cell of f.cells){const u=cell.tile%4,v=Math.floor(cell.tile/4);for(const [x,y]of cell.uv){assert.ok(x>u/4&&x<(u+1)/4);assert.ok(y>v/4&&y<(v+1)/4);}if(cell.floor===0)assert.ok(cell.tile<10,'residential entrances avoid commercial tiles');}
  assert.equal(f.cells.filter(c=>c.floor===0&&(c.tile===8||c.tile===9)).length,1,'one entrance rather than a door in every ground bay');
 }
});
test('coastal walls replace legacy wall geometry and preserve source prisms and reference data',()=>{
 const before=JSON.stringify(data),scene=new THREE.Scene(),play=buildSile(scene,data),walls=scene.getObjectByName('sile-coastal-facades');assert.ok(walls);assert.equal(walls.geometry.attributes.uv.count,walls.geometry.attributes.position.count);assert.equal(walls.material.map.image.width,1024);assert.equal(walls.material.map.colorSpace,THREE.SRGBColorSpace);assert.equal(walls.material.roughnessMap.colorSpace,THREE.NoColorSpace);assert.equal(play.prisms.filter(q=>q.authored!=='coastal-foundation').length,data.buildings.length+data.structures.length);assert.equal(JSON.stringify(data),before);assert.ok(scene.userData.sileBuildingStats.buildings>70);
});
test('solid seaside balcony parts use their actual transformed bounds and stay over land within source height',()=>{
 const scene=new THREE.Scene(),play=buildSile(scene,data);scene.updateMatrixWorld(true);let count=0;
 scene.traverse(o=>{if(!o.isInstancedMesh||!o.userData.buildingBoxes)return;for(let i=0;i<o.count;i++){const m=new THREE.Matrix4();o.getMatrixAt(i,m);const b=o.geometry.boundingBox.clone().applyMatrix4(m),record=o.userData.buildingBoxes[i],c=record.box;assert.ok(play.boxes.includes(c));assert.ok(b.min.x>=c.minx-.0001&&b.max.x<=c.maxx+.0001&&b.min.y>=c.miny-.0001&&b.max.y<=c.maxy+.0001&&b.min.z>=c.minz-.0001&&b.max.z<=c.maxz+.0001);assert.ok(c.maxy<=record.top+.002&&c.miny>=record.base-.002);for(const x of [c.minx,c.maxx])for(const z of [c.minz,c.maxz])assert.equal(surfaceAt(play,x,z).water,false);count++;}});
 assert.ok(count>50);assert.ok(scene.userData.sileBuildingStats.balconies<=160);let meshes=0;scene.traverse(o=>{if(o.isMesh)meshes++});assert.ok(meshes<=51);
});
test('building aprons replace ground once and follow terrain without spilling onto water',()=>{
 assert.equal(typeof api.buildingAprons,'function');const profiles=api.coastalBuildings(data),input=data.positions,result=api.buildingAprons(data,input,profiles),sum=p=>{let s=0;for(let i=0;i<p.length;i+=9)s+=areaXZ(...[0,3,6].map(k=>[p[i+k],p[i+k+2]]));return s;};assert.ok(sum(result.paved)>500);assert.ok(Math.abs(sum(result.ground)+sum(result.paved)-sum(input))<.5);
 for(let i=0;i<result.paved.length;i+=9){const tri=[0,3,6].map(k=>[result.paved[i+k],result.paved[i+k+2]]),x=tri.reduce((s,p)=>s+p[0]/3,0),z=tri.reduce((s,p)=>s+p[1]/3,0);assert.equal(surfaceAt({terrain:data.terrain},x,z).water,false);for(const k of [0,3,6])assert.ok(Math.abs(result.paved[i+k+1]-terrainHeight(data.terrain,result.paved[i+k],result.paved[i+k+2]))<.0001);}
});

test('invalid coastal rings retain legacy ownership while valid concave footprints remain supported',()=>{
 const profile=[...api.coastalBuildings(data).values()].find(p=>p.distance>35&&p.distance<80),[x,z]=profile.center;
 for(const points of [[[-5,0],[0,0],[5,0]],[[-5,-5],[5,5],[-5,5],[5,-5]],[[-5,-5],[5,5],[-5,5],[3,-5]]]){
  const d=structuredClone(data);d.buildings.find(b=>b.id===profile.item.id).rings=[points.map(([a,b])=>[x+a,z+b])];assert.equal(api.coastalBuildings(d).has(profile.item.id),false,'invalid wall must not replace legacy geometry');
 }
 const concave=structuredClone(data);concave.buildings.find(b=>b.id===profile.item.id).rings=[[[-5,-5],[5,-5],[5,5],[0,0],[-5,5]].map(([a,b])=>[x+a,z+b])];assert.equal(api.coastalBuildings(concave).has(profile.item.id),true);
});
test('opposing balconies in a narrow building gap cannot interpenetrate accepted balcony slabs',async()=>{
 const {addCoastalBuildings}=await import('../src/sile-building-view.js'),items=[{id:11,base:0,height:9,rings:[[[0,0],[10,0],[10,10],[0,10]]]},{id:13,base:0,height:9,rings:[[[11,0],[21,0],[21,10],[11,10]]]}],terrain={bounds:[-100,100,-100,100],cols:2,rows:2,heights:[0,0,0,0],datum:0,land:[[[[-100,-100],[100,-100],[100,100],[-100,100]]]]},d={buildings:items},play={terrain,boxes:[],prisms:items.map(b=>({bounds:[b.rings[0][0][0],b.rings[0][1][0],0,10],miny:0,maxy:9}))},profiles=new Map(items.map((item,i)=>[item.id,{item,paint:0xc6bca9,eaves:9,center:[i?16:5,5],shore:[i?-100:100,5]}])),scene=new THREE.Scene();
 addCoastalBuildings(scene,d,play,profiles);const slabs=scene.getObjectByName('sile-coastal-balcony-stone');assert.ok(slabs&&slabs.count>=2);const records=slabs.userData.buildingBoxes;
 for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){const a=records[i].box,b=records[j].box;assert.ok(a.maxx<=b.minx||a.minx>=b.maxx||a.maxy<=b.miny||a.miny>=b.maxy||a.maxz<=b.minz||a.minz>=b.maxz,'separate balconies must clear one another');}
});
test('coastal detail resources dispose once and clear metadata through the existing world lifecycle',async()=>{
 const {buildWorld,clearWorld}=await import('../src/world.js'),scene=new THREE.Scene();buildWorld(scene,'sile',{sileData:data,props:false});const resources=new Set();scene.traverse(o=>{if(!o.isMesh||!o.name.startsWith('sile-coastal-'))return;resources.add(o.geometry);resources.add(o.material);for(const v of Object.values(o.material))if(v?.isTexture)resources.add(v);});let count=0;for(const r of resources)r.addEventListener('dispose',()=>count++);assert.ok(resources.size>6);clearWorld(scene);assert.equal(count,resources.size);assert.equal(scene.userData.sileBuildingStats,null);
});
