import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, step, hoverThrottle, rotateVec } from '../src/physics.js';
import { applyReference, sampleReference } from '../src/propulsion-reference.js';
import { droneById } from '../src/catalog.js';
const spec=dynamics=>applyReference(droneById('freestyle'),{profile:'f60-1750-6s',massG:650,capacityMah:1100,dynamics});
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function simulate(s,d,input,seconds,dt=1/120){for(let i=0;i<Math.round(seconds/dt);i++)step(s,{angleMode:false,...input},d,dt,{real:true,ceil:10000});return s}
function initial(d){const s=createState(0,1000,0);s.armed=true;s.motor=hoverThrottle(d);return s}
test('reference Acro hover has four equal rotor commands and source-current battery integration',()=>{
 const d=spec(),s=initial(d),h=hoverThrottle(d),current=4*sampleReference(d.propulsion.profile,h).currentA+.5;
 simulate(s,d,{throttle:h},1);
 assert.equal(s.rotorThrottle.length,4);s.rotorThrottle.forEach(v=>near(v,h));
 near(s.y,1000);near(s.wx,0);near(s.wy,0);near(s.wz,0);near(s.currentA,current);
 near(s.battery,1-current/(1100*.8/1000*3600),1e-8);
});
test('four-rotor Acro preserves pitch/roll/yaw control signs',()=>{
 const d=spec(),h=hoverThrottle(d);
 const p=simulate(initial(d),d,{throttle:h,pitch:.3},.2);assert.ok(p.wx<-.1&&p.qx<0);
 const r=simulate(initial(d),d,{throttle:h,roll:.3},.2);assert.ok(r.wz<-.1&&r.qz<0);
 const y=simulate(initial(d),d,{throttle:h,yaw:.3},.3);assert.ok(y.wy<-.1);assert.ok(rotateVec(y.qw,y.qx,y.qy,y.qz,0,0,-1)[0]>0);
});
test('motor lag affects response and rotor commands remain bounded under combined saturation',()=>{
 const fast=spec({motorTauMs:10}),slow=spec({motorTauMs:150});
 const a=simulate(initial(fast),fast,{throttle:.8},.05),b=simulate(initial(slow),slow,{throttle:.8},.05);
 assert.ok(a.rotorThrottle[0]>b.rotorThrottle[0]);assert.ok(a.vy>b.vy);
 const d=spec(),s=simulate(initial(d),d,{throttle:1,pitch:1,roll:1,yaw:1},3);
 assert.ok(s.rotorThrottle.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 near(Math.hypot(s.qw,s.qx,s.qy,s.qz),1,1e-9);
 assert.ok(Object.values(s).filter(x=>typeof x==='number').every(Number.isFinite));
});
test('controller integral is bounded, unwinds after release, and frame substeps agree',()=>{
 const d=spec(),s=initial(d);simulate(s,d,{throttle:.2,yaw:1},2);
 assert.ok(s.rateController.integral.every(i=>Math.abs(i)<=20));
 simulate(s,d,{throttle:hoverThrottle(d)},3);assert.ok(Math.abs(s.wy)<.15,`yaw=${s.wy}`);
 const run=dt=>simulate(initial(d),d,{throttle:.4,pitch:.25},1,dt);
 const a=run(1/60),b=run(1/240);
 near(a.wx,b.wx,.01);near(a.qw,b.qw,.01);near(a.qx,b.qx,.01);near(a.battery,b.battery,.0001);
});
test('disarm, empty pack and Angle/Acro transitions cannot retain powered rotor targets',()=>{
 const d=spec(),s=initial(d),h=hoverThrottle(d);simulate(s,d,{throttle:h},.1);
 s.armed=false;const battery=s.battery;simulate(s,d,{throttle:1,roll:1},1);
 assert.ok(s.rotorThrottle.every(v=>v<1e-5));near(s.battery,battery);near(s.currentA,0);
 s.armed=true;s.battery=0;simulate(s,d,{throttle:1},1);assert.ok(s.rotorThrottle.every(v=>v<1e-5));
 s.battery=1;step(s,{angleMode:true,lift:0,roll:0,pitch:0,yaw:0},d,1/120,{real:true,ceil:10000});assert.equal(s.rotorThrottle,null);
 simulate(s,d,{throttle:h},.1);assert.ok(s.rotorThrottle.every(Number.isFinite));
});

test('zero and invalid elapsed time leave the rotor/controller state unchanged',()=>{
 const d=spec(),s=initial(d),before=structuredClone(s);
 step(s,{throttle:1,roll:1,angleMode:false},d,0,{real:true});assert.deepEqual(s,before);
 step(s,{throttle:1,roll:1,angleMode:false},d,NaN,{real:true});assert.deepEqual(s,before);
});

test('unequal rotor transient current and charge equal the four source samples',()=>{
 const d=spec(),s=initial(d);s.rotorThrottle=[.3,.4,.5,.6];
 const dt=1/240,before=s.battery;
 step(s,{throttle:hoverThrottle(d),pitch:.3,angleMode:false},d,dt,{real:true,ceil:10000});
 assert.ok(Math.max(...s.rotorThrottle)-Math.min(...s.rotorThrottle)>.1);
 const amperes=s.rotorThrottle.reduce((sum,t)=>sum+sampleReference(d.propulsion.profile,t).currentA,0)+d.propulsion.electronicsA;
 near(s.currentA,amperes,1e-8);
 near(s.battery,before-amperes*dt/(d.propulsion.capacityMah*d.propulsion.usableFraction/1000*3600),1e-10);
});

test('crash cuts motor command telemetry and electric current instead of freezing powered values',()=>{
 const d=spec(),s=initial(d);simulate(s,d,{throttle:.6},.1);s.crashed=true;s.armed=false;
 step(s,{throttle:1,angleMode:false},d,1/120,{real:true});
 assert.ok(s.rotorThrottle.every(v=>v===0));near(s.currentA,0);near(s.motor,0);near(s.throttleOut,0);
 const hit=initial(d);step(hit,{throttle:.8,angleMode:false},d,1/120,{real:true,ceil:999});assert.ok(hit.crashed);assert.ok(hit.rotorThrottle.every(v=>v===0));near(hit.currentA,0);
});
