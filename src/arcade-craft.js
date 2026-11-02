import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Authored fictional game art; dimensions are visual, not a measured vehicle replica.
export function makeArcadeObject(target){
 const root=new THREE.Group();
 const paint=new THREE.MeshStandardMaterial({color:target.kind==='car'?(target.id.includes('blue')?0x536873:0x836358):0xb9bbb0,roughness:.4,metalness:.32});
 const glass=new THREE.MeshStandardMaterial({color:0x253e48,roughness:.15,metalness:.62});
 const dark=new THREE.MeshStandardMaterial({color:0x222725,roughness:.93});
 const metal=new THREE.MeshStandardMaterial({color:0x6f7779,roughness:.42,metalness:.8});
 const lens=new THREE.MeshStandardMaterial({color:0x162c36,roughness:.08,metalness:.7});
 const mark=new THREE.MeshStandardMaterial({color:0xc6c0a6,roughness:.65});
 const mesh=(geometry,material,x=0,y=0,z=0)=>{
  const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;
 };
 const box=(w,h,d,x,y,z,material=paint,r=.035)=>mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/4,h/4,d/4)),material,x,y,z);
 if(target.kind==='car'){
  box(1.8,.58,3.5,0,-.42,0);box(1.84,.2,3.2,0,-.75,0,dark);
  box(1.5,.6,1.75,0,.12,-.15,glass,.08);box(1.53,.1,1.7,0,.46,-.18,paint);
  for(const x of [-.77,.77]){box(.08,.68,1.75,x,.12,-.15);box(.09,.65,.08,x,.1,-.35);box(.08,.15,3.2,x,-.1,0);}
  box(1.7,.15,.17,0,-.58,1.8,metal);box(1.7,.15,.17,0,-.58,-1.8,dark);
  box(.65,.18,.05,0,-.35,1.79,dark);box(1.6,.05,.1,0,-.15,1.62);
  for(const x of [-.62,.62]){box(.32,.14,.06,x,-.26,1.78,mark);box(.3,.12,.06,x,-.31,-1.78,paint);box(.2,.11,.3,x*1.5,.12,.5,dark);}
  const tyre=new THREE.CylinderGeometry(.48,.48,.27,18),hub=new THREE.CylinderGeometry(.26,.26,.285,12);
  for(const x of [-.92,.92])for(const z of [-1.14,1.14]){
   const wheel=mesh(tyre,dark,x,-.82,z);wheel.rotation.z=Math.PI/2;
   const rim=mesh(hub,metal,x,-.82,z);rim.rotation.z=Math.PI/2;
  }
 }else if(target.kind==='plane'){
  const hull=mesh(new THREE.CylinderGeometry(.19,.34,3.4,14),paint,0,0,.1);hull.rotation.x=Math.PI/2;
  mesh(new THREE.SphereGeometry(.3,14,8),paint,0,0,1.78);
  const wing=new THREE.Shape();wing.moveTo(-2.5,-.5);wing.lineTo(-2.45,.1);wing.lineTo(-.45,.72);wing.lineTo(.45,.72);wing.lineTo(2.45,.1);wing.lineTo(2.5,-.5);wing.lineTo(.5,-.32);wing.lineTo(-.5,-.32);wing.closePath();
  const wings=mesh(new THREE.ExtrudeGeometry(wing,{depth:.075,bevelEnabled:false}),paint,0,0,0);wings.rotation.x=-Math.PI/2;
  box(2,.07,.6,0,.2,-1.35,mark);box(.07,.75,.65,0,.55,-1.35,paint);
  box(.42,.26,.72,0,.28,.75,glass,.08);
  const prop=box(1.1,.07,.04,0,0,2.1,dark);prop.rotation.z=.6;
  for(const x of [-1.9,1.9])box(.16,.09,.55,x,.08,.08,dark);
 }else{
  box(.42,.2,.65,0,0,0,dark);box(.27,.19,.46,0,.2,-.12,paint);
  for(const x of [-.12,.12])box(.045,.21,.5,x,.2,-.12,dark);
  for(const side of [-1,1]){
   const arm=box(1.55,.055,.11,0,-.1,0,dark);arm.rotation.y=side*Math.PI/4;
  }
  for(const x of [-.53,.53])for(const z of [-.53,.53]){
   mesh(new THREE.CylinderGeometry(.1,.1,.13,12),metal,x,-.02,z);
   const rotor=box(.65,.018,.06,x,.06,z,dark,.006);rotor.rotation.y=x*z*3;
   mesh(new THREE.CylinderGeometry(.027,.027,.05,8),paint,x,.09,z);
  }
  box(.29,.22,.14,0,.02,.36,paint);
  const camera=mesh(new THREE.CylinderGeometry(.09,.085,.11,14),lens,0,.04,.47);camera.rotation.x=Math.PI/2;
  const antenna=mesh(new THREE.CylinderGeometry(.015,.015,.43,6),dark,0,.28,-.39);antenna.rotation.x=-.35;
 }
 // Dispose only materials actually used by this object; ownership is transferred to view.
 const used=new Set();root.traverse(o=>{if(o.material)used.add(o.material);});
 for(const material of [paint,glass,dark,metal,lens,mark])if(!used.has(material))material.dispose();
 return root;
}
