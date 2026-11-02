import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {CATALOG} from '../src/catalog.js';

test('chase framing keeps every class visible on portrait and wide screens',async()=>{
 const {chaseFraming}=await import('../src/airframe-view.js');
 for(const spec of CATALOG)for(const aspect of [9/16,1,16/9,21/9]){
  const before=JSON.stringify(spec),f=chaseFraming(spec,aspect),distance=Math.hypot(f.back,f.height),half=Math.atan(Math.tan(82*Math.PI/360)*Math.min(1,aspect));
  const occupancy=f.span/(2*distance*Math.tan(half));assert.ok(occupancy<=.281&&occupancy>.13,`${spec.id}/${aspect}: ${occupancy}`);assert.ok(f.back>.1&&f.height>.05);assert.equal(JSON.stringify(spec),before);
 }
 const a=chaseFraming(CATALOG[0],16/9),b=chaseFraming(CATALOG.at(-1),16/9);assert.ok(a.back<b.back);assert.ok(chaseFraming(CATALOG[4],9/16).back>chaseFraming(CATALOG[4],16/9).back);
});

test('studio fits translated small/large models into neutral receiving platform and bounded shadows',async()=>{
 const {createDroneStudio}=await import('../src/drone-studio.js');const studio=createDroneStudio({reduced:false});
 for(const scale of [.05,1,2]){const root=new THREE.Group();const shape=new THREE.Mesh(new THREE.BoxGeometry(scale,scale*.3,scale*1.5));shape.position.set(.1,.04,.01);root.add(shape);const fit=studio.fit(root),bounds=new THREE.Box3().setFromObject(root);
 assert.ok(bounds.getCenter(new THREE.Vector3()).length()<1e-7);assert.ok(studio.deck.position.y<bounds.min.y);assert.equal(studio.deck.receiveShadow,true);assert.equal(studio.key.castShadow,true);assert.ok(studio.key.shadow.camera.right>=fit.radius*2);assert.ok(studio.key.shadow.camera.far>studio.key.position.length()+fit.radius);assert.equal(shape.geometry.parameters.width,scale);}
 assert.equal(studio.scene.getObjectByName('workshop-platform').material.metalness,0);assert.ok(studio.scene.environmentIntensity<=.5);
});

test('chase offset retains framing distance during flips and keeps last horizontal heading at vertical',async()=>{
 const {chaseFraming,chaseOffset}=await import('../src/airframe-view.js');let heading={x:1,z:0};
 for(const spec of CATALOG)for(const degrees of [0,75,89.999,90,110,180]){
  const p=degrees*Math.PI/180,f=chaseFraming(spec,16/9),offset=chaseOffset(f,[0,Math.sin(p),-Math.cos(p)],heading);
  assert.ok(Math.abs(Math.hypot(offset.x,offset.z)-f.back)<1e-10);assert.ok(Math.abs(Math.hypot(offset.x,offset.y,offset.z)-Math.hypot(f.back,f.height))<1e-10);
  if(degrees===90){assert.ok(Math.abs(offset.x+f.back)<1e-10);assert.ok(Math.abs(offset.z)<1e-10);}
 }
 const fallback=chaseOffset(chaseFraming(CATALOG[0]),[0,1,0],{x:0,z:0});assert.ok([fallback.x,fallback.y,fallback.z].every(Number.isFinite));
});

test('studio yaw pivot retains its centre through a full turn without moving local rotor hardware',async()=>{
 const {createDroneStudio}=await import('../src/drone-studio.js');const studio=createDroneStudio();const craft=new THREE.Group(),geometry=new THREE.BoxGeometry(.2,.05,.3),part=new THREE.Mesh(geometry);part.position.set(.02,.03,.04);craft.add(part);const before=part.position.clone(),fit=studio.fit(craft);assert.ok(fit.pivot?.isGroup);
 studio.scene.add(fit.pivot);for(const yaw of [0,.5,Math.PI,Math.PI*1.7]){fit.pivot.rotation.y=yaw;fit.pivot.updateMatrixWorld(true);const center=new THREE.Box3().setFromObject(craft).getCenter(new THREE.Vector3());assert.ok(center.length()<1e-8);assert.ok(part.position.distanceTo(before)<1e-8);}
});

test('FPV near plane permits close ground detail and restores the old precision range aloft',async()=>{
 const {fpvNearPlane}=await import('../src/airframe-view.js');assert.equal(fpvNearPlane(.02,true),.003);assert.equal(fpvNearPlane(20,true),.1);assert.equal(fpvNearPlane(20,false),.04);assert.ok(fpvNearPlane(.2,true)>.003);assert.ok(fpvNearPlane(.2,true)<.1);
});

test('near-plane clearance accounts for nearby roofs and walls as well as terrain',async()=>{
 const {cameraClearance,fpvNearPlane}=await import('../src/airframe-view.js');
 const point={x:0,y:10.02,z:0};const roof={minx:-2,maxx:2,miny:9,maxy:10,minz:-2,maxz:2};assert.ok(Math.abs(cameraClearance({boxes:[roof]},point)-.02)<1e-7);assert.equal(fpvNearPlane(cameraClearance({boxes:[roof]},point),true),.003);
 const prism={bounds:[.04,2,-2,2],miny:0,maxy:20};assert.ok(Math.abs(cameraClearance({prisms:[prism]},point)-.04)<1e-7);assert.equal(fpvNearPlane(cameraClearance({},point),true),.1);
});
