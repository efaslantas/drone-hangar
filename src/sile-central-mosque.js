import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {terrainHeight,insidePolygon} from './geo-terrain.js';
import {coastCliffContacts} from './sile-rock-view.js';
import profile from './data/sile-central-mosque.json' with {type:'json'};
export function mosqueSite(data){
 if(data?.id!=='sile'||data.completionLayer!==1||!Object.entries(profile.projection).every(([k,v])=>data.projection?.[k]===v))return null;
 const item=data.buildings?.find(b=>b.id===profile.sourceId),ring=item?.rings?.[0];
 if(item?.rings?.length!==1||ring?.length!==4||!ring.every(p=>p.length===2&&p.every(Number.isFinite))||!Number.isFinite(item.base)||!Number.isFinite(item.height)||item.height<=0)return null;
 const center=ring.reduce((s,p)=>[s[0]+p[0]/4,s[1]+p[1]/4],[0,0]),edges=ring.map((p,i)=>ring[(i+1)%4].map((v,k)=>v-p[k])),length=edges.map(e=>Math.hypot(...e)),turns=edges.map((e,i)=>e[0]*edges[(i+1)%4][1]-e[1]*edges[(i+1)%4][0]);
 if(!turns.every(n=>n>0)&&!turns.every(n=>n<0)||length.some(n=>n<18||n>30)||edges.some((e,i)=>Math.abs(e[0]*edges[(i+1)%4][0]+e[1]*edges[(i+1)%4][1])>length[i]*length[(i+1)%4]*.1))return null;
 const short=length[0]<length[1]?0:1,u=edges[short].map(n=>n/length[short]),v=[-u[1],u[0]],width=(length[short]+length[(short+2)%4])/2,depth=(length[(short+1)%4]+length[(short+3)%4])/2;
 const point=(x,z)=>[center[0]+u[0]*x+v[0]*z,center[1]+u[1]*x+v[1]*z],minaret=[-width/2+2,-depth/2+2];
 for(const [x,z,r]of [[0,0,6.4],[...minaret,1.35]])for(let i=0;i<24;i++){const a=i*Math.PI/12;if(!insidePolygon(...point(x+Math.cos(a)*r,z+Math.sin(a)*r),item.rings))return null;}
 return {item,rings:item.rings,center,u,v,width,depth,point,minaret,bodyHeight:profile.bodyHeightM,minaretHeight:profile.minaretHeightM,measured:false,profile};
}
const byte=x=>Math.max(0,Math.min(255,Math.round(x)));
export function mosqueTexel(material,u,v){
 u=((u%1)+1)%1;v=((v%1)+1)%1;const grain=Math.sin(u*789+v*123)*Math.cos(u*431-v*321)*2;
 if(material==='lead'){const seam=Math.min(u%(.125),.125-u%(.125))<.004||Math.abs(v-.18)<.006||Math.abs(v-.52)<.006||Math.abs(v-.85)<.006;return {color:[88,98,104].map(c=>byte(c+grain+(seam?-17:0))),height:seam?154:128,roughness:byte(171+grain),kind:'lead'};}
 const course=(v*16)%1<.035,stagger=Math.floor(v*16)%2*.5,joint=((u*5+stagger)%1)<.018;
 let color=[222,214,194].map(c=>byte(c+grain-(course||joint?12:0))),height=128,roughness=233,kind='stone';
 // One authored arched bay; y grows bottom-to-top with the UV, not image rows.
 const dx=(u-.5)/.205,arch=v<=.60||dx*dx+((v-.60)/.205)**2<1,opening=u>.295&&u<.705&&v>.23&&v<.805&&arch;
 const frame=u>.26&&u<.74&&v>.20&&v<.845&&(v<.60||((u-.5)/.24)**2+((v-.60)/.245)**2<1);
 if(frame){color=[178,146,124].map(c=>byte(c+grain));height=158;roughness=209;}
 if(opening){const lattice=((u*80)%1<.18||(v*80)%1<.18);color=lattice?[207,207,193]:[48,69,74];height=lattice?104:78;roughness=lattice?150:72;kind='window';}
 return {color,height,roughness,kind};
}
function materialTextures(kind){
 const size=256,channels={color:new Uint8Array(size*size*4),height:new Uint8Array(size*size*4),roughness:new Uint8Array(size*size*4)};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const t=mosqueTexel(kind,x/(size-1),y/(size-1)),i=(y*size+x)*4;for(let k=0;k<3;k++){channels.color[i+k]=t.color[k];channels.height[i+k]=t.height;channels.roughness[i+k]=t.roughness;}for(const a of Object.values(channels))a[i+3]=255;}
 const maps={};for(const [name,bytes]of Object.entries(channels)){const map=new THREE.DataTexture(bytes,size,size);map.flipY=false;map.colorSpace=name==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.anisotropy=4;map.userData.visualTemplate=true;map.needsUpdate=true;maps[name]=map;}return maps;
}
function wallUvs(g,base,top){
 const p=g.attributes.position,uv=[];for(let first=0;first<p.count;first+=6){const a=[p.getX(first),p.getZ(first)];let b=a,l=0;for(let j=first;j<first+6;j++){const q=[p.getX(j),p.getZ(j)],d=Math.hypot(q[0]-a[0],q[1]-a[1]);if(d>l){l=d;b=q;}}const bays=Math.max(1,Math.round(l/4.2));for(let j=first;j<first+6;j++)uv.push(l?((p.getX(j)-a[0])*(b[0]-a[0])+(p.getZ(j)-a[1])*(b[1]-a[1]))/(l*l)*bays:0,(p.getY(j)-base)/(top-base)*3);}
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return g;
}
export function mosqueGeometry(site,renderBase){
 const {item,u,v,center}=site,buckets=[[],[],[],[]],parts=[],matrix=new THREE.Matrix4().makeBasis(new THREE.Vector3(u[0],0,u[1]),new THREE.Vector3(0,1,0),new THREE.Vector3(v[0],0,v[1]));matrix.setPosition(center[0],item.base,center[1]);
 function add(g,material,world=false){if(!world)g.applyMatrix4(matrix);const flat=g.index?g.toNonIndexed():g.clone();g.dispose();buckets[material].push(flat);}
 const cylinder=(x,z,bottom,top,r0,r1,mat=0,sides=24)=>{const g=new THREE.CylinderGeometry(r1,r0,top-bottom,sides,1,false);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*(mat===1?16:1));g.translate(x,(bottom+top)/2,z);add(g,mat);};
 function dome(x,z,bottom,radius,role){parts.push({role,x,z,radius,bottom,top:bottom+radius});const g=new THREE.SphereGeometry(radius,32,16,0,Math.PI*2,0,Math.PI/2);g.translate(x,bottom,z);add(g,2);cylinder(x,z,bottom-.12,bottom+.02,radius+.08,radius+.08);}
 function finial(x,z,bottom,height){cylinder(x,z,bottom,bottom+height,.045,.025,3,8);for(let i=0;i<3;i++){const g=new THREE.SphereGeometry(.14-i*.025,8,6);g.translate(x,bottom+height*(.2+i*.24),z);add(g,3);}}
 const bodyTop=item.base+site.bodyHeight,shape=new THREE.Shape(site.rings[0].map(([x,z])=>new THREE.Vector2(x,-z))),body=new THREE.ExtrudeGeometry(shape,{depth:bodyTop-renderBase,bevelEnabled:false,steps:1});body.rotateX(-Math.PI/2);body.translate(0,renderBase,0);
 for(const group of body.groups){const g=new THREE.BufferGeometry();for(const key of ['position','normal','uv']){const a=body.attributes[key],values=a.array.slice(group.start*a.itemSize,(group.start+group.count)*a.itemSize);g.setAttribute(key,new THREE.Float32BufferAttribute(values,a.itemSize));}if(group.materialIndex===1)wallUvs(g,renderBase,bodyTop);add(g,group.materialIndex===1?1:0,true);}body.dispose();parts.push({role:'body',bottom:renderBase,top:bodyTop});
 cylinder(0,0,site.bodyHeight,13.7,7.7,7.3,0,8);cylinder(0,0,13.7,site.profile.mainDrumTopM,6.4,6.4,1,32);dome(0,0,site.profile.mainDrumTopM,site.profile.mainDomeRadiusM,'main-dome');finial(0,0,22.58,1);
 for(const [x,z]of [[-4.5,0],[4.5,0],[0,-6],[0,6]])dome(x,z,site.bodyHeight,3.7,'lower-dome');
 for(const x of [-site.width/2+2,site.width/2-2])for(const z of [-site.depth/2+2,site.depth/2-2])dome(x,z,site.bodyHeight,1.25,'corner-dome');
 const [mx,mz]=site.minaret;parts.push({role:'minaret',x:mx,z:mz,top:site.minaretHeight});
 cylinder(mx,mz,0,4.5,1.15,.88);cylinder(mx,mz,4.5,6,.88,.68);cylinder(mx,mz,6,23.7,.68,.62);cylinder(mx,mz,23.7,24.1,1.22,1.22);cylinder(mx,mz,24.1,25,1.22,1.22);cylinder(mx,mz,25,27,.62,.62);
 const cone=new THREE.ConeGeometry(.74,4.6,24);cone.translate(mx,29.3,mz);add(cone,2);finial(mx,mz,31.58,.42);
 const geometry=mergeGeometries(buckets.flat(),true);let group=0;for(let material=0;material<buckets.length;material++)for(const g of buckets[material]){geometry.groups[group++].materialIndex=material;g.dispose();}
 // Collapse consecutive material groups, keeping four draws and exact vertex order.
 const groups=[];for(const q of geometry.groups){const last=groups.at(-1);if(last?.materialIndex===q.materialIndex)last.count+=q.count;else groups.push({...q});}geometry.clearGroups();for(const g of groups)geometry.addGroup(g.start,g.count,g.materialIndex);
 return {geometry,parts};
}
export function addCompletedMosque(scene,play,data,site=mosqueSite(data)){
 if(!site||scene.getObjectByName('sile-central-mosque'))return;
 const heights=site.rings[0].map(([x,z])=>terrainHeight(play.terrain,x,z));if(!heights.every(Number.isFinite))return;const renderBase=Math.min(site.item.base,...heights)-.015,built=mosqueGeometry(site,renderBase),stone=materialTextures('stone'),lead=materialTextures('lead'),material=(maps,roughness,metalness=0)=>new THREE.MeshStandardMaterial({map:maps.color,bumpMap:maps.height,bumpScale:.012,roughnessMap:maps.roughness,roughness,metalness});
 const materials=[new THREE.MeshStandardMaterial({color:0xd6cbb2,roughness:.94}),material(stone,1),material(lead,.9,.35),new THREE.MeshStandardMaterial({color:0xc3a45f,roughness:.55,metalness:.55})],mesh=new THREE.Mesh(built.geometry,materials);mesh.name='sile-central-mosque';mesh.castShadow=mesh.receiveShadow=true;mesh.userData.mosqueParts=built.parts;scene.add(mesh);
 const body=play.prisms[data.buildings.indexOf(site.item)];if(body){body.miny=Math.fround(renderBase);body.maxy=Math.fround(site.item.base+site.bodyHeight);delete body.roofEaves;body.authored='central-mosque-body';body.sourceId=site.item.id;}
 play.terrainWalls??=[];for(const c of coastCliffContacts(built.geometry)){const [a,b,d]=c.vertices,ny=(b[2]-a[2])*(d[0]-a[0])-(b[0]-a[0])*(d[2]-a[2]);play.terrainWalls.push({...c,sourceId:site.item.id,mesh:mesh.name,authored:'central-mosque-shell',landing:ny>1e-8,reason:'camiye çarptı'});}
 scene.userData.sileMosqueStats={sourceId:site.item.id,measured:false,sourceHeightM:site.item.height,bodyHeightM:site.bodyHeight,domeTopM:22.6,minaretHeightM:site.minaretHeight,triangles:built.geometry.attributes.position.count/3,materials:materials.length,parts:built.parts,renderBase,footprintUnchanged:true};
}
