import * as THREE from 'three';
import {mergeVertices,mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {planSileContext} from './sile-context.js';
import {insidePolygon,surfaceAt} from './geo-terrain.js';
import {surfaceTexture} from './surfaces.js';
function leafGeometry(){
 const raw=new THREE.IcosahedronGeometry(1,1),p=raw.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),scale=1+.045*Math.sin(x*17+y*29+z*23);p.setXYZ(i,x*scale,y*scale,z*scale);}
 raw.deleteAttribute('normal');raw.deleteAttribute('uv');const g=mergeVertices(raw,.00001);g.computeVertexNormals();raw.dispose();return g;
}
const outline=[[0,.5],[-.35,.35],[-.5,.1],[-.47,-.48],[.47,-.48],[.5,.1],[.35,.35]];
function hullGeometry(){const p=[];for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length],v=[[a[0],.55,a[1]],[a[0]*.65,-.35,a[1]*.8],[b[0],.55,b[1]],[b[0]*.65,-.35,b[1]*.8]];for(const n of [0,1,2,2,1,3])p.push(...v[n]);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;}
function deckGeometry(rings,y=0){const shape=new THREE.Shape(rings[0].map(([x,z])=>new THREE.Vector2(x,-z)));for(const ring of rings.slice(1))shape.holes.push(new THREE.Path(ring.map(([x,z])=>new THREE.Vector2(x,-z))));const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);g.translate(0,y,0);return g;}
export function addSileContext(scene,data,play,plan=planSileContext(data,play)){
 if(!plan.valid)return plan;const groups=new Map(),geometries=new Map(),materials=new Map(),matrix=new THREE.Matrix4(),parent=new THREE.Matrix4(),local=new THREE.Matrix4(),position=new THREE.Vector3(),scaleVector=new THREE.Vector3(),rotation=new THREE.Quaternion();
 const geometry=kind=>{if(!geometries.has(kind)){const g=kind==='leaf'?leafGeometry():kind==='cylinder'?new THREE.CylinderGeometry(.5,.5,1,6):kind==='canopy'?new THREE.ConeGeometry(1,.4,12,1,true):kind==='hull'?hullGeometry():kind==='boat-deck'?deckGeometry([outline],.57):new THREE.BoxGeometry(1,1,1);g.computeBoundingBox();geometries.set(kind,g);}return geometries.get(kind);};
 const material=kind=>{if(!materials.has(kind))materials.set(kind,new THREE.MeshStandardMaterial({color:0xffffff,roughness:kind==='window'?.38:.94,metalness:0,side:['canopy','hull'].includes(kind)?THREE.DoubleSide:THREE.FrontSide}));return materials.get(kind);};
 function part(owner,shape,paint,xyz,size,color,solid=true,pitch=0){
  const key=shape+':'+paint,g=geometry(shape);if(owner.frame)parent.copy(owner.frame);else{parent.makeRotationY(owner.yaw);parent.setPosition(owner.x,owner.y,owner.z);}position.set(...xyz);scaleVector.set(...size);rotation.setFromEuler(new THREE.Euler(pitch,0,0));local.compose(position,rotation,scaleVector);matrix.multiplyMatrices(parent,local);
  let box=null;if(solid){const b=g.boundingBox.clone().applyMatrix4(matrix);box={minx:b.min.x-.001,maxx:b.max.x+.001,miny:b.min.y-.001,maxy:b.max.y+.001,minz:b.min.z-.001,maxz:b.max.z+.001};play.boxes.push(box);}
  if(!groups.has(key))groups.set(key,{g,m:material(paint),parts:[]});groups.get(key).parts.push({matrix:matrix.clone(),color:new THREE.Color(color),box});
 }
 for(const p of plan.trees){const {r,h}=p;part(p,'cylinder','wood',[0,h*.3-.08,0],[.24,h*.6,.24],0x655444);const color=p.kind==='scrub'?0x67774d:p.kind==='forest'?[0x3b5835,0x42603a,0x536c3e][Math.abs(p.id)%3]:0x5b7646;part(p,'leaf','leaf',[-r*.2,h*.68,0],[r*.75,h*.28,r*.8],color);part(p,'leaf','leaf',[r*.19,h*.76,r*.05],[r*.6,h*.22,r*.63],color);}
 for(const p of plan.beach){const color=[0xd1c29d,0xb96b49,0x73929d,0xa95643][Math.abs(p.id)%4];part(p,'cylinder','metal',[0,1.08,0],[.055,2.16,.055],0xc7c3b5);part(p,'canopy','canopy',[0,2.3,0],[1.65,1,1.65],color);
  for(const x of [-1.05,1.05]){
   const wx=p.x+x*Math.cos(p.yaw),wz=p.z-x*Math.sin(p.yaw),ground=surfaceAt(play,wx,wz),up=new THREE.Vector3(...ground.normal),forward=new THREE.Vector3(Math.sin(p.yaw),0,Math.cos(p.yaw));forward.addScaledVector(up,-forward.dot(up)).normalize();const right=new THREE.Vector3().crossVectors(up,forward).normalize(),frame=new THREE.Matrix4().makeBasis(right,up,forward);frame.setPosition(wx,ground.height,wz);const chair={...p,frame};
   part(chair,'box','chair',[0,.39,.5],[.63,.1,1.65],0xe2d8bf);part(chair,'box','chair',[0,.62,-.03],[.63,.08,.78],0xe2d8bf,true,Math.PI*.23);for(const z of [-.05,1.08])part(chair,'box','chair',[0,.2,z],[.56,.38,.055],0xb5b5a6);
  }
 }
 for(const p of plan.boats){const {w,l}=p,color=[0x426e83,0xb26445,0xc6c4ab][Math.abs(p.id)%3];part(p,'hull','hull',[0,0,0],[w,1,l],color);part(p,'boat-deck','deck',[0,0,0],[w,1,l],0xd3c7a7);part(p,'box','cabin',[0,.92,-l*.13],[w*.5,.72,l*.26],0xe2dfcd);part(p,'box','window',[0,1.06,-l*.13],[w*.515,.25,l*.27],0x344f59);part(p,'box','deck',[0,1.32,-l*.13],[w*.6,.09,l*.31],0xcecab6);part(p,'cylinder','metal',[0,1.99,-l*.22],[.055,1.6,.055],0xb7b8ac);}
 for(const p of plan.bollards)part(p,'cylinder','metal',[0,.21,0],[.16,.42,.16],0x41494a);
 for(const [name,b] of groups){const mesh=new THREE.InstancedMesh(b.g,b.m,b.parts.length);mesh.name='sile-context-'+name;mesh.userData.contextBoxes=b.parts.map(p=>p.box);for(let i=0;i<b.parts.length;i++){mesh.setMatrixAt(i,b.parts[i].matrix);mesh.setColorAt(i,b.parts[i].color);}mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();scene.add(mesh);}
 const decks=[];for(const p of data.structures.filter(p=>p.kind==='pier')){const g=deckGeometry(p.rings,p.base+p.height+.0005),pos=g.attributes.position,uv=[];for(let i=0;i<pos.count;i++)uv.push(pos.getX(i)/2,pos.getZ(i)/2);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));decks.push(g);}
 if(decks.length){const g=mergeGeometries(decks,false);decks.forEach(p=>p.dispose());const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:surfaceTexture('concrete',1),roughness:.92,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2}));mesh.userData.groundSurface=true;mesh.name='sile-pier-deck';mesh.receiveShadow=true;scene.add(mesh);}
 scene.userData.sileLandcover=plan.source;scene.userData.sileContextStats={trees:plan.trees.length,umbrellas:plan.beach.length,boats:plan.boats.length,bollards:plan.bollards.length,authoredPlacement:true};return plan;
}

// Macro colour follows mapped landuse; original source microtextures are kept.
// This is an authored summer palette, not a sampled satellite colour product.
export function finishSileContext(scene){
 const source=scene.userData.sileLandcover,ground=scene.getObjectByName('sile-terrain');if(!source||!ground||ground.userData.landcoverTint)return;
 const g=ground.geometry,p=g.attributes.position,c=g.attributes.color,paved=[...source.paved,...source.harbour];if(!c)return;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);let tint=null;
  if(paved.some(f=>insidePolygon(x,z,f.rings)))tint=[.84,.88,.88];
  else if(source.green.some(f=>insidePolygon(x,z,f.rings)))tint=[.48,1,.46];
  else if(source.lawns.some(f=>insidePolygon(x,z,f.rings)))tint=[.64,1,.55];
  if(tint)for(let k=0;k<3;k++)c.array[i*3+k]*=tint[k];
 }c.needsUpdate=true;ground.userData.landcoverTint=true;
}
