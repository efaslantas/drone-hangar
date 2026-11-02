export const VISUAL_KEY='efa-hangar-visual-v2';
const defaults={quality:'medium',renderScale:1,shadows:'auto',detail:'auto',fov:110,tilt:25,lens:0,vibration:false,hud:'minimal'};
const profiles={
  low:{ratio:1,shadowSize:512,shadows:false,detailCount:120,samples:0},
  medium:{ratio:1.25,shadowSize:1024,shadows:true,detailCount:320,samples:2},
  high:{ratio:1.75,shadowSize:2048,shadows:true,detailCount:560,samples:4},
};
const member=(v,choices,fallback)=>choices.includes(v)?v:fallback;
const bounded=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
export function normalizeVisualSettings(value){
  const v=value&&typeof value==='object'?value:{};
  return {
    quality:member(v.quality,Object.keys(profiles),defaults.quality),
    renderScale:bounded(v.renderScale??1,.5,1.5,1),
    shadows:member(v.shadows,['auto','off'],defaults.shadows),
    detail:member(v.detail,['auto','low','medium','high'],defaults.detail),
    fov:bounded(v.fov??110,80,140,110),tilt:bounded(v.tilt??25,0,60,25),
    lens:member(Number(v.lens??0),[0,.65,1],0),vibration:v.vibration===true,
    hud:member(v.hud,['minimal','full','off'],defaults.hud),
  };
}
export function readVisualSettings(storage){
  try{return normalizeVisualSettings(JSON.parse(storage.getItem(VISUAL_KEY)||'null'));}catch{return normalizeVisualSettings(null);}
}
export function visualProfile(settings,deviceRatio=1){
  const p=profiles[settings.quality]||profiles.medium;
  return {...p,pixelRatio:Math.min(Math.max(1,deviceRatio),p.ratio)*settings.renderScale,
    shadows:settings.shadows!=='off'&&p.shadows,
    detailCount:settings.detail==='auto'?p.detailCount:profiles[settings.detail].detailCount};
}
export function verticalFov(horizontal,aspect){
  return 2*Math.atan(Math.tan(horizontal*Math.PI/360)/Math.max(.1,aspect))*180/Math.PI;
}
export function lensIntensity(settings,chase=false){return settings.lens*(chase?.35:1);}

const detailBatches=new Set(['airfield-edge-grass','ground-vegetation','loose-ground-debris','ground-weathering','ground-dampness','shore-foam']);
export function applySceneDetail(scene, detailCount) {
  scene.traverse(object=>{
    if(!detailBatches.has(object.name)||!Number.isFinite(object.count)) return;
    object.userData.detailCapacity ??= object.count;
    object.count=Math.max(1,Math.round(object.userData.detailCapacity*Math.min(1,detailCount/560)));
  });
}
