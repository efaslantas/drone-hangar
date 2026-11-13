import * as THREE from 'three';
import{roadFieldIndex,segmentDistance}from './sile-neighbourhood.js';
import{streetBandPartition,roadRibbonMasks}from './sile-streets.js';
import{createSurfacePartition}from './sile-shore.js';
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
  for(let row=0;row<8;row++)for(let col=-1;col<5;col++){const x=col*128+(row%2)*64,y=row*64,n=((row*17+col*31+91)%7+7)%7;c.fillStyle=channel==='color'?['#b0ada1','#a4a79e','#bab7ac','#a9aaa0','#b2b1a5','#a3a79f','#b6b2a6'][n]:channel==='height'?'#aaa':'#eee';c.fillRect(x+2,y+2,124,60);if(channel==='color'){c.fillStyle='rgba(53,55,46,.04)';for(let i=0;i<24;i++)c.fillRect(x+4+(i*29+n*7)%120,y+4+(i*13+n*11)%54,2,2);}if(channel==='height'){c.fillStyle='#777';c.fillRect(x+2,y+2,124,2);c.fillRect(x+2,y+2,2,60);c.fillStyle='#888';c.fillRect(x+2,y+59,124,3);c.fillRect(x+124,y+2,2,60);}if(channel==='roughness'){const r=218+n*3;c.fillStyle=`rgb(${r},${r},${r})`;c.fillRect(x+4,y+4,120,56);}for(let i=0;i<48;i++){const gx=x+5+(i*37+n*19)%117,gy=y+5+(i*23+n*7)%53;c.fillStyle=channel==='color'?(i%3?'rgba(47,48,42,.055)':'rgba(235,232,219,.08)'):channel==='height'?(i%3?'#a5a5a5':'#b0b0b0'):(i%3?'#ddd':'#ececec');c.fillRect(gx,gy,1+i%2,1);}if(channel==='color'){c.fillStyle='rgba(222,219,206,.16)';c.fillRect(x+3,y+3,122,1);c.fillRect(x+3,y+3,1,58);c.fillStyle='rgba(49,51,44,.12)';c.fillRect(x+3,y+60,122,1);}}
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
 const asphalt=scene.getObjectByName('sile-roads');let shoulderArea=0;
 if(asphalt&&!asphalt.userData.asphaltWeathered){const old=asphalt.geometry,source=old.index?old.toNonIndexed():old;asphalt.geometry=asphaltWeatherGeometry(Array.from(source.attributes.position.array),data.roads);old.dispose();if(source!==old)source.dispose();shoulderArea=asphalt.geometry.userData.shoulderAreaM2;asphalt.userData.metricGround=true;asphalt.userData.asphaltWeathered=true;asphalt.material.vertexColors=true;asphalt.material.map.repeat.setScalar(1/1.5);asphalt.material.userData.groundSurface={kind:'asphalt',tileMetres:1.5,uvMetres:true};}
 scene.userData.sileStreetStats.appearance={asphaltShoulderWidthM:.55,asphaltShoulderAreaM2:shoulderArea,asphaltWeathered:!!asphalt?.userData.asphaltWeathered,bandWidthM:.26,stoneAreaM2:stoneArea,pavingAreaBeforeM2:areaBefore,partitionAreaAfterM2:areaAfter,oriented:true,flush:true,measured:false};
}

// Reuse the source road union to refine only the existing visible asphalt.
// Inset boundaries give the narrow shoulder its own vertices on the old plane.
export function asphaltWeatherGeometry(positions,roads){
 const compare=(a,b)=>{for(let i=0;i<Math.min(a.length,b.length);i++){const d=a[i][0]-b[i][0]||a[i][1]-b[i][1];if(d)return d;}return a.length-b.length;};
 const canonical=points=>{const a=points[0],b=points.at(-1);if(!a||!b)return points;if(a[0]!==b[0]||a[1]!==b[1])return compare(points,points.toReversed())<=0?points:points.toReversed();const ring=points.slice(0,-1);let best=ring;for(const direction of[ring,ring.toReversed()])for(let i=0;i<direction.length;i++){const rotated=[...direction.slice(i),...direction.slice(0,i)];if(compare(rotated,best)<0)best=rotated;}return [...best,best[0]];};
 const drive=roads.filter(r=>!['footway','path','steps','pedestrian'].includes(r.kind)).map(r=>({...r,points:canonical(r.points)})),masks=roadRibbonMasks(drive,-.55),inner=createSurfacePartition(masks,{spatial:true}),distanceToInset=asphaltInsetDistance(masks),out=[],colors=[];let shoulderArea=0;
 function append(t,shoulder){for(const[x,z,y]of t){out.push(x,y,z);const distance=shoulder&&drive.length?distanceToInset(x,z):0,f=shoulder?Math.max(0,Math.min(1,distance/.55)):0,tint=f*f*(3-2*f),base=.86+.018*Math.sin(x*.071+z*.049);colors.push(base+.1*tint,base+.085*tint,base+.035*tint);}}
 for(let i=0;i<positions.length;i+=9){const triangle=[0,3,6].map(k=>[positions[i+k],positions[i+k+2],positions[i+k+1]]),parts=inner(triangle);for(const t of parts.inside)append(t,false);for(const t of parts.outside){shoulderArea+=Math.abs((t[1][0]-t[0][0])*(t[2][1]-t[0][1])-(t[1][1]-t[0][1])*(t[2][0]-t[0][0]))/2;append(t,true);}}
 const g=pavingGeometry(out,{frame:pavingFrame(drive)});g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.userData.shoulderAreaM2=shoulderArea;return g;
}

// Only distances within the55cm blend affect color. Index that narrow reach,
// without the general road field's total-reference fallback to a global list.
export function asphaltInsetDistance(masks){
 const cells=new Map(),global=[],step=24,reach=.55;
 for(const rings of masks)for(const ring of rings)for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length];if(![...a,...b].every(Number.isFinite))continue;
  const x0=Math.floor((Math.min(a[0],b[0])-reach)/step),x1=Math.floor((Math.max(a[0],b[0])+reach)/step),z0=Math.floor((Math.min(a[1],b[1])-reach)/step),z1=Math.floor((Math.max(a[1],b[1])+reach)/step),edge=[a,b],count=(x1-x0+1)*(z1-z0+1);
  if(![x0,x1,z0,z1,count].every(Number.isSafeInteger)||count>4096){global.push(edge);continue;}
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=x+':'+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(edge);}
 }
 return(x,z)=>{let d=reach;for(const[a,b]of cells.get(Math.floor(x/step)+':'+Math.floor(z/step))||[])d=Math.min(d,segmentDistance(x,z,a,b));for(const[a,b]of global)d=Math.min(d,segmentDistance(x,z,a,b));return d;};
}
