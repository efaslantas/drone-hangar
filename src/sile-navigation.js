import {insidePolygon,unprojectCoordinate} from './geo-terrain.js';
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const closest=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],s=dx*dx+dz*dz,t=s?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/s)):0,point=[a[0]+t*dx,a[1]+t*dz];return {point,distanceM:Math.hypot(x-point[0],z-point[1])};};
export function headingDegrees(q){
 if(!q||!['qw','qx','qy','qz'].every(k=>Number.isFinite(q[k])))return null;
 const length=Math.hypot(q.qw,q.qx,q.qy,q.qz);if(length<1e-9)return null;
 const [w,x,y,z]=[q.qw,q.qx,q.qy,q.qz].map(v=>v/length),fx=-2*(x*z+w*y),fz=-(1-2*(x*x+y*y));if(Math.hypot(fx,fz)<1e-6)return null;
 return (Math.atan2(fx,-fz)*180/Math.PI+360)%360;
}
export function createNavigationModel(data,navigation){
 const bounds=data?.terrain?.bounds,p=data?.projection;
 if(!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite)||bounds[0]>=bounds[1]||bounds[2]>=bounds[3]||!p||!navigation||!['lat','lon','metresLat','metresLon','offsetX','offsetZ'].every(k=>Number.isFinite(p[k])&&p[k]===navigation.projection?.[k])||p.metresLat<=0||p.metresLon<=0)return null;
 const grid=new Map(),overflow=[],size=96;
 for(const road of data.roads||[]){if(!Array.isArray(road.points)||!Number.isFinite(road.width)||road.width<=0)continue;for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i];if(![a,b].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))continue;const s={a,b,road};const loX=Math.floor(Math.min(a[0],b[0])/size),hiX=Math.floor(Math.max(a[0],b[0])/size),loZ=Math.floor(Math.min(a[1],b[1])/size),hiZ=Math.floor(Math.max(a[1],b[1])/size);
  if((hiX-loX+1)*(hiZ-loZ+1)>256){overflow.push(s);continue;}for(let x=loX;x<=hiX;x++)for(let z=loZ;z<=hiZ;z++){const key=x+':'+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(s);}
 }}
 function nearbyRoads(x,z,radius=150){
  if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(radius)||radius<=0||radius>5000)return [];
  const candidates=new Set(overflow),found=new Map();for(let a=Math.floor((x-radius)/size);a<=Math.floor((x+radius)/size);a++)for(let b=Math.floor((z-radius)/size);b<=Math.floor((z+radius)/size);b++)for(const s of grid.get(a+':'+b)||[])candidates.add(s);
  for(const {a,b,road}of candidates){const at=closest(x,z,a,b);if(at.distanceM>radius)continue;const prior=found.get(road.id);if(!prior||at.distanceM<prior.distanceM)found.set(road.id,{...at,id:road.id,name:road.name||null,width:road.width});}
  return [...found.values()].sort((a,b)=>a.distanceM-b.distanceM||String(a.id).localeCompare(String(b.id)));
 }
 return {bounds,nearbyRoads,locate(state){
  if(!finitePoint(state)||state.x<bounds[0]||state.x>bounds[1]||state.z<bounds[2]||state.z>bounds[3])return {available:false,neighbourhood:null,road:null,landmark:null,label:'Şile harita sınırı dışında veya konum kullanılamıyor'};
  const {x,z}=state,onLand=(data.terrain.land||[]).some(r=>insidePolygon(x,z,r)),neighbourhood=navigation.neighbourhoods?.find(n=>n.polygons.some(r=>insidePolygon(x,z,r)))?.name||null,roads=nearbyRoads(x,z),closest=roads[0],named=roads.find(r=>r.name);
  let road=null;if(closest&&closest.distanceM<=closest.width/2+3)road={...closest,kind:closest.name?'on-road':'unnamed'};else if(named)road={...named,kind:'nearby'};
  const landmark=(navigation.landmarks||[]).map(p=>({...p,distanceM:Math.hypot(x-p.point[0],z-p.point[1])})).filter(p=>p.distanceM<=1800).sort((a,b)=>a.distanceM-b.distanceM)[0]||null;
  return {available:true,neighbourhood,onLand,road,landmark,coordinate:unprojectCoordinate(p,x,z),label:onLand?(neighbourhood||'Mahalle bilgisi bulunmuyor'):(neighbourhood?neighbourhood.replace(/ Mahallesi$/,'')+' kıyısı · deniz':'Karadeniz')};
 }};
}
// Screen-pixel layout: bound and separate labels before converting back to map units.
export function placeLabels(candidates,{width,height,max=8,measureText=s=>s.length*6.4}={}){
 const placed=[];if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return placed;
 for(const c of candidates){if(placed.length>=max)break;if(!Number.isFinite(c.x)||!Number.isFinite(c.y)||c.x<0||c.y<0||c.x>width||c.y>height||typeof c.name!=='string'||!c.name)continue;let displayName=c.name;while(displayName.length>1&&measureText(displayName)+(displayName===c.name?0:measureText('…'))+10>width-8)displayName=displayName.slice(0,-1);if(displayName!==c.name)displayName+='…';const w=Math.max(24,measureText(displayName)+10),h=18;
  for(const [dx,dy]of [[8,-21],[8,5],[-w-8,-21],[-w-8,5]]){const box={x:Math.max(4,Math.min(width-w-4,c.x+dx)),y:c.y+dy,width:w,height:h};if(box.x<4||box.y<4||box.x+w>width-4||box.y+h>height-4||placed.some(p=>box.x<p.box.x+p.box.width+3&&box.x+w+3>p.box.x&&box.y<p.box.y+p.box.height+3&&box.y+h+3>p.box.y))continue;placed.push({...c,displayName,box});break;}
 }return placed;
}

export function navigationPlacement({width,height,motor=null,attributionBottom=0,statusBottom=0}={}){
 if(width>900&&height>500){const bottom=motor?height-motor.top+10:82,topLimit=Math.max(20,statusBottom)+8;return {top:null,bottom,maxHeight:Math.max(72,height-bottom-topLimit)};}
 if(height<=500&&width>height){const bottom=68,topLimit=Math.max(80,attributionBottom+8,motor?motor.bottom+8:0);return {top:null,bottom,maxHeight:Math.max(54,height-bottom-topLimit)};}
 const top=Math.max(165,attributionBottom+8),limit=Math.min(height-top-220,motor&&motor.top>top?motor.top-top-8:Infinity);return {top,bottom:null,maxHeight:Math.max(72,limit)};
}
