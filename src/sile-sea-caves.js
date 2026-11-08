import {ConvexHull} from 'three/addons/math/ConvexHull.js';
import * as THREE from 'three';
import source from './data/sile-context.json' with {type:'json'};
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {beachSandMaterial} from './sile-sand.js';
import {caveVolume,cavePoint,clipSolid,subtractCave} from './sea-cave-volume.js';
import {coastCliffContacts,prepareCliffWeathering} from './sile-rock-view.js';
// Photo-informed authoring. The source DSM/coastline remains unchanged; neither
// entrance position nor interior dimensions are a survey of the real caves.
export function sileSeaCaves(terrain,data){if(data?.id!=='sile'||!Object.entries(source.projection).every(([k,v])=>data.projection?.[k]===v))return [];return [
 {id:'feneralti',name:'Feneraltı / Zeki Müren Mağarası',origin:[1012.477558217635,-348.139690868797],axis:[.6629165507,.7486932929],halfWidth:8,sideHeight:.5,rise:4,taper:-.006,profile:[[-8,-1.2],[8,-1.2],[8,.45],[7.1,1.4],[4.2,3.3],[1.6,4.25],[-1.4,4.5],[-4.8,3.5],[-7.2,1.8],[-8,.4]],minD:-10,maxD:21,blind:true},
 {id:'su-icen-fil',exterior:{center:[.55,3,-7.5],radii:[5.2,4.8,7.2]},name:'Su İçen Fil Geçidi',origin:[1245.8111079319624,-439.42965547522294],axis:[.6427876096865394,.766044443118978],halfWidth:2.8,sideHeight:.4,rise:3.6,profile:[[-2.8,-1.2],[2.8,-1.2],[2.8,.3],[2.2,1.9],[.65,3.6],[-.2,4],[-1.45,3.1],[-2.65,1.4],[-2.8,.35]],minD:-16,maxD:16,blind:false}
 ].map(s=>{const c=caveVolume({...s,sea:-terrain.datum,authored:true,interiorSurveyed:false});c.footprint=[cavePoint(c,-c.halfWidth,0,c.minD),cavePoint(c,c.halfWidth,0,c.minD),cavePoint(c,c.halfWidth,0,c.maxD),cavePoint(c,-c.halfWidth,0,c.maxD)];c.bounds=[Math.min(...c.footprint.map(p=>p[0])),Math.max(...c.footprint.map(p=>p[0])),Math.min(...c.footprint.map(p=>p[2])),Math.max(...c.footprint.map(p=>p[2]))];return c;}).filter(c=>c.bounds[0]>=terrain.bounds[0]&&c.bounds[1]<=terrain.bounds[1]&&c.bounds[2]>=terrain.bounds[2]&&c.bounds[3]<=terrain.bounds[3]);}
