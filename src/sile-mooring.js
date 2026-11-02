import * as THREE from 'three';
import source from './data/sile-context.json' with {type:'json'};
import {surfaceAt,terrainHeight,insidePolygon,splitTerrainEdge} from './geo-terrain.js';
import {harbourLayout,harbourMaterial} from './sile-harbour.js';
const roots=[1485112033,1485112035,1485112037];
function closestShore(terrain,p){
 let best=null;
 for(const rings of terrain.land)for(const ring of rings)for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;if(!l)continue;
  const u=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l)),q=[a[0]+u*dx,a[1]+u*dz],distance=Math.hypot(q[0]-p[0],q[1]-p[1]);
  if(!best||distance<best.distance)best={q,distance};
 }return best;
}
function shoreAlong(terrain,p,dx,dz){
 let best=null;
 for(const rings of terrain.land)for(const ring of rings)for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],ex=b[0]-a[0],ez=b[1]-a[1],cross=dx*ez-dz*ex;if(Math.abs(cross)<1e-9)continue;
  const t=((a[0]-p[0])*ez-(a[1]-p[1])*ex)/cross,u=((a[0]-p[0])*dz-(a[1]-p[1])*dx)/cross;
  if(t<=0||t>52||u<0||u>1||best&&t>=best.distance)continue;
  const q=[p[0]+dx*t,p[1]+dz*t];if(surfaceAt({terrain},q[0]+dx*.1,q[1]+dz*.1).water)continue;best={q,distance:t};
 }return best;
}
// Extend the existing pier axis and width directly to land. Source data stays
// intact; the added footprint remains authored rather than surveyed geometry.
export function planMooringLinks(data,play){
 const out={links:[],rejected:[]},terrain=play?.terrain;
 if(data?.id!=='sile'||!terrain||!data.structures||!Object.entries(source.projection).every(([k,v])=>data.projection?.[k]===v))return out;
 for(const sourceId of roots){
  const pier=data.structures.find(p=>p.id===sourceId&&p.kind==='pier');if(!pier)continue;
  const ring=pier.rings[0];let anchor=null;
  for(let i=0;i<ring.length;i++){
   const a=ring[i],b=ring[(i+1)%ring.length];if(Math.hypot(b[0]-a[0],b[1]-a[1])>5)continue;
   const p=[(a[0]+b[0])/2,(a[1]+b[1])/2],near=closestShore(terrain,p);if(near&&(!anchor||near.distance<anchor.distance))anchor={...near,p,a,b};
  }
  if(!anchor||anchor.distance<1||anchor.distance>48){out.rejected.push(sourceId);continue;}
  const {p,a:capA,b:capB}=anchor,capWidth=Math.hypot(capB[0]-capA[0],capB[1]-capA[1]);let dx=-(capB[1]-capA[1])/capWidth,dz=(capB[0]-capA[0])/capWidth;
  if(dx*(anchor.q[0]-p[0])+dz*(anchor.q[1]-p[1])<0){dx=-dx;dz=-dz;}
  const shore=shoreAlong(terrain,p,dx,dz);if(!shore){out.rejected.push(sourceId);continue;}
  const {q,distance}=shore,nx=dz,nz=-dx,width=capWidth-.02,h=width/2,end=[p[0]-dx*.7,p[1]-dz*.7];let top=null,length=0;
  for(let inset=2;inset<=10;inset++){
   const a=[q[0]+dx*inset,q[1]+dz*inset],corners=[[a[0]+nx*h,a[1]+nz*h],[a[0]-nx*h,a[1]-nz*h],[end[0]-nx*h,end[1]-nz*h],[end[0]+nx*h,end[1]+nz*h]];
   if(corners.slice(0,2).some(v=>surfaceAt(play,...v).water)||corners.slice(2).some(v=>!insidePolygon(...v,pier.rings)))continue;
   top=corners.map((v,i)=>[v[0],i<2?terrainHeight(terrain,...v)+.015:pier.base+pier.height+.0005,v[1]]);length=distance+inset+.7;break;
  }
  if(!top||!top.every(v=>v.every(Number.isFinite))||length>55){out.rejected.push(sourceId);continue;}
  out.links.push({sourceId,top,length,width,base:pier.base,shorePoint:q,authored:true});
 }
 return out;
}
function publishMesh(scene,play,name,positions,material,textureUv=null,landingTriangles=null){
 if(!positions.length){material.dispose();return;}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();
 const p=g.attributes.position,n=g.attributes.normal,uv=[];for(let i=0;i<p.count;i++)if(Math.abs(n.getY(i))>.5)uv.push(p.getX(i)/2,p.getZ(i)/2);else uv.push((Math.abs(n.getX(i))>Math.abs(n.getZ(i))?p.getZ(i):p.getX(i))/2,p.getY(i)/2);g.setAttribute('uv',new THREE.Float32BufferAttribute(textureUv||uv,2));
 const mesh=new THREE.Mesh(g,material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
 play.terrainWalls??=[];
 for(let i=0;i<p.count;i+=3){const vertices=[0,1,2].map(j=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j)]);const contactBounds=[0,1,2].flatMap(k=>[Math.min(...vertices.map(v=>v[k])),Math.max(...vertices.map(v=>v[k]))]);play.terrainWalls.push({vertices,contactBounds,landing:landingTriangles?.has(i/3)||false,mesh:name,authored:'harbour-link',reason:'iskele yapısına çarptı'});}
}
export function planSourceFootbridges(data,play){
 const out={bridges:[],rejected:[]};if(data?.id!=='sile'||!play?.terrain||!Array.isArray(data.roads))return out;
 for(const road of data.roads){
  if(!road.bridge||road.kind!=='footway'||!road.points.some(p=>surfaceAt(play,...p).water))continue;
  const points=road.points.filter((p,i,a)=>!i||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>.001),width=road.width;
  if(points.length<2||!Number.isFinite(width)||width<.8||width>6){out.rejected.push(road.id);continue;}
  function landing(p,other){
   const length=Math.hypot(p[0]-other[0],p[1]-other[1]),dx=(p[0]-other[0])/length,dz=(p[1]-other[1])/length;
   for(let inset=2;inset<=8;inset++){
    const q=[p[0]+dx*inset,p[1]+dz*inset];if([-1,0,1].every(sign=>!surfaceAt(play,q[0]-dz*width/2*sign,q[1]+dx*width/2*sign).water))return q;
   }return null;
  }
  const start=landing(points[0],points[1]),end=landing(points.at(-1),points.at(-2));if(!start||!end){out.rejected.push(road.id);continue;}
  const path=[start,...points,end],distances=[0];for(let i=1;i<path.length;i++)distances.push(distances.at(-1)+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));
  if(distances.at(-1)>600){out.rejected.push(road.id);continue;}
  const sections=path.map((p,i)=>{
   const normal=(a,b)=>{const length=Math.hypot(b[0]-a[0],b[1]-a[1]);return [-(b[1]-a[1])/length,(b[0]-a[0])/length];},n0=normal(path[Math.max(0,i-1)],path[i===0?1:i]),n1=normal(path[i===path.length-1?i-1:i],path[Math.min(path.length-1,i+1)]),sum=[n0[0]+n1[0],n0[1]+n1[1]],length=Math.hypot(...sum)||1,n=[sum[0]/length,sum[1]/length],scale=width/2/Math.max(.5,n[0]*n1[0]+n[1]*n1[1]);
   return {left:[p[0]+n[0]*scale,0,p[1]+n[1]*scale],right:[p[0]-n[0]*scale,0,p[1]-n[1]*scale]};
  });
  const shore=[sections[0],sections.at(-1)].map(section=>[section.left,section.right].map(v=>terrainHeight(play.terrain,v[0],v[2])+.015));
  for(let i=0;i<sections.length;i++){const u=distances[i]/distances.at(-1);sections[i].left[1]=shore[0][0]*(1-u)+shore[1][0]*u;sections[i].right[1]=shore[0][1]*(1-u)+shore[1][1]*u;}
  if(!sections.every(s=>[...s.left,...s.right].every(Number.isFinite))||Math.min(...shore.flat())<-play.terrain.datum+.12){out.rejected.push(road.id);continue;}
  out.bridges.push({sourceId:road.id,width,length:distances.at(-1),sections,authoredHeight:true});
 }return out;
}
function addSourceFootbridges(scene,data,play){
 const plan=planSourceFootbridges(data,play),positions=[],landingTriangles=new Set();
 for(const bridge of plan.bridges){
  for(let i=1;i<bridge.sections.length;i++){
   const a=bridge.sections[i-1],b=bridge.sections[i],top=[a.left,a.right,b.right,b.left],v=[...top,...top.map(([x,y,z])=>[x,y-.18,z])];landingTriangles.add(positions.length/9);landingTriangles.add(positions.length/9+1);
   const faces=[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[1,2,5],[2,6,5],[3,0,7],[0,4,7]];
   if(i===1)faces.push([0,1,4],[1,5,4]);if(i===bridge.sections.length-1)faces.push([2,3,6],[3,7,6]);
   for(const ids of faces)positions.push(...ids.flatMap(i=>v[i]));
  }
 }
 publishMesh(scene,play,'sile-source-footbridges',positions,harbourMaterial(),null,landingTriangles);
 scene.userData.sileSourceBridgeStats={bridges:plan.bridges.length,sourceIds:plan.bridges.map(b=>b.sourceId),rejected:plan.rejected,authoredHeight:true};return plan;
}
export function addMooringLinks(scene,data,play){
 addSourceFootbridges(scene,data,play);
 const plan=planMooringLinks(data,play);if(!plan.links.length)return plan;
 const positions=[],landingTriangles=new Set();
 for(const link of plan.links){
  landingTriangles.add(positions.length/9);landingTriangles.add(positions.length/9+1);
  const v=[...link.top,...link.top.map(([x,y,z])=>[x,link.base,z])];
  for(const ids of [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,4],[1,5,4],[1,2,5],[2,6,5],[2,3,6],[3,7,6],[3,0,7],[0,4,7]])positions.push(...ids.flatMap(i=>v[i]));
 }
 publishMesh(scene,play,'sile-mooring-links',positions,harbourMaterial(),null,landingTriangles);
 const quay=[],quayUv=[],layout=harbourLayout(data),t=play.terrain;
 if(layout)for(const {a,b,nx,nz,nearHarbour}of layout.edges){
  // Keep the existing source coastline, finish only the inner harbour edge.
  if(!nearHarbour)continue;
  const points=splitTerrainEdge(t,a,b);
  for(let i=1;i<points.length;i++){
   const p=points[i-1],q=points[i],bottom=-t.datum-.4,pa=[p[0]-nx*.025,terrainHeight(t,...p),p[1]-nz*.025],pb=[q[0]-nx*.025,terrainHeight(t,...q),q[1]-nz*.025],qa=[pa[0],bottom,pa[2]],qb=[pb[0],bottom,pb[2]];
   const normal=new THREE.Vector3().crossVectors(new THREE.Vector3(...pb).sub(new THREE.Vector3(...pa)),new THREE.Vector3(...qa).sub(new THREE.Vector3(...pa))),faces=[[pa,pb,qa],[pb,qb,qa]];
   if(normal.x*nx+normal.z*nz>0)for(const f of faces)f.reverse();
   quay.push(...faces.flat(2));
   const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
   for(const v of faces.flat())quayUv.push(((v[0]-a[0])*dx+(v[2]-a[1])*dz)/length/2,v[1]/2);
  }
 }
 publishMesh(scene,play,'sile-harbour-quay',quay,harbourMaterial(),quayUv);
 scene.userData.sileMooringStats={links:plan.links.length,quayTriangles:quay.length/9,authored:true,rejected:plan.rejected};return plan;
}
