import * as THREE from 'three';
import source from './data/sile-context.json' with {type:'json'};
import coast from './data/sile-coast.json' with {type:'json'};
import {coastalBuildings,buildingFacade} from './sile-buildings.js';
import {streetLayout,roadRibbonMasks} from './sile-streets.js';
import {createSurfacePartition} from './sile-shore.js';
import {terrainHeight,drapeTerrainTriangles,splitTerrainEdge,insidePolygon,partitionBuildingPads} from './geo-terrain.js';
// Avoid four temporary coordinate arrays for every clipping fragment.
const bounds=ring=>{let minx=Infinity,maxx=-Infinity,minz=Infinity,maxz=-Infinity;for(const p of ring){minx=Math.min(minx,p[0]);maxx=Math.max(maxx,p[0]);minz=Math.min(minz,p[1]);maxz=Math.max(maxz,p[1]);}return [minx,maxx,minz,maxz];};
const overlaps=(a,b)=>a[0]<=b[1]&&a[1]>=b[0]&&a[2]<=b[3]&&a[3]>=b[2];
const faces=r=>[[r[0],r[1],r[2]],[r[0],r[2],r[3]]];
const flat=r=>faces(r).flatMap(t=>t.flatMap(([x,z])=>[x,0,z]));
// Deliberately conservative authored grading, never a change to surveyed data.
export function planBuildingPads(data,profiles=coastalBuildings(data),layout=streetLayout(data,profiles)){
 const out={pads:[],rejected:[],authored:true};const terrain=data?.terrain;
 if(!terrain||!profiles.size||!terrain.heights?.every(Number.isFinite)||terrain.cols<2||terrain.rows<2||terrain.heights.length!==terrain.cols*terrain.rows)return out;
 const land=createSurfacePartition(terrain.land,{spatial:true}),excluded=createSurfacePartition([...roadRibbonMasks(data.roads,1.6),...roadRibbonMasks(terrain.land.flatMap(rings=>rings.map(r=>({points:[...r,r[0]],width:.3})))),...source.beaches.map(f=>f.rings),...source.harbour.map(f=>f.rings),...source.paved.map(f=>f.rings),...coast.features.map(f=>f.rings)],{spatial:true});
 for(const profile of profiles.values()){
  const item=profile.item,ring=item.rings[0],reject=reason=>out.rejected.push({sourceId:item.id,reason});
  if(item.rings.length!==1||ring.length!==4||!ring.every(p=>p.every(Number.isFinite))){reject('unsupported-footprint');continue;}
  const signed=ring.reduce((s,a,i)=>{const c=ring[(i+1)%ring.length];return s+a[0]*c[1]-c[0]*a[1];},0),area=Math.abs(signed)/2;
  const ccw=signed>0?ring:ring.toReversed();
  if(area<12||area>500||ccw.some((a,i)=>{const b=ccw[(i+1)%4],c=ccw[(i+2)%4];return (b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])<=1e-6;})){reject('unsupported-footprint');continue;}
  // Offset the four convex source edges, preserving their rotation. Axis
  // aligned bounds would unnecessarily excavate large unoccupied corners.
  const lines=ccw.map((a,i)=>{const b=ccw[(i+1)%4],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);return {a:[a[0]+dz/l*1.4,a[1]-dx/l*1.4],d:[dx,dz]};});
  const r=lines.map((q,i)=>{const p=lines[(i+3)%4],cross=p.d[0]*q.d[1]-p.d[1]*q.d[0],u=((q.a[0]-p.a[0])*q.d[1]-(q.a[1]-p.a[1])*q.d[0])/cross;return [p.a[0]+p.d[0]*u,p.a[1]+p.d[1]*u];}),bb=bounds(r);
  if(bb[0]<terrain.bounds[0]+3||bb[1]>terrain.bounds[1]-3||bb[2]<terrain.bounds[2]+3||bb[3]>terrain.bounds[3]-3||Math.hypot(Math.max(bb[0],0,-bb[1]),Math.max(bb[2],0,-bb[3]))<18){reject('map-edge-or-spawn');continue;}
  if((terrain.platforms||[]).some(p=>overlaps(bb,p.bounds))||[...data.buildings,...data.structures].some(p=>p.id!==item.id&&overlaps(bb,bounds(p.rings[0]))&&faces(r).some(t=>createSurfacePartition([p.rings])(t).inside.length) )||out.pads.some(p=>overlaps(bb,p.bounds))){reject('neighbour-or-platform');continue;}
  if(faces(r).some(t=>land(t).outside.length||excluded(t).inside.length)){reject('water-coast-road-or-paved');continue;}
  const heights=drapeTerrainTriangles({...terrain,buildingPads:[]},flat(r),0).filter((_,i)=>i%3===1),maxCut=Math.max(...heights)-item.base,maxFill=item.base-Math.min(...heights);
  if(maxCut<.35||maxCut>4||maxFill>1){reject('cut-fill-limit-or-no-burial');continue;}
  // A door-facing escape ray must leave the terrace without a new step. No
  // invented stairs: reject disconnected sites rather than concealing a wall.
  const entry=buildingFacade(item,profile,profile.eaves).cells.find(c=>c.floor===0&&c.tile>=8);
  if(!entry){reject('unsupported-entry');continue;}
  const start=[entry.x,entry.z],end=profile.entry,dx=end[0]-start[0],dz=end[1]-start[1];let exit=Infinity;
  for(let i=0;i<4;i++){const a=r[i],b=r[(i+1)%4],ex=b[0]-a[0],ez=b[1]-a[1],cross=dx*ez-dz*ex;if(Math.abs(cross)<1e-9)continue;const u=((a[0]-start[0])*ez-(a[1]-start[1])*ex)/cross,v=((a[0]-start[0])*dz-(a[1]-start[1])*dx)/cross;if(u>0&&v>=0&&v<=1)exit=Math.min(exit,u);}
  if(!Number.isFinite(exit)||exit>1||Math.abs(terrainHeight(terrain,start[0]+dx*exit,start[1]+dz*exit)-item.base)>.25){reject('entry-disconnection');continue;}
  const corridor=layout.groundCorridors.find(c=>c.sourceId===item.id);
  let maxEntryStep=Math.abs(terrainHeight(terrain,start[0]+dx*exit,start[1]+dz*exit)-item.base);
  if(corridor){
   const vx=corridor.b[0]-corridor.a[0],vz=corridor.b[1]-corridor.a[1],length=Math.hypot(vx,vz),nx=-vz/length*corridor.width/2,nz=vx/length*corridor.width/2;
   for(const sign of [-1,0,1])for(let e=0;e<4;e++){const a=r[e],b=r[(e+1)%4],ex=b[0]-a[0],ez=b[1]-a[1],cross=vx*ez-vz*ex;if(Math.abs(cross)<1e-9)continue;const x=corridor.a[0]+nx*sign,z=corridor.a[1]+nz*sign,u=((a[0]-x)*ez-(a[1]-z)*ex)/cross,v=((a[0]-x)*vz-(a[1]-z)*vx)/cross;if(u>=0&&u<=1&&v>=0&&v<=1)maxEntryStep=Math.max(maxEntryStep,Math.abs(terrainHeight(terrain,x+vx*u,z+vz*u)-item.base));}
  }
  if(maxEntryStep>.25||layout.groundCorridors.some(c=>c.sourceId!==item.id&&faces(r).some(t=>createSurfacePartition(roadRibbonMasks([{points:[c.a,c.b],width:c.width}]))(t).inside.length))){reject('entry-disconnection');continue;}
  out.pads.push({maxEntryStep,rings:[r],bounds:bb,height:item.base,sourceId:item.id,maxCut,maxFill,authored:'building-terrace',padding:1.4});
 }
 return out;
}
export function buildingPadWalls(terrain){
 const positions=[],segments=[],original={...terrain,buildingPads:[]};
 for(const pad of terrain.buildingPads||[])for(let edge=0;edge<4;edge++){
  const ring=pad.rings[0],points=splitTerrainEdge(original,ring[edge],ring[(edge+1)%4]);
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],ha=terrainHeight(original,...a),hb=terrainHeight(original,...b),h=pad.height;
   const pieces=[[a,b,ha,hb]];
   if((ha-h)*(hb-h)<0){const u=(h-ha)/(hb-ha),q=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];pieces.splice(0,1,[a,q,ha,h],[q,b,h,hb]);}
   for(const [p,q,yp,yq]of pieces){if(Math.max(Math.abs(yp-h),Math.abs(yq-h))<1e-8)continue;
    const cut=(yp+yq)/2>h,vertices=[[p[0],h,p[1]],[q[0],h,q[1]],[p[0],yp,p[1]],[q[0],yq,q[1]]];
    for(const ids of (cut?[[0,1,2],[1,3,2]]:[[0,2,1],[1,2,3]])){const t=ids.map(i=>vertices[i]),u=new THREE.Vector3(...t[1]).sub(new THREE.Vector3(...t[0])),v=new THREE.Vector3(...t[2]).sub(new THREE.Vector3(...t[0]));if(new THREE.Vector3().crossVectors(u,v).lengthSq()>1e-15)positions.push(...t.flat());}
    segments.push({a:p,b:q,ya:yp,yb:yq,height:h,sourceId:pad.sourceId});
   }
  }
 }
 return {positions,segments};
}
export function addBuildingPadWalls(scene,play,plan){
 scene.userData.silePadStats={authored:true,pads:plan.pads.length,rejected:plan.rejected};if(!plan.pads.length)return;
 const out=buildingPadWalls(play.terrain),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(out.positions,3));g.computeVertexNormals();const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x928b7b,roughness:1,side:THREE.DoubleSide}));mesh.name='sile-building-retaining-walls';mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);play.terrainWalls??=[];play.terrainWalls.push(...out.segments);
}

