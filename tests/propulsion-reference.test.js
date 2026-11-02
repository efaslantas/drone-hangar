import test from 'node:test';
import assert from 'node:assert/strict';
import * as ref from '../src/propulsion-reference.js';
import { createState, step, hoverThrottle, withPayload } from '../src/physics.js';
import { droneById } from '../src/catalog.js';
const base=()=>ref.applyReference(droneById('freestyle'),{profile:'f60-1750-6s',massG:650,capacityMah:1100,usableFraction:.8,electronicsA:.5});
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('published endpoints reproduce source thrust, current and voltage without KV multipliers',()=>{
 const six=ref.sampleReference('f60-1750-6s',1),four=ref.sampleReference('f60-2550-4s',1);
 near(six.thrustN,1646*.00980665);near(six.currentA,36.14);near(six.voltageV,24.57);
 near(four.thrustN,1436*.00980665);near(four.currentA,45.64);near(four.voltageV,15.95);
 const midpoint=ref.sampleReference('f60-1750-6s',.45);
 near(midpoint.thrustN,(394+571)/2*.00980665);
 assert.equal(ref.sampleReference('f60-1750-6s',.2).evidence,'low-throttle-extrapolation');
 assert.equal(ref.sampleReference('f60-1750-6s',.4).evidence,'published-point');
});
test('hover solves force equilibrium and mAh/A duration with user assumptions',()=>{
 const spec=base(),metrics=ref.referenceMetrics(spec);
 near(ref.sampleReference(spec.propulsion.profile,hoverThrottle(spec)).thrustN*4,spec.mass*9.80665,1e-6);
 near(metrics.hoverSeconds,1100*.8/1000/metrics.hoverCurrentA*3600,1e-6);
 const heavy=ref.applyReference(droneById('freestyle'),{...spec.propulsion,massG:1000});
 assert.ok(hoverThrottle(heavy)>hoverThrottle(spec));
 assert.ok(ref.referenceMetrics(heavy).hoverSeconds<metrics.hoverSeconds);
 near(spec.maxRate,droneById('freestyle').maxRate);
});
test('reference physics uses curve thrust and integrates actual current; disarm drains nothing',()=>{
 const spec=base(),s=createState(0,50,0);s.armed=true;s.motor=.6;
 const sample=ref.sampleReference(spec.propulsion.profile,.6);
 step(s,{throttle:.6,angleMode:false},spec,.01,{real:false});
 near(s.vy,(sample.thrustN*4/spec.mass-9.80665)*.01,1e-8);
 near(s.battery,1-(4*sample.currentA+.5)*.01/(1100*.8/1000*3600),1e-10);
 s.armed=false;const charge=s.battery;step(s,{throttle:1,angleMode:false},spec,.01,{real:false});near(s.battery,charge);
});
test('reference hover remains balanced and payload preserves motor data rather than amplifying thrust',()=>{
 const spec=base(),s=createState(0,30,0);s.armed=true;s.motor=hoverThrottle(spec);
 for(let i=0;i<120;i++)step(s,{lift:0,angleMode:false},spec,1/120,{real:false});
 near(s.y,30,1e-6);
 const loaded=withPayload(spec,.45);
 near(loaded.mass,spec.mass*1.45);
 assert.ok(hoverThrottle(loaded)>hoverThrottle(spec));
 assert.equal(loaded.propulsion.profile,spec.propulsion.profile);
});
test('invalid settings are normalized and references never apply to incompatible airframes',()=>{
 assert.equal(ref.applyReference(droneById('seven'),{profile:'f60-1750-6s'}).propulsion,undefined);
 assert.equal(ref.applyReference(droneById('freestyle'),{profile:'nope'}).propulsion,undefined);
 const o=ref.normalizeReference({profile:'f60-1750-6s',massG:NaN,capacityMah:-1,usableFraction:2,electronicsA:99});
 assert.equal(o.massG,650);assert.equal(o.capacityMah,500);assert.equal(o.usableFraction,1);assert.equal(o.electronicsA,3);
 assert.deepEqual(ref.readReferences({getItem(){throw Error('denied')}}),{});
 assert.deepEqual(ref.readReferences({getItem(){return '{bad'}}),{});
});

test('reference capacity follows electrical load including avionics at zero motor command, independent of game drain',()=>{
 const spec=base(),s=createState(0,30,0);s.armed=true;
 step(s,{throttle:0,angleMode:false},spec,.02,{drain:50});
 near(s.currentA,.5);
 near(s.battery,1-.5*.02/(.88*3600),1e-10);
 const twice=ref.applyReference(droneById('freestyle'),{...spec.propulsion,capacityMah:2200});
 near(ref.referenceMetrics(twice).hoverSeconds,ref.referenceMetrics(spec).hoverSeconds*2,1e-6);
 near(twice.maxThrustG,spec.maxThrustG);
});
