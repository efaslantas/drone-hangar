import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {projectCoordinate,insidePolygon} from '../src/geo-terrain.js';
const equal=(a,b)=>Math.abs(a[0]-b[0])<1e-9&&Math.abs(a[1]-b[1])<1e-9;
export function assembleBoundary(relation,projection){
 const join=role=>{
  const pending=(relation.members||[]).filter(m=>m.type==='way'&&(m.role||'outer')===role).map(m=>{
   if(!m.geometry||m.geometry.length<2||m.geometry.some(p=>!p||!Number.isFinite(p.lon)||!Number.isFinite(p.lat)))throw Error('Incomplete boundary geometry');
   return m.geometry.map(p=>[p.lon,p.lat]);
  }),rings=[];
  while(pending.length){let ring=pending.shift();while(!equal(ring[0],ring.at(-1))){const i=pending.findIndex(p=>equal(p[0],ring.at(-1))||equal(p.at(-1),ring.at(-1)));if(i<0)throw Error('Boundary ring is not closed');const next=pending.splice(i,1)[0];if(!equal(next[0],ring.at(-1)))next.reverse();ring.push(...next.slice(1));}if(ring.length<4)throw Error('Boundary ring too short');rings.push(ring.slice(0,-1).map(([lon,lat])=>projectCoordinate(projection,lon,lat)));}
  return rings;
 };
 const outer=join('outer'),inner=join('inner');if(!outer.length)throw Error('Boundary has no outer ring');const polygons=outer.map(r=>[r]);
 for(const hole of inner){const owner=polygons.find(p=>insidePolygon(...hole[0],p));if(!owner)throw Error('Inner ring has no outer owner');owner.push(hole);}return polygons;
}
function labelPoint(polygons,bounds){
 const [a,b,c,d]=bounds,points=[];
 for(let ix=0;ix<32;ix++)for(let iz=0;iz<16;iz++){const p=[a+(ix+.5)*(b-a)/32,c+(iz+.5)*(d-c)/16];if(polygons.some(r=>insidePolygon(...p,r)))points.push(p);}
 if(!points.length)return null;const mean=points.reduce((s,p)=>[s[0]+p[0]/points.length,s[1]+p[1]/points.length],[0,0]);return points.sort((p,q)=>Math.hypot(p[0]-mean[0],p[1]-mean[1])-Math.hypot(q[0]-mean[0],q[1]-mean[1]))[0];
}
export function prepareNavigation(map,boundaries,places,osm){
 const neighbourhoods=boundaries.elements.filter(e=>e.type==='relation'&&e.tags?.boundary==='administrative'&&e.tags.admin_level==='8').map(e=>{const polygons=assembleBoundary(e,map.projection);return {id:e.id,name:e.tags.name,polygons,labelPoint:labelPoint(polygons,map.terrain.bounds),source:'https://www.openstreetmap.org/relation/'+e.id};});
 if(neighbourhoods.length!==4||new Set(neighbourhoods.map(n=>n.name)).size!==4)throw Error('Four named centre neighbourhoods required');
 const nodes=new Map(osm.elements.filter(e=>e.type==='node').map(e=>[e.id,e])),landmarks=map.landmarks.map(p=>({id:'way/'+p.id,name:p.name,point:[p.x,p.z],kind:p.kind,source:'https://www.openstreetmap.org/way/'+p.id}));
 for(const e of osm.elements){const t=e.tags||{};if(!t.name||!(t.place==='square'||t.natural==='cape'||t.landuse==='harbour'))continue;let point;
  if(e.type==='node')point=projectCoordinate(map.projection,e.lon,e.lat);else if(e.type==='way'&&e.nodes?.length&&e.nodes.every(id=>nodes.has(id))){const ps=e.nodes.map(id=>nodes.get(id));point=projectCoordinate(map.projection,ps.reduce((s,p)=>s+p.lon/ps.length,0),ps.reduce((s,p)=>s+p.lat/ps.length,0));}
  if(point&&!landmarks.some(p=>p.name===t.name&&Math.hypot(p.point[0]-point[0],p.point[1]-point[1])<150))landmarks.push({id:e.type+'/'+e.id,name:t['name:tr']||t.name,point,kind:t.place||t.natural||t.landuse,source:'https://www.openstreetmap.org/'+e.type+'/'+e.id});
 }
 const named=map.roads.filter(r=>r.name);
 return {version:1,projection:map.projection,neighbourhoods,landmarks,counts:{roadPieces:map.roads.length,namedRoadPieces:named.length,namedRoadNames:new Set(named.map(r=>r.name)).size,neighbourhoods:neighbourhoods.length,landmarks:landmarks.length},boundaryTimestamp:boundaries.osm3s?.timestamp_osm_base,placeTimestamp:places.osm3s?.timestamp_osm_base,license:'ODbL-1.0',limits:['OSM administrative boundaries, not surveyed or official cadastral boundaries.','Street names use the existing source snapshot; absent names are never invented.','Label anchors are cartographic placements; not entrances or safe flight corridors.']};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=new URL('../',import.meta.url),read=n=>JSON.parse(fs.readFileSync(new URL('public/maps/sile/'+n,root))),out=prepareNavigation(read('map.json'),read('source-neighbourhoods.json'),read('source-places.json'),read('source-osm.json'));
 out.sources=['map.json','source-osm.json','source-neighbourhoods.json','source-places.json'].map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(new URL('public/maps/sile/'+file,root))).digest('hex')}));out.boundaryQuery='[out:json][timeout:40];rel(id:8917831,8918298,8939333,9064755);out geom;';out.endpoint='https://overpass-api.de/api/interpreter';out.officialNamesReference='https://sile.bel.tr/tr/kurumsal/muhtarlar/';
 const text=JSON.stringify(out,null,2)+'\n';fs.writeFileSync(new URL('src/data/sile-navigation.json',root),text);fs.writeFileSync(new URL('public/maps/sile/navigation.json',root),text);console.log(out.counts);
}
