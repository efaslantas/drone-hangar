import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {droneById,CATALOG} from '../src/catalog.js';import {applyReference} from '../src/propulsion-reference.js';
const source=()=>applyReference(droneById('freestyle'),{airframe:'source-one-v4',profile:'f60-1750-6s',dynamics:{wheelbaseMm:226}});

test('owned SOURCE ONE uses manufacturer part depths/holes and records assembly limits',async()=>{
 const {airframeAppearance}=await import('../src/airframe-appearance.js');const {makeSourceOneFrame}=await import('../src/source-one-frame.js');
 const a=airframeAppearance(source());assert.equal(a.sourceOne,true);assert.equal(a.motorDiameter,.0271);assert.equal(a.pack.cells,6);
 const frame=makeSourceOneFrame(new THREE.MeshStandardMaterial(),a);
 assert.equal(frame.userData.license,'GPL-3.0');assert.equal(frame.userData.assembly,'approximate');
 const bottom=frame.getObjectByName('source-one-bottom');assert.equal(bottom.userData.holes,52);assert.equal(bottom.userData.depth,.003);
 assert.equal(frame.getObjectByName('source-one-top').userData.depth,.002);
 const box=new THREE.Box3().setFromObject(bottom),size=box.getSize(new THREE.Vector3());assert.ok(Math.abs(size.x-.046468)<.0001);assert.ok(size.z>.159&&size.z<.162);
 const {default:data}=await import('../src/source-one-geometry.js');
 const positions=bottom.geometry.attributes.position,normals=bottom.geometry.attributes.normal;let capArea=0;
 for(let i=0;i<positions.count;i+=3)if(normals.getY(i)>.99){const a=new THREE.Vector3().fromBufferAttribute(positions,i),b=new THREE.Vector3().fromBufferAttribute(positions,i+1),c=new THREE.Vector3().fromBufferAttribute(positions,i+2);capArea+=b.sub(a).cross(c.sub(a)).length()/2;}
 assert.ok(Math.abs(capArea-data.parts.bottom.areaM2)<1e-8,'triangulated top retains all cutouts');
 frame.traverse(o=>{if(o.geometry)assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));});
});

test('appearance reads selected battery and reference wheelbase without mutating flight inputs',async()=>{
 const {airframeAppearance}=await import('../src/airframe-appearance.js');const spec=source(),before=JSON.stringify(spec);
 const a=airframeAppearance(spec);assert.equal(a.wheelbase,.226);assert.equal(JSON.stringify(spec),before);
 const custom=airframeAppearance({...spec,propulsion:{...spec.propulsion,capacityMah:1500},dynamics:{...spec.dynamics,wheelbaseMm:260}});
 assert.equal(custom.wheelbase,.26);assert.equal(custom.sourceOne,false);assert.match(custom.evidence,/değiştirilmiş/);assert.ok(custom.pack.length>a.pack.length);assert.equal(custom.pack.capacityMah,1500);
 for(const spec of CATALOG){const v=airframeAppearance(spec);assert.ok(v.motorDiameter>0&&v.pack.height>0&&v.pack.width>0&&v.pack.length>0);}
});
