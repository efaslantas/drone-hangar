import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildingFacade} from '../src/sile-buildings.js';
import * as atlas from '../src/sile-facade-atlas.js';
const api=await import('../src/sile-architectural.js').catch(()=>({}));
function fixture(reverse=false){
 const ring=[[0,0],[12,0],[12,8],[0,8]];if(reverse)ring.reverse();
 const item={id:11,base:0,height:9,rings:[ring]},profile={item,eaves:9,paint:0xc6bca9,shore:[6,-20],center:[6,4]};
 const terrain={bounds:[-100,100,-100,100],cols:2,rows:2,heights:[0,0,0,0],datum:0,land:[[[[-100,-100],[100,-100],[100,100],[-100,100]]]]};
 return {scene:new THREE.Scene(),data:{buildings:[item]},play:{terrain,boxes:[],prisms:[{bounds:[0,12,0,8],miny:0,maxy:9}]},profiles:new Map([[11,profile]])};
}
test('shared opening dimensions follow the exact raster layout, including blank/entry/shop cases',()=>{
 assert.equal(typeof atlas.facadeOpening,'function');
 for(let tile=0;tile<12;tile++){const o=atlas.facadeOpening(tile);assert.ok(o.width>0&&o.height>0);assert.notEqual(atlas.facadeTexel(tile,o.x+10,o.y+10).kind,'plaster');assert.equal(atlas.facadeTexel(tile,10,10).kind,'plaster');}
 assert.equal(atlas.facadeOpening(15),null);
});
test('physical sill and surround align the atlas opening after the2px UV gutter',()=>{
 assert.equal(typeof api.windowDetailParts,'function');
 const cell={tile:0,width:3.2,y0:4,y1:7};const parts=api.windowDetailParts(cell),sill=parts.find(p=>p.kind==='sill');
 assert.equal(parts.length,4);assert.ok(Math.abs(sill.xyz[1]-(4+(254-213)/252*3))<1e-10);
 assert.ok(Math.abs(sill.size[0]-(132+26)/252*3.2)<1e-10);
 for(const p of parts){assert.ok(p.xyz[2]-p.size[2]/2<0,'embedded back contacts own wall');assert.ok(p.xyz[2]+p.size[2]/2<=.160001);}
 for(const tile of [8,9,10,11,15])assert.deepEqual(api.windowDetailParts({...cell,tile}),[],'doors and blank bays stay clear');
});
test('attached details preserve old objects, cover physical instances and support both ring windings',()=>{
 assert.equal(typeof api.addFacadeDepth,'function');
 for(const reverse of [false,true]){const f=fixture(reverse),before=JSON.stringify(f.data),old={minx:90,maxx:91,miny:0,maxy:1,minz:90,maxz:91};f.play.boxes.push(old);api.addFacadeDepth(f.scene,f.data,f.play,f.profiles);
 assert.equal(f.play.boxes[0],old);assert.equal(JSON.stringify(f.data),before);assert.ok(f.scene.userData.sileArchitecturalStats.windows>0);let count=0,meshes=0;
 f.scene.traverse(o=>{if(!o.isInstancedMesh)return;meshes++;const records=o.userData.architecturalBoxes;assert.equal(records.length,o.count);for(let i=0;i<o.count;i++){const m=new THREE.Matrix4();o.getMatrixAt(i,m);const b=o.geometry.boundingBox.clone().applyMatrix4(m),box=records[i];assert.ok(f.play.boxes.includes(box));assert.equal(box.authored,'coastal-architectural');assert.ok(b.min.x>=box.minx&&b.max.x<=box.maxx&&b.min.y>=box.miny&&b.max.y<=box.maxy&&b.min.z>=box.minz&&b.max.z<=box.maxz);assert.ok(box.miny>.02&&box.maxy<=9);count++;}});
 assert.ok(count>12);assert.ok(meshes<=2);}
});
test('terrain, water and obstructing neighbouring solids reject complete assemblies',()=>{
 assert.equal(typeof api.addFacadeDepth,'function');
 for(const mode of ['terrain','water','solid','neighbour']){const f=fixture();if(mode==='terrain')f.play.terrain.heights.fill(20);if(mode==='water')f.play.terrain.land=[];if(mode==='solid')f.play.boxes.push({minx:-20,maxx:30,minz:-20,maxz:30,miny:0,maxy:20});if(mode==='neighbour')f.play.prisms.push({bounds:[-20,30,-20,30],miny:0,maxy:20});api.addFacadeDepth(f.scene,f.data,f.play,f.profiles);assert.equal(f.scene.userData.sileArchitecturalStats.parts,0,mode);assert.equal(f.scene.children.length,0);}
});
test('world-scale caps distribute detail across profiles and keep collision independent of quality',()=>{
 assert.equal(typeof api.addFacadeDepth,'function');const f=fixture(),base=f.data.buildings[0],original=f.profiles.get(11);f.data.buildings=[];f.profiles.clear();f.play.prisms=[];f.play.terrain.bounds=[-10000,10000,-10000,10000];f.play.terrain.land=[[[[-10000,-10000],[10000,-10000],[10000,10000],[-10000,10000]]]];
 for(let i=0;i<150;i++){const item={...base,id:i+1,rings:[base.rings[0].map(([x,z])=>[x+i*20,z])]};f.data.buildings.push(item);f.profiles.set(item.id,{...original,item,center:[6+i*20,4],shore:[6+i*20,-20]});f.play.prisms.push({bounds:[i*20,i*20+12,0,8],miny:0,maxy:9});}
 api.addFacadeDepth(f.scene,f.data,f.play,f.profiles);const stats=f.scene.userData.sileArchitecturalStats;assert.ok(stats.windows<=384&&stats.eaves<=160);assert.equal(new Set(f.play.boxes.map(b=>b.ownerId)).size,150,'round-robin covers eligible profiles before repeating');assert.ok(stats.parts<=384*4+160);
});

