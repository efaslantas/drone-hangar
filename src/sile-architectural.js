import * as THREE from 'three';
import {buildingFacade} from './sile-buildings.js';
import {facadeOpening} from './sile-facade-atlas.js';
import {createSurfacePartition} from './sile-shore.js';
import {drapeTerrainTriangles} from './geo-terrain.js';

// Authored attached trim; source walls remain solid and retain their geometry.
export function windowDetailParts(cell){
 const opening=facadeOpening(cell.tile);
 if(!opening||cell.tile>7||!(cell.width>.5)||!(cell.y1>cell.y0))return [];
 const sy=(cell.y1-cell.y0)/252,sx=cell.width/252;
 const width=opening.width*sx,height=opening.height*sy;
 const center=cell.y0+(254-opening.y-opening.height/2)*sy;
 return [
  {kind:'sill',paint:'stone',xyz:[0,cell.y0+(254-opening.y-opening.height-13)*sy,.065],size:[(opening.width+26)*sx,10*sy,.16]},
  {kind:'head',paint:'frame',xyz:[0,center+height/2+5*sy,.0225],size:[width+18*sx,8*sy,.075]},
  ...[-1,1].map(sign=>({kind:'jamb',paint:'frame',xyz:[sign*(width/2+5*sx),center,.0225],size:[8*sx,height,.075]})),
 ];
}
const overlaps=(a,b)=>a.minx<b.maxx&&a.maxx>b.minx&&a.miny<b.maxy&&a.maxy>b.miny&&a.minz<b.maxz&&a.maxz>b.minz;
export function addFacadeDepth(scene,data,play,profiles){
 const stats={windows:0,eaves:0,parts:0,buildings:0,authored:true};scene.userData.sileArchitecturalStats=stats;
 if(!profiles?.size||!play.terrain)return;
 const geometry=new THREE.BoxGeometry(1,1,1);geometry.computeBoundingBox();
 const land=createSurfacePartition(play.terrain.land||[],{spatial:true}),groups=new Map(),owners=new Set();
 const queues=[...profiles.values()].map(profile=>{
  const facade=buildingFacade(profile.item,profile,profile.eaves),vx=profile.shore[0]-profile.center[0],vz=profile.shore[1]-profile.center[1];
  const cells=facade.cells.slice().sort((a,b)=>(b.nx*vx+b.nz*vz)-(a.nx*vx+a.nz*vz)||a.floor-b.floor||a.bay-b.bay);
  const edgeCells=[...new Map(cells.map(c=>[c.edge,c])).values()];
  return {profile,own:data.buildings.indexOf(profile.item),windows:cells.filter(c=>c.tile<8),eaves:edgeCells};
 });
 function accept(queue,cell,parts){
  const {profile,own}=queue;
  const parent=new THREE.Matrix4().makeBasis(new THREE.Vector3(cell.nz,0,-cell.nx),new THREE.Vector3(0,1,0),new THREE.Vector3(cell.nx,0,cell.nz));parent.setPosition(cell.x,0,cell.z);
  const records=parts.map(part=>{
   const matrix=parent.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...part.xyz),new THREE.Quaternion(),new THREE.Vector3(...part.size)));
   const b=geometry.boundingBox.clone().applyMatrix4(matrix),box={minx:b.min.x-.001,maxx:b.max.x+.001,miny:b.min.y-.001,maxy:b.max.y+.001,minz:b.min.z-.001,maxz:b.max.z+.001,authored:'coastal-architectural',ownerId:profile.item.id,kind:part.kind};
   return {...part,matrix,box,tint:profile.paint};
  });
  for(const {box:b}of records){
   if(!Object.values(b).filter(v=>typeof v==='number').every(Number.isFinite)||b.miny<profile.item.base||b.maxy>profile.eaves)return false;
   const t=play.terrain;if(b.minx<t.bounds[0]||b.maxx>t.bounds[1]||b.minz<t.bounds[2]||b.maxz>t.bounds[3])return false;
   const corners=[[b.minx,b.minz],[b.maxx,b.minz],[b.maxx,b.maxz],[b.minx,b.maxz]],faces=[[0,1,2],[0,2,3]].map(ids=>ids.map(i=>corners[i]));
   if(faces.some(face=>land(face).outside.length))return false;
   const ground=drapeTerrainTriangles(t,faces.flatMap(face=>face.flatMap(([x,z])=>[x,0,z])),0);
   if(!ground.length||ground.some((v,i)=>i%3===1&&v+.03>b.miny))return false;
   if(play.boxes.some(old=>overlaps(b,old)))return false;
   if(play.prisms.some((old,i)=>i!==own&&overlaps(b,{minx:old.bounds[0],maxx:old.bounds[1],minz:old.bounds[2],maxz:old.bounds[3],miny:old.miny,maxy:old.maxy})))return false;
  }
  for(const record of records){if(!groups.has(record.paint))groups.set(record.paint,[]);groups.get(record.paint).push(record);play.boxes.push(record.box);}
  owners.add(profile.item.id);stats.parts+=records.length;return true;
 }
 // Round-robin avoids spending the entire budget on a few dense facades.
 for(const kind of ['windows','eaves']){
  const cap=kind==='windows'?384:160;
  let pending=true;
  while(pending&&stats[kind]<cap){pending=false;
   for(const queue of queues){
    if(stats[kind]>=cap)break;
    while(queue[kind].length){pending=true;const cell=queue[kind].shift();let parts;
     if(kind==='windows')parts=windowDetailParts(cell);
     else{
      const ring=queue.profile.item.rings[0],a=ring[cell.edge],b=ring[(cell.edge+1)%ring.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      cell.x=(a[0]+b[0])/2;cell.z=(a[1]+b[1])/2;
      parts=length>.5?[{kind:'eaves',paint:'stone',xyz:[0,queue.profile.eaves-.12,.045],size:[length-.12,.12,.12]}]:[];
     }
     if(parts.length&&accept(queue,cell,parts)){stats[kind]++;break;}
    }
   }
  }
 }
 for(const [paint,records]of groups){
  const material=new THREE.MeshStandardMaterial({color:paint==='stone'?0xb8b09e:0xbfc1b5,roughness:paint==='stone'?.9:.72});
  const mesh=new THREE.InstancedMesh(geometry,material,records.length);mesh.name='sile-coastal-architectural-'+paint;mesh.userData.architecturalBoxes=records.map(p=>p.box);
  records.forEach((record,i)=>{mesh.setMatrixAt(i,record.matrix);mesh.setColorAt(i,new THREE.Color(record.tint));});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();scene.add(mesh);
 }
 if(!groups.size)geometry.dispose();stats.buildings=owners.size;
}
