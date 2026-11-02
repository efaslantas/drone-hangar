import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createArcade,arcadePose} from '../src/arcade.js';

const intersects=(p,r,b)=>p.x+r>b.minx&&p.x-r<b.maxx&&p.y+r>b.miny&&p.y-r<b.maxy&&p.z+r>b.minz&&p.z-r<b.maxz;

test('aftermath site has ruined structures, a bounded draw budget and finite geometry',async()=>{
 const {buildArcadeSite}=await import('../src/arcade-site.js');const scene=new THREE.Scene();
 const play=buildArcadeSite(scene);assert.ok(play.boxes.length>40);
 assert.deepEqual(play.bounds,{minx:-48,maxx:48,minz:-88,maxz:22});
 assert.ok(scene.getObjectByName('arcade-ruins'));assert.ok(scene.getObjectByName('arcade-smoke'));
 let meshes=0;scene.traverse(o=>{if(o.isMesh||o.isPoints){meshes++;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));assert.equal(o.geometry.getAttribute("normal")?.count,o.geometry.attributes.position.count,"normal pass supports WebGPU AO");}});
 assert.ok(meshes<30,`draw count ${meshes}`);
});

test('every authored game-object loop and the launch circle stay clear of new solids',async()=>{
 const {buildArcadeSite}=await import('../src/arcade-site.js');const play=buildArcadeSite(new THREE.Scene());
 for(const t of createArcade().targets)for(let i=0;i<=360;i++){
  const p=arcadePose(t,t.period*i/360);
  assert.equal(play.boxes.some(b=>intersects(p,t.r+.3,b)),false,`${t.id} phase ${i}`);
 }
 assert.equal(play.boxes.some(b=>intersects({x:0,y:2,z:0},6,b)),false,'launch clearance');
});

test('graphics quality changes smoke only; solids and routes have identical physics',async()=>{
 const {buildArcadeSite}=await import('../src/arcade-site.js');
 const low=new THREE.Scene(),high=new THREE.Scene();
 assert.deepEqual(buildArcadeSite(low,{quality:'low'}),buildArcadeSite(high,{quality:'high'}));
 assert.ok(low.getObjectByName('arcade-smoke').count<high.getObjectByName('arcade-smoke').count);
});

test('smoke follows absolute simulation time, remaining frozen at the same paused time',async()=>{
 const {buildArcadeSite,tickArcadeSite}=await import('../src/arcade-site.js');const scene=new THREE.Scene();buildArcadeSite(scene);
 const mesh=scene.getObjectByName('arcade-smoke');assert.equal(mesh.isInstancedMesh,true,'billboard quads supported by both renderers');
 const positions=mesh.instanceMatrix.array;
 tickArcadeSite(scene,2);const before=[...positions];tickArcadeSite(scene,2);assert.deepEqual([...positions],before);
 tickArcadeSite(scene,3);assert.notDeepEqual([...positions],before);assert.ok(positions.every(Number.isFinite));
});

test('world cache distinguishes aftermath from ordinary Pist and cleanup releases scene resources',async()=>{
 const {buildWorld,clearWorld,worldMatches}=await import('../src/world.js');
 assert.equal(typeof worldMatches,'function','world variant cache contract');
 const scene=new THREE.Scene();
 buildWorld(scene,'airfield',{variant:'aftermath',quality:'low',props:false});
 assert.equal(worldMatches(scene,'airfield',{variant:'aftermath'}),true);
 assert.equal(worldMatches(scene,'airfield'),false,'same map needs rebuild when leaving arcade');
 assert.equal(worldMatches(scene,'airfield',{variant:'aftermath',night:true}),false);
 assert.equal(scene.userData.variant,'aftermath');assert.ok(scene.userData.arcadeSite);
 assert.equal(scene.userData.ambient,null,'ordinary ambient props must not enter this set');
 const instanced=[];scene.traverse(o=>{if(o.isInstancedMesh)instanced.push(o);});
 let instancesDisposed=0;for(const mesh of instanced)mesh.addEventListener('dispose',()=>instancesDisposed++);
 const resources=scene.userData.worldResources;let disposed=0;
 for(const r of resources){const dispose=r.dispose.bind(r);r.dispose=()=>{disposed++;dispose();};}
 clearWorld(scene);assert.equal(instancesDisposed,instanced.length,'instance buffers released');assert.equal(disposed,resources.size);assert.equal(scene.children.length,0);assert.equal(scene.userData.arcadeSite,null);
});


