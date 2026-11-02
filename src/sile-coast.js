import {ShapeUtils,Vector2,Color} from 'three';
import source from './data/sile-coast.json' with {type:'json'};
import {createShoreClipper,createLandClipper} from './sile-shore.js';
import {insidePolygon,terrainHeight,surfaceAt,splitTerrainEdge,drapeTerrainTriangles} from './geo-terrain.js';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function noise(x,z,scale){const a=Math.floor(x/scale),b=Math.floor(z/scale),u=smooth(0,1,x/scale-a),v=smooth(0,1,z/scale-b),hash=(i,j)=>{let h=(Math.imul(i,374761393)^Math.imul(j,668265263))>>>0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};return (hash(a,b)*(1-u)+hash(a+1,b)*u)*(1-v)+(hash(a,b+1)*(1-u)+hash(a+1,b+1)*u)*v;}
const sourceMatches=data=>data?.id==='sile'&&Object.entries(source.projection).every(([k,v])=>data.projection?.[k]===v);
export function coastGround(data,positions){
 if(!sourceMatches(data))return positions;const clip=createShoreClipper(source.features.map(f=>f.rings)),out=[];
 for(let i=0;i<positions.length;i+=9){const triangle=[0,3,6].map(k=>[positions[i+k],positions[i+k+2],positions[i+k+1]]);for(const t of clip(triangle))for(const [x,z,y] of t)out.push(x,y,z);}
 return out;
}
export function sourceCoastPatches(data,terrain){
 const result={sand:[],rock:[]};if(!sourceMatches(data))return result;
 const clip=createLandClipper(terrain.land);
 for(const feature of source.features){const vectors=feature.rings.map(r=>r.map(([x,z])=>new Vector2(x,z))),points=vectors.flat(),flat=[];
  for(const indices of ShapeUtils.triangulateShape(vectors[0],vectors.slice(1))){const triangle=indices.map(i=>[points[i].x,points[i].y]);if((triangle[1][0]-triangle[0][0])*(triangle[2][1]-triangle[0][1])-(triangle[1][1]-triangle[0][1])*(triangle[2][0]-triangle[0][0])>0)triangle.reverse();for(const t of clip(triangle))for(const [x,z] of t)flat.push(x,0,z);}
  result[feature.kind].push(...drapeTerrainTriangles(terrain,flat));
 }return result;
}
export function buildCoast(terrain){
 const cliffs={positions:[],uv:[],colors:[]},foam={positions:[],uv:[]},clip=createShoreClipper(terrain.land),play={terrain},wet=new Color(0x9aa294),dry=new Color(0xe2d7bd),tint=new Color();
 for(const rings of terrain.land)for(const ring of rings){
  const edges=ring.map((a,i)=>{const b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);let nx=len?-dz/len:0,nz=len?dx/len:0;const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
   if(!surfaceAt(play,mx+nx*.8,mz+nz*.8).water){nx=-nx;nz=-nz;}const water=len>.001&&surfaceAt(play,mx+nx*.8,mz+nz*.8).water;
   const crop=terrain.bounds.some((v,k)=>Math.abs(a[k<2?0:1]-v)<.05&&Math.abs(b[k<2?0:1]-v)<.05);return {a,b,len,nx,nz,water,crop};
  });
  const joins=edges.map((e,i)=>{const p=edges[(i+edges.length-1)%edges.length];if(!p.water)return [e.nx,e.nz];if(!e.water)return [p.nx,p.nz];const x=p.nx+e.nx,z=p.nz+e.nz,l=Math.hypot(x,z);if(l<.1)return [e.nx,e.nz];const dot=(x*e.nx+z*e.nz)/l,scale=Math.min(1.6,1/Math.max(.1,dot));return [x/l*scale,z/l*scale];});const perimeter=edges.reduce((s,e)=>s+e.len,0),uvScale=Math.max(1,Math.round(perimeter/11))/Math.max(.001,perimeter);let arc=0;
  for(let edgeIndex=0;edgeIndex<edges.length;edgeIndex++){
   const e=edges[edgeIndex],{a:edgeA,b:edgeB,len,nx,nz}=e;if(len<=.001)continue;
   // Polygon closure at the map crop is not an observed coastal cliff. Keep
   // its arc distance for the existing foam phase but draw no false wall.
   if(e.crop){arc+=len;continue;}
   const grid=terrain.platforms?.find(p=>p.rings===rings)?.surface||terrain,breaks=splitTerrainEdge(grid,edgeA,edgeB),points=[breaks[0]];
   for(let j=1;j<breaks.length;j++){const a=breaks[j-1],b=breaks[j],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/4));for(let k=1;k<=n;k++)points.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);}
   const low=-terrain.datum-.2,heights=points.map(p=>terrainHeight(terrain,...p)),rows=Math.max(1,Math.ceil(Math.max(0,Math.max(...heights)-low)));
   const direction=d=>{const prev=joins[edgeIndex],next=joins[(edgeIndex+1)%joins.length],reach=Math.min(4,len/2),f=1-smooth(0,reach,d),g=1-smooth(0,reach,len-d);return [nx+(prev[0]-nx)*f+(next[0]-nx)*g,nz+(prev[1]-nz)*f+(next[1]-nz)*g];};
   for(let j=1;j<points.length;j++){
    const a=points[j-1],b=points[j],ha=heights[j-1],hb=heights[j],da=Math.hypot(a[0]-edgeA[0],a[1]-edgeA[1]),db=Math.hypot(b[0]-edgeA[0],b[1]-edgeA[1]);
    if(e.water&&!e.crop){const va=direction(da),vb=direction(db);
     for(const [target,width,level] of [[foam,p=>1.2+2.2*noise(...p,23),.025]]){
      const wa=width(a),wb=width(b),q=[[a[0]+va[0]*.15,a[1]+va[1]*.15,(arc+da)*uvScale,0],[b[0]+vb[0]*.15,b[1]+vb[1]*.15,(arc+db)*uvScale,0],[a[0]+va[0]*wa,a[1]+va[1]*wa,(arc+da)*uvScale,1],[b[0]+vb[0]*wb,b[1]+vb[1]*wb,(arc+db)*uvScale,1]];
      for(const indices of [[0,2,1],[1,2,3]])for(const candidate of clip(indices.map(k=>q[k]))){
       const [a,b,c]=candidate,area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),t=area>0?candidate.toReversed():candidate;
       for(const [x,z,u,v] of t){target.positions.push(x,-terrain.datum+level,z);target.uv.push(u,v);}
      }
     }
    }
    if(Math.max(ha,hb)<low+.3)continue;
    function vertex(p,h,d,v){const y=h+(low-h)*v,fade=smooth(0,2,d)*smooth(0,2,len-d);let recess=e.water&&!e.crop ? .08*Math.sin(Math.PI*v)*(.4+.6*noise(p[0]+y*.31,p[1]+y*.17,1.4))*fade:0;let x=p[0]-nx*recess,z=p[1]-nz*recess;if(recess&&!insidePolygon(x,z,rings)){x=p[0];z=p[1];}
     cliffs.positions.push(x,y,z);cliffs.uv.push((arc+d)/3,y/3);const wetness=smooth(.1,2.5,y+terrain.datum),variation=.9+noise(p[0]+v*3,p[1],6)*.1;tint.copy(wet).lerp(dry,wetness).multiplyScalar(variation);cliffs.colors.push(tint.r,tint.g,tint.b);
    }
    const cuts=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2));
    for(let cut=0;cut<cuts;cut++){const u=cut/cuts,t=(cut+1)/cuts,pa=a.map((v,k)=>v+(b[k]-v)*u),pb=a.map((v,k)=>v+(b[k]-v)*t),ya=ha+(hb-ha)*u,yb=ha+(hb-ha)*t,sa=da+(db-da)*u,sb=da+(db-da)*t;
     for(let row=0;row<rows;row++){const v=row/rows,w=(row+1)/rows,triangles=[[[pa,ya,sa,v],[pa,ya,sa,w],[pb,yb,sb,v]],[[pb,yb,sb,v],[pa,ya,sa,w],[pb,yb,sb,w]]];
      for(const triangle of triangles){const dx=pb[0]-pa[0],dz=pb[1]-pa[1];if((-dz*nx+dx*nz)<0)triangle.reverse();for(const[p,h,d,t]of triangle)vertex(p,h,d,t);}
     }
    }
   }arc+=len;
  }
 }
 return {cliffs,foam,...splitRockFaces(cliffs,terrain.datum)};
}

