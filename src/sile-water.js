import * as THREE from 'three';
const tau=Math.PI*2,fract=x=>x-Math.floor(x),smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function periodicNoise(x,y,period){
 const a=Math.floor(x),b=Math.floor(y),u=smooth(0,1,fract(x)),v=smooth(0,1,fract(y)),hash=(i,j)=>{i=((i%period)+period)%period;j=((j%period)+period)%period;let n=(Math.imul(i,374761393)^Math.imul(j,668265263))>>>0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 return (hash(a,b)*(1-u)+hash(a+1,b)*u)*(1-v)+(hash(a,b+1)*(1-u)+hash(a+1,b+1)*u)*v;
}
// Domain-warped periodic noise avoids long coherent crosshatch highlights.
// Derivatives affect only the PBR normal; water collision stays at mean level.
function waveHeight(u,v){
 const warp=periodicNoise(u*4,v*4,4)*3;
 return .6*periodicNoise(u*8+warp,v*16+warp,8)+.16*periodicNoise(u*32+warp*1.7,v*32+warp*1.4,16)+.035*periodicNoise(u*64+warp*2,v*64+warp*2,32);
}
export function waterNormal(u,v){
 const e=.0003,x=(waveHeight(u+e,v)-waveHeight(u-e,v))/(2*e)*.022,y=(waveHeight(u,v+e)-waveHeight(u,v-e))/(2*e)*.022,n=Math.hypot(x,y,1);return [-x/n,-y/n,1/n];
}
export function foamDensity(u,v){
 if(v<=0||v>=1)return 0;
 const warp=.6*Math.sin(tau*u*3),coarse=periodicNoise(u*8,v*13+warp,8),fine=periodicNoise(u*32,v*37+warp*2,32),flecks=smooth(.42,.72,coarse*.65+fine*.35),edge=smooth(0,.12,v)*(1-smooth(.62,1,v));
 return Math.max(0,Math.min(1,flecks*edge));
}
const pixelCache=new Map(); // immutable pixel buffers only; each world owns its textures
function dataMap(size,pixel,{repeat=1,clampV=false,cacheId,height=size}={}){
 let bytes=pixelCache.get(cacheId);if(!bytes){bytes=new Uint8Array(size*height*4);for(let y=0;y<height;y++)for(let x=0;x<size;x++){const p=pixel(x/(size-1),y/(height-1));const i=(y*size+x)*4;bytes[i]=p[0];bytes[i+1]=p[1];bytes[i+2]=p[2];bytes[i+3]=255;}if(cacheId)pixelCache.set(cacheId,bytes);}
 const map=new THREE.DataTexture(bytes,size,height);map.wrapS=THREE.RepeatWrapping;map.wrapT=clampV?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.anisotropy=8;map.repeat.set(repeat,repeat);map.needsUpdate=true;return map;
}
// A single ocean albedo field avoids overlapping transparent coastal sheets.
function shoreColorMap(terrain){
 const size=512,pad=32,b=[terrain.bounds[0]-pad,terrain.bounds[1]+pad,terrain.bounds[2]-pad,terrain.bounds[3]+pad],w=b[1]-b[0],h=b[3]-b[2],distance=new Float32Array(size*size).fill(1),bytes=new Uint8Array(size*size*4);
 for(const rings of terrain.land)for(const ring of rings)for(let i=0;i<ring.length;i++){
  const a=ring[i],q=ring[(i+1)%ring.length],dx=q[0]-a[0],dz=q[1]-a[1],length=dx*dx+dz*dz;if(length<1e-8||terrain.bounds.some((v,k)=>Math.abs(a[k<2?0:1]-v)<.05&&Math.abs(q[k<2?0:1]-v)<.05))continue;
  const x0=Math.max(0,Math.floor((Math.min(a[0],q[0])-14-b[0])/w*(size-1))),x1=Math.min(size-1,Math.ceil((Math.max(a[0],q[0])+14-b[0])/w*(size-1))),y0=Math.max(0,Math.floor((b[3]-Math.max(a[1],q[1])-14)/h*(size-1))),y1=Math.min(size-1,Math.ceil((b[3]-Math.min(a[1],q[1])+14)/h*(size-1)));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const wx=b[0]+x/(size-1)*w,wz=b[3]-y/(size-1)*h,t=Math.max(0,Math.min(1,((wx-a[0])*dx+(wz-a[1])*dz)/length)),d=Math.hypot(wx-a[0]-dx*t,wz-a[1]-dz*t),width=8+6*periodicNoise(wx/37,wz/37,128),index=y*size+x;distance[index]=Math.min(distance[index],d/width);}
 }
 const deep=[36,79,93],shallow=[65,119,119];for(let i=0;i<distance.length;i++){const blend=(1-smooth(0,1,distance[i]))*.7;for(let k=0;k<3;k++)bytes[i*4+k]=Math.round(deep[k]+(shallow[k]-deep[k])*blend);bytes[i*4+3]=255;}
 const map=new THREE.DataTexture(bytes,size,size);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;map.magFilter=map.minFilter=THREE.LinearFilter;map.flipY=false;map.repeat.set(10000/w,10000/h);map.offset.set((-5000-b[0])/w,(b[3]-5000)/h);map.needsUpdate=true;return map;
}
export function waterMaterial(terrain){

 const normal=dataMap(512,(u,v)=>waterNormal(u,v).map(n=>Math.round((n*.5+.5)*255)),{repeat:250,cacheId:'water-normal'});
 const rough=dataMap(256,(u,v)=>{const n=waterNormal(u,v),r=185+Math.round((1-n[2])*55);return [r,r,r];},{repeat:250,cacheId:'water-roughness'});
 return new THREE.MeshStandardMaterial({color:terrain?0xffffff:0x244f5d,map:terrain?shoreColorMap(terrain):null,metalness:0,roughness:.52,normalMap:normal,normalScale:new THREE.Vector2(.75,.75),roughnessMap:rough,envMapIntensity:1.05});
}
export function foamMaterial(){
 // Two padded V bands share one standard-material atlas. U spans four waves,
 // including the slower strength envelope; fragment sampling preserves crests
 // even on offshore triangles that only have V=0/1 endpoints.
 const alpha=dataMap(512,(u,v)=>{
  const land=v>.5,local=(v-(land?.52:.02))/.46;
  const a=local<=0||local>=1?0:Math.round(foamDensity(u*4,local)*surfValue(u*25.6,0,local,land)*255);
  return [a,a,a];
 },{clampV:true,cacheId:'foam-surf-atlas',height:1024});
 return new THREE.MeshBasicMaterial({vertexColors:true,color:0xd1dfd6,alphaMap:alpha,transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide,fog:true});
}
// Authored visual surf, not wave hydrodynamics. Both strips use a common
// world-space phase: offshore crest, low-sand run-up, then fading retreat.
function surfValue(time,phase,v,land){
 const p=fract(time/6.4-phase),strength=.88+.12*Math.sin(tau*(time/25.6-phase*.25));
 if(land){const runup=.42*smooth(.42,.68,p)*(1-smooth(.7,1,p)),window=smooth(.42,.5,p)*(1-smooth(.85,1,p));return strength*window*(1-smooth(runup-.045,runup+.045,v));}
 const front=1-Math.min(1,p*2),gate=smooth(0,.12,p)*(1-smooth(.42,.55,p)),crest=(1-smooth(.06,.22,Math.abs(v-front)))*gate;
 return strength*(.28+.72*crest);
}
export function surfOpacity(time,phase,v,land=false){return Number.isFinite(time)&&Number.isFinite(phase)&&Number.isFinite(v)?surfValue(time,phase,v,land):0;}
export function prepareFoamMotion(geometry,offshoreVertexCount,alphaMap){
 const position=geometry.attributes.position,uv=geometry.attributes.uv;
 if(!position||!uv||!alphaMap)return null;
 for(let i=0;i<uv.count;i++){
  const x=position.getX(i),z=position.getZ(i),phase=x*.013+z*.009+periodicNoise(x/60,z/60,128)*.35;
  // Do not wrap vertex phases: interpolation must cross cycle boundaries smoothly.
  uv.setXY(i,-phase/4,(i>=offshoreVertexCount?.52:.02)+.46*uv.getY(i));
 }
 uv.needsUpdate=true;return {alphaMap};
}
export function tickFoamMotion(motion,time){
 if(!motion||!Number.isFinite(time))return false;
 const offset=fract(time/25.6);if(offset===motion.alphaMap.offset.x)return false;
 motion.alphaMap.offset.x=offset;return true;
}
export function tickSileWater(scene,time){
 const water=scene.userData.sileWater;if(!water)return;
 water.normalMap.offset.set(fract(time*.0037),fract(time*-.0023));if(water.roughnessMap)water.roughnessMap.offset.copy(water.normalMap.offset);
 water.foamMaterial.opacity=.48;tickFoamMotion(water.foamMotion||{alphaMap:water.foamMaterial.alphaMap},time);
}
