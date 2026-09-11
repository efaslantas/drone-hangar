// Detailed CC0 trees with shared resources and distance-based geometry.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
export const VARIANTS = {
  oak: ['island_tree_01','island_tree_02'],
  palm: ['island_tree_02','island_tree_01'], // coastal broadleaf replaces stylized palms
  pineTall: ['pine_sapling_medium'],
  pineRound: ['pine_sapling_small'],
};
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache=new Map();
function loadTree(id) {
  if(!cache.has(id)) {
    const request=Promise.all(['', '-lod'].map(suffix=>loader.loadAsync(`/models/${id}/${id}${suffix}.glb`)))
      .then(levels=>levels.map(gltf=>{
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse(o=>{
          if(!o.isMesh)return;
          o.castShadow=o.receiveShadow=true;
          for(const mat of Array.isArray(o.material)?o.material:[o.material]) {
            // Cutout leaves write depth, avoiding sorted-transparent crowns.
            if(mat.transparent||mat.alphaTest>0){mat.transparent=false;mat.alphaTest=.25;mat.depthWrite=true;}
            mat.side=THREE.DoubleSide;mat.needsUpdate=true;
          }
        });return gltf.scene;
      })).catch(error=>{cache.delete(id);throw error;});
    cache.set(id,request);
  }return cache.get(id);
}
export function treePart(source,id,variant) {
  if(!id.startsWith('pine_sapling_'))return source;
  const suffix=id==='pine_sapling_medium'?'_LOD0':'';
  return source.getObjectByName(`${id}_${['a','b','c'][variant%3]}${suffix}`)||source;
}
export function fitTree(source,height) {
  const root=new THREE.Group(),copy=source.clone(true);
  source.updateWorldMatrix(true,false);
  source.matrixWorld.decompose(copy.position,copy.quaternion,copy.scale);
  root.add(copy);root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  const factor=height/Math.max(.01,bounds.max.y-bounds.min.y);
  copy.position.x-=(bounds.min.x+bounds.max.x)/2;
  copy.position.z-=(bounds.min.z+bounds.max.z)/2;
  copy.position.y-=bounds.min.y;root.scale.setScalar(factor);
  return root;
}
export async function placeTrees(scene,token) {
  const settled=await Promise.allSettled((scene.userData.treePlacements||[]).map(async p=>{
    const ids=VARIANTS[p.kind]||VARIANTS.oak,id=ids[p.variant%ids.length];
    const sources=await loadTree(id);
    if(scene.userData.worldToken!==token)return false;
    const lod=new THREE.LOD();lod.name='natural-tree';
    for(let i=0;i<2;i++)lod.addLevel(fitTree(treePart(sources[i],id,p.variant),p.h),i===0?0:32,.15);
    lod.position.set(p.x,0,p.z);lod.rotation.y=p.rotY;
    lod.userData.life={type:'sway',amp:p.amp*.22,phase:p.phase};
    scene.add(lod);scene.userData.lifeObjs.push(lod);
    if(p.mesh){scene.remove(p.mesh);const index=scene.userData.lifeObjs.indexOf(p.mesh);if(index>=0)scene.userData.lifeObjs.splice(index,1);}
    return true;
  }));
  const failed=settled.filter(r=>r.status==='rejected');
  if(failed.length)console.warn(`[trees] ${failed.length} replacements failed; fallback retained.`,failed[0].reason);
  return settled.filter(r=>r.status==='fulfilled'&&r.value).length;
}
