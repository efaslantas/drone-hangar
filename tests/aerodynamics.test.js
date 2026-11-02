import test from 'node:test';import assert from 'node:assert/strict';
import {aerodynamicForce,normalizeAerodynamics} from '../src/aerodynamics.js';
import {qFromYPR,createState,step,withPayload} from '../src/physics.js';
import {applyReference} from '../src/propulsion-reference.js';import {droneById} from '../src/catalog.js';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('quadratic drag has SI force units, opposes relative airspeed and follows body orientation',()=>{
 const p={density:1.225,cdaX:.01,cdaY:.04,cdaZ:.02},q=[1,0,0,0];
 const f=aerodynamicForce([10,-5,0],q,p);near(f[0],-.6125);near(f[1],.6125);near(f[2],0);
 assert.ok(f.reduce((s,v,i)=>s+v*[10,-5,0][i],0)<0);
 const rolled=qFromYPR(0,0,Math.PI/2);near(aerodynamicForce([10,0,0],rolled,p)[0],-2.45);
 assert.deepEqual(aerodynamicForce([0,0,0],q,p),[0,0,0]);
 assert.equal(normalizeAerodynamics({density:NaN,cdaX:-1}).density,1.225);
});
test('reference deceleration scales with force/mass and cargo preserves stick rate limits',()=>{
 const setup={profile:'f60-1750-6s',massG:650,battery:{mode:'bench'},aerodynamics:{density:1.225,cdaX:.012,cdaY:.045,cdaZ:.012}};
 const run=massG=>{const d=applyReference(droneById('freestyle'),{...setup,massG}),s=createState(0,100,0);s.vx=10;step(s,{throttle:0,angleMode:false},d,.001,{ceil:1000});return 10-s.vx};
 near(run(650)/run(1300),2,1e-6);
 const d=applyReference(droneById('freestyle'),setup),cargo=withPayload(d,.45);near(cargo.maxRate,d.maxRate);near(cargo.yawRate,d.yawRate);near(cargo.aerodynamics.cdaX,d.aerodynamics.cdaX*1.2);
});
