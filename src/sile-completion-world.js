import * as THREE from 'three';
import {terrainHeight} from './geo-terrain.js';
import {refreshCoastalFacades}from './sile-building-view.js';
import {coastalBuildings} from './sile-buildings.js';
import {roadFieldIndex,segmentDistance} from './sile-neighbourhood.js';
// These are terrain-derived modeling choices, never height measurements.
export function groundedEntryProfile(item,profile,terrain){
 const r=item.rings[0];let edge=0,distance=Infinity;
 for(let i=0;i<r.length;i++){const d=segmentDistance(...profile.entry,r[i],r[(i+1)%r.length]);if(d<distance){distance=d;edge=i;}}
 const a=r[edge],b=r[(edge+1)%r.length],entryY=terrainHeight(terrain,(a[0]+b[0])/2,(a[1]+b[1])/2);
 return {entryY,height:Math.max(item.height,entryY-item.base+4.5),evidence:'assumed'};
}
export function completedSileData(data){
 if(data?.completionLayer!==1)return data;
 const profiles=coastalBuildings(data),changes=new Map();
 for(const {item,...profile}of profiles.values()){
  const out=groundedEntryProfile(item,profile,data.terrain);
  if(out.entryY>item.base+.3)changes.set(item.id,{...item,entryY:out.entryY,height:out.height,heightSource:out.height>item.height?'terrain-clearance-assumption':item.heightSource});
 }
 return {...data,buildings:data.buildings.map(item=>changes.get(item.id)||item),completionDerived:{entries:changes.size,heightChanges:[...changes.values()].filter(item=>item.height!==data.buildings.find(b=>b.id===item.id).height).map(b=>b.id)}};
}
const coastIndexes=new WeakMap();
function coastIndex(terrain){
 if(coastIndexes.has(terrain))return coastIndexes.get(terrain);
 const edges=[];for(const rings of terrain.land)for(const r of rings)for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length];if(!terrain.bounds.some((v,k)=>Math.abs(a[k<2?0:1]-v)<.05&&Math.abs(b[k<2?0:1]-v)<.05))edges.push({points:[a,b],width:76});}
 const index=roadFieldIndex(edges);coastIndexes.set(terrain,index);return index;
}
export function coastalSlopeFace(t,terrain){
 const ux=t[3]-t[0],uy=t[4]-t[1],uz=t[5]-t[2],vx=t[6]-t[0],vy=t[7]-t[1],vz=t[8]-t[2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,length=Math.hypot(nx,ny,nz);
 if(!Number.isFinite(length)||length<1e-10||Math.abs(ny)/length>.92)return false;
 const x=(t[0]+t[3]+t[6])/3,z=(t[2]+t[5]+t[8])/3;
 return coastIndex(terrain)(x,z).some(e=>segmentDistance(x,z,e.a,e.b)<38);
}
// Partition existing triangles into materials; do not add an overlapping sheet
// or move a vertex. Physics still samples exactly the same terrain planes.
export function finishCompletionTerrain(scene,play,data,rockMaterial){
 if(data.completionLayer!==1)return;
 const mesh=scene.getObjectByName('sile-terrain'),original=mesh.geometry,g=original.index?original.toNonIndexed():original.clone(),p=g.attributes.position,parts=[[],[]];
 for(let i=0;i<p.count;i+=3){const t=[0,1,2].flatMap(k=>[p.getX(i+k),p.getY(i+k),p.getZ(i+k)]);parts[coastalSlopeFace(t,play.terrain)?1:0].push(i,i+1,i+2);}
 function part(indices,rock){
  const out=new THREE.BufferGeometry();for(const [name,a]of Object.entries(g.attributes)){const values=[];for(const i of indices)for(let k=0;k<a.itemSize;k++)values.push(a.array[i*a.itemSize+k]);out.setAttribute(name,new THREE.Float32BufferAttribute(values,a.itemSize));}
  if(rock){const uv=out.attributes.uv;for(let j=0;j<indices.length;j+=3){const a=new THREE.Vector3().fromBufferAttribute(p,indices[j]),b=new THREE.Vector3().fromBufferAttribute(p,indices[j+1]),c=new THREE.Vector3().fromBufferAttribute(p,indices[j+2]),n=b.sub(a).cross(c.sub(a)),axis=Math.abs(n.y)>=Math.max(Math.abs(n.x),Math.abs(n.z))?'y':Math.abs(n.x)>=Math.abs(n.z)?'x':'z';for(let k=0;k<3;k++){const i=indices[j+k];uv.setXY(j+k,(axis==='x'?p.getZ(i):p.getX(i))/3,(axis==='y'?p.getZ(i):p.getY(i))/3);}}out.setAttribute('color',new THREE.Float32BufferAttribute(Float32Array.from({length:indices.length*3},(_,i)=>[.48,.47,.435][i%3]),3));}return out;
 }
 mesh.geometry=part(parts[0],false);if(parts[1].length){const rock=new THREE.Mesh(part(parts[1],true),rockMaterial);rock.name='sile-coastal-exposure';rock.receiveShadow=true;scene.add(rock);}original.dispose();g.dispose();
 for(const name of ['sile-terrain','sile-coast-cliffs','sile-coastal-exposure','sile-sea-caves','sile-castle-island']){const m=scene.getObjectByName(name);if(m)m.castShadow=true;}
 scene.userData.sileCompletionStats={...data.completionDerived,exposedRockTriangles:parts[1].length/3,terrainTriangles:p.count/3,authored:true,heightsMeasured:false};
}

// Terraces are selected after props exist. Reconcile decorative entries only
// after that final grading; roof/body dimensions and source records stay fixed.
export function alignCompletedEntries(scene,play,profiles,data){
 if(data.completionLayer!==1)return;let changed=false;
 for(const {item,...profile}of profiles.values())if(Number.isFinite(item.entryY)){const final=groundedEntryProfile(item,profile,play.terrain).entryY;if(Math.abs(final-item.entryY)>.0001){item.entryY=final;changed=true;}}
 if(changed)refreshCoastalFacades(scene,profiles);
}
