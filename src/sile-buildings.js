import types from './data/sile-building-types.json' with {type:'json'};
import {insidePolygon,surfaceAt,drapeTerrainTriangles}from './geo-terrain.js';
import {createSurfacePartition}from './sile-shore.js';
import {buildingRoof}from './sile-roofs.js';
const paints=[0xc6bca9,0xc8c5b9,0xb8c0b7,0xc6b2a4,0xb4bec1,0xc6bfad];
function distance(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l)):0,q=[a[0]+dx*t,a[1]+dz*t];return {distance:Math.hypot(p[0]-q[0],p[1]-q[1]),point:q};}
const hash=(id,e,b,f=0)=>{let n=(Math.imul(id|0,374761393)^Math.imul(e+1,668265263)^Math.imul(b+1,1274126177)^Math.imul(f+1,1597334677))>>>0;n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;};
function simpleRing(ring){
 const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),on=(p,a,b)=>Math.abs(turn(a,b,p))<1e-8&&p[0]>=Math.min(a[0],b[0])-1e-8&&p[0]<=Math.max(a[0],b[0])+1e-8&&p[1]>=Math.min(a[1],b[1])-1e-8&&p[1]<=Math.max(a[1],b[1])+1e-8;
 let area=0;
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length];if(Math.hypot(b[0]-a[0],b[1]-a[1])<.01)return false;area+=a[0]*b[1]-b[0]*a[1];
  for(let j=i+1;j<ring.length;j++){
   if(j===(i+1)%ring.length||(j+1)%ring.length===i)continue;const c=ring[j],d=ring[(j+1)%ring.length];
   if(turn(a,b,c)*turn(a,b,d)<0&&turn(c,d,a)*turn(c,d,b)<0||on(c,a,b)||on(d,a,b)||on(a,c,d)||on(b,c,d))return false;
  }
 }
 return Math.abs(area)>.01;
}
export function coastalBuildings(data,{maxDistance=100}={}){
 const profiles=new Map();if(data?.id!=='sile'||data.buildings.length!==types.buildingCount||!Object.entries(types.projection).every(([k,v])=>data.projection?.[k]===v)||!data.terrain?.land?.length)return profiles;
 const edges=[];for(const rings of data.terrain.land)for(const ring of rings)for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];if(data.terrain.bounds.some((v,k)=>Math.abs(a[k<2?0:1]-v)<.05&&Math.abs(b[k<2?0:1]-v)<.05))continue;edges.push([a,b]);}
 const candidates=[];
 for(const item of data.buildings){
  if(item.kind||item.landmark||item.rings.length!==1||item.rings[0].length<3||item.height<4||item.height>30||!Number.isFinite(item.base)||!Number.isFinite(item.height))continue;
  const ring=item.rings[0];if(!ring.every(p=>p.length===2&&p.every(Number.isFinite))||!simpleRing(ring))continue;const center=ring.reduce((s,p)=>[s[0]+p[0]/ring.length,s[1]+p[1]/ring.length],[0,0]);let closest={distance:Infinity};for(const [a,b]of edges){const d=distance(center,a,b);if(d.distance<closest.distance)closest=d;}
  if(closest.distance>maxDistance||surfaceAt({terrain:data.terrain},...center).water)continue;
  const type=types.types[item.id]||'yes';if(['mosque','school','hospital','industrial','government','public'].includes(type))continue;
  let entry={distance:Infinity,point:center};for(const road of data.roads)for(let i=1;i<road.points.length;i++){const d=distance(center,road.points[i-1],road.points[i]);if(d.distance<entry.distance)entry=d;}
  const roof=buildingRoof(item),eaves=roof?.eaves??item.base+item.height;candidates.push({item,distance:closest.distance,shore:closest.point,entry:entry.point,center,type,commercial:['commercial','retail'].includes(type),paint:paints[Math.abs(item.id)%paints.length],eaves,roof});
 }
 candidates.sort((a,b)=>a.distance-b.distance||a.item.id-b.item.id);for(const p of candidates)profiles.set(p.item.id,p);return profiles;
}
export function buildingFacade(item,profile,eaves){
 const positions=[],uv=[],colors=[],cells=[],ring=item.rings[0],signed=ring.reduce((s,a,i)=>{const b=ring[(i+1)%ring.length];return s+a[0]*b[1]-b[0]*a[1];},0),height=eaves-item.base,floors=Math.max(1,Math.round(height/3));
 // Paint values are linearized here, same colour policy as Three.Color(hex).
 const rgb=[(profile.paint>>16&255)/255,(profile.paint>>8&255)/255,(profile.paint&255)/255].map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
 let entryEdge=0,entryDistance=Infinity;if(profile.entry)for(let i=0;i<ring.length;i++){const d=distance(profile.entry,ring[i],ring[(i+1)%ring.length]).distance;if(d<entryDistance){entryDistance=d;entryEdge=i;}}
 for(let edge=0;edge<ring.length;edge++){
  const a=ring[edge],b=ring[(edge+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.01)continue;const nx=dz/length*(signed>0?1:-1),nz=-dx/length*(signed>0?1:-1),bays=Math.max(1,Math.round(length/3.2));
  for(let floor=0;floor<floors;floor++)for(let bay=0;bay<bays;bay++){
   const variation=hash(item.id,edge,bay,floor),entry=!Number.isFinite(item.entryY)&&floor===0&&edge===entryEdge,tile=entry&&profile.commercial?10+variation%2:entry&&bay===Math.floor(bays/2)?8+variation%2:variation%8,u=tile%4,v=Math.floor(tile/4),margin=2/1024,tu=[u/4+margin,(u+1)/4-margin],tv=[v/4+margin,(v+1)/4-margin],y0=item.base+height*floor/floors,y1=item.base+height*(floor+1)/floors;
   const point=(t,y)=>[a[0]+dx*t,y,a[1]+dz*t],q=[point(bay/bays,y0),point((bay+1)/bays,y0),point(bay/bays,y1),point((bay+1)/bays,y1)],tex=[[tu[0],tv[0]],[tu[1],tv[0]],[tu[0],tv[1]],[tu[1],tv[1]]];
   const ids=signed>0?[0,2,1,1,2,3]:[0,1,2,1,3,2];for(const i of ids){positions.push(...q[i]);uv.push(...tex[i]);colors.push(...rgb);}
   cells.push({edge,bay,floor,tile,uv:tex,x:a[0]+dx*(bay+.5)/bays,z:a[1]+dz*(bay+.5)/bays,y0,y1,width:length/bays,dx:dx/length,dz:dz/length,nx,nz});
  }
 }
 if(Number.isFinite(item.entryY)){
  const a=ring[entryEdge],b=ring[(entryEdge+1)%ring.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length,nx=dz*(signed>0?1:-1),nz=-dx*(signed>0?1:-1),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,width=Math.min(3,length*.75),y0=item.entryY,y1=y0+2.7;
  if(y1<=eaves){const point=(t,y)=>[x+dx*t+nx*.008,y,z+dz*t+nz*.008],q=[point(-width/2,y0),point(width/2,y0),point(-width/2,y1),point(width/2,y1)],tex=[[.002,.502],[.248,.502],[.002,.748],[.248,.748]],ids=signed>0?[0,2,1,1,2,3]:[0,1,2,1,3,2];for(const i of ids){positions.push(...q[i]);uv.push(...tex[i]);colors.push(...rgb);}cells.push({edge:entryEdge,bay:0,floor:0,tile:8,x,z,y0,y1,width,dx,dz,nx,nz,authoredEntry:true});}
 }
 return {positions,uv,colors,cells};
}
export function buildingAprons(data,positions,profiles=coastalBuildings(data)){
 if(!profiles.size)return {ground:positions,paved:[]};const masks=[];
 for(const p of profiles.values()){
  const ring=p.item.rings[0],signed=ring.reduce((s,a,i)=>{const b=ring[(i+1)%ring.length];return s+a[0]*b[1]-b[0]*a[1];},0);
  for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.01)continue;const nx=dz/len*(signed>0?1:-1)*1.4,nz=-dx/len*(signed>0?1:-1)*1.4;masks.push([[a,b,[b[0]+nx,b[1]+nz],[a[0]+nx,a[1]+nz]]]);}
 }
 const split=createSurfacePartition(masks),land=createSurfacePartition(data.terrain.land),ground=[],paved=[];
 for(let i=0;i<positions.length;i+=9){const p=split([0,3,6].map(k=>[positions[i+k],positions[i+k+2],positions[i+k+1]]));for(const t of p.outside)for(const [x,z,y]of t)ground.push(x,y,z);for(const t of p.inside)for(const q of land(t).inside)for(const [x,z,y]of q)paved.push(x,y,z);}
 const draped=drapeTerrainTriangles(data.terrain,paved,0),stable=[];for(let i=0;i<draped.length;i+=9){const t=draped.slice(i,i+9).map(Math.fround),a=(t[3]-t[0])*(t[8]-t[2])-(t[5]-t[2])*(t[6]-t[0]);if(Math.abs(a)>1e-8)stable.push(...t);}return {ground,paved:stable};
}
