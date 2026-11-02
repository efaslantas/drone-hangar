import * as THREE from 'three';
import data from './source-one-geometry.js';
import {carbonUvs} from './airframe-appearance.js';
function geometry(part){
 const path=new THREE.Shape(part.outline.map(p=>new THREE.Vector2(...p)));
 for(const ring of part.holes)path.holes.push(new THREE.Path(ring.map(p=>new THREE.Vector2(...p))));
 return new THREE.ExtrudeGeometry(path,{depth:part.depth,bevelEnabled:false,steps:1,curveSegments:4});
}
export function makeSourceOneFrame(material,appearance,edgeMaterial=material){
 const root=new THREE.Group();root.name='source-one-cad-frame';root.userData.license=data.license;root.userData.commit=data.commit;root.userData.assembly='approximate';
 const part=(id,name,y)=>{
  const definition=data.parts[id],geo=geometry(definition);geo.rotateX(Math.PI/2);carbonUvs(geo);
  const mesh=new THREE.Mesh(geo,[material,edgeMaterial]);mesh.name=name;mesh.position.y=y;mesh.userData.depth=definition.depth;mesh.userData.holes=definition.holes.length;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;
 };
 part('bottom','source-one-bottom',-.003);part('center','source-one-center',.004);part('top','source-one-top',.032);
 const spread=appearance.wheelbase/Math.sqrt(8),mx=.035907,mz=.025432,bx=-.041156, bz=-.030681,angle=Math.atan2(mz-bz,mx-bx);
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const arm=part('arm','source-one-arm',.001),yaw=angle-Math.atan2(sz,sx),c=Math.cos(yaw),s=Math.sin(yaw);
  arm.rotation.y=yaw;arm.position.x=sx*spread-(mx*c+mz*s);arm.position.z=sz*spread-(-mx*s+mz*c);
 }
 for(const side of [-1,1]){
  const definition=data.parts.camera,geo=geometry(definition);geo.rotateY(Math.PI/2);carbonUvs(geo);
  const mesh=new THREE.Mesh(geo,[material,edgeMaterial]);mesh.name='source-one-camera-plate';mesh.position.set(side<0?-.013:.011,.015,-.064);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
 }
 return root;
}
