// Numerical/model validation only. Does not claim hardware matching.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createState,step,hoverThrottle } from '../src/physics.js';
import { applyReference } from '../src/propulsion-reference.js';
import { droneById } from '../src/catalog.js';
import { rateSetpoint } from '../src/rigid-body.js';
const spec=applyReference(droneById('freestyle'),{profile:'f60-1750-6s',massG:650,airframe:'source-one-v4',dynamics:{wheelbaseMm:226}});
const h=hoverThrottle(spec),dt=1/240,play={real:true,ceil:10000};
function state(){const s=createState(0,1000,0);s.armed=true;s.motor=h;return s}
function tick(s,input){step(s,{angleMode:false,throttle:h,...input},spec,dt,play)}
const hover=state();for(let i=0;i<2400;i++)tick(hover,{});
const target=-rateSetpoint(.4,spec.maxRate,spec.dynamics),s=state();let peak=0;
for(let i=0;i<480;i++){tick(s,{pitch:.4});peak=Math.max(peak,Math.abs(s.wx))}
const steadyError=Math.abs(s.wx-target);
for(let i=0;i<720;i++)tick(s,{});
assert.ok(Math.abs(hover.y-1000)<1e-6);assert.ok(steadyError<.05);assert.ok(Math.abs(s.wx)<.05);
const b=state(),start=performance.now();for(let i=0;i<10000;i++)tick(b,{});
console.log(JSON.stringify({kind:'numerical-model-validation-not-hardware',assumedMassKg:spec.mass,assumedInertiaKgM2:[spec.dynamics.inertiaX,spec.dynamics.inertiaY,spec.dynamics.inertiaZ],hover10SecondsAltitudeErrorM:Math.abs(hover.y-1000),pitchStepTargetRadS:target,pitchSteadyErrorRadS:steadyError,pitchPeakRadS:peak,pitchReleaseResidualRadS:s.wx,modelStepMeanMilliseconds:(performance.now()-start)/10000},null,2));
