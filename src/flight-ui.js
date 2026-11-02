import {canArmInput} from './rc-input.js';
export function armPresentation({input={},state={},run=null,replay=false,countdown=false}){
 const action=(label,touchLabel,disabled=false)=>({label,touchLabel,disabled});
 if(replay)return action('Tekrarı bitir','BİTİR');
 if(countdown)return action('Başlangıç','BEKLE',true);
 if(run?.won)return action('Hangara dön','HANGAR');
 if(run?.lost)return action('Yeniden dene','TEKRAR');
 if(state.crashed)return action('Yeniden kur','RESET');
 if(state.packCutoff)return action('Pil kesildi','PİL',true);
 if(state.armed)return action('DISARM','DISARM');
 return action('ARM','ARM',!canArmInput(input));
}
export function controlPresentation(settings={},input={},state={}){
 const rc=settings.mode==='rc';
 if(!rc)return {rc:false,title:input.connected?'Gamepad bağlı':'Klavye / dokunmatik',detail:input.connected?'Seçili gamepad profili etkin.':'W/S irtifa · oklar pitch/roll · Space ARM.',tone:'ready',help:'Giriş göstergelerini burada kontrol edebilirsin.'};
 const name=(settings.deviceId||'RC kumanda').split(' (')[0].slice(0,80);
 const help='Mode 2 · sol stick gaz / yaw, sağ stick pitch / roll. Gaz doğrudan 0–100% komuttur; hover noktası ağırlığa ve pil gerilimine bağlıdır. Space ARM, R yeniden kur; ARM için gaz ≤%5.';
 if(!input.rcReady)return {rc:true,title:name+' · giriş bekleniyor',detail:settings.calibrated?'Kalibrasyon kayıtlı. USB Joystick modunu seç; sayfaya tıklayıp stick/tuş hareketi yap.':'Kontroller bölümünden cihazı seçip eksen kalibrasyonunu tamamla.',tone:'waiting',help};
 if(!state.armed&&input.throttle>.05)return {rc:true,title:name+' · bağlı',detail:'ARM için gazı %5 altına indir.',tone:'blocked',help};
 return {rc:true,title:name+' · hazır',detail:state.armed?'RC giriş etkin · Space veya DISARM ile motorları durdur.':'Gaz düşük · Space veya ARM ile motorları başlat.',tone:'ready',help};
}
export function paintInputHelp(root,input){
 const rc=input.controlMode==='rc',v=input.viz||{lx:0,ly:0,rx:0,ry:0,r2:0};
 root.getElementById('m-l').querySelector('i').style.transform=`translate(${(v.lx*18).toFixed(2)}px, ${(v.ly*18).toFixed(2)}px)`;
 root.getElementById('m-r').querySelector('i').style.transform=`translate(${(v.rx*18).toFixed(2)}px, ${(v.ry*18).toFixed(2)}px)`;
 root.getElementById('m-r2').style.width=`${((rc?input.throttle||0:v.r2)*100).toFixed(0)}%`;
 root.getElementById('help-middle-label').textContent=rc?'GAZ':'R2';
 root.getElementById('pad-stat').textContent=rc?(input.rcReady?'RC hazır':'RC giriş bekleniyor'):input.connected?'Gamepad bağlı':'Klavye / dokunmatik';
 root.getElementById('help-rc').hidden=!rc;
 for(const id of ['help-gamepad','help-touch','help-key-flight','help-key-flight-axes'])root.getElementById(id).hidden=rc;
}
