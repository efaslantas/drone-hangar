import * as THREE from 'three';
import{surfaceTexture}from './surfaces.js';
import {createSurfacePartition} from './sile-shore.js';
import {terrainHeight,splitTerrainEdge,drapeTerrainTriangles} from './geo-terrain.js';
// Authored gap closure only: source footprints, wall bases and terrain stay fixed.
// The conservative prism extends below terrain, entirely inside its source ring.
export function buildingFoundations(terrain,profiles){
 const positions=[],prisms=[],frames=[];
 if(!terrain||terrain.platforms?.length||!terrain.bounds?.every(Number.isFinite)||terrain.cols<2||terrain.rows<2||terrain.heights?.length!==terrain.cols*terrain.rows||!terrain.heights.every(Number.isFinite))return {positions,prisms};
 const land=createSurfacePartition(terrain.land||[],{spatial:true});
 for(const {item}of profiles.values()){
  const ring=item?.rings?.[0];if(item?.rings?.length!==1||!ring||ring.length<3||!Number.isFinite(item.base)||!ring.every(p=>p.length===2&&p.every(Number.isFinite)))continue;
  const faces=THREE.ShapeUtils.triangulateShape(ring.map(p=>new THREE.Vector2(...p)),[]);
  // Reject the entire source footprint if any part crosses shore or a water hole.
  if(faces.some(face=>land(face.map(i=>ring[i])).outside.length))continue;
  const flat=faces.flatMap(face=>face.flatMap(i=>[ring[i][0],0,ring[i][1]])),draped=drapeTerrainTriangles(terrain,flat,0),heights=draped.filter((_,i)=>i%3===1);
  if(!heights.length)continue;const min=Math.min(...heights);if(item.base-min<.03||item.base-min>2)continue;
  const signed=ring.reduce((s,a,i)=>{const b=ring[(i+1)%ring.length];return s+a[0]*b[1]-b[0]*a[1];},0),part=[],partFrames=[];
  for(let edge=0;edge<ring.length;edge++){
   const points=splitTerrainEdge(terrain,ring[edge],ring[(edge+1)%ring.length]);
   for(let i=1;i<points.length;i++){
    let a=points[i-1],b=points[i],ya=terrainHeight(terrain,...a)-.015,yb=terrainHeight(terrain,...b)-.015;
    if(ya>=item.base&&yb>=item.base)continue;
    if(ya>item.base||yb>item.base){const t=(item.base-ya)/(yb-ya),q=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];if(ya>item.base){a=q;ya=item.base;}else{b=q;yb=item.base;}}
    const quad=[[a[0],ya,a[1]],[b[0],yb,b[1]],[a[0],item.base,a[1]],[b[0],item.base,b[1]]],indices=signed>0?[[0,2,1],[1,2,3]]:[[0,1,2],[1,3,2]];
    for(const ids of indices){const q=ids.map(i=>quad[i]),u=new THREE.Vector3(...q[1]).sub(new THREE.Vector3(...q[0])),v=new THREE.Vector3(...q[2]).sub(new THREE.Vector3(...q[0]));if(new THREE.Vector3().crossVectors(u,v).lengthSq()>1e-16){part.push(...q.flat());const a=ring[edge],b=ring[(edge+1)%ring.length];partFrames.push([b[0]-a[0],b[1]-a[1]]);}}
   }
  }
  if(!part.length)continue;positions.push(...part);frames.push(...partFrames);const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]);prisms.push({rings:item.rings,miny:min-.015,maxy:item.base,bounds:[Math.min(...xs),Math.max(...xs),Math.min(...zs),Math.max(...zs)],authored:'coastal-foundation',sourceId:item.id});
 }
 return {positions,prisms,...(positions.length?{frames}:{})};
}
export function addBuildingFoundations(scene,play,profiles){
 // Castle terrain carries a distant authored platform. The selected coastal
 // buildings use the unchanged source grid, outside that platform's bounds.
 const terrain=play.terrain,selected=new Map([...profiles].filter(([,p])=>!(terrain.platforms||[]).some(q=>{const xs=p.item.rings[0].map(v=>v[0]),zs=p.item.rings[0].map(v=>v[1]);return Math.min(...xs)<=q.bounds[1]&&Math.max(...xs)>=q.bounds[0]&&Math.min(...zs)<=q.bounds[3]&&Math.max(...zs)>=q.bounds[2];}))),out=buildingFoundations({...terrain,platforms:[]},selected);
 if(!out.positions.length)return;
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(out.positions,3));geometry.computeVertexNormals();const material=new THREE.MeshStandardMaterial({color:0x8c887b,roughness:.96}),mesh=new THREE.Mesh(geometry,material);mesh.name='sile-coastal-foundations';mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.foundationPrisms=out.prisms;mesh.userData.foundationFrames=out.frames;scene.add(mesh);play.prisms.push(...out.prisms);scene.userData.sileBuildingStats.foundations=out.prisms.length;
}

// Appearance only: keep the uploaded foundation positions and physical owner.
export function foundationAppearanceGeometry(positions,groundHeight,{frames}={}){
 const geometry=new THREE.BufferGeometry(),uv=[],colors=[];
 for(let i=0;i<positions.length;i+=9){
  const a=new THREE.Vector3(...positions.slice(i,i+3)),b=new THREE.Vector3(...positions.slice(i+3,i+6)),c=new THREE.Vector3(...positions.slice(i+6,i+9)),normal=b.clone().sub(a).cross(c.clone().sub(a));const frame=frames?.[i/9];let dx=frame?.[0]??normal.z,dz=frame?.[1]??-normal.x,length=Math.hypot(dx,dz);
  if(length>1e-12){dx/=length;dz/=length;if(dx< -1e-10||Math.abs(dx)<=1e-10&&dz<0){dx=-dx;dz=-dz;}}else{dx=1;dz=0;}
  for(let k=0;k<9;k+=3){const x=positions[i+k],y=positions[i+k+1],z=positions[i+k+2],ground=groundHeight(x,z),height=Number.isFinite(ground)?Math.max(0,y-ground):Infinity,shade=.94+.015*Math.sin(x*.061+z*.073)-.18*Math.exp(-height/.35);uv.push(x*dx+z*dz,y);colors.push(shade,shade*.99,shade*.96);}
 }
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}
export function finishFoundationAppearance(scene,play){
 const mesh=scene.getObjectByName('sile-coastal-foundations');if(!mesh?.geometry?.attributes.position||mesh.userData.foundationFinish||!play?.terrain)return;
 const oldGeometry=mesh.geometry,oldMaterial=mesh.material;mesh.geometry=foundationAppearanceGeometry(Array.from(oldGeometry.attributes.position.array),(x,z)=>terrainHeight(play.terrain,x,z),{frames:mesh.userData.foundationFrames});oldGeometry.dispose();
 const map=surfaceTexture('concrete',1);map.repeat.setScalar(.5);mesh.material=new THREE.MeshStandardMaterial({map,color:0xbab6a9,roughness:.96,vertexColors:true});mesh.material.userData.scannedSurface='concrete';mesh.material.userData.groundSurface={kind:'concrete',tileMetres:2,uvMetres:true};mesh.material.userData.preserveTint=true;oldMaterial.dispose();mesh.userData.foundationFinish=true;
 scene.userData.sileBuildingStats.foundationAppearance={vertices:mesh.geometry.attributes.position.count,tileMetres:2,finalGroundContactTone:true,positionsUnchanged:true,measured:false};
}
