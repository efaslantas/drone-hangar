import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';import{createSurfacePartition}from '../src/sile-shore.js';import{coastalBuildings}from '../src/sile-buildings.js';import{buildSile}from '../src/sile-world.js';import{surfaceAt,terrainHeight,insidePolygon}from '../src/geo-terrain.js';
const api=await import('../src/sile-streets.js').catch(()=>({})),view=await import('../src/sile-street-view.js').catch(()=>({})),data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
const ctx=new Proxy({getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const area=t=>Math.abs((t[1][0]-t[0][0])*(t[2][1]-t[0][1])-(t[1][1]-t[0][1])*(t[2][0]-t[0][0]))/2,areaSum=positions=>{let s=0;for(let i=0;i<positions.length;i+=9)s+=area([0,3,6].map(k=>[positions[i+k],positions[i+k+2]]));return s;};
test('indexed union matches legacy clipping across negative cells, large masks, holes and overlaps',()=>{
 const masks=[[[[-150,-150],[150,-150],[150,150],[-150,150]],[[-10,-10],[-10,10],[10,10],[10,-10]]],[[[-8,-8],[8,-8],[8,8],[-8,8]]]];for(let x=-200;x<200;x+=7)masks.push([[[x,-20],[x+12,-20],[x+12,24],[x,24]]]);const legacy=createSurfacePartition(masks),indexed=createSurfacePartition(masks,{spatial:true});for(const x of [-210,-64,0,63,150]){const t=[[x,-30,2*x-90],[x+70,20,2*(x+70)+60],[x-10,60,2*(x-10)+180]];assert.deepEqual(indexed(t),legacy(t));}
});
test('source road joins produce one continuous union with no acute spikes at turns and shared junctions',()=>{
 assert.equal(typeof api.roadRibbonMasks,'function');const roads=[{width:6,points:[[0,0],[20,0],[20,20]]},{width:4,points:[[20,0],[35,-8]]}],masks=api.roadRibbonMasks(roads),clip=createSurfacePartition(masks,{spatial:true});for(const p of [[20,-2],[22,-1],[22,2],[19,1],[0,0],[20,18]]){const t=[[p[0]-.01,p[1]-.01],[p[0]+.01,p[1]-.01],[p[0],p[1]+.01]];assert.ok(clip(t).inside.length,`junction gap${p}`);}for(const rings of masks)for(const[x,z]of rings[0])assert.ok(x>=-3.01&&x<=38.01&&z>=-11.01&&z<=23.01);
});
test('real streets partition soil once into terrain-exact land surfaces without covering source building interiors',()=>{
 assert.equal(typeof api.streetLayout,'function');const profiles=coastalBuildings(data),layout=api.streetLayout(data,profiles),before=JSON.stringify(data),out=api.streetSurfaces(data,data.positions,layout);assert.equal(layout.valid,true);assert.ok(layout.groundCorridors.length>10);assert.ok(areaSum(out.asphalt)>10000&&areaSum(out.paving)>5000);assert.ok(Math.abs(areaSum(out.ground)+areaSum(out.asphalt)+areaSum(out.paving)-areaSum(data.positions))<1);
 for(const positions of [out.asphalt,out.paving])for(let i=0;i<positions.length;i+=9){const x=(positions[i]+positions[i+3]+positions[i+6])/3,z=(positions[i+2]+positions[i+5]+positions[i+8])/3;assert.equal(surfaceAt({terrain:data.terrain},x,z).water,false);if(i%333===0)assert.ok(!data.buildings.some(b=>insidePolygon(x,z,b.rings)),'street surface must not enter a source building');for(const k of [0,3,6])assert.ok(Math.abs(positions[i+k+1]-terrainHeight(data.terrain,positions[i+k],positions[i+k+2]))<.0001);}
 assert.equal(JSON.stringify(data),before);assert.deepEqual(api.streetLayout({...data,projection:{...data.projection,lon:0}},profiles).valid,false);
});
test('entry links are bounded and follow clear source land; old prop owners reserve their full corridor',()=>{
 const scene=new THREE.Scene(),play=buildSile(scene,data);assert.ok(play.groundCorridors?.length>10);for(const c of play.groundCorridors){assert.ok(Math.hypot(c.b[0]-c.a[0],c.b[1]-c.a[1])<=18.001);assert.equal(c.width,1.25);for(let i=0;i<=10;i++){const x=c.a[0]+(c.b[0]-c.a[0])*i/10,z=c.a[1]+(c.b[1]-c.a[1])*i/10;assert.equal(surfaceAt(play,x,z).water,false);}}
 assert.equal(play.prisms.filter(q=>q.authored!=='coastal-foundation').length,data.buildings.length+data.structures.length);let meshes=0;scene.traverse(o=>{if(o.isMesh)meshes++});assert.ok(meshes<=45);
});
test('paving has metric UVs and shared correctly encoded resources, and legacy road fallback survives incomplete fixtures',async()=>{
 assert.equal(typeof view.streetPavingMaterial,'function');const scene=new THREE.Scene();buildSile(scene,data);const paved=scene.getObjectByName('sile-street-paving'),apron=scene.getObjectByName('sile-building-aprons');assert.ok(paved&&apron);assert.equal(paved.material,apron.material);assert.equal(paved.material.map.image.width,512);assert.equal(paved.material.map.colorSpace,THREE.SRGBColorSpace);assert.equal(paved.material.bumpMap.colorSpace,THREE.NoColorSpace);const p=paved.geometry.attributes.position,u=paved.geometry.attributes.uv;for(let i=0;i<p.count;i+=Math.max(1,Math.floor(p.count/100))){assert.ok(Math.abs(u.getX(i)-p.getX(i))<.0001);assert.ok(Math.abs(u.getY(i)-p.getZ(i))<.0001);}
 const partial={...data,buildings:data.buildings.slice(0,1),structures:[]},s=new THREE.Scene();buildSile(s,partial);assert.ok(s.getObjectByName('sile-roads'));assert.equal(s.getObjectByName('sile-street-paving'),undefined);
});


test('new entrance corridors stay clear of existing low prop collision envelopes',async()=>{
 const{segmentDistance}=await import('../src/sile-neighbourhood.js'),scene=new THREE.Scene(),play=buildSile(scene,data);let checked=0;
 for(const b of play.boxes){const x=(b.minx+b.maxx)/2,z=(b.minz+b.maxz)/2,y=surfaceAt(play,x,z).height;if(b.miny>y+.5)continue;const r=Math.hypot((b.maxx-b.minx)/2,(b.maxz-b.minz)/2);for(const c of play.groundCorridors){assert.ok(segmentDistance(x,z,c.a,c.b)>=c.width/2+r-.005,'visible entrance link blocked by a low prop');checked++;}}
 assert.ok(checked>1000);
});
test('shared paving and all street metadata use the existing unique-resource world cleanup',async()=>{
 const{buildWorld,clearWorld}=await import('../src/world.js'),scene=new THREE.Scene();buildWorld(scene,'sile',{sileData:data,props:false});const m=scene.getObjectByName('sile-street-paving').material,resources=new Set([m,...Object.values(m).filter(v=>v?.isTexture)]);let released=0;for(const r of resources)r.addEventListener('dispose',()=>released++);clearWorld(scene);assert.equal(released,resources.size);assert.equal(scene.userData.sileStreetStats,null);
});
