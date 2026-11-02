import * as THREE from 'three';
import source from './data/sile-context.json' with {type:'json'};
import {harbourLayout} from './sile-harbour.js';
import {insidePolygon,surfaceAt} from './geo-terrain.js';
import {roadFieldIndex} from './sile-neighbourhood.js';
import {publishMesh} from './sile-mooring.js';
import {concreteMaterial} from './sile-concrete.js';
const random=(n,s)=>{let h=(Math.imul(n,374761393)^Math.imul(s,668265263))>>>0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
const distance=(p,a,b)=>{const x=b[0]-a[0],z=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*z)/(x*x+z*z||1)));return Math.hypot(p[0]-a[0]-u*x,p[1]-a[1]-u*z);};
// A bounded authored armour shoulder on the seaward side of the source
// breakwater. It does not move the canonical coastline or invent road support.
export function planShoreArmour(data,play){
 const out={edges:[],pieces:[]},layout=harbourLayout(data);if(!layout||!play?.terrain)return out;
 out.edges=layout.edges.map((e,index)=>({...e,index})).filter(e=>e.onArm&&!e.nearHarbour);
 const rock=new THREE.IcosahedronGeometry(1,0),box=new THREE.BoxGeometry(1,1,1),block=box.toNonIndexed();box.dispose();
 const templates={rock:rock.attributes.position,block:block.attributes.position},roads=roadFieldIndex(data.roads),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),sea=-play.terrain.datum;
 for(const e of out.edges)for(let row=0;row<2;row++)for(let along=2.4+row*1.7;along<e.len-1.5&&out.pieces.length<480;along+=2.35){
  const id=(Math.round(e.a[0]*31)^Math.round(e.a[1]*73)^Math.round(along*101)^row*173)|0,kind=random(id,1)<.3?'block':'rock',radius=1.1+random(id,2)*.5,offset=1.85+row*1.65+(random(id,3)-.5)*.5,at=along+(random(id,4)-.5)*1.3,x=e.a[0]+(e.b[0]-e.a[0])*at/e.len-e.nx*offset,z=e.a[1]+(e.b[1]-e.a[1])*at/e.len-e.nz*offset,p=[x,z];
  if(source.harbour.some(f=>insidePolygon(x,z,f.rings))||roads(x,z).some(s=>distance(p,s.a,s.b)<s.width+2.9))continue;
  const centre=sea+.45+random(id,5)*.2-row*.35,sy=.95+random(id,6)*.25;
  q.setFromEuler(new THREE.Euler((random(id,7)-.5)*.7,random(id,8)*Math.PI*2,(random(id,9)-.5)*.6));matrix.compose(new THREE.Vector3(x,centre,z),q,new THREE.Vector3(radius*(kind==='block'?1.65:1),sy*(kind==='block'?1.7:1),radius*(kind==='block'?1.5:1)));
  const vertices=[],template=templates[kind];for(let i=0;i<template.count;i++){const v=new THREE.Vector3().fromBufferAttribute(template,i);if(kind==='rock')v.multiplyScalar(.9+.09*Math.sin(v.x*17+v.y*23+v.z*31));else v.x+=v.y*v.z*.12;v.applyMatrix4(matrix);vertices.push([v.x,v.y,v.z]);}
  if(vertices.some(([x,y,z])=>!surfaceAt(play,x,z).water||x<data.terrain.bounds[0]+.2||x>data.terrain.bounds[1]-.2||z<data.terrain.bounds[2]+.2||z>data.terrain.bounds[3]-.2||data.structures.some(s=>insidePolygon(x,z,s.rings))))continue;
  out.pieces.push({kind,edge:e.index,along:at,vertices});
 }
 rock.dispose();block.dispose();return out;
}
export function addShoreArmour(scene,data,play,rockMaterial){
 const plan=planShoreArmour(data,play);if(!plan.pieces.length)return plan;
 const positions=[],colors=[],groups=[];
 for(const kind of ['rock','block']){const start=positions.length/3;for(const piece of plan.pieces.filter(p=>p.kind===kind))for(const v of piece.vertices){positions.push(...v);const wet=Math.max(0,Math.min(1,(v[1]+play.terrain.datum+.1)/1.25)),shade=(kind==='block'?.66:.8)*(.58+.42*wet);colors.push(shade,shade*(kind==='rock'?1.02:1),shade*.94);}groups.push({start,count:positions.length/3-start});}
 const material=concreteMaterial();material.vertexColors=true;
 const mesh=publishMesh(scene,play,'sile-shore-armour',positions,rockMaterial),g=mesh.geometry;
 mesh.material=[rockMaterial,material];g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));for(let i=0;i<groups.length;i++)g.addGroup(groups[i].start,groups[i].count,i);
 const records=play.terrainWalls.slice(-g.attributes.position.count/3),n=g.attributes.normal;
 records.forEach((w,i)=>{w.authored='shore-armour';w.reason='kıyı koruma kayalığına çarptı';w.landing=n.getY(i*3)>.5;});
 scene.userData.sileShoreArmourStats={pieces:plan.pieces.length,triangles:records.length,sourceEdgeLengthM:plan.edges.reduce((s,e)=>s+e.len,0),authored:true};return plan;
}
