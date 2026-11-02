import * as THREE from 'three';
import source from './data/sile-context.json' with {type:'json'};
import {insidePolygon,surfaceAt,drapeTerrainTriangles} from './geo-terrain.js';
import {createSurfacePartition} from './sile-shore.js';
import {concreteMaterial} from './sile-concrete.js';
const random=(n,s=0)=>{let h=(Math.imul(n|0,374761393)^Math.imul(s,668265263))>>>0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
function distance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l)):0;return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
function boundaryDistance(x,z,rings){let d=Infinity;for(const ring of rings)for(let i=0;i<ring.length;i++)d=Math.min(d,distance(x,z,ring[i],ring[(i+1)%ring.length]));return d;}
export function harbourLayout(data){
 if(data?.id!=='sile'||!Object.entries(source.projection).every(([k,v])=>data.projection?.[k]===v)||data.buildings.length!==source.counts.buildings||data.roads.length!==source.counts.roads||data.structures.length!==source.counts.structures)return null;
 const ring=data.terrain.land[0]?.[0],start=ring?.findIndex(p=>p[0]===-84.4&&p[1]===-657.63),end=ring?.findIndex(p=>p[0]===-119.31&&p[1]===-686.03);
 if(!ring||start<0||end<=start)return null;
 // This selected source-coastline arm and10m apron are authored surface masks,
 // not mapped concrete extent or measured breakwater engineering.
 const arm=ring.slice(start,end+1),masks=[[arm]],edges=[],play={terrain:data.terrain};
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.01)continue;
  const crop=data.terrain.bounds.some((v,k)=>Math.abs(a[k<2?0:1]-v)<.05&&Math.abs(b[k<2?0:1]-v)<.05);if(crop)continue;
  const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,nearHarbour=source.harbour.some(f=>boundaryDistance(x,z,f.rings)<8),onArm=i>=start&&i<end;
  if(!nearHarbour&&!onArm)continue;let nx=-dz/len,nz=dx/len;
  if(surfaceAt(play,x+nx*.8,z+nz*.8).water){nx=-nx;nz=-nz;}
  if(surfaceAt(play,x+nx*.8,z+nz*.8).water)continue;
  if(nearHarbour)masks.push([[a,b,[b[0]+nx*10,b[1]+nz*10],[a[0]+nx*10,a[1]+nz*10]]]);
  edges.push({a,b,nx,nz,len,nearHarbour,onArm});
 }
 return {masks,edges,waterRings:source.harbour.map(f=>f.rings)};
}
export function harbourSurfaces(data,positions){
 const layout=harbourLayout(data);if(!layout)return {ground:positions,paved:[],valid:false};
 const partition=createSurfacePartition(layout.masks),land=createSurfacePartition(data.terrain.land),ground=[],paved=[];
 for(let i=0;i<positions.length;i+=9){const triangle=[0,3,6].map(k=>[positions[i+k],positions[i+k+2],positions[i+k+1]]),p=partition(triangle);for(const t of p.outside)for(const [x,z,y]of t)ground.push(x,y,z);for(const t of p.inside)for(const clipped of land(t).inside)for(const [x,z,y]of clipped)paved.push(x,y,z);}
 // Do not upload shoreline slivers that collapse to a line in Float32.
 const draped=drapeTerrainTriangles(data.terrain,paved,0),stable=[];
 for(let i=0;i<draped.length;i+=9){const t=draped.slice(i,i+9).map(Math.fround),area=(t[3]-t[0])*(t[8]-t[2])-(t[5]-t[2])*(t[6]-t[0]);if(Math.abs(area)>1e-8)stable.push(...t);}
 return {ground,paved:stable,valid:true};
}
function clearRock(data,play,x,z,r,obstacles){
 const t=play.terrain,s=surfaceAt(play,x,z);if(s.water||s.normal[1]<.94||Math.hypot(x,z)<14+r)return false;
 if(x-r<t.bounds[0]||x+r>t.bounds[1]||z-r<t.bounds[2]||z+r>t.bounds[3])return false;
 if(t.land.some(rings=>boundaryDistance(x,z,rings)<r))return false;
 if(source.beaches.some(f=>insidePolygon(x,z,f.rings)))return false;
 if((play.groundCorridors||[]).some(c=>distance(x,z,c.a,c.b)<c.width/2+r))return false;
 for(const p of play.prisms){const [a,b,c,d]=p.bounds;if(x+r>a&&x-r<b&&z+r>c&&z-r<d)return false;}
 for(const b of obstacles)if(x+r>b.minx&&x-r<b.maxx&&z+r>b.minz&&z-r<b.maxz)return false;
 for(const road of data.roads)for(let i=1;i<road.points.length;i++)if(distance(x,z,road.points[i-1],road.points[i])<road.width/2+r+.6)return false;
 return true;
}
export function addSileHarbour(scene,data,play){
 const layout=harbourLayout(data);if(!layout)return;
 const obstacles=play.boxes.slice(),g=new THREE.IcosahedronGeometry(1,1),pos=g.attributes.position;
 // Shared irregular but convex-looking rock shape stays inside the unit sphere.
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),f=.88+.1*Math.sin(x*17+y*23+z*31);pos.setXYZ(i,x*f,y*f,z*f);}
 g.computeVertexNormals();g.computeBoundingBox();const matrices=[],colors=[],boxes=[],matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),position=new THREE.Vector3();
 for(const {a,b,nx,nz,len}of layout.edges)for(let d=1.8;d<len-1;d+=2.1){
  if(matrices.length>=800)break;const id=(Math.round(a[0]*10)^Math.round(a[1]*31)^Math.round(d*73))|0,r=.85+random(id,1)*.65,inset=2.3+random(id,2)*1.6,along=Math.max(.5,Math.min(len-.5,d+(random(id,9)-.5)*1.6)),x=a[0]+(b[0]-a[0])*along/len+nx*inset,z=a[1]+(b[1]-a[1])*along/len+nz*inset;
  q.setFromEuler(new THREE.Euler((random(id,3)-.5)*.4,random(id,4)*Math.PI*2,(random(id,5)-.5)*.4));scale.set(r,r*.85,r*1.12);position.set(x,surfaceAt(play,x,z).height-r*.25,z);matrix.compose(position,q,scale);
  const bnd=g.boundingBox.clone().applyMatrix4(matrix),radius=Math.hypot(Math.max(x-bnd.min.x,bnd.max.x-x),Math.max(z-bnd.min.z,bnd.max.z-z))+.002;
  if(!clearRock(data,play,x,z,radius,obstacles))continue;
  const box={minx:bnd.min.x-.001,maxx:bnd.max.x+.001,miny:bnd.min.y-.001,maxy:bnd.max.y+.001,minz:bnd.min.z-.001,maxz:bnd.max.z+.001};play.boxes.push(box);boxes.push(box);matrices.push(matrix.clone());colors.push(new THREE.Color([0x6b7069,0x7b796e,0x888274,0x686d68,0x918979][Math.floor(random(id,6)*5)%5]));
 }
 if(!matrices.length){g.dispose();return;}
 const mesh=new THREE.InstancedMesh(g,new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}),matrices.length);mesh.name='sile-harbour-armour';mesh.userData.harbourBoxes=boxes;
 matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,colors[i]);});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();scene.add(mesh);scene.userData.sileHarbourStats={rocks:matrices.length,authored:true};
}
export function harbourMaterial(options){return concreteMaterial(options);}
