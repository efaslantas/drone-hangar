// Opt-in index for completed, static world wall arrays. Mutable/unprepared
// callers retain the original scan; a length change invalidates the index.
const prepared=new WeakMap(),STEP=32,MAX_REFERENCES=2000000;
function wallBounds(w){
 if(w.contactBounds)return [w.contactBounds[0],w.contactBounds[1],w.contactBounds[4],w.contactBounds[5]];
 if(w.vertices)return [Math.min(...w.vertices.map(v=>v[0])),Math.max(...w.vertices.map(v=>v[0])),Math.min(...w.vertices.map(v=>v[2])),Math.max(...w.vertices.map(v=>v[2]))];
 return [Math.min(w.a[0],w.b[0]),Math.max(w.a[0],w.b[0]),Math.min(w.a[1],w.b[1]),Math.max(w.a[1],w.b[1])];
}
export function prepareTerrainWallIndex(walls){
 const cells=new Map(),global=[];let references=0;
 walls.forEach((w,id)=>{
  const b=wallBounds(w),x0=Math.floor(b[0]/STEP),x1=Math.floor(b[1]/STEP),z0=Math.floor(b[2]/STEP),z1=Math.floor(b[3]/STEP),count=(x1-x0+1)*(z1-z0+1);
  if(!b.every(Number.isFinite)||![x0,x1,z0,z1].every(Number.isSafeInteger)||count>1024||count<1||references+count>MAX_REFERENCES){global.push(id);return;}
  references+=count;for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=x+':'+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(id);}
 });
 prepared.set(walls,{length:walls.length,cells,global});return {walls:walls.length,cells:cells.size,references,global:global.length};
}
export function terrainWallCandidates(walls,bounds){
 const index=prepared.get(walls);if(!index||index.length!==walls.length)return walls;
 const [x0,x1,z0,z1]=bounds.map(v=>Math.floor(v/STEP)),count=(x1-x0+1)*(z1-z0+1);
 if(!bounds.every(Number.isFinite)||![x0,x1,z0,z1].every(Number.isSafeInteger)||count>4096||count<1)return walls;
 const ids=new Set(index.global);for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)for(const i of index.cells.get(x+':'+z)||[])ids.add(i);
 return [...ids].sort((a,b)=>a-b).map(i=>walls[i]);
}
