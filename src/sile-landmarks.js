import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {insidePolygon} from './geo-terrain.js';
import {createCastleIsland} from './sile-island.js';
import {castleMaterial} from './sile-materials.js';
const bounds=r=>{const p=r[0];return [Math.min(...p.map(q=>q[0])),Math.max(...p.map(q=>q[0])),Math.min(...p.map(q=>q[1])),Math.max(...p.map(q=>q[1]))];};
const area=r=>Math.abs(r.reduce((s,p,i)=>s+p[0]*r[(i+1)%r.length][1]-p[1]*r[(i+1)%r.length][0],0))/2;
export function castleSite(data){
 const source=data.buildings.find(b=>b.landmark==='castle');if(!source||source.rings.length!==1||source.rings[0].length!==4)return null;
 const ring=source.rings[0];if(!Number.isFinite(source.base)||!Number.isFinite(source.height)||source.height<10||source.height>40||!ring.every(p=>p.length===2&&p.every(Number.isFinite)))return null;
 const edges=ring.map((p,i)=>ring[(i+1)%4].map((v,k)=>v-p[k])),lengths=edges.map(e=>Math.hypot(...e)),turns=edges.map((e,i)=>e[0]*edges[(i+1)%4][1]-e[1]*edges[(i+1)%4][0]);
 if(Math.min(...lengths)<3||Math.max(...lengths)>80||(!turns.every(v=>v>0)&&!turns.every(v=>v<0))||edges.some((e,i)=>Math.abs(e.reduce((s,v,k)=>s+v*edges[(i+1)%4][k],0)/lengths[i]/lengths[(i+1)%4])>.3))return null;
 const x=ring.reduce((s,p)=>s+p[0]/4,0),z=ring.reduce((s,p)=>s+p[1]/4,0);
 const islands=data.terrain.land.filter(r=>r.length===1&&area(r[0])<30000&&insidePolygon(x,z,r)&&ring.every(p=>insidePolygon(...p,r))).sort((a,b)=>area(a[0])-area(b[0]));
 if(!islands.length)return null;
 const rings=islands[0],reliefM=4.5,height=-data.terrain.datum+reliefM,platform={rings,bounds:bounds(rings),height,authored:true,kind:'castle-island'};
 const castle={...source,base:height};platform.surface=createCastleIsland(rings,castle,data.terrain.datum);
 return {source,castle,reliefM,platform,terrain:{...data.terrain,platforms:[...(data.terrain.platforms||[]),platform]}};
}
function opening(center,bottom,width,height,arched=false){
 const s=new THREE.Path(),x=center-width/2,y=bottom;s.moveTo(x,y);s.lineTo(x+width,y);s.lineTo(x+width,y+height-(arched?width/2:0));
 if(arched)s.absarc(center,y+height-width/2,width/2,0,Math.PI,false);else s.lineTo(x,y+height);
 s.lineTo(x,y);return s;
}
export function castleModel(item){
 const root=new THREE.Group();root.name='sile-castle';root.userData.decorativeOpenings=true;
 let ring=item.rings[0].map(p=>p.slice());if(ring.reduce((s,p,i)=>s+p[0]*ring[(i+1)%ring.length][1]-p[1]*ring[(i+1)%ring.length][0],0)<0)ring.reverse();
 const stone=[],dark=[],body=item.height-.75;let merlons=0;
 function worldGeometry(g,matrix){if(g.index){const source=g;g=g.toNonIndexed();source.dispose();}g.applyMatrix4(matrix);return g;}
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),matrix=new THREE.Matrix4().makeBasis(new THREE.Vector3(dx/len,0,dz/len),new THREE.Vector3(0,1,0),new THREE.Vector3(-dz/len,0,dx/len));matrix.setPosition(a[0],item.base,a[1]);
  const shape=new THREE.Shape([new THREE.Vector2(0,0),new THREE.Vector2(len,0),new THREE.Vector2(len,body),new THREE.Vector2(0,body)]);
  const holes=[[.8,.30,1.7,true],[item.height*.39,.7,1.35,true],[item.height*.67,.55,1.9,false]];
  for(const [y,w,h,arch] of holes)shape.holes.push(opening(len*.5,y,w,h,arch));
  const g=new THREE.ExtrudeGeometry(shape,{depth:.35,bevelEnabled:false,curveSegments:8}),source=g.attributes.position,uv=g.attributes.uv,p=[],values=[];
  // Front face and opening jambs only: no coplanar decorative overlays or
  // thick outer corners projecting beyond an oblique source footprint.
  for(let j=0;j<source.count;j+=3){const v=[0,1,2].map(k=>[source.getX(j+k),source.getY(j+k),source.getZ(j+k)]),front=v.every(q=>Math.abs(q[2])<1e-6),outer=[0,len].some(x=>v.every(q=>Math.abs(q[0]-x)<1e-6))||[0,body].some(y=>v.every(q=>Math.abs(q[1]-y)<1e-6));if(!front&&(outer||v.every(q=>q[2]>.34)))continue;for(let k=0;k<3;k++){p.push(...v[k]);values.push(uv.getX(j+k)/4,uv.getY(j+k)/4);}}
  const wall=new THREE.BufferGeometry();wall.setAttribute('position',new THREE.Float32BufferAttribute(p,3));wall.setAttribute('uv',new THREE.Float32BufferAttribute(values,2));wall.computeVertexNormals();stone.push(worldGeometry(wall,matrix));g.dispose();
  const back=new THREE.PlaneGeometry(len-1,body-.4);back.rotateY(Math.PI);back.translate(len/2,body/2,.4);dark.push(worldGeometry(back,matrix));
  const n=Math.max(2,Math.round(len/1.4)),step=(len-1.1)/n;
  for(let k=0;k<n;k++){const tooth=new THREE.BoxGeometry(step*.55,.75,.45);tooth.translate(.55+step*(k+.5),body+.375,.225);stone.push(worldGeometry(tooth,matrix));merlons++;}
 }
 const topShape=new THREE.Shape(ring.map(([x,z])=>new THREE.Vector2(x,-z))),deck=new THREE.ShapeGeometry(topShape);deck.rotateX(-Math.PI/2);deck.translate(0,item.base+body-.2,0);dark.push(deck.toNonIndexed());deck.dispose();
 for(const [name,parts,material] of [['limestone',stone,castleMaterial()],['recesses',dark,new THREE.MeshStandardMaterial({color:0x333027,roughness:1})]]){const g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());const mesh=new THREE.Mesh(g,material);mesh.name='sile-castle-'+name;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
 root.userData.merlons=merlons;root.userData.authored=true;return root;
}
