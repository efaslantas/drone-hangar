import {ShapeUtils,Vector2} from 'three';

// Subtract source land from convex foam triangles, retaining [x,z,u,v].
// A conservative 2 mm edge margin keeps cut vertices off land after Float32
// upload. It is a rendering tolerance; source data and collision never change.
const MARGIN=.002,MIN_AREA=1e-8;
function signedArea(p){let sum=0;for(let i=1;i<p.length-1;i++)sum+=(p[i][0]-p[0][0])*(p[i+1][1]-p[0][1])-(p[i][1]-p[0][1])*(p[i+1][0]-p[0][0]);return sum/2;}
function bounds(p){return [Math.min(...p.map(v=>v[0])),Math.max(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[1]))];}
function overlaps(a,b){return a[0]<=b[1]+MARGIN&&a[1]>=b[0]-MARGIN&&a[2]<=b[3]+MARGIN&&a[3]>=b[2]-MARGIN;}
function halfPlane(poly,a,b,inside,margin=MARGIN){
 const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
 const distance=p=>(dx*(p[1]-a[1])-dz*(p[0]-a[0]))/length+margin;
 const output=[];let prev=poly.at(-1),pd=distance(prev),pk=inside?pd>=0:pd<=0;
 for(const current of poly){const cd=distance(current),ck=inside?cd>=0:cd<=0;
  if(ck!==pk){const t=pd/(pd-cd);output.push(prev.map((v,i)=>v+(current[i]-v)*t));}
  if(ck)output.push(current);prev=current;pd=cd;pk=ck;
 }
 return output;
}
function subtract(poly,triangle,margin=MARGIN){
 const outside=[];let remaining=poly;
 for(let i=0;i<3&&remaining.length>=3;i++){
  const a=triangle[i],b=triangle[(i+1)%3],part=halfPlane(remaining,a,b,false,margin);
  if(part.length>=3&&Math.abs(signedArea(part))>MIN_AREA)outside.push(part);
  remaining=halfPlane(remaining,a,b,true,margin);
 }
 // Whatever remains after all three inside half-planes belongs to land.
 return outside;
}

// Partition a surface into the union of masks and its complement. Unlike an
// overlay per mask, each piece is emitted once even when masks overlap. Extra
// vertex attributes (e.g. height) follow the same linear intersections.
export function createSurfacePartition(masks,{spatial=false}={}){
 const triangles=[];
 for(const rings of masks){
  const vectors=rings.map(r=>r.map(([x,z])=>new Vector2(x,z))),points=vectors.flat().map(p=>[p.x,p.y]);
  for(const ids of ShapeUtils.triangulateShape(vectors[0],vectors.slice(1))){const t=ids.map(i=>points[i]),a=signedArea(t);if(Math.abs(a)<=MIN_AREA)continue;if(a<0)t.reverse();triangles.push({vertices:t,bounds:bounds(t)});}
 }
 const cells=new Map(),global=[],step=64;
 if(spatial)triangles.forEach((t,i)=>{const b=t.bounds,x0=Math.floor(b[0]/step),x1=Math.floor(b[1]/step),z0=Math.floor(b[2]/step),z1=Math.floor(b[3]/step);if((x1-x0+1)*(z1-z0+1)>1024){global.push(i);return;}for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=x+':'+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);}});
 const fan=polys=>polys.flatMap(p=>{const out=[];for(let i=1;i<p.length-1;i++){const t=[p[0],p[i],p[i+1]];if(Math.abs(signedArea(t))>MIN_AREA)out.push(t);}return out;});
 return triangle=>{
  const box=bounds(triangle),inside=[];let remaining=[triangle];
  let candidates=triangles;if(spatial){const ids=new Set(global);for(let x=Math.floor(box[0]/step);x<=Math.floor(box[1]/step);x++)for(let z=Math.floor(box[2]/step);z<=Math.floor(box[3]/step);z++)for(const i of cells.get(x+':'+z)||[])ids.add(i);candidates=[...ids].sort((a,b)=>a-b).map(i=>triangles[i]);}
  for(const mask of candidates){
   if(!overlaps(box,mask.bounds))continue;const next=[];
   for(const p of remaining){
    if(!overlaps(bounds(p),mask.bounds)){next.push(p);continue;}
    let hit=p;for(let i=0;i<3&&hit.length;i++)hit=halfPlane(hit,mask.vertices[i],mask.vertices[(i+1)%3],true,0);
    if(hit.length>=3&&Math.abs(signedArea(hit))>MIN_AREA){inside.push(hit);next.push(...subtract(p,mask.vertices,0));}else next.push(p);
   }
   remaining=next;if(!remaining.length)break;
  }
  return {inside:fan(inside),outside:fan(remaining)};
 };
}
export function createShoreClipper(land){
 const triangles=[];
 for(const rings of land){
  const vectors=rings.map(r=>r.map(([x,z])=>new Vector2(x,z)));
  const indices=ShapeUtils.triangulateShape(vectors[0],vectors.slice(1)),points=vectors.flat().map(p=>[p.x,p.y]);
  for(const indices3 of indices){const vertices=indices3.map(i=>points[i]);const area=signedArea(vertices);if(Math.abs(area)<=MIN_AREA)continue;if(area<0)vertices.reverse();triangles.push({vertices,bounds:bounds(vertices)});}
 }
 return triangle=>{
  if(Math.abs(signedArea(triangle))<=MIN_AREA)return [];
  const box=bounds(triangle);let pieces=[triangle];
  for(const landTriangle of triangles){
   if(!overlaps(box,landTriangle.bounds))continue;
   pieces=pieces.flatMap(p=>overlaps(bounds(p),landTriangle.bounds)?subtract(p,landTriangle.vertices):[p]);
   if(!pieces.length)break;
  }
  const result=[];
  for(const p of pieces)for(let i=1;i<p.length-1;i++){const t=[p[0],p[i],p[i+1]];if(Math.abs(signedArea(t))>MIN_AREA)result.push(t);}
  return result;
 };
}

// Inverse operation for mapped sand/rock: retain a slightly inset land mask.
// Internal triangulation edges may leave a2mm rendering margin, never sea spill.
export function createLandClipper(land){
 const triangles=[];
 for(const rings of land){const vectors=rings.map(r=>r.map(([x,z])=>new Vector2(x,z))),points=vectors.flat().map(p=>[p.x,p.y]);for(const indices of ShapeUtils.triangulateShape(vectors[0],vectors.slice(1))){const t=indices.map(i=>points[i]);if(Math.abs(signedArea(t))<=MIN_AREA)continue;if(signedArea(t)<0)t.reverse();triangles.push({vertices:t,bounds:bounds(t)});}}
 return triangle=>{const result=[],box=bounds(triangle);for(const t of triangles){if(!overlaps(box,t.bounds))continue;let p=triangle;for(let i=0;i<3&&p.length;i++)p=halfPlane(p,t.vertices[i],t.vertices[(i+1)%3],true,-MARGIN);for(let i=1;i<p.length-1;i++){const part=[p[0],p[i],p[i+1]];if(Math.abs(signedArea(part))>MIN_AREA)result.push(part);}}return result;};
}
