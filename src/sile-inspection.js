import {surfaceAt,unprojectCoordinate} from './geo-terrain.js';

export const SILE_INSPECTION=Object.freeze({id:'sile-inspection',kind:'free',inspection:true,map:'sile',lockMap:true,lockDrone:false,optional:true,ranked:false,startGrounded:true,real:true,drain:1,name:'İLKE · Şile inceleme',blurb:'Şile’de üç sivil bölgeyi elle gözlemle, başlangıca dön ve yumuşak iniş yap. Yerel simülasyon kaydı.'});
const SCHEMA='ilke.sile.inspection.v1',KEY='efa-hangar-sile-inspection-v1';
const CAPS=Object.freeze({samples:6100,events:256,images:3,imageCharacters:180000,reportBytes:2500000,sampleHz:5});
const terminal=s=>['completed','stopped','failed'].includes(s.status);
const finite=Number.isFinite;
const vec=p=>p&&['x','y','z'].every(k=>finite(p[k]));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const clone=value=>JSON.parse(JSON.stringify(value,(_key,v)=>typeof v==='number'&&!finite(v)?null:v));
const byteLength=s=>new TextEncoder().encode(s).length;
const inside=(t,x,z)=>t?.bounds?.length===4&&x>=t.bounds[0]&&x<=t.bounds[1]&&z>=t.bounds[2]&&z<=t.bounds[3];
function height(t,x,z){try {const h=surfaceAt({terrain:t},x,z).height;return finite(h)?h:null;}catch{return null;}}
function event(s,type,details={}){if(s.events.length<CAPS.events)s.events.push({t:s.t,type,...details});else{s.truncated=true;if(['completed','stopped','failed'].includes(type))s.events[s.events.length-1]={t:s.t,type,...details};}}
function finish(s,status,reason){if(!terminal(s)){s.status=status;s.reason=reason;s.hold=0;event(s,status,{reason});}return s;}
function validProjection(p){return p&&['lat','lon','metresLat','metresLon','offsetX','offsetZ'].every(k=>finite(p[k]))&&p.metresLat>0&&p.metresLon>0;}

export function createInspectionScenario(data,play){
 const terrain=play?.terrain;
 if(data?.id!=='sile'||!validProjection(data.projection)||!terrain||!Array.isArray(terrain.bounds))throw new Error('Şile inceleme kaynağı eksik.');
 const definitions=[['castle','Şile Kalesi',data.buildings?.find(b=>b.landmark==='castle'),[0,38]],['coastal-facade','Kıyı cephe bölgesi',data.buildings?.find(b=>String(b.id)==='550116788'),[0,-30]],['harbour','Liman bölgesi',data.structures?.find(b=>String(b.id)==='1485112037'),[-32,0]]];
 const points=definitions.map(([id,label,item,offset])=>{
  const ring=item?.rings?.[0];if(!ring?.length||!ring.every(p=>p.length===2&&p.every(finite))||!finite(item.base)||!finite(item.height))throw new Error('Şile gözlem bölgesi eksik.');
  const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2;
  const position={x:x+offset[0],y:0,z:z+offset[1]},ground=height(terrain,position.x,position.z),regionGround=height(terrain,x,z);
  if(ground===null||regionGround===null||!inside(terrain,position.x,position.z))throw new Error('Şile gözlem zemini geçersiz.');
  // Region centers are authored area references, never detected defects. Final
  // terrain includes castle platforms/building pads; the camera is level.
  const eye=Math.max(item.base+item.height+4,regionGround+item.height+4,ground+4);
  position.y=eye;
  return {id,label,sourceId:item.id,target:{x,y:eye,z},position,radius:12,holdSeconds:3,maxSpeed:3};
 });
 const rawSpawn=play.spawn||data.spawn||{x:0,z:0},spawn={x:rawSpawn.x,z:rawSpawn.z,y:rawSpawn.y??height(terrain,rawSpawn.x,rawSpawn.z)};
 if(!vec(spawn)||!inside(terrain,spawn.x,spawn.z))throw new Error('Şile başlangıcı geçersiz.');
 return {id:'sile-inspection',version:1,points,spawn,projection:clone(data.projection),terrain,limits:{maxSeconds:1200,maxAgl:80,returnRadius:8},source:{id:'sile',version:data.version,snapshot:'public/maps/sile/map.json',provenance:'public/maps/sile/provenance.json',projection:clone(data.projection),regions:points.map(p=>({id:p.id,sourceId:p.sourceId})),regionMeaning:'Authored area reference centers; no detected defects.'}};
}