const overlap=(poly,c)=>Math.min(...poly.map(p=>p[0]))<=c.bounds[1]&&Math.max(...poly.map(p=>p[0]))>=c.bounds[0]&&Math.min(...poly.map(p=>p[2]))<=c.bounds[3]&&Math.max(...poly.map(p=>p[2]))>=c.bounds[2];
function fan(poly){const out=[];for(let j=1;j+1<poly.length;j++){const t=[poly[0],poly[j],poly[j+1]],a=new THREE.Vector3(...t[0]),b=new THREE.Vector3(...t[1]),c=new THREE.Vector3(...t[2]);if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-14)out.push(t);}return out;}
export function carveCaveCliffs(raw,caves){
 if(!caves.length)return raw;
 const out={positions:[],uv:[],colors:[]};for(let i=0;i<raw.positions.length/3;i+=3){let pieces=[[0,1,2].map(k=>[...raw.positions.slice((i+k)*3,(i+k)*3+3),...raw.uv.slice((i+k)*2,(i+k)*2+2),...raw.colors.slice((i+k)*3,(i+k)*3+3)])];
  for(const c of caves)pieces=pieces.flatMap(p=>overlap(p,c)?subtractCave(p,c):[p]);
  for(const p of pieces)for(const t of fan(p))for(const v of t){out.positions.push(...v.slice(0,3));out.uv.push(...v.slice(3,5));out.colors.push(...v.slice(5,8));}
 }return out;
}
// Authored seaward head/buttress, informed by the reference silhouette. Its
// opening is subtracted with exactly the same planes used by the flight query.
function exteriorRock(c){
 if(!c.exterior)return null;const cloud=[],lobes=[c.exterior,{center:[3,1.6,-11.2],radii:[2,3.8,2.4]}];
 for(const {center,radii}of lobes)for(let r=0;r<=10;r++){const a=r/10*Math.PI;for(let k=0;k<20;k++){const b=k/20*Math.PI*2,rough=1+.10*Math.sin(b*3+a*2)*Math.sin(a)+.055*Math.cos(b*7-a*3)*Math.sin(a),power=v=>Math.sign(v)*Math.abs(v)**.65,u=center[0]+radii[0]*power(Math.sin(a))*power(Math.cos(b))*rough,h=center[1]+radii[1]*power(Math.cos(a))*rough,d=center[2]+radii[2]*power(Math.sin(a))*power(Math.sin(b))*rough;cloud.push(new THREE.Vector3(...cavePoint(c,u,c.sea+h,d)));}}
 const hull=new ConvexHull().setFromPoints(cloud),triangles=[],planes=[];
 for(const face of hull.faces){const points=[];let edge=face.edge;do{points.push(edge.head().point.toArray());edge=edge.next;}while(edge!==face.edge);triangles.push(...fan(points));planes.push({n:face.normal.toArray(),d:face.constant});}return {triangles,planes};
}
function outsideSolids(poly,solids){let pieces=[poly];for(const planes of solids){pieces=pieces.flatMap(p=>subtractCave(p,{planes}));if(!pieces.length)break;}return pieces.flatMap(fan);}
function triangleSolid(t){
 const [a,b,c]=t,n=new THREE.Vector3().subVectors(new THREE.Vector3(...b),new THREE.Vector3(...a)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c),new THREE.Vector3(...a)));if(Math.abs(n.y)<1e-8)return null;if(n.y<0)n.negate();n.normalize();
 const planes=[{n:n.toArray(),d:n.dot(new THREE.Vector3(...a))}];
 for(let i=0;i<3;i++){const p=t[i],q=t[(i+1)%3],other=t[(i+2)%3],nn=[q[2]-p[2],0,p[0]-q[0]];let dd=nn[0]*p[0]+nn[2]*p[2];if(nn[0]*other[0]+nn[2]*other[2]>dd){nn[0]*=-1;nn[2]*=-1;dd*=-1;}planes.push({n:nn,d:dd});}return planes;
}
function geometry(triangles,c,exteriorStart=Infinity){const p=[],uv=[],colors=[];for(const [index,t]of triangles.entries())for(const v of t){p.push(...v);const d=(v[0]-c.origin[0])*c.axis[0]+(v[2]-c.origin[1])*c.axis[1];const u=(v[0]-c.origin[0])*c.side[0]+(v[2]-c.origin[1])*c.side[1],angle=Math.atan2((v[1]-c.sea-c.sideHeight)/c.rise,u/c.halfWidth);if(index>=exteriorStart){const n=new THREE.Vector3(...t[1]).sub(new THREE.Vector3(...t[0])).cross(new THREE.Vector3(...t[2]).sub(new THREE.Vector3(...t[0]))).normalize();uv.push(Math.abs(n.z)>Math.abs(n.x)?v[0]/1.5:v[2]/1.5,Math.abs(n.y)>.7?v[2]/1.5:v[1]/1.5);}else uv.push(d*.8,angle*Math.max(c.halfWidth,c.rise)*.8);const shade=index>=exteriorStart?.65:c.blind?Math.max(.12,.42-d*.012):.3;if(index>=exteriorStart)colors.push(shade,shade*.94,shade*.83);else colors.push(shade*.91,shade*.97,shade);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return prepareCliffWeathering(g,-c.sea);}
export function addSeaCaveInteriors(scene,data,play,caves,material){
 play.terrain={...play.terrain,seaCaves:caves};if(!caves.length)return;play.terrainWalls??=[];const parts=[],groups=[];let vertexStart=0;
 for(const c of caves){
  const solids=[],caps=[],footPlanes=c.planes.filter(p=>Math.abs(p.n[1])<1e-10);
  for(let i=0;i<data.positions.length;i+=9){const t=[0,3,6].map(k=>data.positions.slice(i+k,i+k+3));if(!overlap(t,c))continue;const planes=triangleSolid(t);if(planes)solids.push(planes);caps.push(...fan(clipSolid(t,footPlanes)));}
  // Roof collision follows existing uploaded top faces, including the small
  // authored draping offsets, rather than introducing another roof surface.
  caps.length=0;
  for(const top of scene.children.filter(o=>['sile-terrain','sile-roads','sile-source-sand','sile-source-rock','sile-street-paving','sile-building-aprons','sile-harbour-paved'].includes(o.name))){const p=top.geometry.attributes.position,ix=top.geometry.index,count=ix?.count??p.count;for(let i=0;i<count;i+=3){const t=[0,1,2].map(k=>{const j=ix?ix.getX(i+k):i+k;return[p.getX(j),p.getY(j),p.getZ(j)];});if(overlap(t,c))caps.push(...fan(clipSolid(t,footPlanes)));}}
  const faces=[];
  for(let d=c.minD;d<c.maxD;d+=2){const end=Math.min(c.maxD,d+2);for(let i=0;i<c.section.length;i++){const a=c.section[i],b=c.section[(i+1)%c.section.length],p=cavePoint(c,...a,d),q=cavePoint(c,...b,d),r=cavePoint(c,...a,end),s=cavePoint(c,...b,end);faces.push([p,q,r],[q,s,r]);}}
  if(c.blind){const back=c.section.map(([u,y])=>cavePoint(c,u,y,c.maxD));faces.push(...fan(back));}
  const interior=[];for(const f of faces)for(const solid of solids)interior.push(...fan(clipSolid(f,solid)));
  const exterior=exteriorRock(c);c.exteriorTriangles=0;let exteriorStart=Infinity;
  if(exterior){
   // The cavity lining occupies the union of source land and the authored
   // rock solid. Subtract native solids to avoid duplicate coplanar lining.
   for(const f of faces){const clipped=clipSolid(f,exterior.planes);if(clipped.length)interior.push(...outsideSolids(clipped,solids));}
   exteriorStart=interior.length;
   for(const f of exterior.triangles)for(const clipped of subtractCave(f,c))interior.push(...outsideSolids(clipped,solids));
   c.exteriorTriangles=interior.length-exteriorStart;
  }
  const g=geometry(interior,c,exteriorStart);c.meshRange={start:vertexStart,count:g.attributes.position.count};vertexStart+=g.attributes.position.count;parts.push(g);groups.push(0);
  for(const contact of coastCliffContacts(g))play.terrainWalls.push({...contact,mesh:'sile-sea-caves',caveId:c.id,role:'shell',authored:'sea-cave',reason:'mağara kayalığına çarptı'});
  // These contacts represent the original terrain above the void. They prevent
  // fast downward steps from skipping the roof and entering the cavity.
  const capGeometry=new THREE.BufferGeometry();capGeometry.setAttribute('position',new THREE.Float32BufferAttribute(caps.flat(2),3));for(const contact of coastCliffContacts(capGeometry))play.terrainWalls.push({...contact,mesh:'sile-cave-native-roof-'+c.id,authored:'sea-cave-roof',landing:true,reason:'kayalığa çarptı'});capGeometry.dispose();
  if(c.blind){
   const floor=[];for(let d=6;d<c.maxD;d+=1){const end=Math.min(c.maxD,d+1),height=v=>c.sea-.3+(v-6)*.06,a=cavePoint(c,-c.halfWidth,height(d),d),b=cavePoint(c,c.halfWidth,height(d),d),q=cavePoint(c,-c.halfWidth,height(end),end),r=cavePoint(c,c.halfWidth,height(end),end);for(const t of [[a,q,b],[b,q,r]])for(const solid of solids)floor.push(...fan(clipSolid(clipSolid(t,c.planes),solid)));}
   const fg=geometry(floor,c),color=fg.attributes.color,uv=fg.attributes.uv,p=fg.attributes.position;for(let i=0;i<p.count;i++){color.setXYZ(i,1,1,1);const x=p.getX(i)-c.origin[0],z=p.getZ(i)-c.origin[1];uv.setXY(i,(x*c.side[0]+z*c.side[1])/4,(x*c.axis[0]+z*c.axis[1])/4);}c.floorRange={start:vertexStart,count:p.count};vertexStart+=p.count;parts.push(fg);groups.push(1);c.floorSurface={positions:p.array};for(const contact of coastCliffContacts(fg))play.terrainWalls.push({...contact,mesh:'sile-sea-caves',caveId:c.id,role:'floor',authored:'sea-cave-floor',landing:true,reason:'mağara zeminine çarptı'});
  }
  c.interiorTriangles=g.attributes.position.count/3;c.roofTriangles=caps.length;
 }
 const merged=mergeGeometries(parts,true);merged.groups.forEach((g,i)=>g.materialIndex=groups[i]);parts.forEach(g=>g.dispose());const mesh=new THREE.Mesh(merged,[material,beachSandMaterial()]);mesh.name='sile-sea-caves';mesh.receiveShadow=true;scene.add(mesh);
}
