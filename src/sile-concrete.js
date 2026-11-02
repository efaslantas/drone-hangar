import * as THREE from 'three';
const fract=x=>x-Math.floor(x),smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function noise(u,v,period){
 const x=u*period,y=v*period,a=Math.floor(x),b=Math.floor(y),s=smooth(0,1,fract(x)),t=smooth(0,1,fract(y));
 const hash=(i,j)=>{i=((i%period)+period)%period;j=((j%period)+period)%period;let h=(Math.imul(i,374761393)^Math.imul(j,668265263))>>>0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
 return (hash(a,b)*(1-s)+hash(a+1,b)*s)*(1-t)+(hash(a,b+1)*(1-s)+hash(a+1,b+1)*s)*t;
}
// Procedural appearance reference only. Four-metre UV tiles contain two-metre
// slabs; quay V spans -1..7m above mean sea level and clamps outside that range.
export function concreteSample(u,v,quay=false){
 u=fract(u);if(!quay)v=fract(v);
 const coarse=noise(u,v,4),grain=noise(u,v,128),pores=1-smooth(.12,.3,grain),mottle=(coarse-.5)*23+(grain-.5)*19;
 const seam=t=>{const f=fract(t*2);return 1-smooth(.002,.009,Math.min(f,1-f));};
 const joint=quay?0:Math.max(seam(u),seam(v)),wet=quay?1-smooth(-.15,.9,v*8-1):0,algae=quay?(1-smooth(.05,.75,v*8-1))*(.5+coarse*.5):0;
 const base=[153,148,135],color=base.map((c,k)=>Math.round(Math.max(0,Math.min(255,(c+mottle-pores*13-joint*38)*(1-wet*.38)+(k===1?algae*6:-algae*5)))));
 return {color,height:.62+grain*.15-pores*.12-joint*.48,roughness:.93-wet*.25+(coarse-.5)*.08};
}
export function concreteMaterial({quay=false}={}){
 const size=256,albedo=new Uint8Array(size*size*4),relief=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const sample=concreteSample(x/(size-1),y/(size-1),quay),i=(y*size+x)*4;
  for(let k=0;k<3;k++){albedo[i+k]=sample.color[k];relief[i+k]=Math.round(sample.height*255);roughness[i+k]=Math.round(sample.roughness*255);}albedo[i+3]=relief[i+3]=roughness[i+3]=255;
 }
 const texture=(bytes,colorSpace)=>{const map=new THREE.DataTexture(bytes,size,size);map.colorSpace=colorSpace;map.wrapS=THREE.RepeatWrapping;map.wrapT=quay?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.anisotropy=8;map.needsUpdate=true;return map;};
 return new THREE.MeshStandardMaterial({map:texture(albedo,THREE.SRGBColorSpace),bumpMap:texture(relief,THREE.NoColorSpace),bumpScale:.035,roughnessMap:texture(roughness,THREE.NoColorSpace),roughness:1});
}
