import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Artist-built hardware, not a claim to reproduce a particular flight controller.
export function addDroneElectronics(root,spec,appearance,materials){
 const group=new THREE.Group();group.name='flight-electronics';
 const aio=['micro','whoop'].includes(spec.id),span=Math.min(aio?.020:.036,appearance.plateW*.88,appearance.plateL*.7);
 const pitch=appearance.sourceOne?.0305:span*.74,thickness=aio?.0008:.0012;
 const lower=aio?.003:.006,upper=Math.max(lower+.003,Math.min(.018,appearance.stackH-.004));
 const boards=aio?[lower]:[lower,upper],batches=new Map();
 const add=(geo,mat,x=0,y=0,z=0)=>{if(geo.index){const source=geo;geo=geo.toNonIndexed();source.dispose();}geo.translate(x,y,z);if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push(geo);};
 const addBoard=(geometry,y,z,name)=>{const mesh=new THREE.Mesh(geometry,materials.pcb);mesh.name=name;mesh.position.set(0,y,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);};
 const chip=(w,h,l,x,y,z)=>add(new THREE.BoxGeometry(w,h,l),materials.tape,x,y,z);
 for(const [index,y] of boards.entries()){
  const shape=new THREE.Shape([[-span/2,-span/2],[span/2,-span/2],[span/2,span/2],[-span/2,span/2]].map(p=>new THREE.Vector2(...p)));
  for(const x of [-1,1])for(const z of [-1,1]){const hole=new THREE.Path();hole.absarc(x*pitch/2,z*pitch/2,aio?.00065:.00165,0,Math.PI*2);shape.holes.push(hole);}
  const board=new THREE.ExtrudeGeometry(shape,{depth:thickness,steps:1,bevelEnabled:false,curveSegments:8});board.rotateX(Math.PI/2);addBoard(board,y,0,aio?'aio-controller-board':index===0?'electronic-speed-controller-board':'flight-controller-board');
  if(index===boards.length-1){chip(span*.28,.0012,span*.28,0,y+.0006,0);chip(span*.12,.0008,span*.12,span*.29,y+.0004,0);}
  if(!aio&&index===0)for(const side of [-1,1])for(const z of [-1,0,1])chip(.005,.0012,.004,side*span*.25,y+.0006,z*span*.22);
  for(const side of [-1,1])for(let i=0;i<5;i++){
   add(new THREE.BoxGeometry(span*.055,.0005,span*.028),materials.gold,side*span*.42,y+.00025,(i-2)*span*.12);
   chip(span*.05,.0006,span*.03,side*span*.25,y+.0003,(i-2)*span*.12);
  }
 }
 for(const x of [-1,1])for(const z of [-1,1]){
  const base=aio?.0006:.0015,height=boards.at(-1)-base+.0015;
  add(new THREE.CylinderGeometry(aio?.00045:.00085,aio?.00045:.00085,height,8),materials.metal,x*pitch/2,base+height/2,z*pitch/2);
  for(const y of boards){add(new THREE.CylinderGeometry(aio?.0012:.0025,aio?.0012:.0025,.0018,10),materials.tpu,x*pitch/2,y-.0014,z*pitch/2);add(new THREE.CylinderGeometry(aio?.00085:.0017,aio?.00085:.0017,.0007,6),materials.metal,x*pitch/2,y+.001,z*pitch/2);}
 }
 if(!aio){
  const tailEnd=appearance.plateL/2-.001,tailStart=span/2+.0015;
  const vtxLength=Math.min(.018,tailEnd-tailStart),rear=THREE.MathUtils.clamp(appearance.plateL*.32,tailStart+vtxLength/2,tailEnd-vtxLength/2),y=Math.min(appearance.stackH-.007,.018);
  addBoard(new THREE.BoxGeometry(Math.min(.018,span*.7),.0012,vtxLength),y,rear,'video-transmitter-board');
  add(new THREE.BoxGeometry(Math.min(.014,span*.55),.003,Math.min(.012,vtxLength*.75)),materials.metal,0,y+.002,rear);
  // Rear capacitor and insulated base, sized to stay inside the plate.
  add(new THREE.CylinderGeometry(.0035,.0035,.010,12),materials.bell,span*.32,.008,rear);
  add(new THREE.CylinderGeometry(.0035,.0035,.0006,12),materials.metal,span*.32,.0133,rear);
 }
 for(const [material,pieces] of batches){const mesh=new THREE.Mesh(mergeGeometries(pieces),material);mesh.name='electronic-components';mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);pieces.forEach(g=>g.dispose());}
 group.userData={boardCount:boards.length,mountCount:4,boardSpan:span,mountPitch:pitch,evidence:'Representative electronics; not manufacturer PCB CAD'};
 root.add(group);return group;
}
