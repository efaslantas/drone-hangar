import * as THREE from 'three';
import {prepareTerrainWallIndex}from './terrain-wall-index.js';
function references(value,resources,read=false){
 if(!value||typeof value!=='object')return value;
 if(read&&value.__sileRef){const r=resources.get(value.__sileRef);if(!r)throw Error('Missing Şile scene resource '+value.__sileRef);return r;}
 if(!read&&(value.isTexture||value.isMaterial||value.isBufferGeometry||value.isObject3D))return{__sileRef:value.uuid};
 if(read&&value.__sileMap)return new Map(value.__sileMap.map(([k,v])=>[k,references(v,resources,true)]));
 if(value instanceof Map)return{__sileMap:[...value].map(([k,v])=>[k,references(v,resources)])};
 if(ArrayBuffer.isView(value))return value.slice();
 if(Array.isArray(value))return value.map(v=>references(v,resources,read));
 return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,references(v,resources,read)]));
}
export function packSileScene(scene,play){
 // ObjectLoader supports typed pixel data. Convert only worker canvases; their
 // drawing pixels and texture transforms are retained exactly.
 const textures=new Map();scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])for(const [k,t]of Object.entries(m))if(t?.isTexture&&t.image?.getContext){if(!textures.has(t)){const image=t.image,pixels=image.getContext('2d').getImageData(0,0,image.width,image.height).data,replacement=new THREE.DataTexture(new Uint8Array(pixels),image.width,image.height);replacement.copy(t);replacement.source=new THREE.Source({data:new Uint8Array(pixels),width:image.width,height:image.height});replacement.uuid=t.uuid;textures.set(t,replacement);}m[k]=textures.get(t);}});
 const geometries=new Map();scene.traverse(o=>{if(!o.geometry)return;const g=o.geometry;if(!geometries.has(g)){const plain=new THREE.BufferGeometry().copy(g);plain.uuid=g.uuid;geometries.set(g,plain);}o.geometry=geometries.get(g);});
 const originalUserData=scene.userData,userdata=references(originalUserData);scene.userData={};const json=scene.toJSON();scene.userData=originalUserData;json.object.userData=userdata;
 for(const image of json.images||[])if(image.url?.data)image.url.data=new globalThis[image.url.type](image.url.data);
 for(const g of json.geometries||[])for(const a of [...Object.values(g.data?.attributes||{}),g.data?.index].filter(Boolean))a.array=new globalThis[a.type](a.array);
 const walls=play.terrainWalls||[],vertices=new Float64Array(walls.length*9),metaIds=new Uint32Array(walls.length),hasBounds=new Uint8Array(walls.length),faces=new Int32Array(walls.length).fill(-1),metadata=[],keys=new Map(),special=[];
 walls.forEach((w,i)=>{if(!w.vertices){special.push([i,w]);metaIds[i]=0xffffffff;return;}vertices.set(w.vertices.flat(),i*9);hasBounds[i]=w.contactBounds?1:0;const {vertices:v,contactBounds:bounds,face,...meta}=w,key=JSON.stringify(meta);if(!keys.has(key)){keys.set(key,metadata.length);metadata.push(meta);}metaIds[i]=keys.get(key);if(face!==undefined)faces[i]=face;});
 return{json,play:{...play,terrainWalls:undefined},walls:{vertices,metaIds,hasBounds,faces,metadata,special}};
}
export async function unpackSileScene(packet,yieldFrame=()=>new Promise(r=>setTimeout(r,0)),signal){
 const aborted=()=>{if(signal?.aborted)throw new DOMException('Şile preparation cancelled','AbortError');};aborted();
 const scene=new THREE.ObjectLoader().parse(packet.json),resources=new Map();scene.traverse(o=>{resources.set(o.uuid,o);if(o.geometry)resources.set(o.geometry.uuid,o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){resources.set(m.uuid,m);for(const t of Object.values(m))if(t?.isTexture)resources.set(t.uuid,t);}});
 scene.userData=references(scene.userData,resources,true);const play=structuredClone(packet.play),{vertices,metaIds,hasBounds,faces,metadata,special}=packet.walls,terrainWalls=[];
 for(let i=0;i<metaIds.length;i++){
  if(i%1500===0){await yieldFrame();aborted();}
  if(metaIds[i]===0xffffffff){terrainWalls.push(null);continue;}
  const v=[0,3,6].map(k=>Array.from(vertices.subarray(i*9+k,i*9+k+3))),contactBounds=[0,1,2].flatMap(k=>[Math.min(...v.map(p=>p[k])),Math.max(...v.map(p=>p[k]))]);terrainWalls.push({...metadata[metaIds[i]],vertices:v,...(hasBounds[i]?{contactBounds}:{}),...(faces[i]>=0?{face:faces[i]}:{})});
 }
 for(const [i,w]of special)terrainWalls[i]=structuredClone(w);play.terrainWalls=terrainWalls;prepareTerrainWallIndex(terrainWalls);aborted();return{scene,play};
}
export function sileTransferBuffers(value,result=new Set()){
 if(ArrayBuffer.isView(value)){result.add(value.buffer);return result;}
 if(value&&typeof value==='object')for(const v of Object.values(value))sileTransferBuffers(v,result);return result;
}