export function createInspection(scenario,meta={}){
 if(!scenario||!Array.isArray(scenario.points)||scenario.points.length!==3||!scenario.points.every(p=>typeof p.id==='string'&&vec(p.position)&&vec(p.target)&&p.radius>0&&p.holdSeconds>0&&p.maxSpeed>0)||new Set(scenario.points.map(p=>p.id)).size!==3||!vec(scenario.spawn)||!validProjection(scenario.projection)||!scenario.terrain||!scenario.limits||!['maxSeconds','maxAgl','returnRadius'].every(k=>finite(scenario.limits[k])&&scenario.limits[k]>0))throw new Error('İnceleme senaryosu geçersiz.');
 let safeMeta;try{safeMeta=clone(meta||{});}catch{safeMeta={unavailable:'Metadata is not JSON serializable.'};}
 const metadataTruncated=byteLength(JSON.stringify(safeMeta))>64000;
 if(metadataTruncated)safeMeta={createdAt:typeof meta.createdAt==='string'?meta.createdAt.slice(0,100):null,appVersion:typeof meta.appVersion==='string'?meta.appVersion.slice(0,100):null,unavailable:'Metadata exceeded 64kB.'};
 return {scenario,meta:safeMeta,status:'ready',reason:'',t:0,hold:0,activePointId:scenario.points[0].id,observations:[],samples:[],events:[],hint:'Kaydı başlatmak için ARM.',distanceM:0,maxSpeed:0,truncated:metadataTruncated,lastSampleT:null,lastPosition:null};
}

export function selectInspectionPoint(s,id){
 if(!s||terminal(s)||!['ready','active'].includes(s.status)||!s.scenario.points.some(p=>p.id===id)||s.observations.some(o=>o.pointId===id))return false;
 s.activePointId=id;s.hold=0;event(s,'select',{pointId:id});return true;
}
export function stopInspection(s,reason='operator'){if(!s||terminal(s))return s;return finish(s,'stopped',typeof reason==='string'?reason.slice(0,200):'operator');}

