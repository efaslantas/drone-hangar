import * as THREE from 'three';

// Enforce the limit on the exact UTF-8 download bytes, without rewriting data
// or adding whitespace after the report has passed its own storage bounds.
export function inspectionDownloadBlob(report){
 try{
  const value=JSON.stringify(report);if(typeof value!=='string')return null;
  const blob=new Blob([value],{type:'application/json'});return blob.size<=2500000?blob:null;
 }catch{return null;}
}

// Only actual static Şile geometry participates. Markers, aircraft, sea and foam
// never provide visibility evidence. Missing geometry or an invalid ray fails closed.
export function inspectionVisibility(scene,camera,target){
 if(!scene||!camera||!target||![target.x,target.y,target.z].every(Number.isFinite))return false;
 const meshes=[];scene.traverse(o=>{if(o.isMesh&&o.name.startsWith('sile-')&&!/sea|foam|inspection/.test(o.name))meshes.push(o);});
 if(!meshes.length)return false;
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 const origin=camera.getWorldPosition(new THREE.Vector3()),direction=new THREE.Vector3(target.x,target.y,target.z).sub(origin),distance=direction.length();
 if(!Number.isFinite(distance)||distance<.01)return false;
 direction.normalize();const ray=new THREE.Raycaster(origin,direction,0,Math.max(0,distance-.35));
 try{return ray.intersectObjects(meshes,false).length===0;}catch{return false;}
}
export function captureInspectionFrame(canvas,createCanvas=()=>document.createElement('canvas')){
 try{
  if(!canvas?.width||!canvas?.height)return null;
  const out=createCanvas();out.width=320;out.height=180;const context=out.getContext('2d');if(!context)return null;
  context.drawImage(canvas,0,0,320,180);const image=out.toDataURL('image/jpeg',.7);
  return image.startsWith('data:image/jpeg;base64,')&&image.length<=180000?image:null;
 }catch{return null;}
}
export function createInspectionView(scene,session){
 const root=new THREE.Group();root.name='inspection-guides';
 for(const point of session.scenario.points){
  for(const [at,size,color]of [[point.target,1.2,0xffcb65],[point.position,2.2,0x70dfcd]]){
   const marker=new THREE.Mesh(new THREE.SphereGeometry(size,12,8),new THREE.MeshBasicMaterial({color,wireframe:true,transparent:true,opacity:.75,depthWrite:false}));
   marker.position.set(at.x,at.y,at.z);marker.userData.pointId=point.id;root.add(marker);
  }
 }
 scene.add(root);
 return {
  sensor(camera,fpv){
   camera.updateMatrixWorld(true);const position=camera.getWorldPosition(new THREE.Vector3()),forward=camera.getWorldDirection(new THREE.Vector3());
   const point=session.scenario.points.find(p=>p.id===session.activePointId),target=point?.target;
   // Ray tests remain authoritative for every candidate frame; these cheap
   // rejection checks grant no visibility and avoid scanning the whole map en route.
   const toward=target?new THREE.Vector3(target.x,target.y,target.z).sub(position):null;
   const near=point&&Math.hypot(position.x-point.position.x,position.y-point.position.y,position.z-point.position.z)<=point.radius+1;
   const aimed=toward&&toward.lengthSq()>0&&forward.dot(toward.normalize())>=Math.cos(Math.PI/12);
   const candidate=session.status==='active'&&fpv===true&&near&&aimed;
   return {position:{x:position.x,y:position.y,z:position.z},forward:{x:forward.x,y:forward.y,z:forward.z},visible:!!candidate&&inspectionVisibility(scene,camera,target),fpv};
  },
  paint(){for(const marker of root.children)marker.visible=marker.userData.pointId===session.activePointId;},
  dispose(){scene.remove(root);root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});},
 };
}
