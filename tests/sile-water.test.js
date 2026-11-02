import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
const sea=await import('../src/sile-water.js').catch(()=>({}));
test('multiscale water normals are finite unit vectors and wrap in both directions without a visible seam',()=>{
 assert.equal(typeof sea.waterNormal,'function');let changed=0,previous;
 for(let i=0;i<=64;i++)for(let j=0;j<=32;j++){const u=i/64,v=j/32,n=sea.waterNormal(u,v);assert.ok(n.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...n)-1)<1e-9);assert.ok(n[2]>0);for(let k=0;k<3;k++){assert.ok(Math.abs(n[k]-sea.waterNormal(u+1,v)[k])<1e-10);assert.ok(Math.abs(n[k]-sea.waterNormal(u,v+1)[k])<1e-10);}if(previous&&Math.hypot(n[0]-previous[0],n[1]-previous[1])>.02)changed++;previous=n;}
 assert.ok(changed>100);
});
test('foam has transparent strip edges, broken coverage and periodic alongshore wrapping',()=>{
 assert.equal(typeof sea.foamDensity,'function');let dark=0,light=0;
 for(let i=0;i<=80;i++){const u=i/80;assert.equal(sea.foamDensity(u,0),0);assert.equal(sea.foamDensity(u,1),0);for(let j=1;j<20;j++){const v=j/20,a=sea.foamDensity(u,v);assert.ok(a>=0&&a<=1);assert.ok(Math.abs(a-sea.foamDensity(u+1,v))<1e-9);if(a<.1)dark++;if(a>.4)light++;}}
 assert.ok(dark>200&&light>50,'separate foam flecks, no opaque repeating ribbon');
});
test('water maps are linear dielectric PBR and all animation repeats exactly for the same paused time',()=>{
 assert.equal(typeof sea.waterMaterial,'function');const water=sea.waterMaterial(),foam=sea.foamMaterial();
 assert.ok(water.normalMap);assert.equal(water.normalMap.colorSpace,THREE.NoColorSpace);assert.equal(water.roughnessMap.colorSpace,THREE.NoColorSpace);assert.equal(water.metalness,0);assert.equal(foam.depthWrite,false);
 const scene={userData:{sileWater:{normalMap:water.normalMap,foamMaterial:foam}}};const snapshot=()=>[...water.normalMap.offset.toArray(),...foam.alphaMap.offset.toArray(),foam.opacity];sea.tickSileWater(scene,5);const first=snapshot();sea.tickSileWater(scene,9);assert.notDeepEqual(first,snapshot());sea.tickSileWater(scene,5);assert.deepEqual(snapshot(),first);sea.tickSileWater(scene,5);assert.deepEqual(snapshot(),first);assert.doesNotThrow(()=>sea.tickSileWater({userData:{}},0));
});

test('nearshore color is sampled on the single ocean surface, with smooth tint and no extra transparency layer',()=>{
 const terrain={bounds:[-50,50,-50,50],land:[[[[-10,-10],[10,-10],[10,10],[-10,10]]]]},water=sea.waterMaterial(terrain);assert.ok(water.map,'tint belongs to the ocean surface');assert.equal(water.transparent,false);assert.equal(water.map.colorSpace,THREE.SRGBColorSpace);water.map.updateMatrix();
 const sample=(x,z)=>{const uv=water.map.transformUv(new THREE.Vector2(x/10000+.5,-z/10000+.5)),image=water.map.image,i=(Math.round(uv.y*(image.height-1))*image.width+Math.round(uv.x*(image.width-1)))*4;return Array.from(image.data.slice(i,i+3));};
 const near=sample(0,-12),far=sample(0,-45);assert.ok(near[1]>far[1]+5,'mapped shallow tint near coast');assert.deepEqual(far,[36,79,93],'deep ocean stays original blue');
});