function validState(st){return st&&['x','y','z','vx','vy','vz','qw','qx','qy','qz','battery'].every(k=>finite(st[k]))&&Math.hypot(st.qw,st.qx,st.qy,st.qz)>.000001&&st.battery>=0&&st.battery<=1&&typeof st.armed==='boolean'&&typeof st.grounded==='boolean'&&typeof st.crashed==='boolean';}
function recordedInput(input){
 if(!input||!['roll','pitch','yaw'].every(k=>finite(input[k])&&Math.abs(input[k])<=1))return null;
 const controlMode=input.controlMode===undefined&&Object.hasOwn(input,'throttle')?'rc':input.controlMode;
 const axes={roll:input.roll,pitch:input.pitch,yaw:input.yaw};
 if(controlMode==='rc'&&finite(input.throttle)&&input.throttle>=0&&input.throttle<=1)return {controlMode,throttle:input.throttle,...axes};
 if(controlMode==='gamepad'&&finite(input.lift)&&Math.abs(input.lift)<=1&&finite(input.r2)&&input.r2>=0&&input.r2<=1)return {controlMode,lift:input.lift,r2:input.r2,...axes};
 return null;
}
function sample(s,st,agl,context){
 if(s.lastSampleT!==null&&s.t-s.lastSampleT<.2-1e-9)return;
 s.lastSampleT=s.t;
 if(s.samples.length>=CAPS.samples){s.truncated=true;return;}
 const input=recordedInput(context.input);
 const flightMode=typeof context.flightMode==='string'&&context.flightMode.length<=32?context.flightMode:null;
 const [lon,lat]=unprojectCoordinate(s.scenario.projection,st.x,st.z);
 s.samples.push({t:s.t,input,flightMode,...Object.fromEntries(['x','y','z','vx','vy','vz','qw','qx','qy','qz','battery'].map(k=>[k,st[k]])),agl,packVoltageV:finite(st.packVoltageV)?st.packVoltageV:null,lon,lat,armed:st.armed,grounded:st.grounded});
}
function cameraGood(p,sensor,st){
 if(!sensor||sensor.fpv!==true||sensor.visible!==true||!vec(sensor.position)||!vec(sensor.forward)||distance(st,p.position)>p.radius)return false;
 const dx=p.target.x-sensor.position.x,dy=p.target.y-sensor.position.y,dz=p.target.z-sensor.position.z,length=Math.hypot(dx,dy,dz),f=Math.hypot(sensor.forward.x,sensor.forward.y,sensor.forward.z);
 return length>1e-6&&f>1e-6&&(dx*sensor.forward.x+dy*sensor.forward.y+dz*sensor.forward.z)/(length*f)>=Math.cos(Math.PI/12);
}
export function tickInspection(s,context={}){
 if(!s||terminal(s))return s;
 const {state:st,dt,sensor}=context||{};
 if(dt===0)return s;
 if(!finite(dt)||dt<0){s.hold=0;return s;}
 if(s.status==='ready'){
  if(st?.armed!==true)return s;
  s.status='active';s.hint='Gözlem noktasına uç.';event(s,'armed');
 }
 s.t+=dt;
 if(dt>.25)event(s,'gap',{duration:dt});
 if(s.t>=s.scenario.limits.maxSeconds)return finish(s,'failed','timeout');
 if(st?.crashed===true)return finish(s,'failed','crash');
 if(finite(st?.battery)&&st.battery<=0)return finish(s,'failed','battery');
 if(!validState(st)){s.hold=0;s.lastPosition=null;s.hint='Geçersiz durum: gözlem bekliyor.';return s.t>=s.scenario.limits.maxSeconds?finish(s,'failed','timeout'):s;}
 if(!inside(s.scenario.terrain,st.x,st.z))return finish(s,'failed','bounds');
 const ground=height(s.scenario.terrain,st.x,st.z);
 if(ground===null){s.hold=0;s.lastPosition=null;s.hint='Zemin verisi yok.';return s;}
 const agl=st.y-ground,speed=Math.hypot(st.vx,st.vy,st.vz);
 if(agl>s.scenario.limits.maxAgl)return finish(s,'failed','ceiling');
 if(s.t>=s.scenario.limits.maxSeconds)return finish(s,'failed','timeout');
 if(s.lastPosition)s.distanceM+=distance(st,s.lastPosition);
 s.lastPosition={x:st.x,y:st.y,z:st.z};s.maxSpeed=Math.max(s.maxSpeed,speed);sample(s,st,agl,context);
 if(s.status==='returning'){
  s.hold=0;s.hint='Başlangıca dön, yumuşak iniş ve DISARM.';
  const td=st.lastTouchdown,soft=td==null||(finite(td.verticalSpeed)&&finite(td.horizontalSpeed)&&td.verticalSpeed<=2&&td.verticalSpeed>=0&&td.horizontalSpeed<=2&&td.horizontalSpeed>=0);
  if(st.grounded===true&&st.armed===false&&speed<.8&&distance(st,s.scenario.spawn)<=s.scenario.limits.returnRadius&&soft)finish(s,'completed','returned');
  return s;
 }
 const p=s.scenario.points.find(p=>p.id===s.activePointId);
 if(dt>.25||st.grounded||!st.armed||!p||speed>p.maxSpeed||!cameraGood(p,sensor,st)){s.hold=0;s.hint='FPV, açık görüş, düşük hız ve bölgeye bakış gerekli.';return s;}
 s.hold+=dt;s.hint='Gözlem sürüyor.';
 if(s.hold+1e-9>=p.holdSeconds){
  s.observations.push({pointId:p.id,label:p.label,t:s.t,position:{x:st.x,y:st.y,z:st.z},target:{...p.target},image:null,imageStatus:'unavailable'});
  event(s,'observation',{pointId:p.id});s.hold=0;
  const next=s.scenario.points.find(p=>!s.observations.some(o=>o.pointId===p.id));
  if(next)s.activePointId=next.id;else{s.activePointId=null;s.status='returning';event(s,'returning');}
 }
 return s;
}

