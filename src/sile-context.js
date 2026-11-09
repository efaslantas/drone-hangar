import source from './data/sile-context.json' with {type:'json'};
import {insidePolygon,surfaceAt} from './geo-terrain.js';
import {landcoverSampler} from './sile-landcover.js';
const random=(id,salt=0)=>{let n=(Math.imul(id|0,374761393)^Math.imul(salt,668265263))>>>0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
function bounds(ring){return {minx:Math.min(...ring.map(p=>p[0])),maxx:Math.max(...ring.map(p=>p[0])),minz:Math.min(...ring.map(p=>p[1])),maxz:Math.max(...ring.map(p=>p[1]))};}
function overlap(a,b){const aa=bounds(a),bb=bounds(b);if(aa.minx>bb.maxx||aa.maxx<bb.minx||aa.minz>bb.maxz||aa.maxz<bb.minz)return false;if(a.some(p=>insidePolygon(...p,[b]))||b.some(p=>insidePolygon(...p,[a])))return true;const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length];if(cross(p,q,r)*cross(p,q,s)<0&&cross(r,s,p)*cross(r,s,q)<0)return true;}return false;}
function grid(){const cells=new Map(),size=32;return {add(record,b){for(let x=Math.floor(b.minx/size);x<=Math.floor(b.maxx/size);x++)for(let z=Math.floor(b.minz/size);z<=Math.floor(b.maxz/size);z++){const key=x+':'+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(record);}},near(x,z,r){const out=new Set();for(let i=Math.floor((x-r)/size);i<=Math.floor((x+r)/size);i++)for(let j=Math.floor((z-r)/size);j<=Math.floor((z+r)/size);j++)for(const p of cells.get(i+':'+j)||[])out.add(p);return out;}};}
function distance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l)):0;return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
export function planSileContext(data,play){
 const plan={trees:[],beach:[],boats:[],bollards:[],source};
 if(data.id!=='sile'||!Object.entries(source.projection).every(([k,v])=>data.projection?.[k]===v)||data.buildings.length!==source.counts.buildings||data.roads.length!==source.counts.roads||data.structures.length!==source.counts.structures)return plan;
 plan.valid=true;const cover=landcoverSampler(data),obstacles=grid(),reserved=grid(),t=play.terrain,[minx,maxx,minz,maxz]=t.bounds;
 for(const p of play.prisms){const [minx,maxx,minz,maxz]=p.bounds;obstacles.add({kind:'solid',minx,maxx,minz,maxz},{minx,maxx,minz,maxz});}
 for(const b of data.supplementalBuildings||[]){const box=bounds(b.rings[0]);obstacles.add({kind:'solid',...box},box);}
 for(const road of data.roads)for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],r=road.width/2+1;obstacles.add({kind:'road',a,b,r},{minx:Math.min(a[0],b[0])-r,maxx:Math.max(a[0],b[0])+r,minz:Math.min(a[1],b[1])-r,maxz:Math.max(a[1],b[1])+r});}
 const reserve=(x,z,r)=>reserved.add({x,z,r},{minx:x-r,maxx:x+r,minz:z-r,maxz:z+r});
 function clear(x,z,r,{water=false,road=true,solids=true}={}){
  if(x-r<minx||x+r>maxx||z-r<minz||z+r>maxz||Math.hypot(x,z)<14+r)return false;
  const s=surfaceAt(play,x,z);if(s.water!==water||!water&&s.normal[1]<.7)return false;
  if(!water&&(play.groundCorridors||[]).some(c=>distance(x,z,c.a,c.b)<c.width/2+r))return false;
  for(const p of obstacles.near(x,z,r))if(p.kind==='solid'){if(solids&&x+r>p.minx&&x-r<p.maxx&&z+r>p.minz&&z-r<p.maxz)return false;}else if(road&&distance(x,z,p.a,p.b)<p.r+r*.45)return false;
  for(const p of reserved.near(x,z,r))if(Math.hypot(x-p.x,z-p.z)<(r+p.r)*.9)return false;
  return true;
 }
 function tree(x,z,id,kind,mapped=false){const h=kind==='scrub'?2+random(id,2)*1.6:kind==='forest'?8+random(id,2)*5:5.5+random(id,2)*4.5,r=kind==='scrub'?1+random(id,3):kind==='forest'?3.5+random(id,3)*1.8:2.1+random(id,3)*1.2;if(!clear(x,z,r*1.12))return;const y=surfaceAt(play,x,z).height;plan.trees.push({x,y,z,yaw:random(id,4)*Math.PI*2,h,r,id,kind,mapped});reserve(x,z,r);}
 const shores=[];for(const rings of t.land)for(const ring of rings)for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];if(t.bounds.some((v,k)=>Math.abs(a[k<2?0:1]-v)<.05&&Math.abs(b[k<2?0:1]-v)<.05))continue;shores.push([a,b]);}
 function shore(x,z){let d=Infinity,best;for(const [a,b] of shores){const v=distance(x,z,a,b);if(v<d){d=v;const l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l>.001){let nx=-(b[1]-a[1])/l,nz=(b[0]-a[0])/l;if(!surfaceAt(play,(a[0]+b[0])/2+nx*.8,(a[1]+b[1])/2+nz*.8).water){nx=-nx;nz=-nz;}best=Math.atan2(nx,nz);}}}return {distance:d,yaw:best||0};}
 for(const p of source.trees)tree(...p.point,p.id,'park',true);
 for(const [kind,step,cap] of [['park',14,150],['forest',11.5,data.completionLayer===1?800:1280],['scrub',18,140]]){const candidates=[];for(const feature of source.green.filter(f=>f.kind===kind)){
  const b=bounds(feature.rings[0]);for(let x=Math.max(minx+6,b.minx)+step*.5;x<Math.min(maxx-6,b.maxx);x+=step)for(let z=Math.max(minz+6,b.minz)+step*.5;z<Math.min(maxz-6,b.maxz);z+=step){const id=(Math.round(x*10)^Math.imul(Math.round(z*10),31)^feature.id)|0,px=x+(random(id,0)-.5)*step*.55,pz=z+(random(id,1)-.5)*step*.55;if(!insidePolygon(px,pz,feature.rings)||source.beaches.some(f=>insidePolygon(px,pz,f.rings)))continue;if(data.completionLayer!==1||shore(px,pz).distance<=350)candidates.push({x:px,z:pz,id});}
 }candidates.sort((a,b)=>random(a.id,19)-random(b.id,19)||a.x-b.x||a.z-b.z);let count=0;for(const p of candidates){if(count>=cap||plan.trees.length>=1600)break;const before=plan.trees.length;tree(p.x,p.z,p.id,kind);if(plan.trees.length>before)count++;}}
 // Source canopy classes guide authored trees; newer explicit OSM use wins.
 if(data.completionLayer===1){const candidates=[];for(let x=minx+8;x<maxx-8;x+=11.5)for(let z=minz+8;z<maxz-8;z+=11.5){
  const id=(Math.round(x*10)^Math.imul(Math.round(z*10),31))|0,px=x+(random(id,0)-.5)*5,pz=z+(random(id,1)-.5)*5,cls=cover(px,pz);
  if(![10,20].includes(cls)||source.beaches.some(f=>insidePolygon(px,pz,f.rings))||[...source.paved,...source.harbour,...source.lawns,...source.green].some(f=>insidePolygon(px,pz,f.rings)))continue;
  const d=shore(px,pz).distance;if(d<=350)candidates.push({x:px,z:pz,id,d,kind:cls===20?'scrub':'forest'});
 }candidates.sort((a,b)=>a.d-b.d||a.id-b.id);let added=0;for(const p of candidates){if(plan.trees.length>=1600)break;const n=plan.trees.length;tree(p.x,p.z,p.id,p.kind);if(plan.trees.length>n)added++;}plan.sourceCanopyTrees=added;}
 const planarBeach=(x,z)=>{const s=surfaceAt(play,x,z);for(const dx of[-3,-1.5,0,1.5,3])for(const dz of[-3,-1.5,0,1.5,3]){const q=surfaceAt(play,x+dx,z+dz),height=s.height-(s.normal[0]*dx+s.normal[2]*dz)/s.normal[1];if(q.water||Math.abs(q.height-height)>.012)return false;}return true;};
 const beachCandidates=[];for(const feature of source.beaches){const candidates=[],b=bounds(feature.rings[0]);for(let x=Math.max(minx+5,b.minx)+4;x<Math.min(maxx-5,b.maxx);x+=9)for(let z=Math.max(minz+5,b.minz)+4;z<Math.min(maxz-5,b.maxz);z+=9){if(!insidePolygon(x,z,feature.rings)||!clear(x,z,3)||surfaceAt(play,x,z).normal[1]<.94)continue;const sh=shore(x,z);if(sh.distance<9||sh.distance>48||!planarBeach(x,z))continue;const yaw=sh.yaw,c=Math.cos(yaw),s=Math.sin(yaw);if([[-3,-3],[3,-3],[-3,3],[3,3]].some(([a,b])=>!insidePolygon(x+a*c+b*s,z-a*s+b*c,feature.rings)))continue;const id=(Math.round(x)*31^Math.round(z))|0;candidates.push({x,y:surfaceAt(play,x,z).height,z,yaw,id,sourceId:feature.id});}candidates.sort((a,b)=>random(a.id,17)-random(b.id,17)||a.x-b.x||a.z-b.z);beachCandidates.push(candidates);}
 const beachLimit=data.completionLayer===1?420:72;let pending=true;while(pending&&plan.beach.length<beachLimit){pending=false;for(const list of beachCandidates){const item=list.shift();if(!item)continue;pending=true;if(plan.beach.length<beachLimit&&clear(item.x,item.z,3.5)){plan.beach.push(item);reserve(item.x,item.z,3.5);}}}
 for(const pier of data.structures.filter(p=>p.kind==='pier')){const ring=pier.rings[0];for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<25)continue;let nx=-dz/len,nz=dx/len;if(insidePolygon((a[0]+b[0])/2+nx*.8,(a[1]+b[1])/2+nz*.8,pier.rings)){nx=-nx;nz=-nz;}
  for(let d=12;d<len-8;d+=15){const id=(pier.id^Math.round(d*19)^i)|0,w=2.1+random(id,6)*.6,l=6+random(id,7)*2.4,yaw=Math.atan2(dx,dz),x=a[0]+dx*d/len+nx*(w/2+1.1),z=a[1]+dz*d/len+nz*(w/2+1.1),c=Math.cos(yaw),s=Math.sin(yaw),footprint=[[-w/2,-l/2],[w/2,-l/2],[w/2,l/2],[-w/2,l/2]].map(([a,b])=>[x+a*c+b*s,z-a*s+b*c]);
   if(plan.boats.length<28&&source.harbour.some(f=>insidePolygon(x,z,f.rings))&&footprint.every(p=>surfaceAt(play,...p).water)&&footprint.every(p=>source.harbour.some(f=>insidePolygon(...p,f.rings)))&&!play.prisms.some(p=>overlap(footprint,p.rings[0]))&&!plan.boats.some(p=>overlap(footprint,p.footprint))&&clear(x,z,w/2,{water:true,road:false,solids:false})){plan.boats.push({x,y:-t.datum,z,yaw,w,l,id,footprint});reserve(x,z,Math.hypot(w,l)/2+.4);}
   const bx=a[0]+dx*d/len-nx*.42,bz=a[1]+dz*d/len-nz*.42;if(plan.bollards.length<100&&insidePolygon(bx,bz,pier.rings))plan.bollards.push({x:bx,y:pier.base+pier.height,z:bz,yaw:0,id});
  }
 }}
 return plan;
}