// Partition existing faces, never overlay a coplanar wet sheet. The contour is
// authored mean-water wetting, not measured tide or bathymetry.
export function splitRockFaces(cliffs,datum){
 const dryCliffs={positions:[],uv:[],colors:[]},wetCliffs={positions:[],uv:[],colors:[]};
 function clip(vertices,wet){const out=[];let a=vertices.at(-1),fa=a[8],ia=wet?fa<=0:fa>=0;for(const b of vertices){const fb=b[8],ib=wet?fb<=0:fb>=0;if(ia!==ib){const t=fa/(fa-fb);out.push(a.map((v,k)=>v+(b[k]-v)*t));}if(ib)out.push(b);a=b;fa=fb;ia=ib;}return out;}
 function append(target,poly){for(let i=1;i+1<poly.length;i++){const t=[poly[0],poly[i],poly[i+1]],a=t[0],b=t[1],c=t[2],u=b.slice(0,3).map((v,k)=>v-a[k]),v=c.slice(0,3).map((v,k)=>v-a[k]);if(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])<1e-12)continue;for(const p of t){target.positions.push(...p.slice(0,3));target.uv.push(...p.slice(3,5));target.colors.push(...p.slice(5,8));}}}
 for(let i=0;i<cliffs.positions.length;i+=9){const vertices=[0,3,6].map(k=>{const p=cliffs.positions.slice(i+k,i+k+3),j=(i+k)/3;return [...p,...cliffs.uv.slice(j*2,j*2+2),...cliffs.colors.slice(i+k,i+k+3),p[1]+datum-(.65+.15*(noise(p[0],p[2],9)*2-1))];});append(wetCliffs,clip(vertices,true));append(dryCliffs,clip(vertices,false));}
 return{dryCliffs,wetCliffs};
}
