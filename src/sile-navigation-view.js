import {inspectionMapModel} from './sile-inspection-navigation.js';
import {createNavigationModel,headingDegrees,placeLabels,navigationPlacement} from './sile-navigation.js';
// Read-only cartography. No geolocation, telemetry storage or flight commands.
export function createSileNavigation({hud,overview},data,navigation){
 const doc=hud.ownerDocument,ns='http://www.w3.org/2000/svg',query=createNavigationModel(data,navigation),model=inspectionMapModel(data),views=[];
 function el(tag,parent,text){const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;parent.append(node);return node;}
 function svg(tag,parent,attrs,text){const node=doc.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,String(v));if(text!==undefined)node.textContent=text;parent.append(node);return node;}
 function set(node,text){if(node.textContent!==text)node.textContent=text;}
 hud.replaceChildren();overview.replaceChildren();hud.hidden=overview.hidden=!query||!model;
 if(!query||!model)return {paint(){},dispose(){hud.hidden=overview.hidden=true;hud.replaceChildren();overview.replaceChildren();}};
 const summary=el('summary',hud),location=el('strong',summary,'Şile'),street=el('span',summary,'Konum hazırlanıyor'),hint=el('small',summary,'Haritayı aç / kapat');hint.className='sile-map-toggle';
 hud.open=(doc.defaultView?.innerWidth??1440)>=900&&(doc.defaultView?.innerHeight??1000)>=800;
 el('h3',overview,'Şile · mahalleler ve sokaklar');const overviewLocation=el('p',overview);
 const path=points=>points.map(([x,z],i)=>{const p=model.projectUnbounded({x,z});return `${i?'L':'M'}${p.x},${p.y}`;}).join(' ');
 function makeMap(parent,mini){
  const drawing=svg('svg',parent,{viewBox:model.viewBox.join(' '),role:'img','aria-label':mini?'Şile yakın çevre haritası; kuzey yukarı':'Şile genel haritası, mahalleler, sokaklar ve simülasyon konumun; kuzey yukarı'});
  svg('rect',drawing,{x:-10000,y:-10000,width:20000,height:20000,fill:'#193b49'});
  for(const d of model.land)svg('path',drawing,{d,fill:'#435b46','fill-rule':'evenodd'});
  for(const n of navigation.neighbourhoods)for(const rings of n.polygons)svg('path',drawing,{d:rings.map(r=>path(r)+' Z').join(' '),fill:'none',stroke:'#8ac8b5','stroke-width':1,'stroke-dasharray':'5 5','vector-effect':'non-scaling-stroke',opacity:.6});
  for(const [i,d]of model.roads.entries()){const line=svg('path',drawing,{d,fill:'none',stroke:'#bbc5ad','stroke-width':mini?1.5:1,'vector-effect':'non-scaling-stroke',opacity:.7});svg('title',line,{},data.roads[i]?.name||'Kaynakta adı bulunmayan yol');}
  const labels=svg('g',drawing,{}),current=svg('g',drawing,{'data-sile-position':'true'});svg('circle',current,{r:3,fill:'#ffdd86',stroke:'#14262b','stroke-width':1.5,'vector-effect':'non-scaling-stroke'});current.style.display='none';const arrow=svg('path',current,{d:'M0,-10 L5,3 L0,0 L-5,3 Z',fill:'#ffdd86',stroke:'#102229','stroke-width':1.2,'vector-effect':'non-scaling-stroke'});
  svg('title',current,{},'Simülasyon konumun; GPS cihaz ölçümü değildir');
  const note=el('small',parent,'K ↑ · sarı işaret sensin · kesikli çizgi OSM mahalle sınırı');note.className='sile-map-note';
  views.push({drawing,labels,current,arrow,mini,note});
 }
 makeMap(hud,true);const detail=el('p',hud);detail.className='sile-map-detail';makeMap(overview,false);
 const districts=el('div',overview);districts.className='sile-map-districts';for(const n of navigation.neighbourhoods){const link=el('a',districts,n.name);link.href=n.source;link.target='_blank';link.rel='noopener';}
 const source=el('a',overview,'Adlar ve sınırlar: OpenStreetMap · kaynaklar / kapsam ↗');source.href='/sile.html#navigation';source.target='_blank';source.rel='noopener';
 const win=doc.defaultView,attribution=doc.getElementById('map-attribution'),motor=doc.getElementById('motor-hud'),status=doc.getElementById('input-status');
 const rect=node=>node?.getClientRects().length?node.getBoundingClientRect():null;
 const layout=()=>{const m=rect(motor),a=rect(attribution),s=rect(status),p=navigationPlacement({width:win?.innerWidth??1440,height:win?.innerHeight??1000,motor:m?.height?m:null,attributionBottom:a?.bottom||0,statusBottom:s?.bottom||0});hud.style.setProperty('--sile-navigation-top',`${p.top??165}px`);hud.style.setProperty('--sile-navigation-bottom',`${p.bottom??82}px`);hud.style.setProperty('--sile-navigation-limit',`${p.maxHeight}px`);};
 const observer=win?.ResizeObserver?new win.ResizeObserver(layout):null;for(const n of [attribution,motor,status])if(n)observer?.observe(n);win?.addEventListener('resize',layout);layout();
 const measureContext=doc.createElement('canvas').getContext('2d'),measures=new Map();if(measureContext)measureContext.font='11px system-ui,sans-serif';
 const measureText=text=>{if(!measures.has(text))measures.set(text,measureContext?.measureText(text).width??text.length*6.4);return measures.get(text);};
 let last=-Infinity,disposed=false;
 function draw(view,state,result){
  const {drawing,labels,current,arrow,mini}=view,at=model.project(state),scale=model.metresPerUnit,full=model.viewBox;
  const box=mini&&at?[at.x-700/scale,at.y-420/scale,1400/scale,840/scale]:full;drawing.setAttribute('viewBox',box.join(' '));current.style.display=at?'':'none';
  const width=Math.max(220,drawing.clientWidth||(mini?300:600)),height=width*box[3]/box[2],unit=box[2]/width;
  if(at){current.setAttribute('transform',`translate(${at.x} ${at.y}) scale(${unit})`);const heading=headingDegrees(state);arrow.style.display=heading===null?'none':'';if(heading!==null)arrow.setAttribute('transform',`rotate(${heading})`);}
  const project=point=>{const p=model.projectUnbounded({x:point[0],z:point[1]});return {x:(p.x-box[0])/unit,y:(p.y-box[1])/unit};},candidates=[];
  for(const n of navigation.neighbourhoods)if(n.labelPoint)candidates.push({id:'district/'+n.id,name:n.name,kind:'district',...project(n.labelPoint)});
  for(const p of navigation.landmarks)candidates.push({id:p.id,name:p.name,kind:'landmark',...project(p.point)});
  const roads=mini?(result.available?query.nearbyRoads(state.x,state.z,850).filter(r=>r.name):[]):data.roads.filter(r=>r.name&&['primary','secondary','tertiary'].includes(r.kind)).map(r=>({id:r.id,name:r.name,point:r.points[Math.floor(r.points.length/2)]}));
  const names=new Set();for(const r of roads){if(names.has(r.name))continue;names.add(r.name);candidates.push({id:'road/'+r.id,name:r.name,kind:'road',...project(r.point)});}
  labels.replaceChildren();for(const p of placeLabels(candidates,{width,height,max:mini?9:28,measureText})){const b=p.box,g=svg('g',labels,{transform:`translate(${box[0]+b.x*unit} ${box[1]+b.y*unit}) scale(${unit})`});svg('rect',g,{width:b.width,height:b.height,rx:3,fill:'#12272bea',stroke:p.kind==='district'?'#86cdb9':'none','stroke-width':.6});svg('text',g,{x:5,y:12.5,fill:p.kind==='district'?'#a9ecce':p.kind==='landmark'?'#ffe0a0':'#eef0db','font-size':11,'font-family':'system-ui,sans-serif'},p.displayName);svg('title',g,{},p.name);}
  set(view.note,result.available?`K ↑ · sarı işaret sensin${mini?' · yakın çevre':' · kesikli çizgi OSM mahalle sınırı'}`:'Konum harita dışında veya kullanılamıyor · K ↑');
 }
 return {paint(state,{now=performance.now(),force=false}={}){
  if(disposed||!force&&now-last<200)return;last=now;const result=query.locate(state);
  const road=result.road,roadText=!result.available?'Konum kullanılamıyor':road?.kind==='unnamed'?'Bu yolun adı kaynakta yok':road?`${road.kind==='nearby'?'Yakın: ':''}${road.name}${road.kind==='nearby'?' · '+Math.round(road.distanceM)+' m':''}`:'Yakında adlandırılmış yol yok';
  set(location,result.label);set(street,roadText);set(overviewLocation,`${result.label} · ${roadText}`);
  set(detail,result.landmark?`${result.landmark.name} · yatay ${Math.round(result.landmark.distanceM)} m`:'Şile · simülasyon konumu');
  for(const view of views)if(view.mini?hud.open:overview.getClientRects().length>0)draw(view,state,result);
 },dispose(){if(disposed)return;disposed=true;observer?.disconnect();win?.removeEventListener('resize',layout);for(const key of ['--sile-navigation-top','--sile-navigation-bottom','--sile-navigation-limit'])hud.style.removeProperty(key);hud.hidden=overview.hidden=true;hud.replaceChildren();overview.replaceChildren();}};
}
