import * as THREE from 'three';

// Authored leaf sprig, not a photograph or species inventory. Rows are bottom-up.
export function foliageTextureData(){
 const size=128,pixels=new Uint8Array(size*size*4),leaves=[];
 for(let row=0;row<8;row++)for(const side of [-1,1]){
  const y=.16+row*.092,angle=side*(.34+row*.035);
  leaves.push({x:.5+side*(.13+.03*Math.sin(row*2)),y,angle,a:.19-row*.006,b:.072});
 }
 leaves.push({x:.5,y:.875,angle:Math.PI/2,a:.12,b:.072});
 for(let y=2;y<size-2;y++)for(let x=2;x<size-2;x++){
  const u=(x+.5)/size,v=(y+.5)/size,i=(y*size+x)*4;
  let coverage=0,shade=0;
  if(Math.abs(u-(.5+.012*Math.sin(v*7)))<.012&&v>.08&&v<.9){coverage=1;shade=-23;}
  for(const leaf of leaves){
   const dx=u-leaf.x,dy=v-leaf.y,c=Math.cos(leaf.angle),s=Math.sin(leaf.angle),a=(dx*c+dy*s)/leaf.a,b=(-dx*s+dy*c)/leaf.b,r=a*a+b*b;
   if(r>=1)continue;
   const edge=Math.min(1,(1-r)*12),vein=Math.abs(b)<.07||Math.abs(Math.abs(b)-(.55-Math.abs(a)*.35))<.06;
   if(edge>=coverage){coverage=edge;shade=(vein?-16:0)+12*(1-r)+Math.sin(a*29+b*13)*5+Math.sin(x*31+y*17)*3;}
  }
  if(coverage<=0)continue;
  pixels[i]=Math.max(0,Math.min(255,213+shade));pixels[i+1]=Math.max(0,Math.min(255,220+shade));pixels[i+2]=Math.max(0,Math.min(255,185+shade));pixels[i+3]=Math.round(coverage*255);
 }
 return {size,pixels};
}
export function foliageGeometry(bounds,{planter=false}={}){
 if(!bounds||![...bounds.min,...bounds.max].every(Number.isFinite)||bounds.isEmpty())throw new RangeError('Finite foliage bounds required');
 const center=bounds.getCenter(new THREE.Vector3()),half=bounds.getSize(new THREE.Vector3()).multiplyScalar(.5),positions=[],uv=[],colors=[];
 const worldUp=new THREE.Vector3(0,1,0);
 for(let i=0;i<32;i++){
  const y=1-2*(i+.5)/32,angle=i*2.399963229728653,r=Math.sqrt(1-y*y),normal=new THREE.Vector3(Math.cos(angle)*r,y,Math.sin(angle)*r);
  const right=new THREE.Vector3().crossVectors(worldUp,normal).normalize(),up=new THREE.Vector3().crossVectors(normal,right),origin=normal.clone().multiplyScalar(.55);
  const width=.43,height=.55,corners=[[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,y])=>origin.clone().addScaledVector(right,x*width).addScaledVector(up,y*height).multiply(half).add(center));
  const tex=[[0,0],[1,0],[0,1],[1,1]],shade=.83+.17*(Math.sin(i*17)*.5+.5);
  for(const k of [0,1,2,1,3,2]){positions.push(...corners[k]);uv.push(...tex[k]);colors.push(shade,shade,shade);}
 }
 const foliageCount=positions.length/3,soilY=(.45-.78)/.85;
 // Same entrance-planter dimensions as its existing .92/.85/.68 foliage
 // transform and1/.45/.6 solid pot. The patch sits on the old pot top.
 const soil=planter&&soilY>=bounds.min.y&&soilY<=bounds.max.y;
 if(soil){
  const x=Math.min(.41/.92,Math.min(-bounds.min.x,bounds.max.x)-.00001),z=Math.min(.23/.68,Math.min(-bounds.min.z,bounds.max.z)-.00001);
  const q=[[-x,soilY,-z],[-x,soilY,z],[x,soilY,-z],[x,soilY,z]];
  for(const k of [0,1,2,1,3,2]){positions.push(...q[k]);uv.push(0,0);colors.push(1,1,1);}
 }
 const geometry=new THREE.BufferGeometry();geometry.addGroup(0,foliageCount,0);if(soil)geometry.addGroup(foliageCount,6,1);geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
const targets=new Set(['sile-context-leaf:leaf','sile-neighbourhood-leaf:solid']);
function resourcesOf(scene){
 const out=new Set();scene.traverse(o=>{if(o.geometry)out.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){out.add(m);for(const value of Object.values(m))if(value?.isTexture)out.add(value);}});return out;
}
// Run only after all old placement/collision planning: their envelopes stay exact.
export function finishSileFoliage(scene){
 if(scene.userData.sileFoliageStats)return scene.userData.sileFoliageStats;
 const meshes=[];scene.traverse(o=>{if(o.isInstancedMesh&&targets.has(o.name))meshes.push(o);});
 const stats={batches:meshes.length,crowns:meshes.reduce((n,o)=>n+o.count,0),cardsPerCrown:32,trianglesPerCrown:64,soilPatches:0,authored:true};scene.userData.sileFoliageStats=stats;
 if(!meshes.length)return stats;
 const {size,pixels}=foliageTextureData(),map=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);map.colorSpace=THREE.SRGBColorSpace;map.flipY=false;map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;map.anisotropy=4;map.userData.foliageTemplate=true;map.needsUpdate=true;
 const material=new THREE.MeshStandardMaterial({map,vertexColors:true,color:0xffffff,side:THREE.DoubleSide,alphaTest:.35,transparent:false,roughness:.93,metalness:0}),geometries=new Map(),old=new Set();
 let soilMaterial=null;
 if(meshes.some(o=>o.name==='sile-neighbourhood-leaf:solid')){
  // Instance colour is shared with the crown. Cancel that known planter green
  // for this material so the soil remains brown without changing instance data.
  const tint=new THREE.Color(0x4a643d),soil=new THREE.Color(0x3e3322);
  soilMaterial=new THREE.MeshStandardMaterial({color:new THREE.Color().setRGB(soil.r/tint.r,soil.g/tint.g,soil.b/tint.b),roughness:.98,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 }

 for(const mesh of meshes){
  const original=mesh.geometry,planter=mesh.name==='sile-neighbourhood-leaf:solid';let variants=geometries.get(original);if(!variants){variants=new Map();geometries.set(original,variants);}if(!variants.has(planter)){original.computeBoundingBox();variants.set(planter,foliageGeometry(original.boundingBox,{planter}));}
  old.add(original);for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){old.add(m);for(const value of Object.values(m))if(value?.isTexture)old.add(value);}
  mesh.geometry=variants.get(planter);const soil=planter&&mesh.geometry.groups.length===2;mesh.material=soil?[material,soilMaterial]:material;if(soil)stats.soilPatches+=mesh.count;mesh.computeBoundingBox();mesh.computeBoundingSphere();
 }
 const used=resourcesOf(scene),owned=scene.userData.worldResources;if(soilMaterial&&!used.has(soilMaterial))soilMaterial.dispose();
 for(const resource of old)if(!used.has(resource)){owned?.delete(resource);resource.dispose();}
 if(owned)for(const resource of used)owned.add(resource);
 return stats;
}
