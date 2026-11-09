import * as THREE from 'three';
import {mergeGeometries}from 'three/addons/utils/BufferGeometryUtils.js';
import {coastCliffContacts}from './sile-rock-view.js';
// Height19m is source-reported. Shaft/house dimensions and placement within
// the source compound are photo-informed assumptions, not a building survey.
export function addCompletedLighthouse(scene,play,data){
 const item=data.buildings.find(b=>b.landmark==='lighthouse'&&b.id===693889618);if(data.completionLayer!==1||!item)return;
 const ring=item.rings[0],center=ring.reduce((s,p)=>s.map((n,k)=>n+p[k]/ring.length),[0,0]),parts=[[],[],[],[]],base=item.base;
 function add(g,material){const flat=g.index?g.toNonIndexed():g.clone();parts[material].push(flat);g.dispose();return flat;}
 const shape=new THREE.Shape(ring.map(([x,z])=>new THREE.Vector2(x,-z))),house=new THREE.ExtrudeGeometry(shape,{depth:3.15,bevelEnabled:false});house.rotateX(-Math.PI/2);house.translate(0,base,0);add(house,0);
 const roof=new THREE.ShapeGeometry(shape);roof.rotateX(-Math.PI/2);roof.translate(0,base+3.16,0);add(roof,2);
 const original=play.prisms[data.buildings.indexOf(item)]||play.prisms.find(p=>p.sourceId===item.id);if(original)original.maxy=Math.fround(base+3.15);
 function cylinder(radius,bottom,top,material,solid=true){
  const g=new THREE.CylinderGeometry(radius,radius,top-bottom,8,1,false);g.rotateY(Math.PI/8);g.translate(center[0],base+(bottom+top)/2,center[1]);const flat=add(g,material);
  if(solid){const p=flat.attributes.position,lo=Math.min(...Array.from({length:p.count},(_,i)=>p.getY(i))),hi=Math.max(...Array.from({length:p.count},(_,i)=>p.getY(i))),points=new Map();for(let i=0;i<p.count;i++)if(p.getY(i)===lo&&Math.hypot(p.getX(i)-center[0],p.getZ(i)-center[1])>radius*.9)points.set(p.getX(i)+':'+p.getZ(i),[p.getX(i),p.getZ(i)]);const r=[...points.values()].sort((a,b)=>Math.atan2(a[1]-center[1],a[0]-center[0])-Math.atan2(b[1]-center[1],b[0]-center[0]));play.prisms.push({rings:[r],bounds:[Math.min(...r.map(p=>p[0])),Math.max(...r.map(p=>p[0])),Math.min(...r.map(p=>p[1])),Math.max(...r.map(p=>p[1]))],miny:lo,maxy:hi,authored:'lighthouse-solid',sourceId:item.id});}
 }
 for(let i=0;i<8;i++)cylinder(1.9,i*1.9,(i+1)*1.9,i%2?0:1);
 cylinder(2.12,15.2,15.5,0);cylinder(1.35,15.5,18.1,3);cylinder(1.5,18.1,18.2,1);
 for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8,g=new THREE.CylinderGeometry(.045,.045,2.6,4);g.translate(center[0]+Math.sin(a)*1.355,base+16.8,center[1]+Math.cos(a)*1.355);add(g,1);}
 const cap=new THREE.ConeGeometry(1.5,.8,8);cap.translate(center[0],base+18.6,center[1]);add(cap,1);
 const geometries=[],materialIds=[];for(let k=0;k<parts.length;k++)for(const g of parts[k]){geometries.push(g);materialIds.push(k);}const geometry=mergeGeometries(geometries,true);geometry.groups.forEach((g,i)=>g.materialIndex=materialIds[i]);geometries.forEach(g=>g.dispose());
 const materials=[new THREE.MeshStandardMaterial({color:0xe4e3dc,roughness:.87}),new THREE.MeshStandardMaterial({color:0x242a2b,roughness:.72}),new THREE.MeshStandardMaterial({color:0x9e5840,roughness:.93}),new THREE.MeshStandardMaterial({color:0x49666a,roughness:.28,metalness:.18})],mesh=new THREE.Mesh(geometry,materials);mesh.name='sile-lighthouse';mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
 for(const c of coastCliffContacts(geometry)){const [a,b,d]=c.vertices,ny=(b[2]-a[2])*(d[0]-a[0])-(b[0]-a[0])*(d[2]-a[2]);play.terrainWalls.push({...c,sourceId:item.id,mesh:mesh.name,authored:'lighthouse-shell',landing:ny>1e-8,reason:'fenere çarptı'});}
}
