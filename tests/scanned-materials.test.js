import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as api from '../src/scanned-materials.js';
import {clearWorld} from '../src/world.js';
function fixture(kind='grass'){
 const scene=new THREE.Scene();scene.userData.worldToken={};
 const map=new THREE.Texture();map.userData.surface=kind;map.repeat.set(8,8);
 const bump=new THREE.Texture(),rough=new THREE.Texture();
 const mat=new THREE.MeshStandardMaterial({color:0xaabb88,map,bumpMap:bump,roughnessMap:rough,roughness:.9});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(20,40),mat);scene.add(mesh);
 scene.userData.worldResources=new Set([map,bump,rough,mat,mesh.geometry]);
 return {scene,mat,map,bump,rough};
}
const loader=async()=>new THREE.Texture();
test('quality selects procedural/512/1024 with a mobile cap',()=>{
 assert.equal(api.surfaceTextureSize('low',false),0);assert.equal(api.surfaceTextureSize('medium',false),512);
 assert.equal(api.surfaceTextureSize('high',false),1024);assert.equal(api.surfaceTextureSize('high',true),512);
});
test('grass receives sourced PBR channels at metre-based repeat, then low restores its original appearance',async()=>{
 const f=fixture();const calls=[];await api.applyScannedMaterials(f.scene,{quality:'high',loadTexture:async(...args)=>{calls.push(args);return new THREE.Texture()}});
 assert.equal(f.mat.userData.scannedAsset,'grass_ground');assert.equal(calls.length,3);
 assert.deepEqual(f.mat.map.repeat.toArray(),[5,10]);assert.equal(f.mat.map.colorSpace,THREE.SRGBColorSpace);assert.equal(f.mat.normalMap.colorSpace,THREE.NoColorSpace);
 assert.equal(f.mat.roughnessMap.colorSpace,THREE.NoColorSpace);assert.equal(f.mat.bumpMap,null);
 const owned=[f.mat.map,f.mat.normalMap,f.mat.roughnessMap];let disposed=0;owned.forEach(t=>t.addEventListener('dispose',()=>disposed++));
 await api.applyScannedMaterials(f.scene,{quality:'low',loadTexture:loader});
 assert.equal(f.mat.map,f.map);assert.equal(f.mat.bumpMap,f.bump);assert.equal(f.mat.roughnessMap,f.rough);assert.equal(f.mat.color.getHex(),0xaabb88);assert.equal(disposed,3);
 assert.ok(owned.every(t=>!f.scene.userData.worldResources.has(t)));
});
test('a late high load cannot overwrite low quality or a cleared world',async()=>{
 const f=fixture();const resolves=[];const pending=api.applyScannedMaterials(f.scene,{quality:'high',loadTexture:()=>new Promise(r=>resolves.push(r))});
 await api.applyScannedMaterials(f.scene,{quality:'low',loadTexture:loader});resolves.forEach(r=>r(new THREE.Texture()));await pending;assert.equal(f.mat.map,f.map);
 const next=[];const second=api.applyScannedMaterials(f.scene,{quality:'high',loadTexture:()=>new Promise(r=>next.push(r))});clearWorld(f.scene);next.forEach(r=>r(new THREE.Texture()));await second;assert.equal(f.mat.map,f.map);assert.equal(f.scene.children.length,0);
});
test('quality updates replace only owned maps, keep bounded ownership and recover after failed loads',async()=>{
 const f=fixture('asphalt');let failed=true;
 const load=async()=>{if(failed)throw new Error('missing texture');return new THREE.Texture()};
 await api.applyScannedMaterials(f.scene,{quality:'medium',loadTexture:load,warn:()=>{}});assert.equal(f.mat.map,f.map);
 failed=false;await api.applyScannedMaterials(f.scene,{quality:'medium',loadTexture:load});assert.equal(f.mat.userData.scannedAsset,'asphalt_02');
 const n=f.scene.userData.worldResources.size;
 for(const quality of ['high','medium','high','low','high'])await api.applyScannedMaterials(f.scene,{quality,loadTexture:load});
 assert.equal(f.scene.userData.worldResources.size,n);
});

test('damaged plaster uses the local CC0 surface with linear normal/roughness channels',async()=>{
 const f=fixture('plaster'),assets=[];await api.applyScannedMaterials(f.scene,{quality:'medium',loadTexture:async(asset)=>{assets.push(asset);return new THREE.Texture();}});
 assert.deepEqual(assets,['damaged_plaster','damaged_plaster','damaged_plaster']);assert.equal(f.mat.map.colorSpace,THREE.SRGBColorSpace);assert.equal(f.mat.normalMap.colorSpace,THREE.NoColorSpace);assert.equal(f.mat.roughnessMap.colorSpace,THREE.NoColorSpace);
});

test('metre-normalized ground keeps desktop source resolution and aligned channels across quality while walls retain their budget',async()=>{
 const f=fixture(),wall=fixture('concrete'),calls=[];f.mat.userData.groundSurface={kind:'grass',tileMetres:2,uvMetres:true};f.map.repeat.setScalar(.5);
 await api.applyScannedMaterials(f.scene,{quality:'medium',loadTexture:async(...args)=>{calls.push(args);return new THREE.Texture();}});assert.equal(calls.length,3);assert.ok(calls.every(args=>args[2]===1024));
 for(const map of [f.mat.map,f.mat.normalMap,f.mat.roughnessMap]){assert.deepEqual(map.repeat.toArray(),[.5,.5]);assert.equal(map.anisotropy,16);}
 const sizes=[];await api.applyScannedMaterials(wall.scene,{quality:'medium',loadTexture:async(a,c,size)=>{sizes.push(size);return new THREE.Texture();}});assert.deepEqual(sizes,[512,512,512]);
 await api.applyScannedMaterials(f.scene,{quality:'low',loadTexture:loader});assert.equal(f.mat.map,f.map);assert.deepEqual(f.mat.map.repeat.toArray(),[.5,.5]);assert.equal(f.mat.normalMap,null);
 f.scene.userData.lite=true;const touch=[];await api.applyScannedMaterials(f.scene,{quality:'high',loadTexture:async(a,c,size)=>{touch.push(size);return new THREE.Texture();}});assert.deepEqual(touch,[512,512,512]);assert.equal(f.mat.map.anisotropy,4);assert.equal(f.mat.normalMap.colorSpace,THREE.NoColorSpace);
});
