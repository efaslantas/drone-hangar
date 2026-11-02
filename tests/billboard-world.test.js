import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import * as billboard from '../src/billboard.js';
import {clearWorld} from '../src/world.js';
import {loadSileData} from '../src/sile-data.js';

const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:20})},{get:(o,k)=>k in o?o[k]:()=>{}});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};

test('reselecting actual Şile preview preserves the successful world and craft without disposal',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),craft=new THREE.Group();scene.add(craft);
 const options={crafts:[{mesh:craft}],reduced:false};
 assert.throws(()=>billboard.updateBillboardMap(scene,camera,'sile',options),/Şile/);
 const fetchBefore=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>data});
 try{await loadSileData();}finally{globalThis.fetch=fetchBefore;}
 billboard.updateBillboardMap(scene,camera,'sile',options);
 const resources=scene.userData.worldResources,token=scene.userData.worldToken,children=[...scene.children],projection=camera.projectionMatrix.clone();
 let disposed=0;for(const resource of resources)resource.addEventListener?.('dispose',()=>disposed++);
 const start=performance.now();billboard.updateBillboardMap(scene,camera,'sile',options);
 console.log('Repeated Şile preview selection ms:',+(performance.now()-start).toFixed(3));
 assert.equal(scene.userData.worldToken,token);assert.equal(scene.userData.worldResources,resources);
 assert.deepEqual(scene.children,children);assert.equal(disposed,0);assert.equal(craft.parent,scene);
 assert.deepEqual(camera.projectionMatrix,projection);assert.equal(camera.far,6500);
 scene.remove(craft);clearWorld(scene);
});

test('initial, changed and externally cleared preview scenes rebuild while retaining craft ownership',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),craft=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());scene.add(craft);
 const options={crafts:[{mesh:craft}],reduced:true};let craftDisposed=0;craft.geometry.addEventListener('dispose',()=>craftDisposed++);
 billboard.updateBillboardMap(scene,camera,'airfield',options);const resources=scene.userData.worldResources,token=scene.userData.worldToken;
 let disposed=0;for(const resource of resources)resource.addEventListener?.('dispose',()=>disposed++);
 billboard.updateBillboardMap(scene,camera,'yard',options);
 assert.equal(scene.userData.mapId,'yard');assert.notEqual(scene.userData.worldToken,token);assert.ok(disposed>0);assert.equal(craftDisposed,0);assert.equal(craft.parent,scene);assert.equal(camera.far,220);
 const previous=scene.userData.worldToken;scene.remove(craft);clearWorld(scene);scene.add(craft);
 billboard.updateBillboardMap(scene,camera,'yard',options);assert.notEqual(scene.userData.worldToken,previous);assert.ok(scene.userData.worldResources.size>0);
 scene.remove(craft);clearWorld(scene);craft.geometry.dispose();craft.material.dispose();
});

test('option changes invalidate completed preview',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),options={reduced:false};
 billboard.updateBillboardMap(scene,camera,'indoor',options);const token=scene.userData.worldToken;
 assert.ok(scene.userData.worldResources.size>0);
 billboard.updateBillboardMap(scene,camera,'indoor',{reduced:true});assert.notEqual(scene.userData.worldToken,token);assert.equal(scene.userData.lite,true);
 clearWorld(scene);
});
