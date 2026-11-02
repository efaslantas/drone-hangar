import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
const material=(kind='grass')=>{const map=new THREE.Texture();map.userData.surface=kind;map.repeat.set(12,12);return new THREE.MeshStandardMaterial({map});};

test('ground UVs use world metres on transformed floors while shared walls keep their original material and UVs',async()=>{
 const {prepareGroundSurfaces}=await import('../src/ground-surfaces.js'),scene=new THREE.Scene(),mat=material(),geo=new THREE.PlaneGeometry(20,40),floor=new THREE.Mesh(geo,mat),wall=new THREE.Mesh(geo,mat);
 floor.rotation.x=-Math.PI/2;floor.rotation.z=.5;floor.position.set(12,.002,-18);floor.scale.set(2,1.5,1);wall.position.y=20;scene.add(floor,wall);
 const before=Float32Array.from(geo.attributes.uv.array);let released=0;geo.addEventListener('dispose',()=>released++);const count=prepareGroundSurfaces(scene);assert.equal(count,1);assert.equal(wall.geometry,geo);assert.deepEqual(wall.geometry.attributes.uv.array,before);assert.equal(wall.material,mat);assert.deepEqual(mat.map.repeat.toArray(),[12,12]);assert.notEqual(floor.material,mat);assert.equal(released,0);
 const p=floor.geometry.attributes.position,uv=floor.geometry.attributes.uv,v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(floor.matrixWorld);assert.ok(Math.abs(uv.getX(i)-v.x)<1e-5);assert.ok(Math.abs(uv.getY(i)-v.z)<1e-5);}assert.deepEqual(floor.material.map.repeat.toArray(),[.5,.5]);
});

test('ground preparation is bounded and idempotent, retains surfaces and adds stable modest albedo variation',async()=>{
 const {prepareGroundSurfaces}=await import('../src/ground-surfaces.js');const scene=new THREE.Scene(),floor=new THREE.Mesh(new THREE.PlaneGeometry(2000,1000),material('asphalt'));floor.rotation.x=-Math.PI/2;scene.add(floor);let disposed=0;floor.geometry.addEventListener('dispose',()=>disposed++);prepareGroundSurfaces(scene);assert.equal(disposed,1);
 assert.ok(floor.geometry.attributes.position.count<=65*65);assert.ok(floor.geometry.attributes.position.array.every(Number.isFinite));assert.ok([...floor.geometry.attributes.color.array].every(v=>v>.8&&v<=1));const c=floor.geometry.attributes.color.array;assert.ok(Math.max(...c)-Math.min(...c)>.01);const geometry=floor.geometry,colors=Float32Array.from(c);prepareGroundSurfaces(scene);assert.equal(floor.geometry,geometry);assert.deepEqual(c,colors);
 const other=new THREE.Scene(),copy=new THREE.Mesh(new THREE.PlaneGeometry(2000,1000),material('asphalt'));copy.rotation.x=-Math.PI/2;other.add(copy);prepareGroundSurfaces(other);assert.deepEqual(copy.geometry.attributes.color.array,colors);
});

