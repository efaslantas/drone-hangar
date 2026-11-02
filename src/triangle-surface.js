import {createSurfacePartition} from './sile-shore.js';
const cache=new WeakMap(),STEP=32,TOL=.0002;
const cross=(x,z,a,b)=>x*b-z*a;
function index(surface){
 if(cache.has(surface))return cache.get(surface);
 const records=[],cells=new Map(),global=[];let references=0;
 const p=surface.positions||[];
 for(let i=0;i+8<p.length;i+=9){
  const a=[p[i],p[i+2],p[i+1]],b=[p[i+3],p[i+5],p[i+4]],c=[p[i+6],p[i+8],p[i+7]];if(![...a,...b,...c].every(Number.isFinite))continue;
  const bx=b[0]-a[0],bz=b[1]-a[1],cx=c[0]-a[0],cz=c[1]-a[1],den=cross(bx,bz,cx,cz);if(Math.abs(den)<1e-9)continue;
  const dx=((b[2]-a[2])*cz-(c[2]-a[2])*bz)/den,dz=(bx*(c[2]-a[2])-cx*(b[2]-a[2]))/den,n=Math.hypot(dx,1,dz),bounds=[Math.min(a[0],b[0],c[0])-TOL,Math.max(a[0],b[0],c[0])+TOL,Math.min(a[1],b[1],c[1])-TOL,Math.max(a[1],b[1],c[1])+TOL];
  const r={a,b,c,bx,bz,cx,cz,den,dx,dz,normal:[-dx/n,1/n,-dz/n],bounds,tolerance:TOL*Math.max(Math.hypot(bx,bz),Math.hypot(cx,cz),Math.hypot(cx-bx,cz-bz))/Math.abs(den)},id=records.length;records.push(r);
  const x0=Math.floor(bounds[0]/STEP),x1=Math.floor(bounds[1]/STEP),z0=Math.floor(bounds[2]/STEP),z1=Math.floor(bounds[3]/STEP),count=(x1-x0+1)*(z1-z0+1);
  if(count>1024||references+count>2000000){global.push(id);continue;}references+=count;
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=x+':'+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(id);}
 }
 const result={records,cells,global,partition:null};cache.set(surface,result);return result;
}
function candidates(surface,b){
 const idx=index(surface),x0=Math.floor(b[0]/STEP),x1=Math.floor(b[1]/STEP),z0=Math.floor(b[2]/STEP),z1=Math.floor(b[3]/STEP);
 if((x1-x0+1)*(z1-z0+1)>4096)return idx.records;
 const ids=new Set(idx.global);for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)for(const i of idx.cells.get(x+':'+z)||[])ids.add(i);
 return [...ids].sort((a,b)=>a-b).map(i=>idx.records[i]);
}
export function sampleTriangleSurface(surface,x,z){
 if(!surface||!Number.isFinite(x)||!Number.isFinite(z))return null;
 let fallback=null,nearest=Infinity;
 for(const r of candidates(surface,[x,x,z,z])){
  const b=r.bounds;if(x<b[0]||x>b[1]||z<b[2]||z>b[3])continue;
  const px=x-r.a[0],pz=z-r.a[1],u=cross(px,pz,r.cx,r.cz)/r.den,v=cross(r.bx,r.bz,px,pz)/r.den;
  const sample={height:r.a[2]+r.dx*px+r.dz*pz,normal:r.normal};
  if(u>=-1e-9&&v>=-1e-9&&u+v<=1+1e-9)return sample;
  if(u>=-r.tolerance&&v>=-r.tolerance&&u+v<=1+r.tolerance){const miss=Math.max(0,-u,-v,u+v-1)/r.tolerance;if(miss<nearest){nearest=miss;fallback=sample;}}
 }return fallback;
}
export function triangleSurfaceCuts(surface,a,b){
 if(!surface)return [];
 const dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;if(length<1e-15)return [];
 const values=[];
 for(const r of candidates(surface,[Math.min(a[0],b[0]),Math.max(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[1],b[1])]))for(const [p,q] of [[r.a,r.b],[r.b,r.c],[r.c,r.a]]){
  const ex=q[0]-p[0],ez=q[1]-p[1],px=p[0]-a[0],pz=p[1]-a[1],den=cross(dx,dz,ex,ez);
  if(Math.abs(den)>1e-10){const t=cross(px,pz,ex,ez)/den,u=cross(px,pz,dx,dz)/den;if(t>1e-9&&t<1-1e-9&&u>=-1e-8&&u<=1+1e-8)values.push(t);}
  else if(Math.abs(cross(px,pz,dx,dz))/Math.sqrt(length)<TOL)for(const v of [p,q]){const t=((v[0]-a[0])*dx+(v[1]-a[1])*dz)/length;if(t>1e-9&&t<1-1e-9)values.push(t);}
 }
 return values;
}
// Extra input attributes survive clipping; common surface planes own output Y.
export function partitionTriangleSurface(surface,positions,lift=0){
 const idx=index(surface);idx.partition??=createSurfacePartition(idx.records.map(r=>[[r.a.slice(0,2),r.b.slice(0,2),r.c.slice(0,2)]]),{spatial:true});
 const inside=[],outside=[];
 for(let i=0;i<positions.length;i+=9){const parts=idx.partition([0,3,6].map(k=>[positions[i+k],positions[i+k+2],positions[i+k+1]]));
  for(const t of parts.inside)for(const [x,z] of t){const s=sampleTriangleSurface(surface,x,z);if(!s)throw Error('Triangle surface partition lost its owning face');inside.push(x,s.height+lift,z);}
  for(const t of parts.outside)for(const [x,z,y]of t)outside.push(x,y,z);
 }return {inside,outside};
}
