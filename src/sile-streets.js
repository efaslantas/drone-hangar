import source from './data/sile-context.json' with {type:'json'};
import{surfaceAt,insidePolygon,drapeTerrainTriangles}from './geo-terrain.js';
import{createSurfacePartition}from './sile-shore.js';
import{buildingFacade}from './sile-buildings.js';
const walkKinds=new Set(['footway','path','steps','pedestrian']);
const match=data=>data?.id==='sile'&&data.buildings?.length===source.counts.buildings&&data.roads?.length===source.counts.roads&&data.structures?.length===source.counts.structures&&Object.entries(source.projection).every(([k,v])=>data.projection?.[k]===v);
function hull(points){const p=[...new Map(points.map(p=>[p.map(v=>v.toFixed(8)).join(':'),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(p.length<3)return p;const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),side=list=>{const out=[];for(const v of list){while(out.length>1&&cross(out.at(-2),out.at(-1),v)<=1e-10)out.pop();out.push(v);}out.pop();return out;};return [...side(p),...side(p.toReversed())];}
export function roadRibbonMasks(roads,extraWidth=0,accept=()=>true){
 const masks=[],nodes=new Map();
 for(let r=0;r<roads.length;r++){const road=roads[r],w=road.width/2+extraWidth;if(!Number.isFinite(w)||w<=0)continue;
  for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.01||!accept(road,a,b))continue;const nx=-dz/len*w,nz=dx/len*w,left=[a[0]+nx,a[1]+nz],right=[a[0]-nx,a[1]-nz],bl=[b[0]+nx,b[1]+nz],br=[b[0]-nx,b[1]-nz];masks.push([[left,bl,br,right]]);
   for(const [p,l,q]of [[a,left,right],[b,bl,br]]){const key=p.map(v=>v.toFixed(2)).join(':');if(!nodes.has(key))nodes.set(key,[]);nodes.get(key).push(l,q,p);}
  }
 }
 for(const points of nodes.values()){const ring=hull(points);if(ring.length>=3)masks.push([ring]);}return masks;
}
export function streetLayout(data,profiles){
 const out={valid:false,asphalt:[],paving:[],coverage:[],groundCorridors:[],stats:{}};if(!match(data)||!profiles.size)return out;out.valid=true;
 const drive=data.roads.filter(r=>!walkKinds.has(r.kind)),walk=data.roads.filter(r=>walkKinds.has(r.kind)),near=[...profiles.values()].map(p=>{const ring=p.item.rings[0];return [Math.min(...ring.map(v=>v[0])),Math.max(...ring.map(v=>v[0])),Math.min(...ring.map(v=>v[1])),Math.max(...ring.map(v=>v[1]))];});
 const close=(road,a,b)=>{if(!['residential','service','living_street','tertiary','secondary'].includes(road.kind))return false;const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;return near.some(p=>Math.hypot(Math.max(p[0]-x,0,x-p[1]),Math.max(p[2]-z,0,z-p[3]))<=45);};
 out.asphalt=roadRibbonMasks(drive);out.paving=[...roadRibbonMasks(walk),...roadRibbonMasks(drive,1.5,close)];
 for(const p of profiles.values()){
  const cells=buildingFacade(p.item,p,p.eaves).cells,entry=cells.find(c=>c.floor===0&&(c.tile===8||c.tile===9))||cells.find(c=>c.floor===0&&(c.tile===10||c.tile===11));if(!entry)continue;
  const a=[entry.x+entry.nx*1.2,entry.z+entry.nz*1.2],b=p.entry,dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.7||len>18)continue;const nx=-dz/len*.625,nz=dx/len*.625;let clear=true;
  for(let i=0;i<=12&&clear;i++)for(const side of [-1,0,1]){const x=a[0]+dx*i/12+nx*side,z=a[1]+dz*i/12+nz*side,s=surfaceAt({terrain:data.terrain},x,z);if(s.water||s.normal[1]<.9||data.buildings.some(item=>insidePolygon(x,z,item.rings))){clear=false;break;}}
  if(!clear)continue;out.paving.push([[[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]]]);out.groundCorridors.push({a,b,width:1.25,sourceId:p.item.id});
 }
 out.coverage=[...out.asphalt,...out.paving];out.stats={sourceRoads:data.roads.length,driveRoads:drive.length,walkRoads:walk.length,entranceLinks:out.groundCorridors.length,authored:true};return out;
}
function stableSurface(terrain,positions){const raw=drapeTerrainTriangles(terrain,positions,0),out=[];for(let i=0;i<raw.length;i+=9){const t=raw.slice(i,i+9).map(Math.fround),area=(t[3]-t[0])*(t[8]-t[2])-(t[5]-t[2])*(t[6]-t[0]);if(Math.abs(area)>1e-8)out.push(...t);}return out;}
export function streetSurfaces(data,positions,layout){
 if(!layout.valid)return{ground:positions,asphalt:[],paving:[]};const drive=createSurfacePartition(layout.asphalt,{spatial:true}),walk=createSurfacePartition(layout.paving,{spatial:true}),buildings=createSurfacePartition(data.buildings.map(p=>p.rings),{spatial:true}),land=createSurfacePartition(data.terrain.land),ground=[],asphalt=[],paving=[];
 const append=(target,triangles)=>{for(const t of triangles)for(const[x,z,y]of t)target.push(x,y,z);};
 function keep(pieces,target){for(const t of pieces){const cut=buildings(t);append(ground,cut.inside);for(const q of cut.outside){const onLand=land(q);append(target,onLand.inside);append(ground,onLand.outside);}}}
 for(let i=0;i<positions.length;i+=9){const triangle=[0,3,6].map(k=>[positions[i+k],positions[i+k+2],positions[i+k+1]]),lanes=drive(triangle);keep(lanes.inside,asphalt);for(const t of lanes.outside){const paths=walk(t);keep(paths.inside,paving);append(ground,paths.outside);}}
 return{ground,asphalt:stableSurface(data.terrain,asphalt),paving:stableSurface(data.terrain,paving)};
}
export function streetRemainder(positions,layout){if(!layout.valid||!positions.length)return positions;const clip=createSurfacePartition(layout.coverage,{spatial:true}),out=[];for(let i=0;i<positions.length;i+=9){const t=[0,3,6].map(k=>[positions[i+k],positions[i+k+2],positions[i+k+1]]);for(const q of clip(t).outside)for(const[x,z,y]of q)out.push(x,y,z);}return out;}
