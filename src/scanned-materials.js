import * as THREE from 'three';

const library={plaster:'damaged_plaster',asphalt:'asphalt_02',concrete:'concrete_floor_02',forest:'forest_floor',earth:'gravel_floor',sand:'sandy_gravel',grass:'grass_ground',coastalRock:'rock_face_03'};
const decoded=new Map(),states=new WeakMap();
export function surfaceTextureSize(quality,lite=false,ground=false){return quality==='low'?0:!lite&&(quality==='high'||ground)?1024:512;}
function source(asset,channel,size) {
  // Existing WebP variants are reused. Grass retains its checksum-verified
  // source JPEG; requested touch/other caps change GPU resolution, not its download size.
  const grass=asset==='grass_ground',rock=asset==='rock_face_03';
  const url=rock?`/materials/rock_face_03/${channel}.jpg`:grass?`/materials/${asset}/${channel}.jpg`:`/materials/web-v1/${size}/${asset}/${channel}.webp`;
  const key=url+':'+size;
  if(!decoded.has(key))decoded.set(key,new THREE.TextureLoader().loadAsync(url).then(texture=>{
    if((grass||rock)&&size<texture.image.width){
      const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
      canvas.getContext('2d').drawImage(texture.image,0,0,size,size);texture.image=canvas;
    }
    return texture;
  }).catch(error=>{decoded.delete(key);throw error;}));
  return decoded.get(key);
}
function releaseCopies(record,resources){
  for(const texture of record.copies){resources?.delete(texture);texture.dispose();}
  record.copies=[];
}
function restore(record,resources){
  releaseCopies(record,resources);
  const {mat,fallback}=record;
  for(const key of ['map','bumpMap','normalMap','roughnessMap']){mat[key]=fallback[key];if(mat[key])mat[key].needsUpdate=true;}
  mat.color.copy(fallback.color);mat.roughness=fallback.roughness;mat.metalness=fallback.metalness;mat.normalScale.copy(fallback.normalScale);
  delete mat.userData.scannedAsset;mat.needsUpdate=true;
}
export function applyScannedMaterials(scene,{quality='medium',loadTexture=source,warn=console.warn}={}) {
  // Structural Node tests have no image decoder; injected loaders exercise
  // lifecycle behavior without pretending to render GPU pixels.
  if(typeof Image==='undefined'&&loadTexture===source)return Promise.resolve(0);
  const token=scene.userData.worldToken,size=surfaceTextureSize(quality,scene.userData.lite),key=quality+':'+!!scene.userData.lite;
  let state=states.get(scene);
  if(!state||state.token!==token){state={token,records:[],key:null,pending:null};states.set(scene,state);}
  if(state.key===key)return state.pending||Promise.resolve(0);
  const revision=Symbol('surface-quality');scene.userData.surfaceRevision=revision;state.key=key;
  const known=new Set(state.records.map(r=>r.mat));
  scene.traverse(object=>{
    for(const mat of (Array.isArray(object.material)?object.material:object.material?[object.material]:[])){
      const kind=mat.userData.scannedSurface||mat.map?.userData.surface,asset=library[kind];
      if(!mat?.isMeshStandardMaterial||!asset||known.has(mat))continue;known.add(mat);
      const ground=mat.userData.groundSurface,repeat=mat.map.repeat.clone();
      if(ground?.uvMetres)repeat.setScalar(1/ground.tileMetres);
      else if(['PlaneGeometry','ShapeGeometry'].includes(object.geometry?.type)){
        object.geometry.computeBoundingBox();const bounds=object.geometry.boundingBox;
        const tile=kind==='forest'||kind==='earth'?3:4;
        repeat.set((bounds.max.x-bounds.min.x)*Math.abs(object.scale.x)/tile,(bounds.max.y-bounds.min.y)*Math.abs(object.scale.y)/tile);
      }
      state.records.push({mat,kind,asset,repeat,ground:!!ground,copies:[],fallback:{map:mat.map,bumpMap:mat.bumpMap,normalMap:mat.normalMap,roughnessMap:mat.roughnessMap,color:mat.color.clone(),roughness:mat.roughness,metalness:mat.metalness,normalScale:mat.normalScale.clone()}});
    }
  });
  if(size===0){state.records.forEach(r=>restore(r,scene.userData.worldResources));state.pending=Promise.resolve(0);return state.pending;}
  state.pending=Promise.all(state.records.map(async record=>{
    try{
      const recordSize=surfaceTextureSize(quality,scene.userData.lite,record.ground);
      const channels=record.mat.userData.keepCoastalRoughness?['color','normal']:['color','normal','roughness'];
      const sources=await Promise.all(channels.map(channel=>loadTexture(record.asset,channel,recordSize)));
      if(scene.userData.surfaceRevision!==revision||scene.userData.worldToken!==token)return 0;
      const copies=sources.map((texture,i)=>{
        const map=texture.clone();map.needsUpdate=true;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.copy(record.repeat);
        map.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;map.anisotropy=record.ground?(scene.userData.lite?4:16):(scene.userData.lite?2:8);map.userData.surface=record.kind;
        return map;
      });
      const resources=scene.userData.worldResources;releaseCopies(record,resources);
      // Dispose GPU fallback allocations but retain their JS image objects for
      // a later low-quality restore. Scene cleanup still owns these textures.
      for(const texture of new Set(['map','bumpMap','normalMap','roughnessMap'].map(k=>record.fallback[k]).filter(Boolean)))if(!(record.mat.userData.keepCoastalRoughness&&texture===record.fallback.roughnessMap))texture.dispose();
      const {mat}=record;[mat.map,mat.normalMap]=copies;if(copies[2])mat.roughnessMap=copies[2];mat.bumpMap=null;
      mat.normalScale.setScalar(record.kind==='asphalt'?.5:record.kind==='grass'?.35:.7);
      if(!mat.userData.preserveTint)mat.color.setHex(0xffffff);mat.roughness=1;mat.metalness=0;mat.needsUpdate=true;
      record.copies=copies;copies.forEach(t=>resources?.add(t));mat.userData.scannedAsset=record.asset;return 1;
    }catch(error){
      if(scene.userData.surfaceRevision===revision){state.key=null;warn(`Surface ${record.asset} unavailable; retaining current appearance.`,error);}
      return 0;
    }
  })).then(counts=>counts.reduce((a,b)=>a+b,0));
  return state.pending;
}
