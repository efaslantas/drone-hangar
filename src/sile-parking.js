import * as THREE from 'three';
import source from './data/sile-context.json' with {type:'json'};
import {createSurfacePartition} from './sile-shore.js';
// Replace residual terrain faces, preserving their planes; never overlay paving.
export function parkingSurfaces(positions,masks){
 if(!masks.length)return {ground:positions,paved:[]};
 const split=createSurfacePartition(masks,{spatial:true}),ground=[],paved=[];
 for(let i=0;i<positions.length;i+=9){const p=split([0,3,6].map(k=>[positions[i+k],positions[i+k+2],positions[i+k+1]]));for(const [key,out]of [['inside',paved],['outside',ground]])for(const t of p[key]){const v=t.flatMap(([x,z,y])=>[x,y,z]).map(Math.fround);if(Math.abs((v[3]-v[0])*(v[8]-v[2])-(v[5]-v[2])*(v[6]-v[0]))>1e-8)out.push(...v);}}
 return {ground,paved};
}
export function mappedParkingSurfaces(data,positions){
 if(data.completionLayer!==1||!Object.entries(source.projection).every(([k,v])=>data.projection?.[k]===v))return {ground:positions,paved:[]};
 const masks=source.paved.map(f=>f.rings),first=parkingSurfaces(positions,masks),occupied=[...data.buildings,...(data.supplementalBuildings||[])].map(b=>b.rings),safe=parkingSurfaces(first.paved,occupied);
 // Ground under buildings remains ordinary terrain; this does not grade land.
 return {ground:[...first.ground,...safe.paved],paved:safe.ground};
}
export function addMappedParking(scene,positions){
 if(!positions.length)return;
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(positions.flatMap((v,i)=>i%3===0?[v/3,positions[i+2]/3]:[]),2));g.computeVertexNormals();
 const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x555550,roughness:.96}));mesh.name='sile-mapped-parking';mesh.receiveShadow=true;scene.add(mesh);
 // Representative bay paint, not a survey of current road markings. Clip the
 // paint to actual residual mapped paving, so it cannot extend across streets.
 const masks=[];for(const f of source.paved){const r=f.rings[0];let a,b,len=0;for(let i=0;i<r.length;i++){const p=r[i],q=r[(i+1)%r.length],d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d>len){len=d;a=p;b=q;}}if(len<12)continue;const dx=(b[0]-a[0])/len,dz=(b[1]-a[1])/len;for(let d=3;d<len-2;d+=2.6){const x=a[0]+dx*d,z=a[1]+dz*d;for(const sign of [-1,1]){const nx=-dz*sign,nz=dx*sign;masks.push([[[x+nx*1.2,z+nz*1.2],[x+dx*.09+nx*1.2,z+dz*.09+nz*1.2],[x+dx*.09+nx*6,z+dz*.09+nz*6],[x+nx*6,z+nz*6]]]);}}}
 const paint=parkingSurfaces(positions,masks).paved;if(paint.length){const p=new THREE.BufferGeometry();p.setAttribute('position',new THREE.Float32BufferAttribute(paint,3));p.computeVertexNormals();const m=new THREE.Mesh(p,new THREE.MeshStandardMaterial({color:0xc9c5ac,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2}));m.name='sile-parking-paint';m.receiveShadow=true;scene.add(m);}
 scene.userData.sileParkingStats={sourcePolygons:source.paved.length,triangles:positions.length/9,paintTriangles:paint.length/9,markingsMeasured:false,unspecifiedPavingAssumed:true};
}
