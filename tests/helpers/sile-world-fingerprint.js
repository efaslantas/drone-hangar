import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
const array=a=>({type:a.constructor.name,hash:hash(Buffer.from(a.buffer,a.byteOffset,a.byteLength))});
// Compare uploaded attributes, transforms and collision/surface data, without
// nondeterministic Three object IDs or GPU-specific texture handles.
export function sileWorldFingerprint(scene,play){
 scene.updateMatrixWorld(true);const meshes=[];
 scene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry;
  meshes.push({name:o.name,attributes:Object.entries(g.attributes).map(([name,a])=>({name,size:a.itemSize,normalized:a.normalized,count:a.count,...array(a.array)})),index:g.index?array(g.index.array):null,matrix:o.matrixWorld.elements,instances:o.instanceMatrix?array(o.instanceMatrix.array):null,colours:o.instanceColor?array(o.instanceColor.array):null,count:o.count??null,materials:(Array.isArray(o.material)?o.material:[o.material]).map(m=>({type:m.type,colour:m.color?.getHex(),roughness:m.roughness,metalness:m.metalness,opacity:m.opacity,side:m.side,vertexColors:m.vertexColors,transparent:m.transparent,alphaTest:m.alphaTest}))});
 });
 const collision={bounds:play.bounds,ceil:play.ceil,boxes:play.boxes,prisms:play.prisms,terrain:play.terrain,terrainWalls:play.terrainWalls,groundCorridors:play.groundCorridors};
 return {meshes:hash(JSON.stringify(meshes)),collision:hash(JSON.stringify(collision)),meshCount:meshes.length,boxes:play.boxes.length,prisms:play.prisms.length};
}
