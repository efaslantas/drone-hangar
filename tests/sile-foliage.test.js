import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const api=await import('../src/sile-foliage.js').catch(()=>({}));
function fixture(){
 const scene=new THREE.Scene(),g=new THREE.IcosahedronGeometry(.5,1),m=new THREE.MeshStandardMaterial({color:0xffffff});g.computeBoundingBox();
 const crown=new THREE.InstancedMesh(g,m,2);crown.name='sile-neighbourhood-leaf:solid';for(let i=0;i<2;i++){const matrix=new THREE.Matrix4().compose(new THREE.Vector3(20+i*2,3,-5),new THREE.Quaternion().setFromEuler(new THREE.Euler(.2,.7,0)),new THREE.Vector3(.92,.85,.68));crown.setMatrixAt(i,matrix);crown.setColorAt(i,new THREE.Color(0x4a643d));}scene.add(crown);return{scene,crown,g,m};
}
test('authored foliage texture is deterministic opaque/cutout RGBA with an empty border and leaf detail',()=>{
 assert.equal(typeof api.foliageTextureData,'function');const a=api.foliageTextureData(),b=api.foliageTextureData();assert.equal(a.size,128);assert.deepEqual(a.pixels,b.pixels);let solid=0,empty=0,colors=new Set();for(let y=0;y<a.size;y++)for(let x=0;x<a.size;x++){const i=(y*a.size+x)*4,alpha=a.pixels[i+3];if(!x||!y||x===a.size-1||y===a.size-1)assert.equal(alpha,0);if(alpha>200){solid++;colors.add(a.pixels[i]);}if(alpha===0)empty++;}assert.ok(solid>1000&&empty>5000);assert.ok(colors.size>15);
});
test('leaf cards are finite, deterministic, multi-oriented and stay within the old geometry bounds',()=>{
 assert.equal(typeof api.foliageGeometry,'function');const box=new THREE.Box3(new THREE.Vector3(-.47,-.49,-.46),new THREE.Vector3(.48,.45,.47)),a=api.foliageGeometry(box),b=api.foliageGeometry(box),p=a.attributes.position,n=a.attributes.normal;assert.ok(p.count<=32*6&&p.count>=24*6);assert.deepEqual(p.array,b.attributes.position.array);const directions=new Set();for(let i=0;i<p.count;i++){assert.ok(box.containsPoint(new THREE.Vector3().fromBufferAttribute(p,i)));directions.add([n.getX(i),n.getY(i),n.getZ(i)].map(x=>x.toFixed(2)).join(':'));}assert.ok(directions.size>20);for(const attr of Object.values(a.attributes))assert.ok(attr.array.every(Number.isFinite));a.dispose();b.dispose();
});
test('finishing keeps mesh identity, transforms and colours, and alpha-tests a shared two-sided material',()=>{
 assert.equal(typeof api.finishSileFoliage,'function');const {scene,crown,g}=fixture(),bounds=g.boundingBox.clone(),matrix=crown.instanceMatrix.array.slice(),colors=crown.instanceColor.array.slice();api.finishSileFoliage(scene);assert.equal(scene.children.length,1);assert.deepEqual(crown.instanceMatrix.array,matrix);assert.deepEqual(crown.instanceColor.array,colors);const material=Array.isArray(crown.material)?crown.material[0]:crown.material;assert.equal(material.transparent,false);assert.ok(material.alphaTest>=.35);assert.equal(material.side,THREE.DoubleSide);assert.equal(material.map.colorSpace,THREE.SRGBColorSpace);for(let i=0;i<crown.geometry.attributes.position.count;i++)assert.ok(bounds.containsPoint(new THREE.Vector3().fromBufferAttribute(crown.geometry.attributes.position,i)));const after=crown.geometry;api.finishSileFoliage(scene);assert.equal(crown.geometry,after);
});
test('finish disposes replaced resources once but preserves geometry/material still used in the scene',()=>{
 assert.equal(typeof api.finishSileFoliage,'function');for(const shared of [false,true]){const {scene,g,m}=fixture();let gd=0,md=0;g.addEventListener('dispose',()=>gd++);m.addEventListener('dispose',()=>md++);if(shared){const keep=new THREE.Mesh(g,m);keep.name='unrelated';scene.add(keep);}api.finishSileFoliage(scene);assert.equal(gd,shared?0:1);assert.equal(md,shared?0:1);api.finishSileFoliage(scene);assert.equal(gd,shared?0:1);assert.equal(md,shared?0:1);}
});

test('real world keeps exact2.29 collisions and all foliage vertices inside old transformed envelopes',async()=>{
 const fs=await import('node:fs'),crypto=await import('node:crypto');
 const ctx=new Proxy({getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const {buildWorld,clearWorld}=await import('../src/world.js'),data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url))),before=JSON.stringify(data),scene=new THREE.Scene(),play=buildWorld(scene,'sile',{sileData:data,props:false});
 const hash=crypto.createHash('sha256').update(JSON.stringify({boxes:play.boxes,prisms:play.prisms,pads:play.terrain.buildingPads})).digest('hex');assert.equal(hash,'f6ac98e7e2f5cf83fd22eb0f0f166892b74d7536746e979cca1ba5d09280934f');assert.equal(JSON.stringify(data),before);
 const resources=new Set(),point=new THREE.Vector3(),matrix=new THREE.Matrix4();let crowns=0,meshes=0;
 scene.traverse(o=>{if(o.isMesh)meshes++;if(!['sile-context-leaf:leaf','sile-neighbourhood-leaf:solid'].includes(o.name))return;resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);if(m.map)resources.add(m.map);}const records=o.userData.contextBoxes||o.userData.neighbourhoodBoxes,p=o.geometry.attributes.position;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);const box=records[i];for(let j=0;j<p.count;j++){point.fromBufferAttribute(p,j).applyMatrix4(matrix);assert.ok(point.x>=box.minx&&point.x<=box.maxx&&point.y>=box.miny&&point.y<=box.maxy&&point.z>=box.minz&&point.z<=box.maxz);}crowns++;}});
 assert.equal(meshes,48);assert.equal(crowns,3200);assert.deepEqual(scene.userData.sileFoliageStats,{batches:2,crowns:3200,cardsPerCrown:32,trianglesPerCrown:64,soilPatches:36,authored:true});
 let disposed=0;for(const r of resources)r.addEventListener('dispose',()=>disposed++);assert.equal(resources.size,5);clearWorld(scene);assert.equal(disposed,5);assert.equal(scene.userData.sileFoliageStats,null);
});

test('planter soil patch lies on the existing pot top within the old crown envelope, without another mesh',()=>{
 const {scene,crown,g}=fixture(),oldBounds=g.boundingBox.clone();api.finishSileFoliage(scene);assert.ok(Array.isArray(crown.material),'separate soil shading shares the existing instanced mesh');assert.equal(crown.geometry.groups.length,2);const soil=crown.geometry.groups[1],p=crown.geometry.attributes.position;assert.equal(soil.count,6);for(let i=soil.start;i<soil.start+soil.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i);assert.ok(oldBounds.containsPoint(v));assert.ok(Math.abs(v.y-((.45-.78)/.85))<1e-7);}assert.equal(scene.children.length,1);assert.equal(crown.material[1].polygonOffset,true);
});
