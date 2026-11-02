import * as THREE from 'three';
const cachedModel=id=>import('./props.js').then(module=>module.loadModel(id));
let skyPromise;
const cachedSky=()=>skyPromise||(skyPromise=import('three/addons/loaders/RGBELoader.js').then(({RGBELoader})=>new RGBELoader().loadAsync('/arcade-assets/overcast_soil_puresky_1k.hdr')).catch(error=>{skyPromise=null;throw error;}));

function ownModel(source,scene,resources,copies){
 const root=source.clone(true);
 const copy=(map,value)=>{
  if(!map.has(value)){const clone=value.clone();map.set(value,clone);resources.add(clone);scene.userData.worldResources?.add(clone);}
  return map.get(value);
 };
 root.traverse(o=>{
  if(o.geometry)o.geometry=copy(copies.geometry,o.geometry);
  if(o.material){
   const material=original=>{
    if(copies.material.has(original))return copies.material.get(original);
    const mat=copy(copies.material,original);
    for(const [key,value] of Object.entries(mat))if(value?.isTexture)mat[key]=copy(copies.texture,value);
    return mat;
   };
   o.material=Array.isArray(o.material)?o.material.map(material):material(o.material);
  }
  if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}
  if(o.isInstancedMesh){resources.add(o);scene.userData.worldResources?.add(o);}
 });return root;
}
function release(scene,site){
 site.assetGeneration=(site.assetGeneration||0)+1;
 site.assetGroup?.removeFromParent();site.assetGroup=null;site.assetTask=null;
 for(const resource of site.assetResources||[]){scene.userData.worldResources?.delete(resource);resource.dispose();}
 site.assetResources=new Set();
 for(const anchor of site.assetAnchors||[])anchor.fallback.visible=true;
 if(site.skyCopy){
  scene.environment=null;scene.background=site.baseBackground?.clone()||null;
  scene.backgroundIntensity=1;scene.environmentIntensity=1;scene.backgroundBlurriness=0;
  scene.userData.worldResources?.delete(site.skyCopy);site.skyCopy.dispose();site.skyCopy=null;
 }
}

// Scene-owned copies only; cached CPU source models/textures are never disposed here.
export function applyArcadeAssets(scene,{quality='medium',loadSky=cachedSky,loadModel=cachedModel,warn=console.warn}={}){
 const site=scene.userData.arcadeSite;if(!site)return Promise.resolve(0);
 if(typeof Image==='undefined'&&loadSky===cachedSky&&loadModel===cachedModel)return Promise.resolve(0);
 site.baseBackground??=scene.background?.clone()||null;
 site.assetQuality=quality;
 if(quality==='low'){release(scene,site);return Promise.resolve(0);}
 if(site.assetTask)return site.assetTask;
 const token=scene.userData.worldToken,generation=(site.assetGeneration||0)+1;site.assetGeneration=generation;
 const valid=()=>scene.userData.worldToken===token&&scene.userData.arcadeSite===site&&site.assetGeneration===generation&&site.assetQuality!=='low';
 const resources=new Set(),copies={geometry:new Map(),material:new Map(),texture:new Map()};site.assetResources=resources;
 const group=new THREE.Group();group.name='arcade-scanned-props';scene.add(group);site.assetGroup=group;
 const props=(site.assetAnchors||[]).map(async anchor=>{
  try{
   const model=await loadModel(anchor.asset);if(!valid())return 0;
   const root=new THREE.Group();root.add(ownModel(model.root,scene,resources,copies));
   const box=new THREE.Box3().setFromObject(model.root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
   const yaw=anchor.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw),w=Math.abs(c)*size.x+Math.abs(s)*size.z,d=Math.abs(c)*size.z+Math.abs(s)*size.x;
   const scale=.98*Math.min(anchor.size.x/Math.max(w,1e-6),anchor.size.y/Math.max(size.y,1e-6),anchor.size.z/Math.max(d,1e-6));
   root.scale.setScalar(scale);root.rotation.y=yaw;
   root.position.set(anchor.x-scale*(center.x*c+center.z*s),-box.min.y*scale+(anchor.y||0),anchor.z-scale*(-center.x*s+center.z*c));
   root.userData.arcadeAsset=anchor.asset;group.add(root);anchor.fallback.visible=false;return 1;
  }catch(error){if(valid())warn(`Arcade asset ${anchor.asset} unavailable; keeping fallback.`,error);return 0;}
 });
 const sky=scene.userData.night?Promise.resolve(0):(async()=>{
  try{
   const source=await loadSky();if(!valid())return 0;
   const texture=source.clone();texture.mapping=THREE.EquirectangularReflectionMapping;texture.needsUpdate=true;
   scene.userData.worldResources?.add(texture);site.skyCopy=texture;
   scene.background=texture;scene.environment=texture;scene.backgroundIntensity=.42;scene.environmentIntensity=.45;scene.backgroundBlurriness=.035;return 1;
  }catch(error){if(valid())warn('Arcade sky unavailable; keeping overcast fallback.',error);return 0;}
 })();
 site.assetTask=Promise.all([...props,sky]).then(counts=>counts.reduce((a,b)=>a+b,0));return site.assetTask;
}
