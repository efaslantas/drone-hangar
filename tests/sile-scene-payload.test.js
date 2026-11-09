import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import{packSileScene,unpackSileScene}from '../src/sile-scene-payload.js';
test('worker payload preserves rendered buffers, shared texture identity and exact physical wall vertices',async()=>{
 const scene=new THREE.Scene(),map=new THREE.DataTexture(new Uint8Array([12,34,56,255]),1,1),mat=new THREE.MeshStandardMaterial({map}),mesh=new THREE.Mesh(new THREE.BoxGeometry(2,3,4),mat);scene.add(mesh);scene.userData.sileWater={normalMap:map,foamMaterial:mat,foamMotion:{alphaMap:map}};scene.userData.profiles=new Map([[1,{value:4}]]);const wall={vertices:[[1.23456789,2,3],[2,3,4],[5,6,7]],authored:'test',face:9,reason:'wall'},play={terrainWalls:[wall],prisms:[],boxes:[]},packet=packSileScene(scene,play),out=await unpackSileScene(packet,async()=>{});assert.deepEqual(Array.from(out.scene.children[0].geometry.attributes.position.array),Array.from(mesh.geometry.attributes.position.array));assert.equal(out.scene.userData.sileWater.normalMap,out.scene.children[0].material.map);assert.equal(out.scene.userData.sileWater.foamMaterial,out.scene.children[0].material);assert.equal(out.scene.userData.profiles.get(1).value,4);assert.deepEqual(out.play.terrainWalls,[wall]);assert.notEqual(out.play.terrainWalls,play.terrainWalls);
});

test('the actual prepared Şile world round-trips all rendered meshes and physical contact coordinates',async()=>{
 const fs=await import('node:fs'),{buildSile}=await import('../src/sile-world.js'),{prepareBuildingSupplement}=await import('../src/sile-building-supplement-data.js');const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const data=await prepareBuildingSupplement(JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)))),scene=new THREE.Scene(),play=buildSile(scene,data),packet=packSileScene(scene,play),out=await unpackSileScene(packet,async()=>{}),source=[],result=[];scene.traverse(o=>{if(o.isMesh)source.push(o)});out.scene.traverse(o=>{if(o.isMesh)result.push(o)});assert.equal(result.length,source.length);for(let i=0;i<source.length;i++){assert.equal(result[i].name,source[i].name);for(const [name,a]of Object.entries(source[i].geometry.attributes))assert.deepEqual(result[i].geometry.attributes[name].array,a.array,source[i].name+':'+name);assert.deepEqual(result[i].geometry.index?.array,source[i].geometry.index?.array,source[i].name+':index');if(source[i].isInstancedMesh)assert.deepEqual(result[i].instanceMatrix.array,source[i].instanceMatrix.array);}
 assert.equal(out.play.terrainWalls.length,play.terrainWalls.length);for(let i=0;i<play.terrainWalls.length;i++){assert.deepEqual(out.play.terrainWalls[i].vertices,play.terrainWalls[i].vertices);assert.equal(out.play.terrainWalls[i].sourceId,play.terrainWalls[i].sourceId);assert.equal(out.play.terrainWalls[i].reason,play.terrainWalls[i].reason);}assert.deepEqual(out.play.prisms,play.prisms);
});

test('cancelling on the first preparation frame prevents scene allocation',async()=>{
 const source=new THREE.Scene();source.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));
 const packet=packSileScene(source,{terrainWalls:[{vertices:[[0,0,0],[1,0,0],[0,1,0]]}],prisms:[],boxes:[]}),json=packet.json,controller=new AbortController();let reads=0;
 Object.defineProperty(packet,'json',{get(){reads++;return json;}});
 await assert.rejects(unpackSileScene(packet,async()=>controller.abort(),controller.signal),{name:'AbortError'});
 assert.equal(reads,0,'a cancelled preparation must not allocate the large scene before the first browser frame');
});

test('cancellation after scene reconstruction prevents the subsequent physical-data clone',async()=>{
 const source=new THREE.Scene();source.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));
 const packet=packSileScene(source,{terrainWalls:[{vertices:[[0,0,0],[1,0,0],[0,1,0]]}],prisms:[],boxes:[]}),json=packet.json,play=packet.play,controller=new AbortController();let sceneRead=false,playReads=0;
 Object.defineProperty(packet,'json',{get(){sceneRead=true;return json;}});Object.defineProperty(packet,'play',{get(){playReads++;return play;}});
 await assert.rejects(unpackSileScene(packet,async()=>{if(sceneRead)controller.abort();},controller.signal),{name:'AbortError'});
 assert.equal(playReads,0,'abort must be observed between reconstruction and cloning the physical world');
});
