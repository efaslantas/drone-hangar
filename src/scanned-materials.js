import * as THREE from 'three';

const library={asphalt:'asphalt_02',concrete:'concrete_floor_02',forest:'forest_floor',earth:'gravel_floor',sand:'sandy_gravel'};
const decoded=new Map();
function source(asset,channel,lite) {
  const url=`/materials/web-v1/${lite ? '512' : '1024'}/${asset}/${channel}.webp`;
  if(!decoded.has(url)) decoded.set(url,new THREE.TextureLoader().loadAsync(url).catch(error=>{decoded.delete(url);throw error;}));
  return decoded.get(url);
}

export function applyScannedMaterials(scene) {
  // Node structural tests have no image decoder. The same procedural fallback remains valid.
  if(typeof Image==='undefined')return;
  const revision=Symbol('surface-build');scene.userData.surfaceRevision=revision;
  const seen=new Set();
  scene.traverse(object=>{
    for(const mat of (Array.isArray(object.material)?object.material:object.material?[object.material]:[])) {
      const kind=mat.map?.userData.surface, asset=library[kind];
      if(!asset||seen.has(mat))continue;seen.add(mat);
      const repeat=mat.map.repeat.clone();
      if(['PlaneGeometry','ShapeGeometry'].includes(object.geometry?.type)) {
        object.geometry.computeBoundingBox();
        const bounds=object.geometry.boundingBox;
        const tile=kind==='forest'||kind==='earth'?3:4;
        repeat.set((bounds.max.x-bounds.min.x)/tile,(bounds.max.y-bounds.min.y)/tile);
      }
      Promise.all(['color','normal','roughness'].map(channel=>source(asset,channel,scene.userData.lite))).then(sources=>{
        if(scene.userData.surfaceRevision!==revision)return;
        const textures=sources.map((source,i)=>{
          const map=source.clone();map.needsUpdate=true;
          map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.copy(repeat);
          map.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;
          map.anisotropy=scene.userData.lite?2:8;return map;
        });
        for(const key of ['map','bumpMap','roughnessMap'])if(mat[key]) {
          scene.userData.worldResources?.delete(mat[key]);mat[key].dispose();mat[key]=null;
        }
        [mat.map,mat.normalMap,mat.roughnessMap]=textures;
        mat.normalScale.setScalar(kind==='asphalt'?.5:.7);
        if(!mat.userData.preserveTint)mat.color.setHex(0xffffff);mat.roughness=1;mat.metalness=0;mat.needsUpdate=true;
        textures.forEach(texture=>scene.userData.worldResources?.add(texture));
        mat.userData.scannedAsset=asset;
      }).catch(error=>console.warn(`Surface ${asset} unavailable; using local procedural fallback.`,error));
    }
  });
}
