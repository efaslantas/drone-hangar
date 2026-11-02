import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
const api=await import('../src/sile-concrete.js').catch(()=>({}));
test('harbour concrete tiles have seamless colour, relief and roughness at both repeat boundaries',()=>{
 assert.equal(typeof api.concreteSample,'function');
 for(let i=0;i<=100;i++){const t=i/100;assert.deepEqual(api.concreteSample(0,t),api.concreteSample(1,t));assert.deepEqual(api.concreteSample(t,0),api.concreteSample(t,1));}
 const joint=api.concreteSample(0,.27),slab=api.concreteSample(.24,.27);assert.ok(joint.height<slab.height);assert.ok(joint.color[0]<slab.color[0]);
});
test('quay weathering follows one sea-level band and does not repeat up a tall wall',()=>{
 assert.equal(typeof api.concreteSample,'function');
 const wet=api.concreteSample(.23,1/8,true),dry=api.concreteSample(.23,4/8,true),high=api.concreteSample(.23,1,true);
 assert.ok(wet.color[0]<dry.color[0]*.8);assert.ok(wet.roughness<dry.roughness);assert.ok(high.color[0]>wet.color[0]*1.2);
});
test('harbour concrete textures use correct colour/data spaces, mipmaps and world-owned lifecycle',()=>{
 assert.equal(typeof api.concreteMaterial,'function');const a=api.concreteMaterial(),b=api.concreteMaterial({quay:true});
 assert.equal(a.map.colorSpace,THREE.SRGBColorSpace);for(const m of [a,b])for(const k of ['bumpMap','roughnessMap'])assert.equal(m[k].colorSpace,THREE.NoColorSpace);
 for(const m of [a,b])for(const k of ['map','bumpMap','roughnessMap']){const t=m[k];assert.equal(t.generateMipmaps,true);assert.equal(t.minFilter,THREE.LinearMipmapLinearFilter);assert.equal(t.wrapS,THREE.RepeatWrapping);assert.equal(t.wrapT,m===a?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping);assert.ok(t.image.data.every(Number.isFinite));}
 const next=api.concreteMaterial();assert.notEqual(next.map,a.map);assert.deepEqual(next.map.image.data,a.map.image.data);for(const m of [a,b,next]){for(const k of ['map','bumpMap','roughnessMap'])m[k].dispose();m.dispose();}
});