test('oblique facades retain right-handed transforms and collider coverage',()=>{
 const f=fixture(),p=f.profiles.get(11),angle=.63,rotate=([x,z])=>[x*Math.cos(angle)-z*Math.sin(angle),x*Math.sin(angle)+z*Math.cos(angle)];
 p.item.rings=[p.item.rings[0].map(rotate)];p.center=rotate(p.center);p.shore=rotate(p.shore);const xs=p.item.rings[0].map(v=>v[0]),zs=p.item.rings[0].map(v=>v[1]);f.play.prisms[0].bounds=[Math.min(...xs),Math.max(...xs),Math.min(...zs),Math.max(...zs)];
 api.addFacadeDepth(f.scene,f.data,f.play,f.profiles);assert.ok(f.play.boxes.length>0);f.scene.traverse(o=>{if(!o.isInstancedMesh)return;for(let i=0;i<o.count;i++){const m=new THREE.Matrix4();o.getMatrixAt(i,m);assert.ok(m.determinant()>0);const b=o.geometry.boundingBox.clone().applyMatrix4(m),c=o.userData.architecturalBoxes[i];assert.ok(b.min.x>=c.minx&&b.max.x<=c.maxx&&b.min.z>=c.minz&&b.max.z<=c.maxz);}});
});
test('a water hole crossing an eaves strip rejects it even when its bounding corners are on land',()=>{
 const f=fixture(),hole=[[5.95,-.095],[6.05,-.095],[6.05,-.025],[5.95,-.025]];f.play.terrain.land[0].push(hole);api.addFacadeDepth(f.scene,f.data,f.play,f.profiles);
 const strips=f.play.boxes.filter(b=>b.kind==='eaves');assert.equal(strips.length,3);assert.ok(strips.every(b=>b.minz>=0||b.maxz<-.095||b.maxx<5.95||b.minx>6.05));
});

test('real map retains the old collision prefix and source geometry, and trim clears/disposes once',async()=>{
 const fs=await import('node:fs'),crypto=await import('node:crypto');
 const ctx=new Proxy({getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const {buildWorld,clearWorld}=await import('../src/world.js'),data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url))),before=JSON.stringify(data),scene=new THREE.Scene(),play=buildWorld(scene,'sile',{sileData:data,props:false});
 const sourceBoxCount=play.boxes.findIndex(b=>['coastal-bench','coastal-architectural'].includes(b.authored)),sourceCount=data.buildings.length+data.structures.length,old={boxes:play.boxes.slice(0,sourceBoxCount),prisms:play.prisms.slice(0,sourceCount)};assert.equal(crypto.createHash('sha256').update(JSON.stringify(old)).digest('hex'),'2a10c03aa0d883183f7ef08bcd665cff57c2bdc15387e37705a7572b0092b736');assert.equal(JSON.stringify(data),before);
 assert.equal(play.boxes.slice(play.boxes.findIndex(b=>b.authored==='coastal-architectural')).every(b=>b.authored==='coastal-architectural'),true);assert.equal(play.terrain.buildingPads.length,4);const stats=scene.userData.sileArchitecturalStats;assert.deepEqual([stats.windows,stats.eaves,stats.parts,stats.buildings],[384,160,1696,134]);
 const {applyScannedMaterials}=await import('../src/scanned-materials.js'),boxes=JSON.stringify(play.boxes),resources=new Set();scene.traverse(o=>{if(o.name.startsWith('sile-coastal-architectural-')){resources.add(o.geometry);resources.add(o.material);assert.equal(o.visible,true);}});
 for(const quality of ['low','high','medium']){applyScannedMaterials(scene,{quality});assert.equal(JSON.stringify(play.boxes),boxes);scene.traverse(o=>{if(o.name.startsWith('sile-coastal-architectural-'))assert.equal(o.visible,true);});}
 let disposed=0;for(const r of resources)r.addEventListener('dispose',()=>disposed++);clearWorld(scene);assert.equal(resources.size,3);assert.equal(disposed,3);assert.equal(scene.userData.sileArchitecturalStats,null);
});
