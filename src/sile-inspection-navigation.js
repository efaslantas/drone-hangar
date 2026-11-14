// Presentation only: never advances the session or grants observation evidence.
const position=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
export function inspectionNavigation(session,state){
 if(!session||!['ready','active','returning'].includes(session.status)||!position(state)||!['vx','vy','vz'].every(k=>Number.isFinite(state[k])))return null;
 const returning=session.status==='returning',point=returning?null:session.scenario.points.find(p=>p.id===session.activePointId);
 const goal=returning?session.scenario.spawn:point?.position;if(!position(goal))return null;
 const horizontalM=Math.hypot(goal.x-state.x,goal.z-state.z),heightDifferenceM=goal.y-state.y,distanceM=Math.hypot(horizontalM,heightDifferenceM);
 const radiusM=returning?session.scenario.limits.returnRadius:point.radius;
 return {label:returning?'Başlangıç / iniş':point.label,horizontalM,heightDifferenceM,distanceM,radiusM,inRegion:distanceM<=radiusM,speedMps:Math.hypot(state.vx,state.vy,state.vz),maxSpeedMps:returning ? .8 : point.maxSpeed,holdFraction:returning?0:Math.max(0,Math.min(1,session.hold/point.holdSeconds)),returning};
}

export function inspectionMapModel(data){
 const b=data?.terrain?.bounds;if(!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite)||b[1]<=b[0]||b[3]<=b[2])return null;
 const metresPerUnit=Math.max(b[1]-b[0],b[3]-b[2])/1000;
 const xy=(x,z)=>({x:(x-b[0])/metresPerUnit,y:(z-b[2])/metresPerUnit});
 const path=points=>Array.isArray(points)&&points.length>=2&&points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))?points.map(([x,z],i)=>{const p=xy(x,z);return `${i?'L':'M'}${+p.x.toFixed(3)},${+p.y.toFixed(3)}`;}).join(' '):null;
 const land=(data.terrain.land||[]).flatMap(rings=>{
  if(!Array.isArray(rings)||!rings.length||rings.some(r=>!Array.isArray(r)||r.length<3))return [];
  const paths=rings.map(path);return paths.every(Boolean)?[paths.map(p=>p+' Z').join(' ')]:[];
 });
 const roads=(data.roads||[]).map(r=>path(r.points)).filter(Boolean);
 return {viewBox:[0,0,(b[1]-b[0])/metresPerUnit,(b[3]-b[2])/metresPerUnit],metresPerUnit,land,roads,projectUnbounded(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.z)?xy(p.x,p.z):null;},project(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=b[0]&&p.x<=b[1]&&p.z>=b[2]&&p.z<=b[3]?xy(p.x,p.z):null;}};
}

