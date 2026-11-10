import * as THREE from 'three';
import contextSource from './data/sile-context.json' with {type:'json'};
import {planNeighbourhood,neighbourhoodField,segmentDistance}from './sile-neighbourhood.js';
import {surfaceAt,terrainHeight,insidePolygon}from './geo-terrain.js';
function overlap(a,b){return a.minx<b.maxx&&a.maxx>b.minx&&a.miny<b.maxy&&a.maxy>b.miny&&a.minz<b.maxz&&a.maxz>b.minz;}
export function addNeighbourhood(scene,data,play,profiles){
 const plan=planNeighbourhood(data,play,profiles);if(!plan.valid)return;const geometries={box:new THREE.BoxGeometry(1,1,1),post:new THREE.CylinderGeometry(.5,.5,1,8),leaf:new THREE.IcosahedronGeometry(.5,2)},groups=new Map(),lamps=[];
 // An irregular, mottled crown reads as foliage rather than a smooth ball.
 const leaf=geometries.leaf,lp=leaf.attributes.position,lc=[];for(let i=0;i<lp.count;i++){const x=lp.getX(i),y=lp.getY(i),z=lp.getZ(i),n=Math.sin(x*47+y*31+z*17)*Math.cos(z*39-x*23),f=.9+.08*n;lp.setXYZ(i,x*f,y*f,z*f);const shade=.83+.17*(n+1)/2;lc.push(shade,.9+.1*(n+1)/2,shade*.86);}leaf.setAttribute('color',new THREE.Float32BufferAttribute(lc,3));leaf.computeVertexNormals();for(const g of Object.values(geometries))g.computeBoundingBox();let lampCount=0,planterCount=0,benchCount=0;
 function clear(box){
  const x=(box.minx+box.maxx)/2,z=(box.minz+box.maxz)/2,r=Math.hypot((box.maxx-box.minx)/2,(box.maxz-box.minz)/2),t=play.terrain;
  if(data.completionLayer===1&&contextSource.sports.some(f=>insidePolygon(x,z,f.rings)))return false;
  if(Math.hypot(x,z)<14+r||box.minx<t.bounds[0]||box.maxx>t.bounds[1]||box.minz<t.bounds[2]||box.maxz>t.bounds[3]||surfaceAt(play,x,z).water)return false;
  if((play.groundCorridors||[]).some(c=>segmentDistance(x,z,c.a,c.b)<c.width/2+r))return false;
  for(const rings of t.land)for(const ring of rings)for(let i=0;i<ring.length;i++)if(segmentDistance(x,z,ring[i],ring[(i+1)%ring.length])<r)return false;
  for(const road of data.roads)for(let i=1;i<road.points.length;i++)if(segmentDistance(x,z,road.points[i-1],road.points[i])<road.width/2+r+.15)return false;
  if(play.boxes.some(b=>overlap(box,b)))return false;
  for(const p of play.prisms)if(overlap(box,{minx:p.bounds[0],maxx:p.bounds[1],minz:p.bounds[2],maxz:p.bounds[3],miny:p.miny,maxy:p.maxy}))return false;
  return true;
 }
 function candidate(owner,parts,sloped=false){
  const up=sloped?new THREE.Vector3(...owner.normal):new THREE.Vector3(0,1,0),forward=new THREE.Vector3(owner.nx,0,owner.nz);forward.addScaledVector(up,-forward.dot(up)).normalize();const right=new THREE.Vector3().crossVectors(up,forward).normalize(),parent=new THREE.Matrix4().makeBasis(right,up,forward);parent.setPosition(owner.x,owner.y,owner.z);
  const result=parts.map(p=>{const local=new THREE.Matrix4().compose(new THREE.Vector3(...p.xyz),new THREE.Quaternion(),new THREE.Vector3(...p.size)),matrix=parent.clone().multiply(local),b=geometries[p.shape].boundingBox.clone().applyMatrix4(matrix),box={minx:b.min.x-.001,maxx:b.max.x+.001,miny:b.min.y-.001,maxy:b.max.y+.001,minz:b.min.z-.001,maxz:b.max.z+.001};if(owner.authored){box.authored=owner.authored;if(p.support)box.support=true;}return {...p,matrix,box};});
  if(sloped){for(const x of [-.5,.5])for(const z of [-.3,.3]){const foot=new THREE.Vector3(x,0,z).applyMatrix4(parent),delta=foot.y-terrainHeight(play.terrain,foot.x,foot.z);if(delta>.045||delta<-.08)return false;}}
  if(owner.authored==='coastal-bench'){
   // Reject terrain-face bends beneath any of the four actual support feet.
   for(const p of result.filter(p=>p.support))for(const x of [-.5,.5])for(const z of [-.5,.5]){const foot=new THREE.Vector3(x,-.5,z).applyMatrix4(p.matrix),delta=foot.y-terrainHeight(play.terrain,foot.x,foot.z);if(delta>.0005||delta<-.02)return false;}
  }
  if(result.some(p=>!clear(p.box)))return false;
  for(const p of result){const key=p.shape+':'+p.paint;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);play.boxes.push(p.box);}return true;
 }
 for(const p of plan.lamps){if(lampCount>=56)break;if(lamps.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<15))continue;
  if(candidate(p,[{shape:'post',paint:'solid',xyz:[0,.04,0],size:[.34,.2,.34],color:0x797b71},{shape:'post',paint:'solid',xyz:[0,2.4,0],size:[.13,4.8,.13],color:0x545d59},{shape:'box',paint:'solid',xyz:[0,4.72,.48],size:[.09,.09,.96],color:0x545d59},{shape:'box',paint:'solid',xyz:[0,4.69,1],size:[.58,.14,.28],color:0x46514e},{shape:'box',paint:'lens',xyz:[0,4.612,1],size:[.48,.015,.2],color:0xd6d9c7}])){lamps.push(p);lampCount++;}
 }
 for(const p of plan.planters){if(planterCount>=64)break;if(candidate(p,[{shape:'box',paint:'solid',xyz:[0,.225,0],size:[1,.45,.6],color:0x8c8675},{shape:'leaf',paint:'solid',xyz:[0,.78,0],size:[.92,.85,.68],color:0x4a643d}],true))planterCount++;}
 const benches=[];for(const p of plan.benches){if(benchCount>=32)break;if(benches.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<18))continue;
  const parts=[{shape:'box',paint:'solid',xyz:[0,.48,0],size:[2,.09,.64],color:0x8c7960},{shape:'box',paint:'solid',xyz:[0,.78,-.29],size:[2,.45,.085],color:0x8c7960}];
  for(const x of [-.76,.76])for(const z of [-.22,.22])parts.push({shape:'box',paint:'solid',xyz:[x,.215,z],size:[.12,.45,.12],color:0x515952,support:true});
  if(candidate({...p,authored:'coastal-bench'},parts,true)){benches.push(p);benchCount++;}
 }
 const used=new Set();for(const [key,parts]of groups){const [shape,paint]=key.split(':'),g=geometries[shape];used.add(g);const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:shape==='leaf',roughness:paint==='lens'?.45:.94,emissive:paint==='lens'?0x7d806a:0,emissiveIntensity:paint==='lens'?.2:0}),mesh=new THREE.InstancedMesh(g,material,parts.length);mesh.name='sile-neighbourhood-'+key;mesh.userData.neighbourhoodBoxes=parts.map(p=>p.box);parts.forEach((p,i)=>{mesh.setMatrixAt(i,p.matrix);mesh.setColorAt(i,new THREE.Color(p.color));});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();scene.add(mesh);}
 for(const g of Object.values(geometries))if(!used.has(g))g.dispose();scene.userData.sileNeighbourhood={data,profiles};scene.userData.sileNeighbourhoodStats={lamps:lampCount,planters:planterCount,benches:benchCount,authored:true};
}
export function finishNeighbourhood(scene){
 const state=scene.userData.sileNeighbourhood,ground=scene.getObjectByName('sile-terrain');if(!state||!ground||ground.userData.neighbourhoodTint)return;const field=neighbourhoodField(state.data,state.profiles),p=ground.geometry.attributes.position,c=ground.geometry.attributes.color;if(!c)return;
 for(let i=0;i<p.count;i++){const w=field(p.getX(i),p.getZ(i));c.array[i*3]*=1-.52*w;c.array[i*3+1]*=1+.08*w;c.array[i*3+2]*=1-.55*w;}
 c.needsUpdate=true;ground.userData.neighbourhoodTint=true;
}
