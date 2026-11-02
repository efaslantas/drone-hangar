import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import {aabbFromBox} from './collide.js';

// Authored fictional aftermath set. Solids are shared by every quality level.
function noiseTexture(relief=false){
 const n=128,data=new Uint8Array(n*n*4);let seed=0x51eaf;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const grain=(seed>>>24)/255,crack=(x+Math.floor(Math.sin(y*.19)*8))%43===0;
  const value=Math.round((crack?.3:.65+grain*.35)*255),i=(y*n+x)*4;
  data[i]=value;data[i+1]=relief?value:Math.round(value*.96);data[i+2]=relief?value:Math.round(value*.86);data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,n,n);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.colorSpace=relief?THREE.NoColorSpace:THREE.SRGBColorSpace;texture.repeat.set(14,16);
 texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 return texture;
}
function smokeTexture(){
 const n=32,data=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const r=Math.hypot((x+.5)/n*2-1,(y+.5)/n*2-1),i=(y*n+x)*4;
  data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(Math.max(0,1-r)**2*210);
 }
 const texture=new THREE.DataTexture(data,n,n);texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}
export function buildArcadeSite(scene,{quality='medium'}={}){
 const play={bounds:{minx:-48,maxx:48,minz:-88,maxz:22},ceil:50,boxes:[]};
 const root=new THREE.Group();root.name='arcade-ruins';scene.add(root);
 const wallMap=noiseTexture();wallMap.repeat.set(1,1);wallMap.userData.surface='plaster';
 const concrete=new THREE.MeshStandardMaterial({color:0xd0cec5,roughness:.98,map:wallMap});concrete.userData.preserveTint=true;
 const soot=new THREE.MeshStandardMaterial({color:0x6b6c66,roughness:.97,map:wallMap});soot.userData.preserveTint=true;
 const steel=new THREE.MeshStandardMaterial({color:0x494c48,metalness:.55,roughness:.85});
 const warning=new THREE.MeshStandardMaterial({color:0xb7a46f,roughness:.9});
 const sand=new THREE.MeshStandardMaterial({color:0x77745b,roughness:1});
 const assetAnchors=[];
 const batches=new Map(),unit=new THREE.BoxGeometry(1,1,1),transform=new THREE.Object3D();
 function box(w,h,d,x,y,z,mat=concrete,yaw=0,solid=true){
  const geometry=new THREE.BoxGeometry(w,h,d),positions=geometry.attributes.position,normals=geometry.attributes.normal,uv=geometry.attributes.uv;
  for(let i=0;i<positions.count;i++){
   const px=positions.getX(i),py=positions.getY(i),pz=positions.getZ(i);
   if(Math.abs(normals.getX(i))>.5)uv.setXY(i,(pz+d/2)/3,(py+h/2)/3);
   else if(Math.abs(normals.getY(i))>.5)uv.setXY(i,(px+w/2)/3,(pz+d/2)/3);
   else uv.setXY(i,(px+w/2)/3,(py+h/2)/3);
  }
  geometry.rotateY(yaw);geometry.translate(x,y,z);
  if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push(geometry);
  if(solid)play.boxes.push(aabbFromBox(x,y,z,w,h,d,yaw));
 }
 function asset(asset,x,z,size,yaw=0,material=concrete){
  const fallback=new THREE.Group();fallback.name='arcade-asset-fallback';root.add(fallback);
  const block=new THREE.Mesh(unit,material);block.position.y=size.y/2;block.scale.set(size.x,size.y,size.z);block.castShadow=true;block.receiveShadow=true;fallback.add(block);fallback.position.set(x,0,z);
  play.boxes.push(aabbFromBox(x,size.y/2,z,size.x,size.y,size.z));
  assetAnchors.push({asset,x,z,size,yaw,fallback});
 }
 const surface=new THREE.MeshStandardMaterial({color:0x77766b,roughness:.98,map:noiseTexture(),bumpMap:noiseTexture(true),bumpScale:.035});
 surface.map.userData.surface='earth';surface.userData.preserveTint=true;
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),surface);
 ground.rotation.x=-Math.PI/2;ground.position.y=-.015;ground.receiveShadow=true;ground.name='arcade-scarred-ground';root.add(ground);
 const pavement=noiseTexture();pavement.userData.surface='asphalt';
 const roadMaterial=new THREE.MeshStandardMaterial({color:0xa8aaa4,roughness:.96,map:pavement});roadMaterial.userData.preserveTint=true;
 const road=new THREE.Mesh(new THREE.PlaneGeometry(14,86),roadMaterial);roadMaterial.polygonOffset=true;roadMaterial.polygonOffsetFactor=-1;roadMaterial.polygonOffsetUnits=-1;road.rotation.x=-Math.PI/2;road.position.set(0,.0002,-37);road.receiveShadow=true;road.name='arcade-street';root.add(road);
 const walkMap=noiseTexture();walkMap.userData.surface='concrete';
 const walkMaterial=new THREE.MeshStandardMaterial({color:0xaeb1a8,roughness:.98,map:walkMap});walkMaterial.userData.preserveTint=true;
 for(const x of [-8,8]){const walk=new THREE.Mesh(new THREE.PlaneGeometry(1.8,84),walkMaterial);walkMaterial.polygonOffset=true;walkMaterial.polygonOffsetFactor=-2;walkMaterial.polygonOffsetUnits=-2;walk.rotation.x=-Math.PI/2;walk.position.set(x,.0003,-36);walk.receiveShadow=true;root.add(walk);}
 // Open, broken concrete shells: segmented floors, exposed columns and rebar.
 function ruin(cx,cz,width,depth,height){
  box(width,.45,depth,cx,.225,cz);
  for(let i=0;i<4;i++)for(const z of [-depth/2,depth/2]){
   const h=height-(i%3)*1.35;
   box(.65,h,.65,cx-width/2+i*width/3,h/2,cz+z);
   box(.09,2,.09,cx-width/2+i*width/3,h+.7,cz+z,steel);
  }
  for(let floor=1;floor<=Math.floor(height/3.5);floor++){
   const y=floor*3.2;
   box(width,.32,2.4,cx,y,cz-depth/2+1.2);
   box(width*.36,.28,depth*.55,cx-width*.32,y,cz+depth*.1);
   box(width,.45,.5,cx,y,cz+depth/2,soot);
  }
  box(width*.19,6.4,.45,cx-width*.38,3.2,cz+depth/2);
  box(width*.13,3.8,.45,cx+width*.39,1.9,cz+depth/2);
  box(width*.3,4,.45,cx+width*.3,2,cz-depth/2,soot);
  box(.4,3,depth*.55,cx-width/2,1.5,cz+depth*.1);
  box(width*.2,1.5,.5,cx-width*.1,.75,cz+depth/2);
  for(let i=0;i<7;i++){
   const h=[4.3,3.1,5.4,1.7,2.8,1.2,2.1][i];
   box(width/8,h,.45,cx-width*.42+i*width/7,h/2,cz-depth/2);
   if(i<3)box(.04,.9,.04,cx-width*.42+i*width/7,h+.25,cz-depth/2,steel);
  }
 }
 ruin(0,-80,18,8,13.5);ruin(-36,-74,12,12,9);ruin(36,-74,12,12,10.5);
 ruin(-39,-34,6,14,11);ruin(39,-34,6,14,8);
 // Intact travel corridors are kept around the authored game-object loops.
 for(const x of [-32,32])for(const z of [-14,-38,-56])asset('concrete_road_barrier_02',x,z,{x:1.5,y:1.35,z:5},Math.PI/2);
 asset('portable_generator',-34,-20,{x:1.8,y:1.3,z:1.5},.3,steel);
 asset('Barrel_01',34,-62,{x:1.05,y:1.5,z:1.05},0,soot);
 asset('rock_07',-36,-65,{x:2.1,y:1.1,z:1.6},.4);
 asset('old_tyre',33,-65,{x:1.2,y:.65,z:1.2},0,soot);
 for(const x of [-13,13]){
  box(6.8,1.1,1.4,x,.55,6,sand);
  for(let row=0;row<3;row++)for(let i=0;i<7;i++)box(.9,.28,1.1,x-3+i+(row%2)*.15,.22+row*.29,6,sand);
 }
 // Burnt vehicle shells are scenery, separate from the four colourful game objects.
 for(const [x,z,yaw] of [[-36,-51,.3],[36,-18,-.4]]){
  box(2.3,.9,4.5,x,.65,z,soot,yaw);box(1.7,.35,1.8,x,1.35,z-.3,steel,yaw);
  box(1.8,.1,1.9,x,1.7,z+.5,soot,yaw);
 }
 // Deterministic rubble near the shells, never in the travel corridors.
 let seed=19;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<100;i++){
  const side=i%2?1:-1,x=side*(30+random()*12),z=-63-random()*20;
  const w=.2+random()*1.1,h=.12+random()*.45,d=.2+random()*.9;
  box(w,h,d,x,h/2,z,i%4?concrete:steel,random()*Math.PI);
 }
 // Broken perimeter and distant industrial silhouettes frame the playable site.
 for(let x=-44;x<=44;x+=8)box(5,1.1+(x%3)*.1,.6,x,.65,-87,soot);
 for(let i=0;i<9;i++){
  const x=-72+i*18,h=8+(i%4)*4;
  box(12,h,12,x,h/2,-112,soot,0,false);
  if(i%2)box(2,24,2,x,12,-118,steel,0,false);
 }
 for(const [mat,geometries] of batches){
  const geometry=mergeGeometries(geometries,false);for(const piece of geometries)piece.dispose();
  const batch=new THREE.Mesh(geometry,mat);
  batch.name=mat===concrete?'arcade-concrete-shells':'arcade-set-dressing';
  batch.castShadow=true;batch.receiveShadow=true;root.add(batch);
 }
 // Flat scorch stains and a clear, painted launch marker do not alter ground height.
 const stains=new THREE.InstancedMesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:0x1c2423,transparent:true,opacity:.5,depthWrite:false}),8);
 for(let i=0;i<8;i++){
  transform.position.set((i%2?1:-1)*(20+(i%3)*6),.018,-20-i*8);transform.rotation.set(-Math.PI/2,0,0);transform.scale.set(3+(i%3),5,1);transform.updateMatrix();stains.setMatrixAt(i,transform.matrix);
 }
 root.add(stains);
 const pad=new THREE.Mesh(new THREE.RingGeometry(4.9,5.15,48),new THREE.MeshBasicMaterial({color:0xb1ae91,transparent:true,opacity:.65}));
 pad.name='padHint';pad.rotation.x=-Math.PI/2;pad.position.y=.0005;root.add(pad);
 // Painted launch H.
 const hGeo=new THREE.BufferGeometry();const hPositions=[];
 for(const [x0,x1,z0,z1] of [[-.95,-.65,-1,1],[.65,.95,-1,1],[-.65,.65,-.15,.15]])hPositions.push(x0,.0006,z0,x0,.0006,z1,x1,.0006,z1,x0,.0006,z0,x1,.0006,z1,x1,.0006,z0);
 hGeo.setAttribute('position',new THREE.Float32BufferAttribute(hPositions,3));hGeo.computeVertexNormals();root.add(new THREE.Mesh(hGeo,new THREE.MeshBasicMaterial({color:0xb1ae91,side:THREE.DoubleSide,transparent:true,opacity:.35,depthWrite:false})));
 const perPlume=quality==='low'?7:quality==='high'?18:12;
 const origins=[[-36,-74],[36,-74],[-40,-33],[40,-20]];
 const smoke=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:scene.userData.night?0x485058:0x3e4544,map:smokeTexture(),transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide}),origins.length*18);
 smoke.count=origins.length*perPlume;
 smoke.name='arcade-smoke';smoke.frustumCulled=false;scene.add(smoke);
 scene.userData.arcadeSite={smoke,origins,perPlume,assetAnchors,time:0,viewer:{x:0,y:3,z:0},transform:new THREE.Object3D()};tickArcadeSite(scene,0);
 return play;
}
export function tickArcadeSite(scene,time,viewer){
 const site=scene.userData.arcadeSite;if(!site)return;
 site.time=time;if(viewer)site.viewer={x:viewer.x,y:viewer.y,z:viewer.z};
 const transform=site.transform;
 let index=0;
 for(let p=0;p<site.origins.length;p++)for(let j=0;j<site.perPlume;j++){
  const age=((time*.045+j/site.perPlume+p*.17)%1+1)%1;
  const [x,z]=site.origins[p],height=age*38;
  transform.position.set(x+age*7+Math.sin(j*2.4+time*.17)*age*2,1+height,z+Math.cos(j*1.7+time*.13)*age*3);
  transform.scale.setScalar(8+age*14);
  transform.lookAt(site.viewer.x,site.viewer.y,site.viewer.z);transform.updateMatrix();
  site.smoke.setMatrixAt(index++,transform.matrix);
 }
 site.smoke.instanceMatrix.needsUpdate=true;
}
export function setArcadeSiteQuality(scene,quality){
 const site=scene.userData.arcadeSite;if(!site)return;
 const perPlume=quality==='low'?7:quality==='high'?18:12;
 if(site.perPlume===perPlume)return;
 site.perPlume=perPlume;site.smoke.count=site.origins.length*perPlume;
 tickArcadeSite(scene,site.time);
}
