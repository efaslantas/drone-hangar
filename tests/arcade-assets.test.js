import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
function fixture(){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x717b7c);scene.userData.worldToken={};scene.userData.worldResources=new Set();
 const fallback=new THREE.Group();scene.add(fallback);
 scene.userData.arcadeSite={assetAnchors:[{asset:'barrier',x:4,z:-10,yaw:Math.PI/2,size:{x:2,y:2,z:4},fallback}]};
 const texture=new THREE.Texture(),material=new THREE.MeshStandardMaterial({map:texture}),geometry=new THREE.BoxGeometry(3,1,1);
 const root=new THREE.Mesh(geometry,material);root.position.y=.5;
 const sky=new THREE.Texture();return{scene,fallback,root,sky,texture,geometry,material,loadSky:async()=>sky,loadModel:async()=>({root})};
}
test('local sky and scanned prop copies fit fixed envelopes and are owned independently of sources',async()=>{
 const {applyArcadeAssets}=await import('../src/arcade-assets.js');const f=fixture();await applyArcadeAssets(f.scene,{...f,quality:'medium'});
 assert.equal(f.fallback.visible,false);assert.notEqual(f.scene.background,f.sky);assert.equal(f.scene.background,f.scene.environment);
 const mesh=f.scene.getObjectByName('arcade-scanned-props').children[0];const bounds=new THREE.Box3().setFromObject(mesh),size=bounds.getSize(new THREE.Vector3());
 assert.ok(size.x<=2&&size.y<=2&&size.z<=4);assert.ok(Math.abs((bounds.min.x+bounds.max.x)/2-4)<1e-6);assert.ok(Math.abs(bounds.min.y)<1e-6);
 let rendered;mesh.traverse(o=>{if(o.isMesh)rendered=o;});assert.ok(f.scene.userData.worldResources.has(rendered.geometry));assert.notEqual(rendered.geometry,f.geometry);assert.notEqual(rendered.material.map,f.texture);
});
test('low quality restores the original sky and placeholders, releasing owned copies without source disposal',async()=>{
 const {applyArcadeAssets}=await import('../src/arcade-assets.js');const f=fixture();let sourceDisposed=0;
 f.texture.addEventListener('dispose',()=>sourceDisposed++);f.geometry.addEventListener('dispose',()=>sourceDisposed++);
 await applyArcadeAssets(f.scene,{...f,quality:'high'});const count=f.scene.userData.worldResources.size,old=f.scene.background;let disposed=0;old.addEventListener('dispose',()=>disposed++);
 await applyArcadeAssets(f.scene,{...f,quality:'low'});assert.equal(f.fallback.visible,true);assert.equal(f.scene.environment,null);assert.equal(f.scene.background.getHex(),0x717b7c);assert.equal(disposed,1);assert.equal(sourceDisposed,0);assert.equal(f.scene.userData.worldResources.size,0);
 await applyArcadeAssets(f.scene,{...f,quality:'medium'});assert.equal(f.scene.userData.worldResources.size,count);
});
test('failed downloads retain visible fallbacks and scene lighting',async()=>{
 const {applyArcadeAssets}=await import('../src/arcade-assets.js');const f=fixture();
 await applyArcadeAssets(f.scene,{quality:'medium',loadSky:async()=>{throw Error('offline')},loadModel:async()=>{throw Error('offline')},warn:()=>{}});
 assert.equal(f.fallback.visible,true);assert.equal(f.scene.background.getHex(),0x717b7c);assert.equal(f.scene.userData.worldResources.size,0);
});
test('late asset arrivals cannot attach after low quality or world clearing',async()=>{
 const {applyArcadeAssets}=await import('../src/arcade-assets.js');const {clearWorld}=await import('../src/world.js');
 for(const action of ['low','clear']){
  const f=fixture(),pending=[];const task=applyArcadeAssets(f.scene,{quality:'high',loadSky:()=>new Promise(r=>pending.push(()=>r(f.sky))),loadModel:()=>new Promise(r=>pending.push(()=>r({root:f.root})))});
  if(action==='low')await applyArcadeAssets(f.scene,{...f,quality:'low'});else clearWorld(f.scene);
  pending.forEach(r=>r());await task;assert.equal(f.scene.userData.worldResources?.size||0,0);assert.ok(!f.scene.getObjectByName('arcade-scanned-props'));
 }
});
test('night never applies a daylight HDR sky',async()=>{
 const {applyArcadeAssets}=await import('../src/arcade-assets.js');const f=fixture();f.scene.userData.night=true;let requested=0;
 await applyArcadeAssets(f.scene,{...f,quality:'medium',loadSky:async()=>{requested++;return f.sky}});assert.equal(requested,0);assert.equal(f.scene.background.getHex(),0x717b7c);
});
