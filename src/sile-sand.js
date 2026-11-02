import * as THREE from 'three';
const smooth=t=>t*t*(3-2*t),tau=Math.PI*2;
function noise(x,y,period){
 const a=Math.floor(x),b=Math.floor(y),u=smooth(x-a),v=smooth(y-b);
 const hash=(i,j)=>{i=((i%period)+period)%period;j=((j%period)+period)%period;let h=(Math.imul(i,374761393)^Math.imul(j,668265263))>>>0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
 return (hash(a,b)*(1-u)+hash(a+1,b)*u)*(1-v)+(hash(a,b+1)*(1-u)+hash(a+1,b+1)*u)*v;
}
// Authored 4m appearance tile; millimetre relief is normal detail, not terrain.
export function sandTexel(u,v){
 const macro=noise(u*4,v*4,4),warp=noise(u*8,v*8,8),grain=noise(u*256,v*256,256),middle=noise(u*64,v*64,64);
 const ripple=(.5+.5*Math.sin(tau*(v*19+warp*1.4+macro*.5)))*(.2+.8*noise(u*16,v*16,16));
 const shade=(macro-.5)*15+(middle-.5)*6+(grain-.5)*15+(ripple-.5)*3;
 return{height:.001+grain*.00055+middle*.00045+ripple*.0014,color:[188+shade,175+shade,146+shade],roughness:.87+grain*.08};
}
let cached; // immutable CPU buffers; each world owns its GPU textures
function pixels(){
 if(cached)return cached;
 const size=1024,height=new Float32Array(size*size),color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const t=sandTexel(x/size,y/size),i=y*size+x;height[i]=t.height;for(let k=0;k<3;k++){color[i*4+k]=Math.round(t.color[k]);roughness[i*4+k]=Math.round(t.roughness*255);}color[i*4+3]=roughness[i*4+3]=255;}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])*size/8,dy=(height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x])*size/8,n=Math.hypot(dx,dy,1),i=(y*size+x)*4;
  normal[i]=Math.round((.5-dx/n*.5)*255);normal[i+1]=Math.round((.5-dy/n*.5)*255);normal[i+2]=Math.round((.5+1/n*.5)*255);normal[i+3]=255;
 }
 cached={size,color,normal,roughness};return cached;
}
export function beachSandMaterial(){
 const p=pixels(),maps={};
 for(const name of ['color','normal','roughness']){const t=new THREE.DataTexture(p[name],p.size,p.size);t.colorSpace=name==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=8;t.userData.visualTemplate=true;t.needsUpdate=true;maps[name]=t;}
 return new THREE.MeshStandardMaterial({map:maps.color,normalMap:maps.normal,roughnessMap:maps.roughness,roughness:1});
}
