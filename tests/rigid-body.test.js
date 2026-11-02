import test from 'node:test';
import assert from 'node:assert/strict';
import * as rb from '../src/rigid-body.js';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('estimated inertia scales with mass and manual principal moments reject impossible tensors',()=>{
 const a=rb.normalizeDynamics({},.65),b=rb.normalizeDynamics({},1.3);
 for(const key of ['inertiaX','inertiaY','inertiaZ']){assert.ok(a[key]>0);near(b[key],a[key]*2)}
 const manual=rb.normalizeDynamics({inertiaMode:'manual',inertiaX:.002,inertiaY:.003,inertiaZ:.004},.65);
 assert.equal(manual.inertiaMode,'manual');near(manual.inertiaY,.003);
 const invalid=rb.normalizeDynamics({inertiaMode:'manual',inertiaX:.1,inertiaY:.0001,inertiaZ:.0001,motorTauMs:NaN},.65);
 assert.equal(invalid.inertiaMode,'estimated');assert.ok(Number.isFinite(invalid.motorTauMs));
});
test('Euler equation includes gyroscopic cross coupling and torque/inertia units',()=>{
 const j=[.002,.003,.005];const a=rb.angularAcceleration([1,2,3],[0,0,0],j);
 near(a[0],-6);near(a[1],3);near(a[2],-.4);
 let w=[0,0,0];for(let i=0;i<1000;i++)w=rb.integrateAngularVelocity(w,[.004,0,0],j,.001);
 near(w[0],2,1e-8);near(w[1],0);near(w[2],0);
});
test('torque-free asymmetric body conserves rotational energy under integration',()=>{
 const j=[.002,.003,.005],energy=w=>w.reduce((s,x,i)=>s+.5*j[i]*x*x,0);
 let w=[1,2,3];const initial=energy(w);
 for(let i=0;i<5000;i++)w=rb.integrateAngularVelocity(w,[0,0,0],j,.001);
 near(energy(w),initial,1e-9);
});
test('X mixer reconstructs all body torque axes and handles low/high collective saturation',()=>{
 const p=rb.normalizeDynamics({},.65),tau=[.03,-.005,-.02];
 const m=rb.allocateRotorForces(8,tau,p,0,15);
 const actual=rb.rotorWrench(m.forces,p);
 near(actual.forceN,8);actual.torqueNm.forEach((v,i)=>near(v,tau[i]));
 for(const c of [0,60]) {
  const result=rb.allocateRotorForces(c,[4,2,-3],p,.01,15);
  assert.ok(result.saturated);
  assert.ok(result.forces.every(f=>f>=.01-1e-9&&f<=15+1e-9));
  const t=rb.rotorWrench(result.forces,p).torqueNm;
  assert.ok(t[0]>0&&t[1]>0&&t[2]<0);
 }
});
test('rate curve is odd, monotonic and exactly reaches pilot endpoint',()=>{
 const p=rb.normalizeDynamics({centerRateDps:150},.65);let previous=-Infinity;
 for(let i=-100;i<=100;i++) {
  const r=rb.rateSetpoint(i/100,14,p);
  assert.ok(r>=previous);near(r,-rb.rateSetpoint(-i/100,14,p));previous=r;
 }
 near(rb.rateSetpoint(1,14,p),14);near(rb.rateSetpoint(0,14,p),0);
});

test('saturation freezes growing integral but allows it to unwind',()=>{
 const p=rb.normalizeDynamics({},.65),c=rb.createRateController();
 c.integral=[1,1,1];c.saturated=true;
 rb.rateController(c,[0,0,0],[5,5,5],p,.01);assert.deepEqual(c.integral,[1,1,1]);
 rb.rateController(c,[0,0,0],[-5,-5,-5],p,.01);c.integral.forEach(x=>near(x,.95));
 c.saturated=false;rb.rateController(c,[0,0,0],[5,5,5],p,.01);c.integral.forEach(x=>near(x,1));
});
