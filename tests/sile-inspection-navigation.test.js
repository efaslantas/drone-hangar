import test from 'node:test';
import assert from 'node:assert/strict';
import * as navigation from '../src/sile-inspection-navigation.js';

const point={id:'castle',label:'Şile Kalesi',position:{x:10,y:30,z:-40},radius:12,maxSpeed:3,holdSeconds:3};
const scenario={points:[point],spawn:{x:0,y:1,z:0},limits:{returnRadius:8}};
const session=(status='active')=>({status,scenario,activePointId:'castle',observations:[],hold:1.5});
const state={x:10,y:10,z:-40,vx:0,vy:0,vz:0};

test('vertical separation is not arrival even with zero horizontal distance',()=>{
 const n=navigation.inspectionNavigation(session(),state);
 assert.equal(n.horizontalM,0);assert.equal(n.distanceM,20);assert.equal(n.heightDifferenceM,20);
 assert.equal(n.inRegion,false);assert.equal(n.holdFraction,.5);assert.equal(n.label,'Şile Kalesi');
});
test('return guidance uses actual home position and authored return radius',()=>{
 const s=session('returning');s.activePointId=null;
 const n=navigation.inspectionNavigation(s,{...state,x:3,y:1,z:4});
 assert.equal(n.horizontalM,5);assert.equal(n.distanceM,5);assert.equal(n.heightDifferenceM,0);
 assert.equal(n.label,'Başlangıç / iniş');assert.equal(n.radiusM,8);assert.equal(n.inRegion,true);
});
test('terminal and absent sessions never present a pending point as an active destination',()=>{
 for(const status of ['completed','stopped','failed'])assert.equal(navigation.inspectionNavigation(session(status),state),null);
 assert.equal(navigation.inspectionNavigation(null,state),null);
});
test('invalid state or missing active point is unavailable rather than fabricated zero',()=>{
 assert.equal(navigation.inspectionNavigation(session(),{...state,y:NaN}),null);
 assert.equal(navigation.inspectionNavigation(session(),{...state,vx:undefined}),null);
 const s=session();s.activePointId='missing';assert.equal(navigation.inspectionNavigation(s,state),null);
});
test('speed and full sphere criterion reflect actual navigation state without changing session',()=>{
 const s=session(),before=JSON.stringify(s),n=navigation.inspectionNavigation(s,{...state,y:30,vx:3,vy:4});
 assert.equal(n.speedMps,5);assert.equal(n.maxSpeedMps,3);assert.equal(n.inRegion,true);
 assert.equal(JSON.stringify(s),before);
});

const source={terrain:{bounds:[-100,100,-200,0],land:[[[[-100,-200],[100,-200],[100,0],[-100,0]],[[0,-150],[20,-150],[20,-130],[0,-130]]]]},roads:[{points:[[-100,-200],[100,0]]}]};
test('source map uses north-up x/z alignment, even-odd holes and consistent scale',()=>{
 const m=navigation.inspectionMapModel(source);
 assert.deepEqual(m.project({x:-100,z:-200}),{x:0,y:0});
 assert.deepEqual(m.project({x:100,z:0}),{x:1000,y:1000});
 assert.deepEqual(m.project({x:0,z:-100}),{x:500,y:500});
 assert.equal(m.land.length,1);assert.equal((m.land[0].match(/Z/g)||[]).length,2);
 assert.equal(m.roads[0],'M0,0 L1000,1000');assert.equal(m.metresPerUnit,.2);
});
test('outside or invalid map positions are hidden, not clamped to an apparent valid point',()=>{
 const m=navigation.inspectionMapModel(source);
 assert.equal(m.project({x:101,z:0}),null);assert.equal(m.project({x:NaN,z:0}),null);
 for(const bounds of [null,[1,1,2,3],[0,1,2,Infinity]])assert.equal(navigation.inspectionMapModel({terrain:{bounds}}),null);
});
test('non-square source bounds preserve metric aspect and discard invalid feature coordinates',()=>{
 const m=navigation.inspectionMapModel({terrain:{bounds:[0,400,0,200],land:[[[[0,0],[1,1],[NaN,2]]]]},roads:[{points:[[0,0],[Infinity,3]]}]});
 assert.deepEqual(m.viewBox,[0,0,1000,500]);assert.deepEqual(m.project({x:400,z:200}),{x:1000,y:500});
 assert.deepEqual(m.land,[]);assert.deepEqual(m.roads,[]);
});

test('boundary rendering may project outside coverage without clamping the live position marker',()=>{
 const m=navigation.inspectionMapModel(source);assert.deepEqual(m.projectUnbounded({x:-120,z:-220}),{x:-100,y:-100});assert.equal(m.project({x:-120,z:-220}),null);assert.equal(m.projectUnbounded({x:NaN,z:0}),null);
});