function validImage(value){
 if(typeof value!=='string'||value.length>CAPS.imageCharacters||!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value))return false;
 const body=value.slice(23);if(body.length%4!==0)return false;
 // Validate JPEG SOI/EOI bytes without browser APIs or decoding the full image.
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',tail=body.slice(-4),bits=(alphabet.indexOf(tail[0])<<18)|(alphabet.indexOf(tail[1])<<12)|((alphabet.indexOf(tail[2])&63)<<6)|(alphabet.indexOf(tail[3])&63);
 const bytes=[bits>>>16&255,bits>>>8&255,bits&255];
 const padding=tail.endsWith('==')?2:tail.endsWith('=')?1:0;
 const end=bytes.slice(0,3-padding);
 if(end.length===1){const prev=body.slice(-8,-4),n=(alphabet.indexOf(prev[0])<<18)|(alphabet.indexOf(prev[1])<<12)|(alphabet.indexOf(prev[2])<<6)|alphabet.indexOf(prev[3]);end.unshift(n&255);}
 return end[end.length-2]===255&&end[end.length-1]===217;
}
export function attachInspectionImage(s,pointId,dataURL){
 const o=s?.observations?.find(o=>o.pointId===pointId);if(!o||!validImage(dataURL))return false;
 o.image=dataURL;o.imageStatus='captured';return true;
}
export function inspectionTrace(s){
 const data=[];let previous=-Infinity;
 for(const p of s?.samples||[])if(['t','x','y','z','qw','qx','qy','qz'].every(k=>finite(p[k]))&&p.t>previous&&Math.hypot(p.qw,p.qx,p.qy,p.qz)>1e-6){data.push(p.t,p.x,p.y,p.z,p.qw,p.qx,p.qy,p.qz);previous=p.t;}
 return {data,next:0,truncated:!!s?.truncated};
}
export function inspectionReport(s){
 const {scenario:c}=s;
 const report=clone({schema:SCHEMA,meta:s.meta,status:s.status,reason:s.reason,criteria:{holdSeconds:3,radiusM:12,maxSpeedMps:3,maxAngleDegrees:15,fpv:true,unobstructedGeometry:true,cameraMountDegrees:0,returnRadiusM:c.limits.returnRadius,landingSpeedMps:.8,softTouchdownMps:2,authoredDemoRules:true},source:c.source,route:{id:c.id,version:c.version,spawn:c.spawn,projection:c.projection,points:c.points},summary:{observed:s.observations.length,total:c.points.length,elapsedSeconds:s.t,distanceM:s.distanceM,maxSpeed:s.maxSpeed,sampleCount:s.samples.length,truncated:s.truncated},telemetry:s.samples,observations:s.observations,events:s.events,limits:{...c.limits,...CAPS},evidence:{kind:'local-simulation',realVehicleModel:'unknown',measurements:'Actual recorded simulation states; no interpolated measurements.',images:'320×180 simulated camera JPEG; unavailable unless capture succeeds.',projection:'Approximate source-projection WGS84; not surveyed GNSS.',scope:'Manual civilian inspection exercise. No defect detection, real hardware validation or sensor accuracy claim.',replay:'Recorded poses, not a live physics rerun.'}});
 if(byteLength(JSON.stringify(report))>CAPS.reportBytes){
  report.summary.truncated=true;report.summary.recordedSampleCount=report.telemetry.length;
  const samples=report.telemetry;let lo=0,hi=samples.length;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);report.telemetry=samples.slice(0,mid);report.summary.sampleCount=mid;if(byteLength(JSON.stringify(report))<=CAPS.reportBytes)lo=mid;else hi=mid-1;}
  report.telemetry=samples.slice(0,lo);report.summary.sampleCount=lo;
 }
 return report;
}
function validReport(r){
 if(!r||r.schema!==SCHEMA||!['ready','active','returning','completed','stopped','failed'].includes(r.status)||typeof r.reason!=='string'||!r.meta||typeof r.meta!=='object'||!r.summary||!finite(r.summary.elapsedSeconds)||!r.criteria||!r.source||!r.evidence)return false;
 const points=r.route?.points;
 if(!Array.isArray(points)||points.length!==3||!points.every(p=>p&&typeof p.id==='string'&&vec(p.position)&&vec(p.target))||new Set(points.map(p=>p.id)).size!==3)return false;
 if(!Array.isArray(r.telemetry)||r.telemetry.length>CAPS.samples||!r.telemetry.every(p=>p&&['t','x','y','z','qw','qx','qy','qz','vx','vy','vz','agl','battery'].every(k=>finite(p[k]))&&p.battery>=0&&p.battery<=1))return false;
 if(!Array.isArray(r.events)||r.events.length>CAPS.events||!r.events.every(e=>e&&finite(e.t)&&typeof e.type==='string'))return false;
 if(!Array.isArray(r.observations)||r.observations.length>3||!r.observations.every(o=>o&&points.some(p=>p.id===o.pointId)&&vec(o.position)&&vec(o.target)&&finite(o.t)&&(o.image==null||validImage(o.image)))||new Set(r.observations.map(o=>o.pointId)).size!==r.observations.length)return false;
 return r.summary.observed===r.observations.length&&r.summary.total===3&&r.summary.sampleCount===r.telemetry.length;
}
export function saveInspectionReport(report,storage){try {const value=JSON.stringify(report);if(byteLength(value)>CAPS.reportBytes||!validReport(JSON.parse(value)))return false;storage.setItem(KEY,value);return true;}catch{return false;}}
export function readInspectionReport(storage){try {const value=storage.getItem(KEY);if(typeof value!=='string'||byteLength(value)>CAPS.reportBytes)return null;const r=JSON.parse(value);return validReport(r)?r:null;}catch{return null;}}
