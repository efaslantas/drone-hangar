import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {buildSile} from '../src/sile-world.js';import {insidePolygon,surfaceAt} from '../src/geo-terrain.js';
const api=await import('../src/sile-context.js').catch(()=>({})),view=await import('../src/sile-context-view.js').catch(()=>({}));
const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
test('sourced context fills beach, green areas and protected pier water deterministically without changing map',()=>{
 assert.equal(typeof api.planSileContext,'function');const scene=new THREE.Scene(),before=JSON.stringify(data),play=buildSile(scene,data),p=api.planSileContext(data,play);
 assert.ok(p.trees.length>150&&p.trees.length<=1600);assert.ok(p.beach.length>10&&p.beach.length<=72);assert.ok(p.boats.length>5&&p.boats.length<=28);assert.deepEqual(api.planSileContext(data,play),p);assert.equal(JSON.stringify(data),before);
 for(const item of [...p.trees,...p.beach]){assert.equal(surfaceAt(play,item.x,item.z).water,false);assert.ok(Math.hypot(item.x,item.z)>12);assert.ok([item.x,item.y,item.z,item.yaw].every(Number.isFinite));}
 for(const item of p.beach)assert.ok(p.source.beaches.some(f=>insidePolygon(item.x,item.z,f.rings)));
 for(const item of p.trees)assert.ok(item.mapped||p.source.green.some(f=>insidePolygon(item.x,item.z,f.rings)));
 for(const item of p.boats){assert.ok(p.source.harbour.some(f=>insidePolygon(item.x,item.z,f.rings)));for(const [x,z] of item.footprint)assert.equal(surfaceAt(play,x,z).water,true);}
});
test('visible solid instanced parts share their world transform with a conservative collision box',()=>{
 assert.equal(typeof view.addSileContext,'function');const scene=new THREE.Scene(),play=buildSile(scene,data);scene.updateMatrixWorld(true);let solids=0;
 scene.traverse(o=>{if(!o.isInstancedMesh||!o.userData.contextBoxes)return;const indices=o.userData.contextBoxes;o.geometry.computeBoundingBox();for(let i=0;i<o.count;i++){const matrix=new THREE.Matrix4();o.getMatrixAt(i,matrix);matrix.premultiply(o.matrixWorld);const b=o.geometry.boundingBox.clone().applyMatrix4(matrix),c=indices[i];assert.ok(c&&play.boxes.includes(c));for(const [axis,lo,hi]of [['x','minx','maxx'],['y','miny','maxy'],['z','minz','maxz']]){assert.ok(b.min[axis]>=c[lo]-.002);assert.ok(b.max[axis]<=c[hi]+.002);}solids++;}});assert.ok(solids>300);
 let meshes=0;scene.traverse(o=>{if(o.isMesh)meshes++});assert.ok(meshes<=45,'bounded context draw batches');assert.equal(play.prisms.filter(q=>q.authored!=='coastal-foundation').length,data.buildings.length+data.structures.length);
});
test('stale or incomplete source maps skip context instead of placing objects at unrelated coordinates',()=>{
 assert.equal(typeof api.planSileContext,'function');const play={terrain:data.terrain,prisms:[],boxes:[]};for(const d of [{...data,projection:{...data.projection,lon:0}},{...data,buildings:[]}]){const p=api.planSileContext(d,play);assert.equal(p.trees.length+p.beach.length+p.boats.length,0);}
});

test('seasonal setup is distributed over multiple mapped beaches rather than exhausting the cap on the first shore',()=>{
 const scene=new THREE.Scene(),play=buildSile(scene,data),p=api.planSileContext(data,play);assert.ok(new Set(p.beach.map(p=>p.sourceId)).size>=2);
});

test('mapped summer land cover changes ground colour once without changing terrain positions or colliders',async()=>{
 assert.equal(typeof view.finishSileContext,'function');const {prepareGroundSurfaces}=await import('../src/ground-surfaces.js');const scene=new THREE.Scene(),play=buildSile(scene,data);prepareGroundSurfaces(scene);const g=scene.getObjectByName('sile-terrain').geometry,before=g.attributes.color.array.slice(),positions=g.attributes.position.array.slice(),boxes=JSON.stringify(play.boxes);view.finishSileContext(scene);const first=g.attributes.color.array.slice();let changed=0;for(let i=0;i<first.length;i++)if(first[i]!==before[i])changed++;assert.ok(changed>100);view.finishSileContext(scene);assert.deepEqual(g.attributes.color.array,first);assert.deepEqual(g.attributes.position.array,positions);assert.equal(JSON.stringify(play.boxes),boxes);
});

test('beach lounger supports follow the local terrain plane instead of floating on sloped sand',async()=>{
 const {terrainHeight}=await import('../src/geo-terrain.js'),scene=new THREE.Scene(),play=buildSile(scene,data);scene.updateMatrixWorld(true);const chairs=scene.getObjectByName('sile-context-box:chair');assert.ok(chairs);let checked=0;
 for(let i=0;i<chairs.count;i++){const matrix=new THREE.Matrix4();chairs.getMatrixAt(i,matrix);const scale=new THREE.Vector3().setFromMatrixScale(matrix);if(Math.abs(scale.y-.38)>.0001)continue;for(const x of [-.5,.5])for(const z of [-.5,.5]){const p=new THREE.Vector3(x,-.5,z).applyMatrix4(matrix);assert.ok(Math.abs(p.y-terrainHeight(play.terrain,p.x,p.z)-.01)<.035,'lounger support feet follow sand');checked++;}}
 assert.ok(checked>100);
});

test('instance caps preserve western woodland and broad beach coverage instead of filling source iteration order',()=>{
 const play=buildSile(new THREE.Scene(),data),p=api.planSileContext(data,play),west=p.source.green.find(f=>f.id===1223140961);assert.ok(p.trees.some(t=>t.kind==='forest'&&insidePolygon(t.x,t.z,west.rings)),'west woodland must not disappear when earlier forests consume the cap');const beach=p.beach.filter(b=>b.sourceId===309193706),xs=beach.map(p=>p.x);assert.ok(Math.max(...xs)-Math.min(...xs)>100,'summer setups cover the visible beach rather than clustering at its first clipped edge');
});
