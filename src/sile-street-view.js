import * as THREE from 'three';
import{roadFieldIndex,segmentDistance}from './sile-neighbourhood.js';
import{streetBandPartition}from './sile-streets.js';
import{surfaceTexture}from './surfaces.js';
// A local road/edge owns orientation for each triangle. Canonical direction
// keeps phase stable when a source polyline reverses; UV units remain metres.
export function pavingFrame(roads){const index=roadFieldIndex(roads);return(x,z)=>{let best=null,d=Infinity;for(const r of index(x,z)){const q=segmentDistance(x,z,r.a,r.b);if(q<d){d=q;best=r;}}return best;};}
export function pavingGeometry(positions,{frame,weatherBase=false}={}){
 const g=new THREE.BufferGeometry(),uv=[],colors=[];
 for(let i=0;i<positions.length;i+=9){
  const edge=frame?.((positions[i]+positions[i+3]+positions[i+6])/3,(positions[i+2]+positions[i+5]+positions[i+8])/3);let dx=1,dz=0;
  if(edge){const length=Math.hypot(edge.b[0]-edge.a[0],edge.b[1]-edge.a[1]);if(length>.0001){dx=(edge.b[0]-edge.a[0])/length;dz=(edge.b[1]-edge.a[1])/length;if(dx< -1e-10||Math.abs(dx)<=1e-10&&dz<0){dx=-dx;dz=-dz;}}}
  for(let k=0;k<9;k+=3){const x=positions[i+k],z=positions[i+k+2],distance=edge?segmentDistance(x,z,edge.a,edge.b):Infinity,shade=frame ? .85+.02*Math.sin(x*.073+z*.041)-(weatherBase ? .12*Math.exp(-distance/.24):0):.94+.035*Math.sin(x*.073+z*.041);uv.push(x*dx+z*dz,-x*dz+z*dx);colors.push(shade,shade,shade);}
 }
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
export function streetPavingMaterial(){
 function texture(channel){const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');c.fillStyle=channel==='color'?'#787b72':channel==='height'?'#555':'#ddd';c.fillRect(0,0,512,512);
  for(let row=0;row<8;row++)for(let col=-1;col<5;col++){const x=col*128+(row%2)*64,y=row*64,n=((row*17+col*31+91)%7+7)%7;c.fillStyle=channel==='color'?['#b0ada1','#a4a79e','#bab7ac','#a9aaa0','#b2b1a5','#a3a79f','#b6b2a6'][n]:channel==='height'?'#aaa':'#eee';c.fillRect(x+2,y+2,124,60);if(channel==='color'){c.fillStyle='rgba(53,55,46,.04)';for(let i=0;i<24;i++)c.fillRect(x+4+(i*29+n*7)%120,y+4+(i*13+n*11)%54,2,2);}if(channel==='height'){c.fillStyle='#888';c.fillRect(x+2,y+59,124,3);}}
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=channel==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;t.userData.visualTemplate=true;return t;
 }
 return new THREE.MeshStandardMaterial({map:texture('color'),bumpMap:texture('height'),bumpScale:.006,roughnessMap:texture('roughness'),roughness:1,vertexColors:true});
}

export function streetStoneMaterial(){const material=new THREE.MeshStandardMaterial({map:surfaceTexture('concrete',1),color:0x9a9b91,roughness:.96,vertexColors:true});material.map.repeat.setScalar(.5);material.userData.scannedSurface='concrete';material.userData.groundSurface={kind:'concrete',tileMetres:2,uvMetres:true};material.userData.preserveTint=true;return material;}
export function finishStreetAppearance(scene,data,play,layout,profiles){
 if(data.completionLayer!==1||!layout.valid)return;
 const roads=[...data.roads,...layout.groundCorridors.map(c=>({width:c.width,points:[c.a,c.b]}))],roadFrame=pavingFrame(roads),wallFrame=pavingFrame([...profiles.values()].map(p=>({width:0,points:[...p.item.rings[0],p.item.rings[0][0]]}))),stone=[];let areaBefore=0,areaAfter=0;
 const area=positions=>{let a=0;for(let i=0;i<positions.length;i+=9)a+=Math.abs((positions[i+3]-positions[i])*(positions[i+8]-positions[i+2])-(positions[i+5]-positions[i+2])*(positions[i+6]-positions[i]))/2;return a;};
 for(const name of ['sile-street-paving','sile-building-aprons']){
  const mesh=scene.getObjectByName(name);if(!mesh)continue;const old=mesh.geometry,g=old.index?old.toNonIndexed():old,p=Array.from(g.attributes.position.array),parts=streetBandPartition(p,data.roads),weatherBase=name==='sile-building-aprons';areaBefore+=area(p);areaAfter+=area(parts.paving)+area(parts.stone);for(const v of parts.stone)stone.push(v);
  mesh.geometry=pavingGeometry(parts.paving,{frame:weatherBase?wallFrame:roadFrame,weatherBase});old.dispose();if(g!==old)g.dispose();
 }
 let stoneArea=0;if(stone.length){const geometry=pavingGeometry(stone,{frame:roadFrame}),material=streetStoneMaterial();
  const mesh=new THREE.Mesh(geometry,material);mesh.name='sile-roadside-stone-bands';mesh.receiveShadow=true;scene.add(mesh);stoneArea=area(Array.from(geometry.attributes.position.array));
 }
 scene.userData.sileStreetStats.appearance={bandWidthM:.26,stoneAreaM2:stoneArea,pavingAreaBeforeM2:areaBefore,partitionAreaAfterM2:areaAfter,oriented:true,flush:true,measured:false};
}
