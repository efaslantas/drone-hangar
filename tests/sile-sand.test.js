import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const sand=await import('../src/sile-sand.js').catch(()=>({}));
test('sand detail meets seamlessly at negative and positive tile coordinates with bounded millimetre relief',()=>{
 assert.equal(typeof sand.sandTexel,'function');
 for(const [u,v] of [[0,0],[.29,.71],[-.82,1.31],[1,1]]){
  const a=sand.sandTexel(u,v),b=sand.sandTexel(u+1,v-1);
  assert.ok(Math.abs(a.height-b.height)<1e-10);assert.ok(a.height>=0&&a.height<=.004);
  for(let k=0;k<3;k++)assert.ok(Math.abs(a.color[k]-b.color[k])<1e-8);
  assert.ok(a.roughness>=.8&&a.roughness<=1);
 }
});
test('sand maps are filtered, correctly encoded and individually owned by each world',()=>{
 assert.equal(typeof sand.beachSandMaterial,'function');const a=sand.beachSandMaterial(),b=sand.beachSandMaterial();
 for(const key of ['map','normalMap','roughnessMap']){assert.notEqual(a[key],b[key]);assert.equal(a[key].wrapS,THREE.RepeatWrapping);assert.equal(a[key].wrapT,THREE.RepeatWrapping);assert.equal(a[key].generateMipmaps,true);assert.equal(a[key].colorSpace,key==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace);}
 const p=a.normalMap.image.data;for(let i=0;i<p.length;i+=4108){const n=[p[i],p[i+1],p[i+2]].map(v=>v/255*2-1);assert.ok(Math.abs(Math.hypot(...n)-1)<.015&&n[2]>.9);}
 assert.ok(!a.map.userData.surface,'generic ground replacement must not erase authored sand');
});
test('full world retains sand material through finishing and releases its textures once',async()=>{
 const fs=await import('node:fs'),{buildWorld,clearWorld}=await import('../src/world.js');
 const ctx=new Proxy({getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url))),s=new THREE.Scene();buildWorld(s,'sile',{sileData:data,props:false});
 const mesh=s.getObjectByName('sile-source-sand'),m=mesh.material;assert.ok(m.map.isDataTexture&&m.normalMap.isDataTexture&&m.roughnessMap.isDataTexture);assert.equal(m.bumpMap,null);
 const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;for(let i=0;i<p.count;i+=97){assert.ok(Math.abs(uv.getX(i)-p.getX(i)/4)<.0001);assert.ok(Math.abs(uv.getY(i)-p.getZ(i)/4)<.0001);}
 const owned=new Set([mesh.geometry,m,m.map,m.normalMap,m.roughnessMap]);let disposals=0;for(const r of owned)r.addEventListener('dispose',()=>disposals++);clearWorld(s);assert.equal(disposals,owned.size);
});
