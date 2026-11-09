import {RC_KEY,RC_ROLES,normalizeRcSettings,selectRcDevice,finishRcCalibration,mapRcInput,saveRcSettings} from './rc-input.js';
import {getInputSettings,setInputSettings,readInputDevices} from './input.js';
export function bindRcSetup(root,storage) {
 const el=id=>root.querySelector('#'+id);
 let config;try{config=normalizeRcSettings(JSON.parse(storage?.getItem(RC_KEY)||'null'));}catch{config=normalizeRcSettings(null)}
 setInputSettings(config);
 let start=null,busy=false,last=0,deviceSignature='';
 const status=el('rc-status');
 function persist(){setInputSettings(config);if(!saveRcSettings(storage,config))status.textContent+=' · Tarayıcı kaydı kullanılamadı; bu oturumda geçerli.'}
 function paint(){
  el('input-mode').value=config.mode;
  for(const role of RC_ROLES){el('rc-axis-'+role).value=String(config.axes[role].index);el('rc-invert-'+role).checked=config.axes[role].invert;}
  el('rc-fields').hidden=config.mode!=='rc';
  for(const id of ['calibrate-pad','control-profile']){const field=document.getElementById(id);if(field)field.disabled=config.mode==='rc';}
  el('rc-measure').disabled=!start||busy;
 }
 function changed(invalidate=true){
  if(invalidate)config.calibrated=false;
  start=null;status.textContent=config.calibrated?'Kalibrasyon kayıtlı; yönleri canlı göstergede kontrol et.':'Eksenleri seç, sonra iki kalibrasyon adımını tamamla.';
  persist();paint();
 }
 for(const role of RC_ROLES){
  const select=el('rc-axis-'+role);
  for(let i=0;i<32;i++){const option=document.createElement('option');option.value=String(i);option.textContent='Eksen '+(i+1);select.append(option);}
  select.addEventListener('change',()=>{const index=Number(select.value),different=index!==config.axes[role].index;config.axes[role].index=index;changed(different);});
  el('rc-invert-'+role).addEventListener('change',()=>{config.axes[role].invert=el('rc-invert-'+role).checked;changed(false);});
 }
 el('input-mode').addEventListener('change',()=>{config.mode=el('input-mode').value;changed(false);});
 el('rc-device').addEventListener('change',()=>{
  const gp=el('rc-device').value===''?null:readInputDevices().find(p=>p.index===Number(el('rc-device').value));
  const deviceId=gp?.id||'',different=deviceId!==config.deviceId;
  config.deviceId=deviceId;config.deviceIndex=gp?.index||0;changed(different);
 });
 el('rc-centre').addEventListener('click',()=>{
  const gp=selectRcDevice(readInputDevicesByIndex(),config);
  if(!gp){status.textContent='Önce bağlı cihazı seç.';return;}
  start={values:Array.from(gp.axes),id:gp.id,index:gp.index};
  status.textContent='Başlangıç alındı. Aralığı ölç düğmesine basıp dört ekseni tüm uçlara götür.';paint();
 });
 el('rc-measure').addEventListener('click',async()=>{
  if(!start||busy)return;
  const initial=start,mins=[...start.values],maxs=[...start.values],began=performance.now();
  busy=true;el('rc-config').disabled=true;setInputSettings({...config,calibrated:false});
  try{
   await new Promise((resolve,reject)=>{
    const sample=now=>{
     const gp=readInputDevices().find(p=>p.id===initial.id&&p.index===initial.index);
     if(!gp){reject(new Error('Ölçüm sırasında cihaz bağlantısı kesildi; kayıt yapılmadı.'));return;}
     for(let i=0;i<gp.axes.length;i++){mins[i]=Math.min(mins[i]??gp.axes[i],gp.axes[i]);maxs[i]=Math.max(maxs[i]??gp.axes[i],gp.axes[i]);}
     status.textContent=`Tüm stick uçlarını gezdir · ${Math.max(0,Math.ceil((4000-now+began)/1000))} sn`;
     if(now-began<4000)requestAnimationFrame(sample);else resolve();
    };requestAnimationFrame(sample);
   });
   config=finishRcCalibration(config,initial.values,mins,maxs);
   status.textContent='RC kalibrasyonu kaydedildi. Gaz alt/üst ve dönüş yönlerini göstergede doğrula.';persist();
  }catch(error){status.textContent=error.message;setInputSettings(config);}
  finally{busy=false;start=null;el('rc-config').disabled=false;paint();}
 });
 function readInputDevicesByIndex(){const result=[];for(const p of readInputDevices())result[p.index]=p;return result;}
 paint();status.textContent=config.calibrated?'RC kalibrasyonu kayıtlı.':'RC için cihaz, eksen eşlemesi ve kalibrasyon gerekir.';
 return {update(now){
  if(now-last<150||root.closest('[hidden]'))return;last=now;
  const pads=readInputDevicesByIndex(),gp=selectRcDevice(pads,config);
  const signature=JSON.stringify(pads.filter(Boolean).map(p=>[p.id,p.index]));
  if(signature!==deviceSignature){
   deviceSignature=signature;const select=el('rc-device');select.replaceChildren();
   const option=document.createElement('option');option.value='';option.textContent='Cihaz seç';select.append(option);
   for(const p of pads.filter(Boolean)){const o=document.createElement('option');o.value=String(p.index);o.textContent=`${p.index+1} · ${p.id}`;select.append(o);}
  }
  el('rc-device').value=gp?String(gp.index):'';
  el('rc-connection').textContent=gp?`${gp.id} · ${gp.axes.length} eksen · ${gp.buttons.length} buton`:'Seçili cihaz bağlı değil. USB Joystick modunu seç, sayfaya tıkla ve stick/tuş hareketi yap. Tarayıcı veya işletim sistemi cihazı göstermeyebilir.';
  el('rc-raw').textContent=gp?Array.from(gp.axes,(v,i)=>`E${i+1} ${Number.isFinite(v)?v.toFixed(3):'geçersiz'}`).join(' · '):'Ham eksen verisi yok';
  const command=mapRcInput(gp,getInputSettings());
  for(const role of RC_ROLES){const value=command[role];el('rc-meter-'+role).value=role==='throttle'?value:(value+1)/2;el('rc-value-'+role).textContent=role==='throttle'?`${Math.round(value*100)}%`:value.toFixed(2);}
  el('rc-ready').textContent=command.rcReady?'RC hazır · ARM için gaz ≤%5; Space veya ekran ARM düğmesi':command.rcFault;
 }};
}