test('live quality changes active smoke count without reallocating geometry or changing colliders',async()=>{
 const {buildWorld,clearWorld}=await import('../src/world.js');
 const {setArcadeSiteQuality}=await import('../src/arcade-site.js');
 assert.equal(typeof setArcadeSiteQuality,'function');
 const scene=new THREE.Scene(),play=buildWorld(scene,'airfield',{variant:'aftermath',quality:'high'});
 const solids=structuredClone(play.boxes),smoke=scene.getObjectByName('arcade-smoke'),old=smoke.geometry;
 let released=0;old.addEventListener('dispose',()=>released++);
 setArcadeSiteQuality(scene,'low');assert.equal(smoke.count,28);assert.equal(released,0);assert.equal(smoke.geometry,old);
 assert.equal(scene.userData.worldResources.has(old),true);assert.equal(scene.userData.worldResources.has(smoke.geometry),true);
 assert.deepEqual(play.boxes,solids);setArcadeSiteQuality(scene,'high');assert.equal(smoke.count,72);
 clearWorld(scene);
});

test('overcast night dims the background without changing scene colliders',async()=>{
 const {buildWorld,clearWorld}=await import('../src/world.js');const day=new THREE.Scene(),night=new THREE.Scene();
 const a=buildWorld(day,'airfield',{variant:'aftermath'}),b=buildWorld(night,'airfield',{variant:'aftermath',night:true});
 assert.notEqual(day.background.getHex(),night.background.getHex());assert.deepEqual(a,b);clearWorld(day);clearWorld(night);
});

test('street surfaces declare sourced PBR materials and fixed prop envelopes outside game routes',async()=>{
 const {buildArcadeSite}=await import('../src/arcade-site.js');const scene=new THREE.Scene();buildArcadeSite(scene);
 const surfaces=new Set();scene.traverse(o=>{if(o.material?.map?.userData.surface)surfaces.add(o.material.map.userData.surface);});
 assert.ok(surfaces.has('plaster')&&surfaces.has('asphalt')&&surfaces.has('concrete'));
 assert.ok(scene.userData.arcadeSite.assetAnchors.length>=6);
 assert.ok(scene.userData.arcadeSite.assetAnchors.every(a=>a.fallback.visible&&a.size.x>0&&a.size.y>0&&a.size.z>0));
});
test('elongated wall segments keep metre-sized texture density after batching',async()=>{
 const {buildArcadeSite}=await import('../src/arcade-site.js');const scene=new THREE.Scene();buildArcadeSite(scene);
 const mesh=scene.getObjectByName('arcade-concrete-shells'),g=mesh.geometry,p=g.attributes.position,uv=g.attributes.uv;
 const ia=g.index?g.index.getX(0):0,ib=g.index?g.index.getX(1):1;
 const a=new THREE.Vector3().fromBufferAttribute(p,ia),b=new THREE.Vector3().fromBufferAttribute(p,ib);
 if(mesh.isInstancedMesh){const matrix=new THREE.Matrix4();mesh.getMatrixAt(0,matrix);a.applyMatrix4(matrix);b.applyMatrix4(matrix);}
 const du=Math.hypot(uv.getX(ia)-uv.getX(ib),uv.getY(ia)-uv.getY(ib));
 assert.ok(Math.abs(a.distanceTo(b)/du-3)<1e-4,'3 metre surface tile without stretching tall/thin beams');
});
