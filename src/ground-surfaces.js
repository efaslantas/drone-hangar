import * as THREE from 'three';

// Artist tile scales; source images are photographs, these metres are not surveyed.
export const GROUND_TILES={grass:2,asphalt:1.5,concrete:2,earth:1.5,forest:2,sand:2};
const channels=['map','bumpMap','normalMap','roughnessMap'];
function noise(x,z,step){
 const ix=Math.floor(x/step),iz=Math.floor(z/step),fx=x/step-ix,fz=z/step-iz,smooth=t=>t*t*(3-2*t),u=smooth(fx),v=smooth(fz);
 const hash=(a,b)=>{let n=(Math.imul(a,374761393)^Math.imul(b,668265263)^913)>>>0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 return (hash(ix,iz)*(1-u)+hash(ix+1,iz)*u)*(1-v)+(hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u)*v;
}
function canonicalPlane(geometry){
 if(geometry.type!=='PlaneGeometry'||!geometry.parameters||geometry.groups.length||geometry.drawRange.start!==0||geometry.drawRange.count!==Infinity)return false;
 const p=geometry.parameters,reference=new THREE.PlaneGeometry(p.width,p.height,p.widthSegments,p.heightSegments);
 const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<1e-6);
 const canonical=equal(geometry.attributes.position?.array,reference.attributes.position.array)&&equal(geometry.attributes.normal?.array,reference.attributes.normal.array)&&equal(geometry.index?.array,reference.index.array);
 reference.dispose();return canonical;
}
export function prepareGroundSurfaces(scene){
 scene.updateMatrixWorld(true);
 const candidates=[],uses=new Map(),groundUses=new Map(),geometryUses=new Map();
 const materials=o=>Array.isArray(o.material)?o.material:o.material?[o.material]:[];
 scene.traverse(o=>{
  if(o.geometry)geometryUses.set(o.geometry,(geometryUses.get(o.geometry)||0)+1);
  const mats=materials(o);for(const mat of mats)uses.set(mat,(uses.get(mat)||0)+1);
  if(!o.isMesh||o.isInstancedMesh||o.userData.metricGround||!mats.length||mats.some(m=>!GROUND_TILES[m.map?.userData.surface]))return;
  let eligible=o.userData.groundSurface===true;
  if(!eligible&&['PlaneGeometry','ShapeGeometry'].includes(o.geometry?.type)){
   o.geometry.computeBoundingBox();const b=o.geometry.boundingBox,sx=new THREE.Vector3().setFromMatrixColumn(o.matrixWorld,0).length(),sy=new THREE.Vector3().setFromMatrixColumn(o.matrixWorld,1).length();
   eligible=new THREE.Vector3(0,0,1).transformDirection(o.matrixWorld).y>.985&&(b.max.x-b.min.x)*(b.max.y-b.min.y)*sx*sy>=16;
  }
  if(!eligible)return;candidates.push(o);for(const mat of mats)groundUses.set(mat,(groundUses.get(mat)||0)+1);
 });
 const prepared=new Map(),oldTextures=new Set(),resources=scene.userData.worldResources;
 for(const o of candidates){
  const previous=o.geometry,p=previous.parameters;
  let geometry;
  const canonical=canonicalPlane(previous);
  if(canonical){
   const sx=new THREE.Vector3().setFromMatrixColumn(o.matrixWorld,0).length(),sy=new THREE.Vector3().setFromMatrixColumn(o.matrixWorld,1).length();
   geometry=new THREE.PlaneGeometry(p.width,p.height,Math.min(64,Math.max(1,Math.ceil(Math.abs(p.width*sx)/8))),Math.min(64,Math.max(1,Math.ceil(Math.abs(p.height*sy)/8))));
  }else geometry=previous.clone();
  o.geometry=geometry;geometryUses.set(previous,geometryUses.get(previous)-1);
  if(geometryUses.get(previous)===0){resources?.delete(previous);previous.dispose();}resources?.add(geometry);
  const positions=geometry.attributes.position,uv=new Float32Array(positions.count*2),colors=new Float32Array(positions.count*3),point=new THREE.Vector3(),kind=materials(o)[0].map.userData.surface;
  const amplitude=['grass','earth','forest','sand'].includes(kind)?.14:.08;
  for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld);uv[i*2]=point.x;uv[i*2+1]=point.z;
   const value=1-amplitude*(1-(noise(point.x,point.z,32)*.65+noise(point.x,point.z,9)*.35));
   colors[i*3]=colors[i*3+1]=colors[i*3+2]=value;
  }
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const convert=original=>{
   if(prepared.has(original))return prepared.get(original);
   const mat=uses.get(original)===groundUses.get(original)?original:original.clone(),kind=original.map.userData.surface,tileMetres=GROUND_TILES[kind];
   for(const channel of channels)if(mat[channel]){const old=mat[channel];oldTextures.add(old);const copy=old.clone();copy.repeat.setScalar(1/tileMetres);copy.wrapS=copy.wrapT=THREE.RepeatWrapping;copy.needsUpdate=true;mat[channel]=copy;resources?.add(copy);}
   mat.vertexColors=true;mat.userData.groundSurface={kind,tileMetres,uvMetres:true};mat.needsUpdate=true;resources?.add(mat);prepared.set(original,mat);return mat;
  };
  o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);o.userData.metricGround=true;
 }
 // Original maps can also belong to an unchanged wall/prop. Release only unreferenced maps.
 const retained=new Set();scene.traverse(o=>{for(const mat of materials(o))for(const value of Object.values(mat))if(value?.isTexture)retained.add(value);});
 for(const texture of oldTextures)if(!retained.has(texture)){resources?.delete(texture);texture.dispose();}
 return candidates.length;
}
