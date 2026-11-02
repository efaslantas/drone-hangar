import {makeArcadeObject} from './arcade-craft.js';
import * as THREE from 'three';
import {arcadePose} from './arcade.js';

// Colourful toy objects: authored game art, not real vehicle replicas.
export function createArcadeView(scene,session,{guides=false}={}){
 let showGuides=guides;
 const root=new THREE.Group();root.name='arcade-game';scene.add(root);
 const objects=new Map();
 for(const target of session.targets){
  const g=new THREE.Group();g.userData.target=target.id;root.add(g);objects.set(target.id,g);
  g.add(makeArcadeObject(target));
  const halo=new THREE.Mesh(new THREE.TorusGeometry(target.r+.7,.055,5,40),new THREE.MeshBasicMaterial({color:target.color,transparent:true,opacity:.7,depthWrite:false}));
  halo.position.y=0;halo.userData.arcadeGuide=true;halo.visible=showGuides;g.add(halo);g.userData.halo=halo;
  const points=[];
  for(let i=0;i<=64;i++){const p=arcadePose(target,i*target.period/64);points.push(new THREE.Vector3(p.x,target.kind==='car'?.09:p.y,p.z));}
  const pathGeo=new THREE.BufferGeometry().setFromPoints(points),normals=new Float32Array(points.length*3);
  for(let i=0;i<points.length;i++)normals[i*3+1]=1;pathGeo.setAttribute('normal',new THREE.BufferAttribute(normals,3));
  const path=new THREE.Line(pathGeo,new THREE.LineBasicMaterial({color:target.color,transparent:true,opacity:scene.userData.variant==='aftermath'?.055:.2}));
  path.userData.arcadeGuide=true;path.visible=showGuides;path.userData.path=target.id;root.add(path);
 }
 const burst=new THREE.Group();root.add(burst);burst.visible=false;
 const burstMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false});
 const burstGeo=new THREE.BoxGeometry(.22,.22,.22);
 for(let i=0;i<24;i++){
  const m=new THREE.Mesh(burstGeo,burstMat);const angle=i*2.39996;
  m.userData.direction=new THREE.Vector3(Math.cos(angle),.2+(i%5)/5,Math.sin(angle)).normalize();burst.add(m);
 }
 return {root,setGuides(value){showGuides=!!value;},paint(a,camera){
  for(const target of a.targets){
   const g=objects.get(target.id),p=arcadePose(target,a.t);
   g.visible=!target.done;g.position.set(p.x,p.y,p.z);g.rotation.y=p.yaw;
   g.userData.halo.visible=showGuides&&!target.done;
   if(camera)g.userData.halo.lookAt(camera.position);
  }
  for(const child of root.children)if(child.userData.path)child.visible=showGuides&&!a.targets.find(t=>t.id===child.userData.path).done;
  const age=a.burst?a.t-a.burst.t:Infinity;burst.visible=age<1.4;
  if(burst.visible){
   burst.position.set(a.burst.x,a.burst.y,a.burst.z);burstMat.color.setHex(a.burst.color);burstMat.opacity=1-age/1.4;
   for(const m of burst.children){m.position.copy(m.userData.direction).multiplyScalar(age*5);m.rotation.set(age*3,age*4,age*2);}
  }
 },dispose(){
  root.removeFromParent();const resources=new Set();
  root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});
  for(const r of resources)r.dispose();root.clear();
 }};
}