// Existing prop transforms and collision remain byte-for-byte stable. Reject
// grading beneath their actual rendered bounds rather than moving furniture.
export function applyBuildingPads(scene,data,play,profiles,layout){
 const plan=planBuildingPads({...data,terrain:play.terrain},profiles,layout),obstacles=[];
 scene.updateMatrixWorld(true);
 scene.traverse(o=>{if(!o.isInstancedMesh)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
  for(let i=0;i<o.count;i++){const m=new THREE.Matrix4();o.getMatrixAt(i,m);m.premultiply(o.matrixWorld);const b=o.geometry.boundingBox.clone().applyMatrix4(m);obstacles.push(b);}
 });
 plan.pads=plan.pads.filter(p=>{const hit=obstacles.some(b=>b.min.y<=p.height+Math.max(p.maxCut,.3)&&b.max.y>=p.height-Math.max(p.maxFill,.3)&&overlaps(p.bounds,[b.min.x,b.max.x,b.min.z,b.max.z])&&faces(p.rings[0]).some(t=>createSurfacePartition([[[[b.min.x,b.min.z],[b.max.x,b.min.z],[b.max.x,b.max.z],[b.min.x,b.max.z]]]])(t).inside.length));if(hit)plan.rejected.push({sourceId:p.sourceId,reason:'existing-prop-bounds'});return !hit;});
 play.terrain={...play.terrain,buildingPads:plan.pads};
 if(plan.pads.length)for(const name of ['sile-terrain','sile-building-aprons','sile-harbour-paved','sile-roads','sile-street-paving','sile-source-sand','sile-source-rock']){
  const mesh=scene.getObjectByName(name);if(!mesh)continue;
  const raw=mesh.geometry,attributes=Object.entries(raw.attributes),buffers=Object.fromEntries(attributes.map(([k])=>[k,[]]));let changed=false;
  const partitions=plan.pads.map(p=>({pad:p,split:createSurfacePartition([p.rings])}));
  const indices=raw.index?.array;const count=indices?.length??raw.attributes.position.count;
  for(let i=0;i<count;i+=3){
   let pieces=[Array.from({length:3},(_,j)=>{const id=indices?indices[i+j]:i+j,v=[raw.attributes.position.getX(id),raw.attributes.position.getZ(id),raw.attributes.position.getY(id)];for(const [name,a]of attributes)if(name!=='position')for(let k=0;k<a.itemSize;k++)v.push(a.array[id*a.itemSize+k]);return v;})],tops=[];
   for(const {pad,split}of partitions){const next=[];for(const t of pieces){if(!overlaps(bounds(t),pad.bounds)){next.push(t);continue;}const parts=split(t);if(parts.inside.length)changed=true;for(const q of parts.inside){for(const v of q){v[2]=pad.height;let offset=3;for(const [name,a]of attributes)if(name!=='position'){if(name==='normal'){v[offset]=0;v[offset+1]=1;v[offset+2]=0;}offset+=a.itemSize;}}const f=q.map(v=>v.map(Math.fround)),area=(f[1][0]-f[0][0])*(f[2][1]-f[0][1])-(f[1][1]-f[0][1])*(f[2][0]-f[0][0]);if(Math.abs(area)>1e-8){if(area>0)q.reverse();tops.push(q);}}next.push(...parts.outside);}pieces=next;}
   for(const t of [...tops,...pieces])for(const v of t){buffers.position.push(v[0],v[2],v[1]);let offset=3;for(const [name,a]of attributes)if(name!=='position'){for(let k=0;k<a.itemSize;k++)buffers[name].push(v[offset+k]);offset+=a.itemSize;}}
  }
  if(changed){const g=new THREE.BufferGeometry();for(const [name,a]of attributes)g.setAttribute(name,new THREE.Float32BufferAttribute(buffers[name],a.itemSize));if(raw.index){
   // Restore shared lighting vertices by exact uploaded attributes only. A
   // tolerant merge could weld the two elevations across a retaining cut.
   const shared=new Map(),ids=[],values=Object.fromEntries(attributes.map(([name])=>[name,[]]));
   for(let i=0;i<g.attributes.position.count;i++){const tuple=[];for(const [name,a]of attributes)for(let k=0;k<a.itemSize;k++)tuple.push(g.attributes[name].array[i*a.itemSize+k]);const key=tuple.join(',');let id=shared.get(key);if(id===undefined){id=shared.size;shared.set(key,id);for(const [name,a]of attributes)for(let k=0;k<a.itemSize;k++)values[name].push(g.attributes[name].array[i*a.itemSize+k]);}ids.push(id);}
   for(const [name,a]of attributes)g.setAttribute(name,new THREE.Float32BufferAttribute(values[name],a.itemSize));g.setIndex(ids);
  }mesh.geometry=g;raw.dispose();}

 }
 addBuildingPadWalls(scene,play,plan);return plan;
}
