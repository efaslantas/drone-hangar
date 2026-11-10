import * as THREE from 'three';
import source from './data/sile-context.json' with {type:'json'};
import {parkingSurfaces} from './sile-parking.js';
import {concreteMaterial} from './sile-concrete.js';
import {insidePolygon} from './geo-terrain.js';
import {harbourLayout} from './sile-harbour.js';
// Clipping in doubles then uploading Float32 can leave microscopic coastline
// strips whose centroid lies on water. Retain exact supported vertices only.
export function supportedLandFragments(positions,land){
 const out=[],rejected=[];let area=0;for(let i=0;i<positions.length;i+=9){const t=positions.slice(i,i+9),x=(t[0]+t[3]+t[6])/3,z=(t[2]+t[5]+t[8])/3;if(land.some(r=>insidePolygon(x,z,r)))out.push(...t);else{rejected.push(i/9);area+=Math.abs((t[3]-t[0])*(t[8]-t[2])-(t[5]-t[2])*(t[6]-t[0]))/2;}}return {positions:out,rejectedTriangles:rejected.length,rejectedAreaM2:area};
}
// The harbour polygon is mostly water. Extend the existing10m quay apron to
// an authored30m landward band along the same mapped harbour edges. This width
// and concrete appearance are model choices, never measured paving extent.
export function mappedHarbourYard(data,positions){
 if(data.completionLayer!==1||!Object.entries(source.projection).every(([k,v])=>data.projection?.[k]===v))return {ground:positions,yard:[]};
 const layout=harbourLayout(data);if(!layout)return {ground:positions,yard:[]};
 const masks=layout.edges.map(({a,b,nx,nz})=>[[a,b,[b[0]+nx*30,b[1]+nz*30],[a[0]+nx*30,a[1]+nz*30]]]);
 const first=parkingSurfaces(positions,masks),land=parkingSurfaces(first.paved,data.terrain.land),excluded=[...source.green,...source.lawns,...source.beaches,...source.paved,...source.sports,...data.buildings,...data.structures,...(data.supplementalBuildings||[])].map(f=>f.rings),safe=parkingSurfaces(land.paved,excluded);
 const stable=supportedLandFragments(safe.ground,data.terrain.land);
 return {ground:[...first.ground,...land.ground,...safe.paved],yard:stable.positions,roundingRejectedTriangles:stable.rejectedTriangles,roundingRejectedAreaM2:stable.rejectedAreaM2};
}
export function addHarbourYard(scene,positions,{roundingRejectedTriangles=0,roundingRejectedAreaM2=0}={}){
 if(!positions.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(positions.flatMap((v,i)=>i%3===0?[v/4,positions[i+2]/4]:[]),2));g.computeVertexNormals();const mesh=new THREE.Mesh(g,concreteMaterial());mesh.name='sile-harbour-yard';mesh.receiveShadow=true;scene.add(mesh);scene.userData.sileHarbourYardStats={sourceIds:source.harbour.map(f=>f.id),triangles:positions.length/9,measuredMaterial:false,grading:false,landwardBandM:30,widthMeasured:false,roundingRejectedTriangles,roundingRejectedAreaM2};
}
