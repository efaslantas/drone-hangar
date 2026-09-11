import * as THREE from 'three';
import { loadModel } from './props.js';

export function worldGeometry(mesh) {
  const geo=mesh.geometry.clone(),src=geo.getAttribute('position');
  // Meshopt exports quantized normalized integers. Baking metre-scale world
  // transforms into that storage wraps coordinates and tears fence triangles.
  const positions=new THREE.Float32BufferAttribute(new Float32Array(src.count*3),3);
  for(let i=0;i<src.count;i++)positions.setXYZ(i,src.getX(i),src.getY(i),src.getZ(i));
  geo.setAttribute('position',positions);geo.applyMatrix4(mesh.matrixWorld);return geo;
}

/** The boundary remains the existing play.bounds; only its visible mesh changes. */
export async function placePerimeter(scene,play,token) {
  const height=scene.userData.perimeterHeight;
  if(!height||height<1)return 0; // retain the low coastal parapet
  const {root}=await loadModel('modular_chainlink_fence');
  if(scene.userData.worldToken!==token)return 0;
  const panel=root.getObjectByName('modular_chainlink_fence_double');
  const post=root.getObjectByName('modular_chainlink_fence_post');
  if(!panel||!post)throw new Error('Missing modular fence parts');
  const {minx,maxx,minz,maxz}=play.bounds;
  const edges=[[[minx,minz],[maxx,minz]],[[maxx,minz],[maxx,maxz]],[[maxx,maxz],[minx,maxz]],[[minx,maxz],[minx,minz]]];
  const panels=[],posts=[];
  for(const [[ax,az],[bx,bz]] of edges) {
    const length=Math.hypot(bx-ax,bz-az),count=Math.ceil(length/(height*.78));
    const yaw=-Math.atan2(bz-az,bx-ax);
    for(let i=0;i<count;i++) {
      const t=(i+.5)/count;
      panels.push({x:ax+(bx-ax)*t,z:az+(bz-az)*t,w:length/count,yaw});
      posts.push({x:ax+(bx-ax)*i/count,z:az+(bz-az)*i/count,w:height*.059,yaw});
    }
  }
  const group=new THREE.Group();group.name='scanned-perimeter';
  function instances(source,entries) {
    source.updateWorldMatrix(true,true);
    const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3());
    const center=bounds.getCenter(new THREE.Vector3());
    source.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const geo=worldGeometry(mesh);
      geo.translate(-center.x,-bounds.min.y,-center.z);
      const mats=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(m=>{
        const mat=m.clone();if(mat.transparent){mat.transparent=false;mat.alphaTest=.4;mat.depthWrite=true;}
        scene.userData.worldResources?.add(mat);return mat;
      });
      const batch=new THREE.InstancedMesh(geo,Array.isArray(mesh.material)?mats:mats[0],entries.length);
      const tr=new THREE.Object3D();
      entries.forEach((e,i)=>{
        tr.position.set(e.x,0,e.z);tr.rotation.y=e.yaw;
        tr.scale.set(e.w/size.x,height/size.y,height/size.y);tr.updateMatrix();batch.setMatrixAt(i,tr.matrix);
      });
      batch.castShadow=batch.receiveShadow=true;batch.computeBoundingSphere();group.add(batch);
      scene.userData.worldResources?.add(geo);
    });
  }
  instances(panel,panels);instances(post,posts);
  for(const part of scene.children)if(part.userData.perimeterFallback)part.visible=false;
  scene.add(group);return panels.length;
}
