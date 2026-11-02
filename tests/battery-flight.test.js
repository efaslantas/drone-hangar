import test from 'node:test';
import assert from 'node:assert/strict';
import * as ref from '../src/propulsion-reference.js';
import {createState,step,hoverThrottle,withPayload} from '../src/physics.js';
import {droneById} from '../src/catalog.js';
import {resetBattery} from '../src/battery-model.js';
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const make=(battery={})=>ref.applyReference(droneById('freestyle'),{profile:'f60-1750-6s',massG:650,capacityMah:1100,battery:{mode:'rint',...battery}});
test('voltage-adjusted curve inverse stays within the source upper bound',()=>{
 const base=ref.sampleReference('f60-1750-6s',.6),low=ref.sampleReferenceAtVoltage('f60-1750-6s',.6,20);
 assert.ok(low.thrustN<base.thrustN);assert.ok(low.currentA<base.currentA);
 near(ref.sampleReferenceAtVoltage('f60-1750-6s',.6,30).thrustN,base.thrustN);
 const t=ref.throttleForForce('f60-1750-6s',low.thrustN,20);near(t,.6,1e-5);
});
test('fresh-pack hover solves battery and motor force equilibrium, and payload invalidates cached hover',()=>{
 const d=make(),h=hoverThrottle(d),p=ref.freshBatteryMetrics(d);
 assert.ok(h>ref.throttleForForce(d.propulsion.profile,d.mass*9.80665/4));near(h,p.hoverThrottle,1e-7);
 const s=createState(0,30,0);s.armed=true;s.motor=h;
 step(s,{throttle:h,angleMode:false},d,1/240,{real:true});near(s.vy,0,1e-6);
 assert.ok(hoverThrottle(withPayload(d,.45))>h);
 const poor=make({initialSoc:.4,cellResistanceMohm:20});assert.ok(ref.freshBatteryMetrics(poor).hoverThrottle>h);
});
test('lower battery SOC reduces force at the same motor command and charge follows the shared current',()=>{
 const d=make();function run(budget){const s=createState(0,30,0);s.armed=true;s.battery=budget;s.motor=.6;step(s,{throttle:.6,angleMode:false},d,.01,{real:false});return s}
 const full=run(1),low=run(.2);assert.ok(low.packVoltageV<full.packVoltageV);assert.ok(low.vy<full.vy);assert.ok(full.packUsedMah>0);
 near(full.packUsedMah,full.currentA*.01/3.6,1e-7);assert.ok(full.packLossWh>0);
});
test('loaded voltage cutoff cannot be bypassed by rearming and a fresh pack clears its state',()=>{
 const d=make({initialSoc:.2,cellResistanceMohm:30,cutoffCellV:3.6}),s=createState(0,40,0);s.armed=true;s.motor=.9;
 for(let i=0;i<80;i++)step(s,{throttle:.9,angleMode:false},d,1/240,{real:true});
 assert.ok(s.packCutoff);assert.ok(s.battery>.5);assert.equal(s.armed,false);
 s.armed=true;step(s,{throttle:1,angleMode:false},d,1/120,{real:true});near(s.currentA,0);
 resetBattery(s);assert.equal(s.packCutoff,false);assert.equal(s.packUsedMah,0);
});

test('four-rotor Rint charge and trajectory agree across frame subdivisions',()=>{
 const d=make(),run=dt=>{const s=createState(0,30,0);s.armed=true;s.motor=.5;for(let t=0;t<.2-1e-9;t+=dt)step(s,{throttle:.5,pitch:.1,roll:0,yaw:0,angleMode:false},d,dt,{real:true});return s};
 const a=run(1/60),b=run(1/240);
 near(a.battery,b.battery,1e-9);near(a.packUsedMah,b.packUsedMah,1e-7);near(a.packEnergyWh,b.packEnergyWh,1e-8);near(a.qx,b.qx,1e-9);near(a.vy,b.vy,.005);
});
test('a crashed disconnected pack reports recovered open-circuit voltage with zero current',()=>{
 const d=make({cellResistanceMohm:30}),s=createState(0,30,0);s.armed=true;s.motor=.9;
 step(s,{throttle:.9,angleMode:false},d,.01,{real:false});assert.ok(s.packVoltageV<s.packOpenV);
 const used=s.packUsedMah;s.crashed=true;s.armed=false;
 step(s,{throttle:1,angleMode:false},d,.01,{real:true});
 near(s.packVoltageV,s.packOpenV);near(s.currentA,0);near(s.packUsedMah,used);
});