export function createInspectionNavigation({hud,map,route},session,data){
 const doc=hud.ownerDocument,svgNs='http://www.w3.org/2000/svg';
 function el(tag,parent,className){const node=doc.createElement(tag);if(className)node.className=className;parent.append(node);return node;}
 function svg(tag,parent,attrs){const node=doc.createElementNS(svgNs,tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);parent.append(node);return node;}
 function text(node,value){if(node.textContent!==value)node.textContent=value;}
 hud.replaceChildren();map.replaceChildren();route.replaceChildren();
 const attribution=doc.getElementById('map-attribution'),win=doc.defaultView;
 // Attribution wraps and moves at responsive breakpoints. Observe its actual
 // bounds instead of duplicating a fixed height or forcing layout each frame.
 const layout=()=>{if(attribution?.getClientRects().length)hud.style.top=`${Math.max(90,attribution.getBoundingClientRect().bottom+8)}px`;};
 const observer=win?.ResizeObserver?new win.ResizeObserver(layout):null;
 if(attribution)observer?.observe(attribution);win?.addEventListener('resize',layout);layout();
 const kicker=el('small',hud),title=el('strong',hud),metrics=el('span',hud),conditions=el('span',hud),progress=el('progress',hud),hint=el('span',hud,'inspection-hint');
 progress.max=1;progress.setAttribute('aria-label','Kesintisiz gözlem ilerlemesi');
 const model=inspectionMapModel(data),markers=[],rows=[];let current=null,currentTitle=null,drawing=null;
 if(model){
  drawing=svg('svg',map,{viewBox:model.viewBox.join(' '),role:'img','aria-label':'Şile inceleme bakış noktaları ve mevcut simülasyon konumu; kuzey yukarı'});
  svg('rect',drawing,{width:model.viewBox[2],height:model.viewBox[3],fill:'#234958'});
  for(const d of model.land)svg('path',drawing,{d,fill:'#52684f','fill-rule':'evenodd'});
  for(const d of model.roads)svg('path',drawing,{d,fill:'none',stroke:'#c5d1b8','stroke-width':1,'vector-effect':'non-scaling-stroke',opacity:.5});
  svg('text',drawing,{x:25,y:60,fill:'white','font-size':42}).textContent='K ↑';
  for(const [i,p]of [...session.scenario.points,{id:'home',label:'Başlangıç / iniş',position:session.scenario.spawn}].entries()){
   const at=model.project(p.position);if(!at)continue;
   const group=svg('g',drawing,{transform:`translate(${at.x} ${at.y})`,'data-point':p.id});
   svg('circle',group,{r:24,fill:'#11252a',stroke:'#91e7d7','stroke-width':2,'vector-effect':'non-scaling-stroke'});
   svg('text',group,{'text-anchor':'middle','dominant-baseline':'central',y:p.id==='home'?-42:0,fill:'white','font-size':32}).textContent=p.id==='home'?'H':String(i+1);
   svg('title',group,{}).textContent=p.label;markers.push({id:p.id,group});
  }
  current=svg('g',drawing,{'data-current':'true'});svg('circle',current,{r:12,fill:'#ffe5a3',stroke:'#132427','stroke-width':2,'vector-effect':'non-scaling-stroke'});currentTitle=svg('title',current,{});currentTitle.textContent='Mevcut simülasyon konumun';
 }else el('p',map).textContent='Harita özeti kullanılamıyor.';
 const mapNote=el('small',map);mapNote.textContent='Kuzey yukarı · H başlangıç · sarı nokta sensin. İşaretler bakış noktalarıdır; güvenli uçuş koridoru göstermez.';
 const snapshotNote=el('small',map);snapshotNote.hidden=true;snapshotNote.textContent='TEKRAR · Bölge listesi kayıt sonundaki durumu gösterir.';
 for(const [i,p]of session.scenario.points.entries()){const row=el('li',route),label=el('span',row),status=el('b',row);label.textContent=`${i+1}. ${p.label}`;rows.push({id:p.id,status});}
 return {
  paint(state,{replaying=false}={}){
   const count=session.observations.length,n=inspectionNavigation(session,state);
   const phase={ready:'Hazır · ARM ile kayıt',active:'Kayıt sürüyor',returning:'Dönüş / iniş',completed:'Tamamlandı',stopped:'Durduruldu',failed:'Başarısız'}[session.status]||'Durum bilinmiyor';
   text(kicker,replaying?'YEREL POZ TEKRARI · canlı kayıt değil':`İLKE · ŞİLE · ${count}/${session.scenario.points.length} · ${phase}`);
   const terminal=['completed','stopped','failed'].includes(session.status);
   text(title,replaying?'Kaydedilmiş uçuş pozları':n?.label||(terminal?'İnceleme kaydı kapalı':'Konum bilgisi kullanılamıyor'));
   metrics.hidden=conditions.hidden=progress.hidden=replaying||!n;
   if(n&&!replaying){
    const dy=n.heightDifferenceM,vertical=Math.abs(dy)<.5?'Aynı kot':`${dy>0?'↑':'↓'} ${Math.abs(dy).toFixed(0)} m kot farkı`;
    text(metrics,`Yatay ${n.horizontalM.toFixed(0)} m · ${vertical}`);
    text(conditions,n.returning?`Başlangıca ${n.distanceM.toFixed(1)} m · yumuşak iniş + DISARM`:`Bölge ${n.inRegion?'içinde':'dışında'} · ${n.distanceM.toFixed(0)} / ${n.radiusM} m · hız ${n.speedMps.toFixed(1)} / ${n.maxSpeedMps} m/s`);
    progress.hidden=n.returning;progress.value=n.holdFraction;
   }
   text(hint,replaying?'Fizik yeniden çözülmez; bitince duraklatılmış uçuşuna dönersin.':terminal?'Rapor ve yerel poz tekrarı uçuş menüsünde.':`${session.hint||phase}${n&&!n.returning?' · Kamera 0° / FPV ±15° / açık görüş / 3 sn':''}`);
   for(const {id,status}of rows){const done=session.observations.some(o=>o.pointId===id),active=!!n&&session.activePointId===id;status.dataset.state=done?'done':active?'active':'pending';text(status,done?'Gözlendi':active?'Sıradaki':'Bekliyor');}
   for(const {id,group}of markers){const done=session.observations.some(o=>o.pointId===id),active=!!n&&(n.returning?id==='home':id===session.activePointId);group.setAttribute('opacity',done?'0.45':'1');group.querySelector('circle').setAttribute('stroke',active?'#ffe5a3':'#91e7d7');}
   snapshotNote.hidden=!replaying;route.setAttribute('aria-label',replaying?'Kayıt sonundaki inceleme bölgeleri':'İnceleme bölgeleri');
   if(current){
    const p=model.project(state);current.style.display=p?'':'none';if(p)current.setAttribute('transform',`translate(${p.x} ${p.y})`);
    text(currentTitle,replaying?'Tekrardaki kaydedilmiş poz':'Mevcut simülasyon konumun');
    drawing.setAttribute('aria-label',replaying?'Şile inceleme bakış noktaları ve tekrardaki kaydedilmiş poz; kuzey yukarı':'Şile inceleme bakış noktaları ve mevcut simülasyon konumu; kuzey yukarı');
    const label=replaying?'TEKRAR · sarı nokta kayıtlı poz':'sarı nokta sensin';
    text(mapNote,p?`Kuzey yukarı · H başlangıç · ${label}. İşaretler bakış noktalarıdır; güvenli uçuş koridoru göstermez.`:`${replaying?'Kayıtlı':'Mevcut'} konum harita dışında veya kullanılamıyor. İşaretler güvenli uçuş koridoru göstermez.`);
   }
  },
  dispose(){observer?.disconnect();win?.removeEventListener('resize',layout);hud.style.removeProperty('top');hud.replaceChildren();map.replaceChildren();route.replaceChildren();},
 };
}
