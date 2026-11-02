import {sampleTriangleSurface,triangleSurfaceCuts,partitionTriangleSurface} from './triangle-surface.js';
import {createSurfacePartition} from './sile-shore.js';
// Metric local tangent approximation; producer records its WGS84 scale factors.
export function projectCoordinate(p,lon,lat){return [(lon-p.lon)*p.metresLon-p.offsetX,-(lat-p.lat)*p.metresLat-p.offsetZ];}
export function unprojectCoordinate(p,x,z){return [p.lon+(x+p.offsetX)/p.metresLon,p.lat-(z+p.offsetZ)/p.metresLat];}
function onSegment(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1];return Math.abs(dx*(z-a[1])-dz*(x-a[0]))<1e-7&&x>=Math.min(a[0],b[0])-1e-8&&x<=Math.max(a[0],b[0])+1e-8&&z>=Math.min(a[1],b[1])-1e-8&&z<=Math.max(a[1],b[1])+1e-8;}
export function insideRing(x,z,ring){
 let hit=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[j],b=ring[i];if(onSegment(x,z,a,b))return true;
  if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }return hit;
}
export function insidePolygon(x,z,rings){return !!rings.length&&insideRing(x,z,rings[0])&&!rings.slice(1).some(r=>insideRing(x,z,r));}
function platformAt(t,x,z){
 // Source coastline vertices are uploaded as Float32. A0.1mm edge tolerance
 // keeps that drawn edge and physical query on the same side of the platform.
 const epsilon=.0001;
 for(const p of t.platforms||[]){
  const b=p.bounds;if(x<b[0]-epsilon||x>b[1]+epsilon||z<b[2]-epsilon||z>b[3]+epsilon)continue;
  if(insidePolygon(x,z,p.rings))return p;
  if(p.rings.slice(1).some(r=>insideRing(x,z,r)))continue;
  const ring=p.rings[0];for(let i=0;i<ring.length;i++){const a=ring[i],q=ring[(i+1)%ring.length],dx=q[0]-a[0],dz=q[1]-a[1],length=dx*dx+dz*dz,u=length?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/length)):0;if(Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz)<=epsilon)return p;}
 }return null;
}
export function terrainSample(t,x,z){
 const platform=platformAt(t,x,z)|| (t.buildingPads||[]).find(p=>insidePolygon(x,z,p.rings));if(platform)return platform.surface?terrainSample(platform.surface,x,z):{height:platform.height,normal:[0,1,0]};
 const beach=sampleTriangleSurface(t.beachSurface,x,z);if(beach)return beach;
 const [minx,maxx,minz,maxz]=t.bounds,sx=(maxx-minx)/(t.cols-1),sz=(maxz-minz)/(t.rows-1);
 const gx=Math.max(0,Math.min(t.cols-1,(x-minx)/sx)),gz=Math.max(0,Math.min(t.rows-1,(z-minz)/sz));
 const c=Math.min(t.cols-2,Math.floor(gx)),r=Math.min(t.rows-2,Math.floor(gz)),u=gx-c,v=gz-r;
 const a=t.heights[r*t.cols+c],b=t.heights[r*t.cols+c+1],cc=t.heights[(r+1)*t.cols+c],d=t.heights[(r+1)*t.cols+c+1];
 let height,dx,dz;
 if(u+v<=1){height=a+(b-a)*u+(cc-a)*v;dx=(b-a)/sx;dz=(cc-a)/sz;}
 else{height=b*(1-v)+cc*(1-u)+d*(u+v-1);dx=(d-cc)/sx;dz=(d-b)/sz;}
 const n=Math.hypot(dx,1,dz);return {height:height-t.datum,normal:[-dx/n||0,1/n,-dz/n||0]};
}
export function terrainHeight(t,x,z){return terrainSample(t,x,z).height;}
export function surfaceAt(play,x,z){
 const t=play?.terrain;if(!t)return {height:0,water:false,normal:[0,1,0]};
 const platform=platformAt(t,x,z);if(platform)return {...terrainSample(t,x,z),water:false};
 if(!t.land.some(rings=>insidePolygon(x,z,rings)))return {height:-t.datum,water:true,normal:[0,1,0]};
 return {...terrainSample(t,x,z),water:false};
}
// A coastline edge must split wherever it crosses a grid edge or its diagonal;
// each resulting cliff lip then lies on exactly one rendered terrain triangle.
export function splitTerrainEdge(t,a,b){
 const [minx,maxx,minz,maxz]=t.bounds,sx=(maxx-minx)/(t.cols-1),sz=(maxz-minz)/(t.rows-1);
 const ua=(a[0]-minx)/sx,ub=(b[0]-minx)/sx,va=(a[1]-minz)/sz,vb=(b[1]-minz)/sz,values=[0,1,...triangleSurfaceCuts(t.beachSurface,a,b)];
 for(const [start,end,limit] of [[ua,ub,t.cols],[va,vb,t.rows],[ua+va,ub+vb,t.cols+t.rows]]){
  if(Math.abs(end-start)<1e-12)continue;
  for(let k=1;k<limit;k++){const u=(k-start)/(end-start);if(u>1e-9&&u<1-1e-9)values.push(u);}
 }
 values.sort((x,y)=>x-y);
 return values.filter((u,i)=>!i||u-values[i-1]>1e-8).map(u=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]);
}

