import {caveClearance} from './sea-cave-volume.js';
import {surfaceAt} from './geo-terrain.js';
import {airframeAppearance} from './airframe-appearance.js';

// Visual follow framing only. FPV origin/tilt/FOV and flight state are untouched.
export function chaseFraming(spec,aspect=16/9){
 const v=airframeAppearance(spec),span=v.wheelbase/Math.SQRT2+v.propDiameter;
 const safeAspect=Number.isFinite(aspect)&&aspect>0?aspect:16/9;
 const halfAngle=Math.atan(Math.tan(82*Math.PI/360)*Math.min(1,safeAspect));
 const distance=Math.max(.25,span/(2*Math.tan(halfAngle)*.28)),back=distance/Math.hypot(1,.38);
 return {span,back,height:back*.38};
}

export function chaseOffset(framing,forward,previousHeading={x:0,z:-1}){
 const length=Math.hypot(forward?.[0],forward?.[2]);let x,z;
 if(Number.isFinite(length)&&length>.001){x=forward[0]/length;z=forward[2]/length;}
 else{const previous=Math.hypot(previousHeading.x,previousHeading.z);x=previous>0&&Number.isFinite(previous)?previousHeading.x/previous:0;z=previous>0&&Number.isFinite(previous)?previousHeading.z/previous:-1;}
 return {x:-x*framing.back,y:framing.height,z:-z*framing.back,heading:{x,z}};
}

export function fpvNearPlane(clearance,terrain=false){
 const safe=Number.isFinite(clearance)?Math.max(0,clearance):1;
 return Math.max(.003,Math.min(terrain?.1:.04,safe*.12));
}
export function cameraClearance(play,point){
 let nearest=Math.max(0,point.y-surfaceAt(play,point.x,point.z,point.y).height);
 for(const c of play.terrain?.seaCaves||[])nearest=Math.min(nearest,caveClearance(c,point.x,point.y,point.z));
 const boxDistance=(minx,maxx,miny,maxy,minz,maxz)=>{
  const x=Math.max(minx-point.x,0,point.x-maxx),y=Math.max(miny-point.y,0,point.y-maxy),z=Math.max(minz-point.z,0,point.z-maxz);
  if(x<1&&y<1&&z<1)nearest=Math.min(nearest,Math.hypot(x,y,z));
 };
 for(const b of play.boxes||[])boxDistance(b.minx,b.maxx,b.miny,b.maxy,b.minz,b.maxz);
 for(const p of play.prisms||[]){const [minx,maxx,minz,maxz]=p.bounds;boxDistance(minx,maxx,p.miny,p.maxy,minz,maxz);}
 return nearest;
}
