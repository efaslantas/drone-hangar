import * as THREE from 'three';
import { surfaceTexture } from './surfaces.js';
import { grassBladeGeometry } from './natural-shapes.js';

// Decorative layers stay outside the collision contract. The buildings and
// fence are authored by world.js; all runway/apron additions are flush surfaces.
export function addAirfieldDetail(scene, play) {
  const root = new THREE.Group();
  root.name = 'airfield-detail';
  const paint = new THREE.MeshStandardMaterial({ color:0xd9d8c1,roughness:.97 });
  const yellow = new THREE.MeshStandardMaterial({ color:0xc2a94d,roughness:.96 });
  const metal = new THREE.MeshStandardMaterial({ color:0x525b52,roughness:.74,metalness:.42 });
  const glass = new THREE.MeshStandardMaterial({ color:0x334d50,roughness:.22,metalness:.35 });
  const concrete = new THREE.MeshStandardMaterial({ color:0x91958a,map:surfaceTexture('concrete',12),roughness:.92 });
  function slab(w,d,x,z,material,y=.0004,name='') {
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),material);
    material.polygonOffset=true;material.polygonOffsetFactor=-2;material.polygonOffsetUnits=-2;
    m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.receiveShadow=true;m.name=name;
    root.add(m);return m;
  }
  slab(91,24,0,8,concrete,.00015,'airfield-apron');
  const marks=new THREE.Group();marks.name='airfield-runway-markings';root.add(marks);
  function stripe(w,d,x,z,mat=paint) {
    const m=slab(w,d,x,z,mat);root.remove(m);marks.add(m);return m;
  }
  stripe(.14,96,-8.35,-34);stripe(.14,96,8.35,-34);
  for(let z=-77;z<-7;z+=11) stripe(.28,5,0,z);
  for(const z of [-78,-5]) for(const x of [-6.4,-4.4,-2.4,2.4,4.4,6.4]) stripe(.8,3.8,x,z);
  for(const x of [-18,18]) { stripe(.12,20,x,7,yellow);stripe(12,.12,x,16,yellow); }
  for(const x of [-37,-27,27,37]) { stripe(.09,5,x,-.5,yellow);stripe(7,.09,x,-3,yellow); }
  // Fine roof ribs and framed doors give the existing solid hangars metre-scale detail.
  for(const [cx,w,h,d] of [[28,36,10,22],[-26,30,8,18]]) {
    const front=8-d/2-.025;
    const door=new THREE.Mesh(new THREE.BoxGeometry(w*.63,h*.68,.08),metal);
    door.position.set(cx,h*.34,front);door.name='airfield-hangar-door';root.add(door);
    const rib=new THREE.InstancedMesh(new THREE.BoxGeometry(.055,h,.06),metal,Math.floor(w/1.2));
    const dummy=new THREE.Object3D();
    for(let i=0;i<rib.count;i++){dummy.position.set(cx-w/2+.6+i*1.2,h/2,front-.055);dummy.updateMatrix();rib.setMatrixAt(i,dummy.matrix);}
    rib.name='airfield-hangar-ribs';root.add(rib);
    const window=new THREE.Mesh(new THREE.BoxGeometry(w*.6,.65,.09),glass);
    window.position.set(cx,h*.82,front-.08);root.add(window);
    const trim=new THREE.Mesh(new THREE.BoxGeometry(w+.16,.13,.3),metal);
    trim.position.set(cx,h-.3,front);root.add(trim);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(w+.6,.18,d+.6),metal);
    roof.position.set(cx,h+.08,8);roof.castShadow=true;root.add(roof);
  }
  // Layered low hills give a horizon beyond the bounded practice field.
  const terrain=new THREE.PlaneGeometry(700,700,48,48);terrain.rotateX(-Math.PI/2);
  const positions=terrain.attributes.position;
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i),distance=Math.max(Math.abs(x),Math.abs(z+25));
    const rise=Math.max(0,Math.min(1,(distance-90)/120));
    positions.setY(i,-.06+rise*(5+Math.sin(x*.022)*7+Math.cos(z*.018)*5));
  }
  terrain.computeVertexNormals();
  const horizon=new THREE.Mesh(terrain,new THREE.MeshStandardMaterial({color:0x71825b,roughness:1}));
  horizon.name='airfield-horizon';horizon.position.y=-.04;horizon.receiveShadow=true;root.add(horizon);
  // Perimeter grass is batched; it can disappear without changing a single collider.
  {
    const grassGeo=grassBladeGeometry();
    const grass=new THREE.InstancedMesh(grassGeo,new THREE.MeshStandardMaterial({color:0x687748,roughness:1,side:THREE.DoubleSide}),560);
    const dummy=new THREE.Object3D();
    let seed=1973;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<grass.count;i++){
      const side=i%2?1:-1;dummy.position.set(side*(13+random()*28),.015,-15-random()*65);
      dummy.rotation.set(0,random()*Math.PI,0);dummy.scale.setScalar(.18+random()*.25);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
    }
    grass.name='airfield-edge-grass';grass.receiveShadow=true;root.add(grass);
  }
  scene.add(root);
  return root;
}
