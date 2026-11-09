import * as THREE from 'three';
import {drapeTerrainTriangles} from './geo-terrain.js';
import {facadeUvs} from './sile-materials.js';
import {coastCliffContacts} from './sile-rock-view.js';
// Conservative ML roofprints, not measured heights or roof styles. Keep the
// existing world and props; defer a candidate that conflicts with either.
export function addSupplementalBuildings(scene,play,data){
 if(!data.supplementalBuildings?.length)return;
 const positions=[[],[]],uv=[[],[]],owners=[[],[]],rejected=[],added=[],overlap=(a,b)=>a[0]<b[1]&&a[1]>b[0]&&a[2]<b[3]&&a[3]>b[2];
 for(const b of data.supplementalBuildings){
  const ring=b.rings?.[0];if(b.rings?.length!==1||!ring||ring.length<3||!ring.every(p=>p.length===2&&p.every(Number.isFinite))||b.height!==7.5||b.confidence<.99){rejected.push({id:b.id,reason:'invalid-source'});continue;}
  const bounds=[Math.min(...ring.map(p=>p[0])),Math.max(...ring.map(p=>p[0])),Math.min(...ring.map(p=>p[1])),Math.max(...ring.map(p=>p[1]))],map=play.terrain.bounds;
  if(bounds[0]<map[0]||bounds[1]>map[1]||bounds[2]<map[2]||bounds[3]>map[3]||play.prisms.some(q=>overlap(bounds,q.bounds))||play.boxes.some(q=>overlap(bounds,[q.minx,q.maxx,q.minz,q.maxz]))){rejected.push({id:b.id,reason:'occupied'});continue;}
  const faces=THREE.ShapeUtils.triangulateShape(ring.map(p=>new THREE.Vector2(...p)),[]),flat=faces.flatMap(f=>f.flatMap(i=>[ring[i][0],0,ring[i][1]])),ground=drapeTerrainTriangles(play.terrain,flat,0),heights=ground.filter((_,i)=>i%3===1);
  if(!heights.length||!heights.every(Number.isFinite)||Math.max(...heights)-Math.min(...heights)>1.2){rejected.push({id:b.id,reason:'steep-ground'});continue;}
  const base=Math.min(...heights)-.015,shape=new THREE.Shape(ring.map(([x,z])=>new THREE.Vector2(x,-z))),g=new THREE.ExtrudeGeometry(shape,{depth:b.height,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);g.translate(0,base,0);const p=g.attributes.position;
  for(const group of g.groups){const k=group.materialIndex===0?0:1,part=[];for(let i=group.start;i<group.start+group.count;i++)part.push(p.getX(i),p.getY(i),p.getZ(i));positions[k].push(...part);uv[k].push(...(k?facadeUvs(part,base,b.height):part.flatMap((v,i)=>i%3===0?[v/1.8,part[i+2]/1.8]:[])));for(let i=0;i<part.length;i+=9)owners[k].push(b.id);}
  const ys=Array.from({length:p.count},(_,i)=>p.getY(i));play.prisms.push({rings:b.rings,miny:Math.min(...ys),maxy:Math.max(...ys),bounds,authored:'overture-building',sourceId:b.id,heightSource:b.heightSource});added.push(b.id);g.dispose();
 }
 scene.userData.sileSupplementStats={candidates:data.supplementalBuildings.length,buildings:added.length,added,rejected,assumedHeightM:7.5,measuredHeights:0};if(!added.length)return;
 const values=[...positions[0],...positions[1]],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(values,3));g.setAttribute('uv',new THREE.Float32BufferAttribute([...uv[0],...uv[1]],2));g.setAttribute('color',new THREE.Float32BufferAttribute(Array(values.length).fill(1),3));g.addGroup(0,positions[0].length/3,0);g.addGroup(positions[0].length/3,positions[1].length/3,1);g.computeVertexNormals();
 const roof=scene.getObjectByName('sile-buildings-0')?.material,wall=scene.getObjectByName('sile-buildings-1')?.material,mesh=new THREE.Mesh(g,[roof||new THREE.MeshStandardMaterial({color:0xb0a394,roughness:1}),wall||new THREE.MeshStandardMaterial({color:0xc6bca9,roughness:1})]);mesh.name='sile-supplemental-buildings';mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
 const ids=[...owners[0],...owners[1]];play.terrainWalls??=[];for(const c of coastCliffContacts(g)){const [a,b,d]=c.vertices,ny=(b[2]-a[2])*(d[0]-a[0])-(b[0]-a[0])*(d[2]-a[2]);play.terrainWalls.push({...c,mesh:mesh.name,sourceId:ids[c.face],authored:'overture-building',landing:ny>1e-8,reason:'binaya çarptı'});}
}
