import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { surfaceTexture } from './surfaces.js';
import { aabbFromBox } from './collide.js';
import { grassBladeGeometry } from './natural-shapes.js';

export function enrichMap(scene, play, id) {
  const groups=new Map();
  const steel=new THREE.MeshStandardMaterial({color:0x59615e,metalness:.45,roughness:.67});
  const concrete=new THREE.MeshStandardMaterial({color:0x939084,roughness:.96});
  const dark=new THREE.MeshStandardMaterial({color:0x303a37,roughness:.87});
  const paint=new THREE.MeshStandardMaterial({color:0xc1b99b,roughness:.95});
  function box(w,h,d,x,y,z,mat,solid=false) {
    const geo=new THREE.BoxGeometry(w,h,d);geo.translate(x,y,z);
    if(!groups.has(mat))groups.set(mat,[]);groups.get(mat).push(geo);
    if(solid)play.boxes.push(aabbFromBox(x,y,z,w,h,d));
  }
  const buildings=scene.children.filter(o=>o.geometry?.type==='BoxGeometry' && o.geometry.parameters.width>=8 && o.geometry.parameters.height>=5 && o.geometry.parameters.depth>=5);
  for(const building of buildings) {
    const {width:w,height:h,depth:d}=building.geometry.parameters;
    const {x,y,z}=building.position;const base=y-h/2;
    if(!building.material.map) {
      building.material.map=surfaceTexture('concrete',2);
      building.material.userData.preserveTint=true;
      building.material.needsUpdate=true;
    }
    const doorW=Math.min(4,w*.3), doorH=Math.min(3.4,h*.6);
    // Closed roller door and frame sit against the existing building collider.
    box(doorW,doorH,.035,x,base+doorH/2,z+d/2+.018,dark);
    for(let dy=.15;dy<doorH;dy+=.23)box(doorW,.032,.06,x,base+dy,z+d/2+.033,steel);
    for(const side of [-1,1])box(.12,doorH+.15,.09,x+side*(doorW/2+.06),base+doorH/2,z+d/2+.04,concrete);
    box(doorW+.25,.15,.18,x,base+doorH+.1,z+d/2+.06,concrete);
    // Rooftop equipment has matching collision boxes.
    box(1.9,.75,1.3,x+w*.22,y+h/2+.375,z,steel,true);
    for(let i=0;i<6;i++)box(.035,.53,1.15,x+w*.22-.72+i*.28,y+h/2+.4,z,dark);
    box(.24,h,.18,x-w/2+.3,y,z+d/2+.1,steel);
    if(id==='city') {
      // Shallow pavement follows the facade, without narrowing the central street.
      box(w+.7,.12,1.2,x,.06,z+d/2+.65,concrete,true);
    }
  }
  if(id==='indoor') {
    // Equipment stays against walls, clear of the school route.
    for(const x of [-36,36])for(const z of [-12,-42]) {
      box(2.4,1.25,.8,x,.625,z,steel,true);
      box(2.5,.08,.9,x,1.29,z,concrete,true);
      for(let k=0;k<3;k++)box(.65,.045,.04,x-.8+k*.8,.9,z+.42,dark);
    }
    for(const x of [-38.8,38.8])box(.1,.12,108,x,4,-20,steel);
  }
  if(id==='airfield') {
    for(let i=0;i<9;i++)box(.25,.015,3.5,0,.049,-15-i*7,paint);
    for(const side of [-1,1])for(let i=0;i<5;i++)box(.6,.015,5,side*(2+i),.049,10,paint);
  }
  for(const [mat,geos] of groups) {
    const mesh=new THREE.Mesh(mergeGeometries(geos),mat);mesh.name='map-architecture';mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);geos.forEach(g=>g.dispose());
  }
  for(const mat of [steel,concrete,dark,paint])if(!groups.has(mat))mat.dispose();
  if(id==='indoor')return;
  // Terrain is beyond the playable boundary, so the map no longer ends at a blank horizon.
  const hillMat=new THREE.MeshStandardMaterial({color:id==='coast'?0x787a69:0x65715c,roughness:1});
  const tr=new THREE.Object3D();
  const radius=Math.max(play.bounds.maxx-play.bounds.minx,play.bounds.maxz-play.bounds.minz)*1.8;
  // The transparent boundary now exposes the surroundings. Continue the
  // ground beneath the distant trees instead of revealing a white void.
  const coast=id==='coast',extent=radius*3;
  const skirt=new THREE.Mesh(new THREE.PlaneGeometry(extent,coast?extent/2:extent),
    new THREE.MeshStandardMaterial({map:surfaceTexture(coast?'sand':'earth',48),roughness:1,color:0x8b8875}));
  skirt.name='outer-ground';skirt.rotation.x=-Math.PI/2;skirt.position.set(0,-.3,
    coast?play.bounds.minz+extent/4:(play.bounds.minz+play.bounds.maxz)/2);
  skirt.receiveShadow=true;scene.add(skirt);
  // Continuous irregular ridgeline replaces the ring of inflated spheres.
  const vertices=[],indices=[],segments=128,rows=6;
  for(let row=0;row<rows;row++)for(let i=0;i<=segments;i++) {
    const a=i/segments*Math.PI*2,t=row/(rows-1),r=radius*(.73+t*.65);
    const ridge=8+5*Math.sin(a*3+.7)+3*Math.sin(a*7)+2*Math.cos(a*13);
    const ocean=id==='coast'&&Math.sin(a)<-.35;
    const y=ocean?-12:-4+Math.sin(t*Math.PI)*ridge;
    vertices.push(Math.cos(a)*r,y,(play.bounds.minz+play.bounds.maxz)/2+Math.sin(a)*r);
    if(row<rows-1&&i<segments){const k=row*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
  }
  const terrain=new THREE.BufferGeometry();terrain.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));terrain.setIndex(indices);terrain.computeVertexNormals();
  const hills=new THREE.Mesh(terrain,hillMat);hills.name='distant-terrain';scene.add(hills);
  if(!['forest','coast','yard'].includes(id))return;
  let seed=135;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const points=[];const count=scene.userData.lite?100:450;
  for(let i=0;i<count;i++) {
    const x=play.bounds.minx+3+random()*(play.bounds.maxx-play.bounds.minx-6);
    const z=play.bounds.minz+3+random()*(play.bounds.maxz-play.bounds.minz-6);
    if(Math.hypot(x,z)<9 || Math.abs(x)<10)continue;
    if(play.boxes.some(b=>x>b.minx-1&&x<b.maxx+1&&z>b.minz-1&&z<b.maxz+1))continue;
    if(id==='forest'&&Math.hypot(x-play.bounds.minx*.35,z-((play.bounds.minz+play.bounds.maxz)/2-10))<15)continue;
    points.push([x,z,.15+random()*.35,random()*Math.PI]);
  }
  const blade=grassBladeGeometry();
  const grassMat=new THREE.MeshStandardMaterial({color:id==='coast'?0x8a8960:0x65784c,roughness:1,side:THREE.DoubleSide});
  const grass=new THREE.InstancedMesh(blade,grassMat,points.length*7);grass.name='ground-vegetation';
  let index=0;for(const [x,z,height,yaw]of points)for(let k=0;k<7;k++) {
    tr.position.set(x+Math.sin(k*2.4)*.04,0,z+Math.cos(k*2.4)*.04);tr.rotation.set(0,yaw+k*2.4,0);tr.scale.set(1,height*(.7+(k%3)*.2),1);tr.updateMatrix();grass.setMatrixAt(index++,tr.matrix);
  }
  grass.computeBoundingSphere();grass.receiveShadow=true;scene.add(grass);
}
