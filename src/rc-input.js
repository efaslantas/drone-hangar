import {clamp,deadzone} from './controls.js';
export const RC_KEY='efa-hangar-rc-input-v1';
export const RC_ROLES=['roll','pitch','yaw','throttle'];
const defaults={roll:0,pitch:1,yaw:3,throttle:2};
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export function normalizeRcSettings(value) {
 const axes=Object.fromEntries(RC_ROLES.map(role=>{
  const a=value?.axes?.[role]||{};
  return [role,{index:Number.isInteger(a.index)&&a.index>=0&&a.index<32?a.index:defaults[role],min:finite(a.min)?clamp(a.min):-1,max:finite(a.max)?clamp(a.max):1,center:finite(a.center)?clamp(a.center):0,invert:a.invert===true}];
 }));
 const unique=new Set(RC_ROLES.map(r=>axes[r].index)).size===4;
 const measured=RC_ROLES.every(r=>{
  const a=value?.axes?.[r];
  return a&&Number.isInteger(a.index)&&a.index>=0&&a.index<32&&['min','max','center'].every(k=>finite(a[k])&&Math.abs(a[k])<=1)&&(r==='throttle'?a.max-a.min>=.5:a.center-a.min>=.2&&a.max-a.center>=.2);
 });
 return {mode:value?.mode==='rc'?'rc':'gamepad',deviceId:typeof value?.deviceId==='string'?value.deviceId.slice(0,300):'',deviceIndex:Number.isInteger(value?.deviceIndex)&&value.deviceIndex>=0?value.deviceIndex:0,axes,calibrated:value?.calibrated===true&&!!value?.deviceId&&unique&&measured};
}
export function selectRcDevice(pads,settings) {
 if(!settings.deviceId)return null;
 return pads[settings.deviceIndex]?.id===settings.deviceId?pads[settings.deviceIndex]:Array.from(pads).find(p=>p?.id===settings.deviceId)||null;
}
export function finishRcCalibration(settings,start,mins,maxs) {
 const next=normalizeRcSettings(settings);
 if(new Set(RC_ROLES.map(r=>next.axes[r].index)).size!==4)throw new Error('Dört farklı eksen seç.');
 for(const role of RC_ROLES) {
  const a=next.axes[role],i=a.index;
  if(![start[i],mins[i],maxs[i]].every(v=>finite(v)&&Math.abs(v)<=1))throw new Error('Eksen verisi eksik veya geçersiz.');
  Object.assign(a,{center:start[i],min:mins[i],max:maxs[i]});
  if(role==='throttle'?a.max-a.min<.5:a.center-a.min<.2||a.max-a.center<.2)throw new Error('Tüm stick uçlarını gezdir; merkezde başlayan eksenler iki yönde hareket etmeli.');
  if(role==='throttle') {
   if(Math.min(Math.abs(a.center-a.min),Math.abs(a.center-a.max))>(a.max-a.min)*.1)throw new Error('İlk adımda gaz en altta olmalı.');
   a.invert=Math.abs(a.center-a.max)<Math.abs(a.center-a.min);
  }
 }
 next.calibrated=true;
 const result=normalizeRcSettings(next);
 if(!result.calibrated)throw new Error('Cihaz seç ve kalibrasyonu tekrar tamamla.');
 return result;
}
export function mapRcInput(gp,settings) {
 const c=normalizeRcSettings(settings);
 const fail=message=>({controlMode:'rc',rcReady:false,rcFault:message,throttle:0,roll:0,pitch:0,yaw:0});
 if(!gp||gp.id!==c.deviceId)return fail('RC kumanda bağlı değil veya seçili cihaz bulunamadı.');
 if(!c.calibrated)return fail('RC eksenlerini eşle ve iki adımlı kalibrasyonu tamamla.');
 if(!RC_ROLES.every(r=>finite(gp.axes?.[c.axes[r].index])))return fail('RC eksen verisi geçersiz; bağlantıyı ve eşlemeyi kontrol et.');
 const output={controlMode:'rc',rcReady:true,rcFault:''};
 for(const role of RC_ROLES) {
  const a=c.axes[role],v=clamp(gp.axes[a.index]);
  if(role==='throttle'){const t=clamp((v-a.min)/(a.max-a.min),0,1);output.throttle=a.invert?1-t:t;}
  else {const span=v>=a.center?a.max-a.center:a.center-a.min;const t=deadzone(clamp((v-a.center)/span),.02);output[role]=a.invert?-t:t;}
 }
 return output;
}
export function canArmInput(input) {
 return input.controlMode!=='rc'||(input.rcReady===true&&Number.isFinite(input.throttle)&&input.throttle<=.05);
}
export function disarmOnInputLoss(state,input) {
 if(state&&input.controlMode==='rc'&&!input.rcReady)state.armed=false;
}
export function applyRcGroundStart(state,input,groundY) {
 if(input.controlMode==='rc')Object.assign(state,{y:groundY,grounded:true,groundedFor:1,armed:false,motor:0,throttleOut:0,altHold:null});
}
export function saveRcSettings(storage,settings) {
 try{if(!storage?.setItem)return false;storage.setItem(RC_KEY,JSON.stringify(normalizeRcSettings(settings)));return true;}catch{return false;}
}
