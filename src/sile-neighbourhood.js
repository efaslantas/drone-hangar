import source from './data/sile-context.json' with {type:'json'};
import {insidePolygon,surfaceAt}from './geo-terrain.js';
import {buildingFacade}from './sile-buildings.js';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const hash=(id,s=0)=>{let n=(Math.imul(id|0,374761393)^Math.imul(s,668265263))>>>0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
export function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz,u=l?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l)):0;return Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz);}
function profileIndex(profiles){
 const cells=new Map(),step=48;for(const p of profiles.values()){const ring=p.item.rings[0],xs=ring.map(v=>v[0]),zs=ring.map(v=>v[1]),b={minx:Math.min(...xs),maxx:Math.max(...xs),minz:Math.min(...zs),maxz:Math.max(...zs),profile:p};for(let x=Math.floor(b.minx/step);x<=Math.floor(b.maxx/step);x++)for(let z=Math.floor(b.minz/step);z<=Math.floor(b.maxz/step);z++){const k=x+':'+z;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(b);}}
 return (x,z,r)=>{const out=new Set();for(let a=Math.floor((x-r)/step);a<=Math.floor((x+r)/step);a++)for(let b=Math.floor((z-r)/step);b<=Math.floor((z+r)/step);b++)for(const p of cells.get(a+':'+b)||[]){const dx=Math.max(p.minx-x,0,x-p.maxx),dz=Math.max(p.minz-z,0,z-p.maxz);if(Math.hypot(dx,dz)<=r)out.add(p.profile);}return [...out];};
}
const matches=data=>data?.id==='sile'&&data.buildings?.length===source.counts.buildings&&data.roads?.length===source.counts.roads&&data.structures?.length===source.counts.structures&&Object.entries(source.projection).every(([k,v])=>data.projection?.[k]===v);
// Street/apron clipping has partial-edge neighbours. Refine triangle interiors
// only: original cut boundaries remain exactly shared and no new edge vertices
// require a global, tolerance-dependent retriangulation of tiny cut slivers.
export function refineNeighbourhoodGround(positions,profiles){
 if(!profiles.size)return positions;const near=profileIndex(profiles);let current=positions;
 for(let pass=0;pass<3;pass++){
  const next=[];let changed=false;
  for(let i=0;i<current.length;i+=9){const t=[0,3,6].map(k=>current.slice(i+k,i+k+3)),center=t[0].map((v,k)=>(v+t[1][k]+t[2][k])/3),longest=Math.max(...t.map((a,e)=>Math.hypot(a[0]-t[(e+1)%3][0],a[2]-t[(e+1)%3][2]))),twiceArea=Math.abs((t[1][0]-t[0][0])*(t[2][2]-t[0][2])-(t[1][2]-t[0][2])*(t[2][0]-t[0][0]));
   // Keep narrow source cut fragments untouched; their centers would be almost
   // coincident with existing boundaries at Float32 upload precision.
   if(longest<=8||twiceArea<longest*.01||!near(center[0],center[2],46).length){for(const p of t)next.push(...p);continue;}
   changed=true;for(let e=0;e<3;e++)next.push(...t[e],...t[(e+1)%3],...center);
  }
  if(next.length/9>250000||!changed)break;current=next;
 }
 return current;
}
export function neighbourhoodField(data,profiles){
 if(!matches(data)||!profiles.size)return()=>0;const near=profileIndex(profiles),buildings=profileIndex(new Map(data.buildings.map(item=>[item.id,{item}]))),exclude=[...source.green,...source.lawns,...source.paved,...source.harbour,...source.beaches],roads=[];
 for(const road of data.roads)for(let i=1;i<road.points.length;i++)roads.push({a:road.points[i-1],b:road.points[i],width:road.width/2,minx:Math.min(road.points[i-1][0],road.points[i][0]),maxx:Math.max(road.points[i-1][0],road.points[i][0]),minz:Math.min(road.points[i-1][1],road.points[i][1]),maxz:Math.max(road.points[i-1][1],road.points[i][1])});
 return (x,z)=>{
  const candidates=near(x,z,35);if(!candidates.length||exclude.some(f=>insidePolygon(x,z,f.rings))||buildings(x,z,0).some(p=>insidePolygon(x,z,p.item.rings)))return 0;let d=Infinity;
  for(const p of candidates){if(insidePolygon(x,z,p.item.rings))return 0;const ring=p.item.rings[0];for(let i=0;i<ring.length;i++)d=Math.min(d,segmentDistance(x,z,ring[i],ring[(i+1)%ring.length]));}
  if(d>35||d<1.4)return 0;let roadFade=1;
  for(const r of roads){const reach=r.width+3;if(x<r.minx-reach||x>r.maxx+reach||z<r.minz-reach||z>r.maxz+reach)continue;roadFade=Math.min(roadFade,smooth(r.width+.6,r.width+3,segmentDistance(x,z,r.a,r.b)));if(!roadFade)return 0;}
  const variation=.82+.18*Math.sin(x*.037+Math.sin(z*.029))*Math.sin(z*.041+x*.011);return Math.max(0,Math.min(1,(1-smooth(13,35,d))*smooth(1.4,3,d)*variation*roadFade));
 };
}
export function planNeighbourhood(data,play,profiles){
 const plan={lamps:[],planters:[],benches:[],valid:false};if(!matches(data)||!profiles.size)return plan;plan.valid=true;const near=profileIndex(profiles);
 for(const road of data.roads){if(!['residential','service','pedestrian','living_street','tertiary'].includes(road.kind))continue;let walked=0,next=6+hash(road.id,1)*18,serial=0;
  for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.01)continue;
   while(next<walked+len){const d=next-walked,id=(road.id^Math.imul(serial++,97))|0,side=hash(id,2)>.5?1:-1,nx=-dz/len*side,nz=dx/len*side,x=a[0]+dx*d/len+nx*(road.width/2+1.7),z=a[1]+dz*d/len+nz*(road.width/2+1.7),s=surfaceAt(play,x,z);
    if(near(x,z,45).length&&!s.water&&s.normal[1]>.985&&!source.beaches.some(f=>insidePolygon(x,z,f.rings)))plan.lamps.push({x,y:s.height,z,nx:-nx,nz:-nz,id});
    // Roadside pockets near the selected coastal neighbourhood, not a city inventory.
    const bx=x+dx/len*7+nx*1.8,bz=z+dz/len*7+nz*1.8,bs=surfaceAt(play,bx,bz);
    if(near(bx,bz,30).length&&!bs.water&&bs.normal[1]>.985&&!source.beaches.some(f=>insidePolygon(bx,bz,f.rings)))plan.benches.push({x:bx,y:bs.height,z:bz,nx:-nx,nz:-nz,normal:bs.normal,id});next+=24;
   }walked+=len;
  }
 }
 for(const p of profiles.values()){
  if(p.commercial)continue;const entry=buildingFacade(p.item,p,p.eaves).cells.find(c=>c.floor===0&&(c.tile===8||c.tile===9));if(!entry)continue;
  for(const sign of [-1,1]){const offset=entry.width/2+.8,x=entry.x+entry.dx*offset*sign+entry.nx*1.9,z=entry.z+entry.dz*offset*sign+entry.nz*1.9,s=surfaceAt(play,x,z);if(!s.water&&s.normal[1]>.97&&!source.beaches.some(f=>insidePolygon(x,z,f.rings)))plan.planters.push({x,y:s.height,z,nx:entry.nx,nz:entry.nz,normal:s.normal,id:p.item.id^sign});}
 }
 const order=(a,b)=>hash(a.id,7)-hash(b.id,7)||a.x-b.x||a.z-b.z;plan.lamps.sort(order);plan.planters.sort(order);plan.benches.sort(order);return plan;
}