// Clip overlay triangles onto each heightfield face so paint cannot bridge
// over the physical terrain. All output vertices use the same sampled plane.
// Partition first: a discontinuity has two distinct heights at its shared edge.
// Sampling the combined query at outside vertices would create bridging slopes.
export function partitionBuildingPads(terrain,positions,{drape=false,lift=0}={}){
 let remaining=positions;const output=[],source={...terrain,buildingPads:[]};
 for(const pad of terrain.buildingPads||[]){
  const split=createSurfacePartition([pad.rings]),next=[];
  for(let i=0;i<remaining.length;i+=9){const parts=split([0,3,6].map(k=>[remaining[i+k],remaining[i+k+2],remaining[i+k+1]]));
   for(const t of parts.inside)for(const [x,z]of t)output.push(x,pad.height+lift,z);
   for(const t of parts.outside)for(const [x,z,y]of t)next.push(x,y,z);
  }remaining=next;
 }
 if(drape){for(const v of drapeTerrainTriangles(source,remaining,lift))output.push(v);}else for(const v of remaining)output.push(v);
 return output;
}
export function drapeTerrainTriangles(terrain,positions,lift=.0005){
 if(terrain.buildingPads?.length)return partitionBuildingPads(terrain,positions,{drape:true,lift});
 if(terrain.beachSurface){const p=partitionTriangleSurface(terrain.beachSurface,positions,lift);return [...p.inside,...drapeGridTriangles({...terrain,beachSurface:null},p.outside,lift)];}
 return drapeGridTriangles(terrain,positions,lift);
}
function drapeGridTriangles(terrain,positions,lift){
 const [minx,maxx,minz,maxz]=terrain.bounds,sx=(maxx-minx)/(terrain.cols-1),sz=(maxz-minz)/(terrain.rows-1),output=[];
 function clip(polygon,a,b){
  const side=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);const result=[];
  for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length],dp=side(p),dq=side(q),inside=dp>=-1e-9,next=dq>=-1e-9;if(inside)result.push(p);if(inside!==next){const t=dp/(dp-dq);result.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}
  return result;
 }
 for(let i=0;i<positions.length;i+=9){
  const triangle=[0,3,6].map(j=>[positions[i+j],positions[i+j+2]]),xs=triangle.map(p=>p[0]),zs=triangle.map(p=>p[1]);
  const c0=Math.max(0,Math.floor((Math.min(...xs)-minx)/sx)),c1=Math.min(terrain.cols-2,Math.floor((Math.max(...xs)-minx)/sx)),r0=Math.max(0,Math.floor((Math.min(...zs)-minz)/sz)),r1=Math.min(terrain.rows-2,Math.floor((Math.max(...zs)-minz)/sz));
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){
   const a=[minx+c*sx,minz+r*sz],b=[a[0]+sx,a[1]],d=[a[0]+sx,a[1]+sz],e=[a[0],a[1]+sz];
   for(const face of [[a,b,e],[b,d,e]]){
    let polygon=triangle;for(let edge=0;edge<3&&polygon.length;edge++)polygon=clip(polygon,face[edge],face[(edge+1)%3]);
    for(let k=1;k+1<polygon.length;k++){const t=[polygon[0],polygon[k],polygon[k+1]],area=(t[1][0]-t[0][0])*(t[2][1]-t[0][1])-(t[1][1]-t[0][1])*(t[2][0]-t[0][0]);if(Math.abs(area)<1e-10)continue;for(const p of t)output.push(p[0],terrainHeight(terrain,...p)+lift,p[1]);}
   }
  }
 }
 return output;
}
