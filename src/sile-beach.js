import {connectedBeachFeatures} from './sile-coast.js';
import {sampleTriangleSurface} from './triangle-surface.js';
import source from './data/sile-coast.json' with {type:'json'};
import {insidePolygon,surfaceAt,terrainHeight,splitTerrainEdge} from './geo-terrain.js';
import {createSurfacePartition} from './sile-shore.js';
const WIDTH=18,SLOPE=.08,TOE=.03;
const area=r=>Math.abs(r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-p[1]*q[0];},0))/2;
const bounds=p=>[Math.min(...p.map(v=>v[0])),Math.max(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[1]))];
const overlap=(a,b)=>a[0]<=b[1]&&a[1]>=b[0]&&a[2]<=b[3]&&a[3]>=b[2];
function distance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz,u=l?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l)):0;return Math.hypot(x-a[0]-dx*u,z-a[1]-dz*u);}
function split(poly,value,positive){if(poly.length<3)return [];const out=[];let a=poly.at(-1),fa=value(a),ia=positive?fa>=0:fa<=0;for(const b of poly){const fb=value(b),ib=positive?fb>=0:fb<=0;if(ia!==ib){const t=fa/(fa-fb);out.push(a.map((v,k)=>v+(b[k]-v)*t));}if(ib)out.push(b);a=b;fa=fb;ia=ib;}return out;}
function fan(poly){const out=[];for(let i=1;i+1<poly.length;i++){const t=[poly[0],poly[i],poly[i+1]];if(area(t)>1e-9)out.push(t);}return out;}
function interpolate(t,x,z,k){const [a,b,c]=t,den=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),u=((x-a[0])*(c[1]-a[1])-(z-a[1])*(c[0]-a[0]))/den,v=((b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0]))/den;return a[k]+u*(b[k]-a[k])+v*(c[k]-a[k]);}
function protectionQuery(data){
 const cells=new Map(),global=[],step=32;
 const add=record=>{const b=record.bounds,x0=Math.floor(b[0]/step),x1=Math.floor(b[1]/step),z0=Math.floor(b[2]/step),z1=Math.floor(b[3]/step);if((x1-x0+1)*(z1-z0+1)>1024){global.push(record);return;}for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=x+':'+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(record);}};
 for(const road of data.roads)for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],r=road.width/2+3;add({a,b,r,bounds:[Math.min(a[0],b[0])-r,Math.max(a[0],b[0])+r,Math.min(a[1],b[1])-r,Math.max(a[1],b[1])+r]});}
 for(const item of [...data.buildings,...data.structures]){const b=bounds(item.rings.flat());add({rings:item.rings,bounds:[b[0]-3,b[1]+3,b[2]-3,b[3]+3]});}
 return (x,z)=>{for(const p of [...global,...(cells.get(Math.floor(x/step)+':'+Math.floor(z/step))||[])]){const b=p.bounds;if(x<b[0]||x>b[1]||z<b[2]||z>b[3])continue;if(p.rings?(insidePolygon(x,z,p.rings)||p.rings.some(r=>r.some((a,i)=>distance(x,z,a,r[(i+1)%r.length])<3))):distance(x,z,p.a,p.b)<p.r)return true;}return false;};
}
// Split T-junctions at shared uploaded vertices before generating collision
// faces. Clipped neighbouring polygons otherwise interpolate different heights
// along an edge even when their endpoint elevations have been welded.
function conformTriangles(triangles){
 const step=8,epsilon=.00012,points=new Map(),cells=new Map();
 for(const t of triangles)for(const p of t){const x=Math.fround(p[0]),z=Math.fround(p[1]),key=x+':'+z;if(points.has(key))continue;const v=[x,z,Math.fround(p[2]),p[3]];points.set(key,v);const cell=Math.floor(x/step)+':'+Math.floor(z/step);if(!cells.has(cell))cells.set(cell,[]);cells.get(cell).push(v);}
 const result=[];
 for(const tri of triangles){const boundary=[];for(let i=0;i<3;i++){
  const a=tri[i],b=tri[(i+1)%3],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;if(length<1e-15)continue;
  const cuts=[{u:0,p:a}];
  for(let x=Math.floor((Math.min(a[0],b[0])-epsilon)/step);x<=Math.floor((Math.max(a[0],b[0])+epsilon)/step);x++)for(let z=Math.floor((Math.min(a[1],b[1])-epsilon)/step);z<=Math.floor((Math.max(a[1],b[1])+epsilon)/step);z++)for(const p of cells.get(x+':'+z)||[]){const u=((p[0]-a[0])*dx+(p[1]-a[1])*dz)/length;if(u<=epsilon/Math.sqrt(length)||u>=1-epsilon/Math.sqrt(length))continue;if(Math.abs(dx*(p[1]-a[1])-dz*(p[0]-a[0]))/Math.sqrt(length)<=epsilon)cuts.push({u,p});}
  cuts.sort((a,b)=>a.u-b.u);for(let j=0;j<cuts.length;j++)if(!j||cuts[j].u-cuts[j-1].u>epsilon/Math.sqrt(length))boundary.push(cuts[j].p);
 }
 if(boundary.length===3){result.push(tri);continue;}
 const center=[0,1,2,3].map(k=>tri.reduce((s,p)=>s+p[k],0)/3);for(let i=0;i<boundary.length;i++)result.push([center,boundary[i],boundary[(i+1)%boundary.length]]);
 }return result;
}
export function buildBeachApproach(data,terrain,sand){
 const stats={changedVertices:0,maxCutM:0,rampTriangles:0,unsafe:false};
 if(data.id!=='sile'||!Object.entries(source.projection).every(([k,v])=>data.projection?.[k]===v))return null;
 const beaches=connectedBeachFeatures(terrain),ramps=[];
 for(const rings of terrain.land)for(const sourceRing of rings){
  const ring=sourceRing.flatMap((a,i)=>splitTerrainEdge(terrain,a,sourceRing[(i+1)%sourceRing.length]).slice(0,-1));
  const edges=ring.map((a,i)=>{const b=ring[(i+1)%ring.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]),mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;let nx=-(b[1]-a[1])/len,nz=(b[0]-a[0])/len;if(surfaceAt({terrain},mx+nx*.8,mz+nz*.8).water){nx=-nx;nz=-nz;}
   const crop=terrain.bounds.some((v,k)=>Math.abs(a[k<2?0:1]-v)<.05&&Math.abs(b[k<2?0:1]-v)<.05),eligible=len>.01&&!crop&&surfaceAt({terrain},mx-nx*.8,mz-nz*.8).water&&beaches.some(f=>insidePolygon(mx,mz,f.rings)||f.rings.some(r=>r.some((p,i)=>distance(mx,mz,p,r[(i+1)%r.length])<WIDTH)))&&[a,b,[mx,mz]].every(p=>terrainHeight(terrain,...p)+terrain.datum<2.5);
   return {a,b,len,nx,nz,eligible,crop};});
  const joins=edges.map((e,i)=>{const p=edges[(i+edges.length-1)%edges.length];if(!p.eligible)return [e.nx,e.nz];if(!e.eligible)return [p.nx,p.nz];const x=p.nx+e.nx,z=p.nz+e.nz,l=Math.hypot(x,z);if(l<.1)return [e.nx,e.nz];const scale=Math.min(1.6,1/Math.max(.1,(x*e.nx+z*e.nz)/l));return [x/l*scale,z/l*scale];});
  // The inland boundary must meet or exceed every native grid face;
  // otherwise a constant ramp height leaves a second cliff inside the beach.
  const inland=edges.map((e,i)=>{if(!e.eligible)return -Infinity;const a=[e.a[0]+joins[i][0]*WIDTH,e.a[1]+joins[i][1]*WIDTH],j=joins[(i+1)%joins.length],b=[e.b[0]+j[0]*WIDTH,e.b[1]+j[1]*WIDTH];return Math.max(-terrain.datum+TOE+WIDTH*SLOPE,...splitTerrainEdge(terrain,a,b).map(p=>terrainHeight(terrain,...p)+.01));});
  for(let i=0;i<edges.length;i++){
   const e=edges[i];if(!e.eligible)continue;
   const va=joins[i],vb=joins[(i+1)%edges.length],a=e.a,b=e.b,innerA=[a[0]+va[0]*WIDTH,a[1]+va[1]*WIDTH],innerB=[b[0]+vb[0]*WIDTH,b[1]+vb[1]*WIDTH];
   const endHeight=(p,q)=>Math.max(...splitTerrainEdge(terrain,p,q).map(v=>terrainHeight(terrain,...v)))+.01;
   const startOpen=!edges[(i+edges.length-1)%edges.length].eligible&&!edges[(i+edges.length-1)%edges.length].crop,endOpen=!edges[(i+1)%edges.length].eligible&&!edges[(i+1)%edges.length].crop,startH=endHeight(a,innerA),endH=endHeight(b,innerB),innerHA=Math.max(inland[i],inland[(i+edges.length-1)%edges.length]),innerHB=Math.max(inland[i],inland[(i+1)%edges.length]),cuts=[0,1];if(startOpen&&e.len>24)cuts.push(12/e.len);if(endOpen&&e.len>24)cuts.push(1-12/e.len);cuts.sort((a,b)=>a-b);
   const section=u=>{const taper=Math.max(startOpen?Math.max(0,1-u*e.len/12):0,endOpen?Math.max(0,1-(1-u)*e.len/12):0),h=startOpen&&u<.5?startH:endH,outerY=(-terrain.datum+TOE)*(1-taper)+h*taper,innerH=innerHA+(innerHB-innerHA)*u,innerY=innerH*(1-taper)+Math.max(h,innerH)*taper;return [[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,outerY,0],[innerA[0]+(innerB[0]-innerA[0])*u,innerA[1]+(innerB[1]-innerA[1])*u,innerY,WIDTH]];};
   for(let j=1;j<cuts.length;j++){const [a,b]=section(cuts[j-1]),[c,d]=section(cuts[j]);for(const t of [[a,b,c],[c,b,d]])if(area(t)>1e-8)ramps.push({vertices:t,bounds:bounds(t),partition:createSurfacePartition([[t.map(p=>p.slice(0,2))]])});}
  }
 }
 stats.rampTriangles=ramps.length;
 let triangles=[];for(let i=0;i<sand.length;i+=9)triangles.push([0,3,6].map(k=>[sand[i+k],sand[i+k+2],sand[i+k+1]-.0005,0]));
 for(const ramp of ramps){const next=[];for(const tri of triangles){
  if(!overlap(bounds(tri),ramp.bounds)){next.push(tri);continue;}
  const parts=ramp.partition(tri);next.push(...parts.outside);
  for(const piece of parts.inside){const p=piece.map(v=>[...v,interpolate(ramp.vertices,v[0],v[1],2),interpolate(ramp.vertices,v[0],v[1],3)]);
   for(const above of [false,true]){
    if(above&&p.every(v=>Math.abs(v[2]-v[4])<1e-9))continue;
    const poly=split(p,v=>v[2]-v[4],above);if(poly.length<3)continue;
    for(const capped of above?[false,true]:[false]){
     if(capped&&poly.every(v=>Math.abs(v[2]-v[4]-2)<1e-9))continue;
     const limited=above?split(poly,v=>v[2]-v[4]-2,capped):poly;
     const q=limited.map(v=>[v[0],v[1],above?(capped?v[2]-2:v[4]):v[2],v[3],v[5]]);
     for(const wet of [false,true]){if(wet&&q.every(v=>Math.abs(v[4]-4)<1e-9))continue;const part=split(q,v=>v[4]-4,!wet);for(const t of fan(part))next.push(t.map(v=>[v[0],v[1],v[2],Math.max(v[3],wet?Math.max(0,Math.min(1,1-v[4]/4)):0)]));}
    }
   }
  }
 }triangles=next;}
 // Clipping creates shared boundary vertices in separate polygons. Publish
 // one elevation per uploaded XZ so two incident faces cannot retain different
 // heights at a graded edge (including Float32-rounded intersections).
 const vertices=new Map();for(const t of triangles)for(const p of t){const key=Math.fround(p[0])+':'+Math.fround(p[1]),old=vertices.get(key);if(old){old.h=Math.min(old.h,p[2]);old.w=Math.max(old.w,p[3]);}else vertices.set(key,{h:p[2],w:p[3]});}
 triangles=triangles.map(t=>t.map(p=>{const v=vertices.get(Math.fround(p[0])+':'+Math.fround(p[1]));return [p[0],p[1],v.h,v.w];}));
 triangles=conformTriangles(triangles);
 triangles=triangles.map(t=>t.map(p=>[Math.fround(p[0]),Math.fround(p[1]),Math.fround(p[2]),p[3]])).filter(t=>{
  const [a,b,c]=t,dx=b[0]-a[0],dz=b[1]-a[1],ex=c[0]-a[0],ez=c[1]-a[1],signed=dx*ez-dz*ex,scale=Math.max(dx*dx+dz*dz,ex*ex+ez*ez,(ex-dx)**2+(ez-dz)**2);return signed<-1e-7&&-signed>scale*1e-5;
 });
 const protectedAt=protectionQuery(data);
 const positions=[],colors=[],swash={positions:[],uv:[],colors:[]};
 for(const t of triangles){const near=split(split(t,v=>v[3]-.01,true),v=>v[2]+terrain.datum-.18,false);for(const f of fan(near))for(const [x,z,h,w]of f){swash.positions.push(Math.fround(x),Math.fround(h)+.004,Math.fround(z));swash.uv.push(x/11+z/17,1-w);swash.colors.push(1,1,1,w*.28);}}
 for(const t of triangles)for(const p of t){const [x,z,h,w]=p,old=terrainHeight(terrain,x,z),cut=old-h;if(cut>.005){stats.changedVertices++;stats.maxCutM=Math.max(stats.maxCutM,cut);
   if(cut>2.00001||protectedAt(x,z))stats.unsafe=true;
  }
  positions.push(Math.fround(x),Math.fround(h),Math.fround(z));colors.push(1-w*.4,1-w*.35,1-w*.3);
 }
 if(stats.unsafe)throw Error('Beach approach exceeds protected source bounds '+JSON.stringify(stats));
 const surface={positions},foam={positions:[],uv:[],colors:[]};
 for(let i=0;i<swash.positions.length;i+=9){let valid=true;for(let k=0;k<9;k+=3){const p=swash.positions.slice(i+k,i+k+3),s=sampleTriangleSurface(surface,p[0],p[2]);if(!s||Math.abs(p[1]-s.height-.004)>.001)valid=false;}if(!valid)continue;foam.positions.push(...swash.positions.slice(i,i+9));foam.uv.push(...swash.uv.slice(i/3*2,i/3*2+6));foam.colors.push(...swash.colors.slice(i/3*4,i/3*4+12));}
 return {surface,colors,swash:foam,stats};
}
