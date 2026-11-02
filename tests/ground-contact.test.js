import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {CATALOG,droneById} from '../src/catalog.js';import {applyReference} from '../src/propulsion-reference.js';import {makeDrone,setCamPodTilt,disposeDrone} from '../src/models.js';import {createState,step} from '../src/physics.js';import {applyWorld} from '../src/collide.js';import {applyRcGroundStart} from '../src/rc-input.js';
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const source=()=>applyReference(droneById('freestyle'),{airframe:'source-one-v4',profile:'f60-1750-6s',dynamics:{wheelbaseMm:226}});
const near=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);

test('model records finite local body bounds and optical mount, independent of world transform',()=>{
 for(const spec of [...CATALOG,source()]){
  const before=JSON.stringify(spec),root=makeDrone(spec,.2),bounds=root.userData.contactBounds,mount=root.userData.fpvAnchor;
  assert.ok(bounds?.min&&bounds?.max&&mount?.length===3,spec.id);assert.ok([...bounds.min,...bounds.max,...mount].every(Number.isFinite));assert.equal(JSON.stringify(spec),before);
  const parent=new THREE.Group();parent.position.set(30,60,-40);parent.rotation.y=.7;parent.add(root);root.position.set(8,9,10);root.scale.setScalar(3);root.rotation.set(.3,.8,.6);setCamPodTilt(root,.7);
  const expected=makeDrone(spec,.7);for(let axis=0;axis<3;axis++){near(root.userData.contactBounds.min[axis],expected.userData.contactBounds.min[axis]);near(root.userData.contactBounds.max[axis],expected.userData.contactBounds.max[axis]);near(root.userData.fpvAnchor[axis],expected.userData.fpvAnchor[axis]);}assert.equal(root.userData.contactBounds,bounds);disposeDrone(root);disposeDrone(expected);
 }
});

test('support keeps actual airframe vertices above flat and sloped planes at multiple attitudes',async()=>{
 const {groundSupport}=await import('../src/airframe-contact.js');
 for(const spec of [...CATALOG,source()])for(const angles of [[0,0,0],[.4,.8,.2],[1.5,.2,-.7],[Math.PI,0,0]])for(const normal of [new THREE.Vector3(0,1,0),new THREE.Vector3(.2,1,-.3).normalize()]){
  const root=makeDrone(spec),active={...spec,contactBounds:root.userData.contactBounds};root.rotation.set(...angles);const q=root.quaternion,state={qw:q.w,qx:q.x,qy:q.y,qz:q.z};root.position.y=groundSupport(active,state,normal.toArray())/normal.y;root.updateMatrixWorld(true);
  let minimum=Infinity;const point=new THREE.Vector3();root.traverse(o=>{const p=o.geometry?.attributes.position;if(p)for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);minimum=Math.min(minimum,point.dot(normal));}});assert.ok(minimum>=.001-1e-6,`${spec.id}: plane penetration ${minimum}`);if(angles.every(a=>a===0)&&normal.y===1)near(minimum,.001);disposeDrone(root);
 }
});

test('flat ground, negative DEM and RC grounded start share the model contact height without changing airborne forces',async()=>{
 const {groundHeight,groundSupport}=await import('../src/airframe-contact.js');
 for(const original of [CATALOG[0],source(),CATALOG.at(-1)]){
  const root=makeDrone(original),spec={...original,contactBounds:root.userData.contactBounds};
  for(const height of [0,-20]){const play=height===0?{}:{terrain:{cols:2,rows:2,bounds:[-10,10,-10,10],heights:[-10,-10,-10,-10],datum:10,land:[[[[-10,-10],[10,-10],[10,10],[-10,10]]]]}};const s=createState(0,height+1,0);for(let i=0;i<180;i++)step(s,{throttle:0},spec,1/60,play);near(s.y,height+groundSupport(spec,s));assert.equal(s.grounded,true);assert.equal(s.crashed,false);const rc=createState();applyRcGroundStart(rc,{controlMode:'rc'},groundHeight(spec,rc,{height,normal:[0,1,0]}));near(rc.y,s.y);assert.equal(rc.armed,false);}
  const a=createState(0,20,0),b=createState(0,20,0);a.armed=b.armed=true;for(let i=0;i<20;i++){step(a,{throttle:.4},original,1/240,{});step(b,{throttle:.4},spec,1/240,{});}assert.deepEqual(a,b);disposeDrone(root);
 }
 near(groundSupport({size:.22},{}),.099);near(groundSupport({size:.055},{},[0,1,0],.06),.06);
});

test('model contact retains water and hard-terrain landing failures',async()=>{
 const {groundSupport}=await import('../src/airframe-contact.js');const root=makeDrone(source()),spec={...source(),contactBounds:root.userData.contactBounds};const terrain={cols:2,rows:2,bounds:[-10,10,-10,10],heights:[0,0,0,0],datum:0,land:[]};
 const sea=createState(0,groundSupport(spec,{} )-.001,0);sea.armed=true;applyWorld(sea,spec,{terrain});assert.equal(sea.crashed,true);assert.equal(sea.crashReason,'suya düştü');
 const hard=createState(0,0,0);hard.armed=true;hard.vy=-12;applyWorld(hard,spec,{terrain:{...terrain,land:[[[[-10,-10],[10,-10],[10,10],[-10,10]]]]}});assert.equal(hard.crashed,true);assert.equal(hard.crashReason,'sert iniş');disposeDrone(root);
});

test('reference drone can lift off from the model floor and settle back without spurious crash',async()=>{
 const {groundSupport}=await import('../src/airframe-contact.js');const {hoverThrottle}=await import('../src/physics.js');const root=makeDrone(source()),spec={...source(),contactBounds:root.userData.contactBounds},s=createState(0,0,0);s.y=groundSupport(spec,s);s.armed=true;s.grounded=true;
 const floor=s.y;for(let i=0;i<240;i++)step(s,{throttle:hoverThrottle(spec)*1.2},spec,1/240,{});assert.ok(s.y>floor+.05);assert.equal(s.crashed,false);s.armed=false;for(let i=0;i<1440;i++)step(s,{throttle:0},spec,1/240,{});near(s.y,groundSupport(spec,s));assert.equal(s.grounded,true);assert.equal(s.crashed,false);disposeDrone(root);
});
