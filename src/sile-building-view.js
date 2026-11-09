import * as THREE from 'three';
import{buildingFacade}from './sile-buildings.js';import{surfaceAt}from './geo-terrain.js';
import{facadeAtlasData}from './sile-facade-atlas.js';
function wallMaterial(){
 const{size,pixels}=facadeAtlasData(),maps={};
 for(const[channel,bytes]of Object.entries(pixels)){
  const map=new THREE.DataTexture(bytes,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);map.colorSpace=channel==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;map.flipY=false;map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;map.anisotropy=4;map.userData.visualTemplate=true;map.needsUpdate=true;maps[channel]=map;
 }
 return new THREE.MeshStandardMaterial({map:maps.color,bumpMap:maps.height,bumpScale:.018,roughnessMap:maps.roughness,roughness:1,vertexColors:true});
}
export function coastalFacadeGeometry(profiles){
 const positions=[],uv=[],colors=[],facades=[];
 for(const profile of profiles.values()){
  const f=buildingFacade(profile.item,profile,profile.eaves);positions.push(...f.positions);uv.push(...f.uv);colors.push(...f.colors);facades.push({profile,facade:f});
  const roof=profile.roof;if(roof?.gables?.length){positions.push(...roof.gables);const color=new THREE.Color(profile.paint);for(let i=0;i<roof.gables.length;i+=3){uv.push(.875,.875);colors.push(color.r,color.g,color.b);}}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return {geometry,facades};
}
export function refreshCoastalFacades(scene,profiles){const mesh=scene.getObjectByName('sile-coastal-facades');if(!mesh)return;const old=mesh.geometry;mesh.geometry=coastalFacadeGeometry(profiles).geometry;old.dispose();}
export function addCoastalBuildings(scene,data,play,profiles,{balconyProfiles=profiles}={}){
 if(!profiles.size)return;
 const {geometry:wallGeometry,facades}=coastalFacadeGeometry(profiles),walls=new THREE.Mesh(wallGeometry,wallMaterial());walls.name='sile-coastal-facades';walls.castShadow=true;walls.receiveShadow=true;scene.add(walls);
 const geometry=new THREE.BoxGeometry(1,1,1);geometry.computeBoundingBox();const groups=new Map();let balconies=0;
 function partsFor(p,cell){
  const width=Math.min(2.05,cell.width*.72),slabY=cell.y0+.04,parts=[];
  parts.push({paint:'stone',xyz:[0,slabY,.34],size:[width,.15,.68]});
  parts.push({paint:'rail',xyz:[0,slabY+.92,.66],size:[width,.055,.055]});
  for(const x of [-width/2,width/2]){parts.push({paint:'rail',xyz:[x,slabY+.5,.36],size:[.055,.94,.055]});parts.push({paint:'rail',xyz:[x,slabY+.92,.34],size:[.055,.055,.68]});}
  for(let x=-width/2+.23;x<width/2-.1;x+=.27)parts.push({paint:'rail',xyz:[x,slabY+.49,.66],size:[.035,.85,.035]});
  const parent=new THREE.Matrix4().makeBasis(new THREE.Vector3(cell.nz,0,-cell.nx),new THREE.Vector3(0,1,0),new THREE.Vector3(cell.nx,0,cell.nz));parent.setPosition(cell.x,0,cell.z);
  return parts.map(part=>{const local=new THREE.Matrix4().compose(new THREE.Vector3(...part.xyz),new THREE.Quaternion(),new THREE.Vector3(...part.size)),matrix=parent.clone().multiply(local),b=geometry.boundingBox.clone().applyMatrix4(matrix),box={minx:b.min.x-.001,maxx:b.max.x+.001,miny:b.min.y-.001,maxy:b.max.y+.001,minz:b.min.z-.001,maxz:b.max.z+.001};return {...part,matrix,box};});
 }
 const overlap=(a,b)=>a.minx<b.maxx&&a.maxx>b.minx&&a.miny<b.maxy&&a.maxy>b.miny&&a.minz<b.maxz&&a.maxz>b.minz;
 for(const {profile:p,facade}of facades){
  if(!balconyProfiles.has(p.item.id))continue;
  if(balconies>=160)break;const ownIndex=data.buildings.indexOf(p.item),vx=p.shore[0]-p.center[0],vz=p.shore[1]-p.center[1];let best=-Infinity,edge=-1;
  for(const c of facade.cells){const facing=c.nx*vx+c.nz*vz;if(facing>best){best=facing;edge=c.edge;}}
  for(const cell of facade.cells){
   if(balconies>=160)break;if(cell.edge!==edge||cell.floor<1||cell.width<2.5||cell.bay%2!==(Math.abs(p.item.id)%2))continue;
   const parts=partsFor(p,cell);if(parts.some(({box:b})=>b.maxy>p.eaves-.15||b.miny<p.item.base||[b.minx,b.maxx].some(x=>[b.minz,b.maxz].some(z=>surfaceAt(play,x,z).water))||play.boxes.some(q=>overlap(b,q))||play.prisms.some((q,i)=>i!==ownIndex&&overlap(b,{minx:q.bounds[0],maxx:q.bounds[1],minz:q.bounds[2],maxz:q.bounds[3],miny:q.miny,maxy:q.maxy}))))continue;
   for(const part of parts){if(!groups.has(part.paint))groups.set(part.paint,[]);groups.get(part.paint).push({...part,base:p.item.base,top:p.eaves});play.boxes.push(part.box);}balconies++;
  }
 }
 if(!groups.size)geometry.dispose();
 for(const [paint,parts]of groups){const material=new THREE.MeshStandardMaterial({color:paint==='stone'?0xa9a395:0x4c5553,roughness:.88}),mesh=new THREE.InstancedMesh(geometry,material,parts.length);mesh.name='sile-coastal-balcony-'+paint;mesh.userData.buildingBoxes=parts.map(p=>({box:p.box,base:p.base,top:p.top}));parts.forEach((p,i)=>mesh.setMatrixAt(i,p.matrix));mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();scene.add(mesh);}
 scene.userData.sileBuildingStats={buildings:profiles.size,balconies,authored:true};
}
