import test from 'node:test';
import assert from 'node:assert/strict';
import {opById,FREE} from '../src/missions.js';
import {createRun,tickRun} from '../src/goals.js';
import {resolveOperationLoadout} from '../src/loadout-selection.js';

const op=()=>opById('arcade-contact');
const state=(p={})=>({x:0,y:2,z:0,vx:0,vy:0,vz:0,battery:1,armed:true,crashed:false,...p});

test('arcade is optional, unranked and restores the preferred Şile loadout on exit',()=>{
 assert.equal(op().kind,'arcade');assert.equal(op().ranked,false);assert.equal(op().optional,true);
 const preferred={drone:'freestyle',map:'sile'};
 assert.equal(resolveOperationLoadout(preferred,op()).map,'airfield');
 assert.deepEqual(resolveOperationLoadout(preferred,FREE),preferred);
});

test('four game objects include cars, plane and drone, moving on authored loops',async()=>{
 const {arcadePose}=await import('../src/arcade.js');const a=createRun(op()).arcade;
 assert.equal(a.targets.length,4);assert.deepEqual(new Set(a.targets.map(t=>t.kind)),new Set(['car','plane','drone']));
 for(const t of a.targets) assert.notDeepEqual(arcadePose(t,0),arcadePose(t,2));
});

test('player can choose any object, contact completes once and waits for a fresh DISARM drone',async()=>{
 const {arcadePose,renewArcadeDrone}=await import('../src/arcade.js');const r=createRun(op());
 const target=r.arcade.targets[3];let s=state(arcadePose(target,.01));
 tickRun(r,{dt:.01,state:s});assert.equal(target.done,true);assert.equal(r.arcade.targets.filter(t=>t.done).length,1);
 assert.equal(r.won,false);assert.ok(r.arcade.wait>0);
 tickRun(r,{dt:.1,state:s});assert.equal(r.arcade.targets.filter(t=>t.done).length,1);
 tickRun(r,{dt:2,state:s});assert.equal(r.arcade.needsSpawn,true);
 renewArcadeDrone(r.arcade);assert.equal(r.arcade.drones,2);assert.equal(target.done,true);assert.equal(r.arcade.previous,null);
 s=state({armed:false,...arcadePose(r.arcade.targets[0],r.arcade.t+.01)});
 tickRun(r,{dt:.01,state:s});assert.equal(r.arcade.targets[0].done,false);
});

test('missed collision and drone reset preserve successes; a new run clears them',async()=>{
 const {renewArcadeDrone}=await import('../src/arcade.js');const r=createRun(op());r.arcade.targets[1].done=true;
 tickRun(r,{dt:.02,state:state({crashed:true})});assert.equal(r.lost,false);assert.ok(r.arcade.wait>0);
 tickRun(r,{dt:2,state:state({crashed:true})});renewArcadeDrone(r.arcade);
 assert.equal(r.arcade.targets[1].done,true);assert.equal(r.arcade.drones,2);
 assert.ok(createRun(op()).arcade.targets.every(t=>!t.done));
});

test('all four contacts end the game, without requiring an extra drone',async()=>{
 const {arcadePose,renewArcadeDrone}=await import('../src/arcade.js');const r=createRun(op());
 for(const t of r.arcade.targets){
  tickRun(r,{dt:.01,state:state(arcadePose(t,r.arcade.t+.01))});
  if(!r.won){tickRun(r,{dt:2,state:state({armed:false})});renewArcadeDrone(r.arcade);}
 }
 assert.equal(r.won,true);assert.equal(r.lost,false);assert.equal(r.arcade.drones,4);
});

test('swept game contact cannot skip an object between frames',async()=>{
 const {arcadePose}=await import('../src/arcade.js');const r=createRun(op());const t=r.arcade.targets[2];
 let p=arcadePose(t,.01);tickRun(r,{dt:.01,state:state({...p,x:p.x-6})});
 p=arcadePose(t,.02);tickRun(r,{dt:.01,state:state({...p,x:p.x+6})});assert.equal(t.done,true);
});

test('arcade remains local-only even with a generic drone profile',async()=>{
 const {isLocalOnlyRun,shouldRankRun}=await import('../src/session-preferences.js');
 const r=createRun(op());assert.equal(isLocalOnlyRun(r),true);assert.equal(shouldRankRun(r),false);
 assert.equal(isLocalOnlyRun({op:{kind:'race'},reference:true}),true);
 assert.equal(isLocalOnlyRun({op:{kind:'race'},reference:false}),false);
});

test('briefing explains replacement drones and view reflects completions without leaking resources',async()=>{
 const {objectiveText}=await import('../src/briefing.js');assert.match(objectiveText(op()),/4.*yeni drone/);
 const {createArcadeView}=await import('../src/arcade-view.js');
 const {Group}=await import('three');const scene=new Group(),a=createRun(op()).arcade;
 const view=createArcadeView(scene,a);view.paint(a);assert.equal(view.root.children.filter(o=>o.userData.target).length,4);
 const mesh=view.root.children.find(o=>o.userData.target===a.targets[0].id);
 const before=mesh.position.clone();a.t=1;view.paint(a);assert.ok(mesh.position.distanceTo(before)>0);
 a.targets[0].done=true;view.paint(a);assert.equal(mesh.visible,false);
 const resources=new Set();view.root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});
 let disposed=0;for(const r of resources)r.addEventListener('dispose',()=>disposed++);
 view.dispose();assert.equal(scene.children.length,0);assert.equal(disposed,resources.size);
});

test('a sweep crossing two objects completes the first contact, independent of array order',async()=>{
 const {arcadePose}=await import('../src/arcade.js');const r=createRun(op());
 const blue=arcadePose(r.arcade.targets[1],.01),coral=arcadePose(r.arcade.targets[0],.02);
 const d={x:coral.x-blue.x,z:coral.z-blue.z};
 tickRun(r,{dt:.01,state:state({x:blue.x-d.x*.3,y:1.3,z:blue.z-d.z*.3})});
 tickRun(r,{dt:.01,state:state({x:coral.x+d.x*.3,y:1.3,z:coral.z+d.z*.3})});
 assert.equal(r.arcade.targets[1].done,true);assert.equal(r.arcade.targets[0].done,false);
});

test('FPV game objects remain visible while rings/routes are off by default and can be enabled',async()=>{
 const {createArcadeView}=await import('../src/arcade-view.js');const {Scene}=await import('three');const scene=new Scene(),a=createRun(op()).arcade;
 const view=createArcadeView(scene,a);view.paint(a);
 const guides=[];view.root.traverse(o=>{if(o.userData.arcadeGuide)guides.push(o);});assert.ok(guides.length>=8);
 assert.ok(guides.every(g=>!g.visible));assert.ok(view.root.children.filter(o=>o.userData.target).every(o=>o.visible));
 view.setGuides(true);view.paint(a);assert.ok(guides.every(g=>g.visible));a.targets[0].done=true;view.paint(a);assert.equal(view.root.children.find(o=>o.userData.target===a.targets[0].id).visible,false);view.dispose();
});