test('explicit terrain buffers retain source positions/normals and holes while unmarked objects stay unchanged',async()=>{
 const {prepareGroundSurfaces}=await import('../src/ground-surfaces.js'),scene=new THREE.Scene();const shape=new THREE.Shape([new THREE.Vector2(-10,-10),new THREE.Vector2(10,-10),new THREE.Vector2(10,10),new THREE.Vector2(-10,10)]),hole=new THREE.Path();hole.absarc(0,0,3,0,Math.PI*2,true);shape.holes.push(hole);
 const floor=new THREE.Mesh(new THREE.ShapeGeometry(shape),material('forest'));floor.rotation.x=-Math.PI/2;scene.add(floor);const positions=Float32Array.from(floor.geometry.attributes.position.array);const terrain=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([0,2,0,8,5,0,0,3,8],3)).setAttribute('uv',new THREE.Float32BufferAttribute([0,0,2,0,0,2],2)),material('grass'));terrain.geometry.computeVertexNormals();terrain.userData.groundSurface=true;scene.add(terrain);const normals=Float32Array.from(terrain.geometry.attributes.normal.array);
 const prop=new THREE.Mesh(new THREE.BoxGeometry(4,2,4),material('concrete'));scene.add(prop);const propGeo=prop.geometry;const plaster=new THREE.Mesh(new THREE.PlaneGeometry(30,30),material('plaster'));plaster.rotation.x=-Math.PI/2;scene.add(plaster);const plasterGeo=plaster.geometry;
 prepareGroundSurfaces(scene);assert.deepEqual(floor.geometry.attributes.position.array,positions);assert.deepEqual(terrain.geometry.attributes.normal.array,normals);assert.deepEqual(terrain.geometry.attributes.uv.array,new Float32Array([0,0,8,0,0,8]));assert.equal(prop.geometry,propGeo);assert.equal(plaster.geometry,plasterGeo);assert.equal(floor.material.vertexColors,true);
});

test('baked offsets in plane geometry survive ground preparation',async()=>{
 const {prepareGroundSurfaces}=await import('../src/ground-surfaces.js'),scene=new THREE.Scene(),geometry=new THREE.PlaneGeometry(20,30);geometry.translate(5,2,.1);const floor=new THREE.Mesh(geometry,material('earth'));floor.rotation.x=-Math.PI/2;scene.add(floor);const before=Float32Array.from(geometry.attributes.position.array);prepareGroundSurfaces(scene);assert.deepEqual(floor.geometry.attributes.position.array,before);
});

test('authored material groups and partial draw ranges survive preparation',async()=>{
 const {prepareGroundSurfaces}=await import('../src/ground-surfaces.js');
 for(const mode of ['groups','drawRange']){const scene=new THREE.Scene(),geometry=new THREE.PlaneGeometry(20,20,2,2);if(mode==='groups'){geometry.addGroup(0,12,0);geometry.addGroup(12,12,1);}else geometry.setDrawRange(6,12);const originalGroups=structuredClone(geometry.groups),originalRange={...geometry.drawRange},positions=Float32Array.from(geometry.attributes.position.array),floor=new THREE.Mesh(geometry,mode==='groups'?[material('grass'),material('earth')]:material('grass'));floor.rotation.x=-Math.PI/2;scene.add(floor);prepareGroundSurfaces(scene);assert.deepEqual(floor.geometry.groups,originalGroups,mode);assert.deepEqual(floor.geometry.drawRange,originalRange,mode);assert.deepEqual(floor.geometry.attributes.position.array,positions,mode);}
});

test('edited interior positions and authored normals are retained even when the plane bounds look canonical',async()=>{
 const {prepareGroundSurfaces}=await import('../src/ground-surfaces.js'),scene=new THREE.Scene(),geometry=new THREE.PlaneGeometry(20,20,2,2);geometry.attributes.position.setX(4,1);geometry.attributes.normal.setXYZ(4,.2,.1,.97);const positions=Float32Array.from(geometry.attributes.position.array),normals=Float32Array.from(geometry.attributes.normal.array),floor=new THREE.Mesh(geometry,material());floor.rotation.x=-Math.PI/2;scene.add(floor);prepareGroundSurfaces(scene);assert.deepEqual(floor.geometry.attributes.position.array,positions);assert.deepEqual(floor.geometry.attributes.normal.array,normals);
});

test('a source texture referenced by another material channel remains alive',async()=>{
 const {prepareGroundSurfaces}=await import('../src/ground-surfaces.js'),scene=new THREE.Scene(),mat=material(),source=mat.map;let released=0;source.addEventListener('dispose',()=>released++);const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),mat);floor.rotation.x=-Math.PI/2;const wall=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshStandardMaterial({aoMap:source}));scene.add(floor,wall);prepareGroundSurfaces(scene);assert.equal(wall.material.aoMap,source);assert.equal(released,0);
});
