import test from'node:test';import assert from'node:assert/strict';import * as THREE from'three';
const api=await import('../src/sile-water.js');
test('coastal foam has bounded local phases and a front that advances inland then retreats',()=>{
 assert.equal(typeof api.surfOpacity,'function');
 for(const t of [-20,0,1,3,5,6.4,10000])for(const phase of [-1.1,0,.3,2])for(const v of [0,.1,.3,.8,1])for(const land of [false,true]){const a=api.surfOpacity(t,phase,v,land);assert.ok(Number.isFinite(a)&&a>=0&&a<=1);}
 const near=[],far=[];for(let i=0;i<=640;i++){const t=i/100;if(api.surfOpacity(t,0,.03,true)>.1)near.push(t);if(api.surfOpacity(t,0,.3,true)>.1)far.push(t);}assert.ok(near.length&&far.length);assert.ok(near[0]<far[0]&&near.at(-1)>far.at(-1),'wet front must reach near sand first and leave it last');
 assert.notEqual(api.surfOpacity(3.7,0,.2,true),api.surfOpacity(3.7,.4,.2,true),'shore points must not pulse together');
});
function fixture(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-10,0,0,0,0,0,0,0,1,0,0,2],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,.5,0,.5,0,.03,0,.3],2));g.setAttribute('color',new THREE.Float32BufferAttribute([1,1,1,1,1,1,1,.2,1,1,1,.25,1,1,1,.2],4));return g;}
test('atlas motion uses absolute time without per-frame vertex uploads or cumulative changes',()=>{
 const g=fixture(),positions=g.attributes.position.array.slice(),base=g.attributes.color.array.slice(),material=api.foamMaterial(),m=api.prepareFoamMotion(g,2,material.alphaMap),uv=g.attributes.uv.array.slice(),version=g.attributes.uv.version;
 assert.ok(g.attributes.uv.getY(0)<.5&&g.attributes.uv.getY(2)>.5,'separate offshore and land bands');
 api.tickFoamMotion(m,3.71);const first=m.alphaMap.offset.x;assert.equal(api.tickFoamMotion(m,3.71),false);api.tickFoamMotion(m,5.2);assert.notEqual(m.alphaMap.offset.x,first);api.tickFoamMotion(m,3.71);assert.equal(m.alphaMap.offset.x,first);api.tickFoamMotion(m,NaN);assert.equal(m.alphaMap.offset.x,first);
 assert.deepEqual(g.attributes.color.array,base);assert.deepEqual(g.attributes.position.array,positions);assert.deepEqual(g.attributes.uv.array,uv);assert.equal(g.attributes.uv.version,version);
});
// Sample the same filtered atlas that the standard material receives, at an
// interpolated interior UV of a strip with no interior vertices.
function sample(map,u,v){u=((u%1)+1)%1;const {width:w,height:h,data}=map.image,x=u*w-.5,y=Math.max(0,Math.min(h-1,v*h-.5)),ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,p=(a,b)=>data[(Math.min(h-1,b)*w+((a%w+w)%w))*4+1]/255;return (p(ix,iy)*(1-fx)+p(ix+1,iy)*fx)*(1-fy)+(p(ix,iy+1)*(1-fx)+p(ix+1,iy+1)*fx)*fy;}
test('sparse endpoint-only offshore strips retain a moving crest at interpolated interior fragments',()=>{
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,0,0],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,0,1],2));const material=api.foamMaterial(),m=api.prepareFoamMotion(g,2,material.alphaMap),u=g.attributes.uv.getX(0),v=g.attributes.uv.getY(0)*.7+g.attributes.uv.getY(1)*.3;
 // world origin has phase .35*noise(0,0)=0; the crest crosses V=.3 at 2.24s.
 api.tickFoamMotion(m,2.24);const crest=sample(m.alphaMap,u+m.alphaMap.offset.x,v);api.tickFoamMotion(m,3.2);const away=sample(m.alphaMap,u+m.alphaMap.offset.x,v);
 assert.ok(crest>.03,'interior crest is visible despite zero-density endpoints');assert.ok(crest>away*1.5,`${crest} vs ${away}`);
 const image=m.alphaMap.image;assert.equal(image.width,512);assert.equal(image.height,1024);for(let y=0;y<image.height;y++)assert.equal(image.data[y*image.width*4+1],image.data[((y+1)*image.width-1)*4+1],'periodic U seam');
});
test('actual world keeps contacts and all buffers static during surf motion, then releases its atlas once',async()=>{
 const fs=await import('node:fs'),crypto=await import('node:crypto'),{buildWorld,clearWorld}=await import('../src/world.js'),{sileWorldFingerprint}=await import('./helpers/sile-world-fingerprint.js');const ctx=new Proxy({getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url))),s=new THREE.Scene(),p=buildWorld(s,'sile',{sileData:data,props:false,quality:'medium'}),baseline=JSON.parse(fs.readFileSync(new URL('../docs/sile-cliff-contact-validation.json',import.meta.url))).fingerprints[0].full,current=sileWorldFingerprint(s,p);assert.equal(current.collision,baseline.collision);assert.equal(current.meshCount,baseline.meshCount);
 const g=s.getObjectByName('sile-shore-foam').geometry,shape=()=>crypto.createHash('sha256').update(Buffer.concat(Object.values(g.attributes).map(a=>Buffer.from(a.array.buffer)))).digest('hex'),before=shape(),map=s.userData.sileWater.foamMaterial.alphaMap;api.tickSileWater(s,3.7);const offset=map.offset.x;api.tickSileWater(s,4.4);assert.notEqual(map.offset.x,offset);assert.equal(shape(),before);assert.equal(sileWorldFingerprint(s,p).collision,current.collision);
 let released=0;map.addEventListener('dispose',()=>released++);clearWorld(s);const finalOffset=map.offset.x;api.tickSileWater(s,5);assert.equal(map.offset.x,finalOffset);assert.equal(released,1);assert.equal(s.userData.sileWater,null);
});
