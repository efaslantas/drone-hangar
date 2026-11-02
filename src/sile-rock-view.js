import * as THREE from 'three';
import{mergeVertices}from 'three/addons/utils/BufferGeometryUtils.js';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function noise(x,y,n){const a=Math.floor(x),b=Math.floor(y),u=smooth(0,1,x-a),v=smooth(0,1,y-b),hash=(i,j)=>{i=((i%n)+n)%n;j=((j%n)+n)%n;let h=(Math.imul(i,374761393)^Math.imul(j,668265263))>>>0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};return(hash(a,b)*(1-u)+hash(a+1,b)*u)*(1-v)+(hash(a,b+1)*(1-u)+hash(a+1,b+1)*u)*v;}
function cells(x,y,n){let first=Infinity,second=Infinity;const a=Math.floor(x),b=Math.floor(y),hash=(i,j,s)=>{i=((i%n)+n)%n;j=((j%n)+n)%n;let h=(Math.imul(i+1,374761393)^Math.imul(j+1,668265263)^Math.imul(s,1274126177))>>>0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
 for(let j=b-1;j<=b+1;j++)for(let i=a-1;i<=a+1;i++){const dx=x-i-.2-hash(i,j,1)*.6,dy=y-j-.2-hash(i,j,2)*.6,d=dx*dx+dy*dy;if(d<first){second=first;first=d;}else if(d<second)second=d;}return Math.sqrt(second)-Math.sqrt(first);
}
// Periodic authored bedding and irregular cellular fractures, not a survey.
export function rockTexel(u,v){
 const macro=noise(u*4,v*4,4),middle=noise(u*16+macro*.5,v*16,16),fine=noise(u*128,v*128,128),gap=cells(u*4+macro*.5,v*4+middle*.35,4),joint=(1-smooth(.012,.045,gap))*smooth(.2,.7,middle),bed=(1-smooth(.012,.04,Math.abs(noise(u*8+macro*.3,v*16,8)-.5)))*smooth(.3,.6,macro),fracture=joint*.7+bed*.3,strata=noise(u*8+macro*.5,v*8,8)-.5,shade=(macro-.5)*30+(middle-.5)*15+(fine-.5)*7+strata*20-fracture*48;
 return{height:Math.max(0,Math.min(1,.53+(macro-.5)*.2+(middle-.5)*.07+(fine-.5)*.018+strata*.018-fracture*.16)),color:[199+shade,197+shade,184+shade],roughness:.82+macro*.1+fracture*.035};
}
let cachedPixels; // immutable CPU buffers only; every world owns its textures
function pixels(){if(cachedPixels)return cachedPixels;const size=1024,heights=new Float32Array(size*size),color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const t=rockTexel(x/size,y/size),i=y*size+x;heights[i]=t.height;for(let k=0;k<3;k++){color[i*4+k]=Math.round(t.color[k]);roughness[i*4+k]=Math.round(Math.min(1,t.roughness)*255);}color[i*4+3]=roughness[i*4+3]=255;}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=(heights[y*size+(x+1)%size]-heights[y*size+(x+size-1)%size])*size*.004,dv=(heights[((y+1)%size)*size+x]-heights[((y+size-1)%size)*size+x])*size*.004,n=Math.hypot(dx,dv,1),i=(y*size+x)*4;normal[i]=Math.round((.5-dx/n*.5)*255);normal[i+1]=Math.round((.5-dv/n*.5)*255);normal[i+2]=Math.round((.5+1/n*.5)*255);normal[i+3]=255;}
 cachedPixels={size,color,normal,roughness};return cachedPixels;
}
export function coastalRockMaterials(){
 const p=pixels(),maps={};for(const name of ['color','normal','roughness']){const t=new THREE.DataTexture(p[name],p.size,p.size);t.colorSpace=name==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=8;t.userData.visualTemplate=true;t.needsUpdate=true;maps[name]=t;}
 const material=wet=>new THREE.MeshStandardMaterial({map:maps.color,normalMap:maps.normal,roughnessMap:maps.roughness,roughness:wet?.46:.98,color:wet?0xcbd2cf:0xffffff,normalScale:new THREE.Vector2(wet?.65:1,wet?.65:1),vertexColors:true,side:THREE.DoubleSide});return{dry:material(false),wet:material(true)};
}
export function rockGeometry(dry,wet){
 const raw=new THREE.BufferGeometry();for(const[name,key,size]of [['position','positions',3],['uv','uv',2],['color','colors',3]])raw.setAttribute(name,new THREE.Float32BufferAttribute([...dry[key],...wet[key]],size));raw.addGroup(0,dry.positions.length/3,0);raw.addGroup(dry.positions.length/3,wet.positions.length/3,1);const g=mergeVertices(raw,.00001);g.computeVertexNormals();raw.dispose();return g;
}

// Collision owns exactly the uploaded cliff triangles, including indexed wet
// contours and authored surface recesses. No extra wall box or landing deck.
export function coastCliffContacts(geometry){
 const p=geometry.attributes.position,ids=geometry.index,count=ids?.count??p.count,result=[];
 for(let i=0;i<count;i+=3){const vertices=[0,1,2].map(k=>{const j=ids?ids.getX(i+k):i+k;return [p.getX(j),p.getY(j),p.getZ(j)];}),[a,b,c]=vertices,ab=b.map((v,k)=>v-a[k]),ac=c.map((v,k)=>v-a[k]);
  if(Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])<1e-10)continue;
  result.push({vertices,contactBounds:[0,1,2].flatMap(k=>[Math.min(...vertices.map(v=>v[k])),Math.max(...vertices.map(v=>v[k]))]),landing:false,mesh:'sile-coast-cliffs',authored:'coast-cliff',reason:'kayalığa çarptı',face:i/3});
 }return result;
}
