import {normalizeAerodynamics} from './aerodynamics.js';
import { normalizeBattery, scaleRotor, solveBattery, usableCapacityAh } from './battery-model.js';
import { normalizeDynamics } from "./rigid-body.js";
// Selected numerical observations, not article text/code/images.
// Provenance and limitations: docs/PHYSICS-EVIDENCE.md.
export const REFERENCE_KEY = 'efa-hangar-propulsion-reference-v1';
export const STANDARD_GRAVITY = 9.80665;
export const BENCH_SOURCE = 'https://dronehitech.com/t-motor-f60-pro-iv-review-and-thrust-test/';
const source = Object.freeze({ url:BENCH_SOURCE, author:'Sergey / DroneHiTech', published:'2020-05-23', checked:'2026-10-31', kind:'published-static-bench-test', propeller:'HQ 5×4 üç pal', esc:'AIKON 35A BLHeli32' });
// [PWM µs, single-motor thrust gf, loaded voltage V, current A].
export const REFERENCE_PROFILES = Object.freeze({
 'f60-1750-6s':Object.freeze({id:'f60-1750-6s',name:'F60 Pro IV 1750KV · HQ 5×4×3 · 6S',motor:'T-Motor F60 Pro IV 1750KV',cells:6,capacityMah:1100,source,points:[
  [1300,87,25.14,2.85],[1400,394,25.10,4.88],[1500,571,25.06,7.68],[1600,756,25.01,11.24],
  [1700,971,24.92,16.23],[1800,1231,24.81,22.49],[1900,1488,24.68,29.76],[1985,1650,24.58,35.36],[2000,1646,24.57,36.14],
 ]}),
 'f60-2550-4s':Object.freeze({id:'f60-2550-4s',name:'F60 Pro IV 2550KV · HQ 5×4×3 · 4S',motor:'T-Motor F60 Pro IV 2550KV',cells:4,capacityMah:1500,source,points:[
  [1300,151,16.69,3.79],[1400,352,16.64,6.49],[1500,481,16.59,9.61],[1600,629,16.52,13.96],
  [1700,822,16.41,20.39],[1800,1036,16.28,28.32],[1900,1273,16.11,37.79],[2000,1436,15.95,45.64],
 ]}),
});
const bounded=(value,fallback,min,max)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback;
export function normalizeReference(value={}) {
 const profile=REFERENCE_PROFILES[value?.profile];
 const massG=bounded(value?.massG,650,300,1500);
 return {airframe:profile&&value?.airframe==='source-one-v4'?'source-one-v4':null,aerodynamics:normalizeAerodynamics(value?.aerodynamics),battery:normalizeBattery(value?.battery),dynamics:normalizeDynamics(value?.dynamics,massG/1000),profile:profile?.id||'generic',massG,capacityMah:bounded(value?.capacityMah,profile?.capacityMah||1100,500,3000),usableFraction:bounded(value?.usableFraction,.8,.5,1),electronicsA:bounded(value?.electronicsA,.5,0,3)};
}
export function readReferences(storage) {
 try {
  const parsed=JSON.parse(storage?.getItem(REFERENCE_KEY)||'null');
  return Object.fromEntries(['freestyle','racer'].filter(id=>parsed?.[id]&&typeof parsed[id]==='object').map(id=>[id,normalizeReference(parsed[id])]));
 }catch{return {}}
}
export function sampleReference(id, throttle) {
 const profile=REFERENCE_PROFILES[id];
 if(!profile)throw new RangeError('Unknown propulsion reference');
 const pwm=1000+bounded(throttle,0,0,1)*1000;
 const points=[[1000,0,profile.points[0][2],0],...profile.points];
 let a=points[0],b=points.at(-1);
 for(let i=1;i<points.length;i++)if(pwm<=points[i][0]){a=points[i-1];b=points[i];break}
 const ratio=(pwm-a[0])/(b[0]-a[0]);
 const interpolate=col=>a[col]+(b[col]-a[col])*ratio;
 return {thrustN:interpolate(1)*STANDARD_GRAVITY/1000,voltageV:interpolate(2),currentA:interpolate(3),evidence:pwm<1300?'low-throttle-extrapolation':profile.points.some(p=>p[0]===pwm)?'published-point':'interpolated'};
}
export function sampleReferenceAtVoltage(id,throttle,voltageV) {
 return scaleRotor(sampleReference(id,throttle),voltageV);
}
export function throttleForForce(id, targetN, voltageV) {
 if(Number.isFinite(voltageV)) {
  const profile=REFERENCE_PROFILES[id];if(!profile)return null;
  const peak=profile.points.reduce((a,b)=>a[1]>b[1]?a:b),max=(peak[0]-1000)/1000;
  if(targetN>sampleReferenceAtVoltage(id,max,voltageV).thrustN+1e-9)return null;
  let lo=0,hi=max;
  for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(sampleReferenceAtVoltage(id,mid,voltageV).thrustN<targetN)lo=mid;else hi=mid}
  return (lo+hi)/2;
 }
 const profile=REFERENCE_PROFILES[id];
 if(!profile)return null;
 const points=[[1000,0,profile.points[0][2],0],...profile.points];
 const grams=Math.max(0,targetN)/STANDARD_GRAVITY*1000;
 for(let i=1;i<points.length;i++) {
  const a=points[i-1],b=points[i];
  if(grams>=a[1]&&grams<=b[1])return (a[0]+(grams-a[1])/(b[1]-a[1])*(b[0]-a[0])-1000)/1000;
 }
 return null;
}
export function referenceMetrics(spec) {
 const settings=spec.propulsion,profile=REFERENCE_PROFILES[settings?.profile];
 if(!profile)return null;
 const hover=throttleForForce(profile.id,spec.mass*STANDARD_GRAVITY/4);
 const operating=hover==null?null:sampleReference(profile.id,hover);
 const hoverCurrentA=operating?4*operating.currentA+settings.electronicsA:null;
 return {hoverThrottle:hover,hoverCurrentA,hoverSeconds:hoverCurrentA>0?settings.capacityMah*settings.usableFraction/1000/hoverCurrentA*3600:null,
  peakThrustToWeight:4*Math.max(...profile.points.map(p=>p[1]))/(spec.mass*1000),peakCurrentA:4*Math.max(...profile.points.map(p=>p[3]))+settings.electronicsA,
  hoverEvidence:operating?.evidence||'outside-supported-force',source:profile.source};
}
// Fresh-pack estimate only: no ongoing SOC compensation of the stick centre.
export function freshBatteryMetrics(spec) {
 const setup=spec.propulsion,profile=REFERENCE_PROFILES[setup?.profile];
 if(!profile)return null;
 const power=t=>solveBattery(setup.battery,profile.cells,setup.battery.initialSoc,Array(4).fill(sampleReference(profile.id,t)),setup.electronicsA);
 const peak=profile.points.reduce((a,b)=>a[1]>b[1]?a:b),max=(peak[0]-1000)/1000;
 const target=spec.mass*STANDARD_GRAVITY;
 if(power(max).rotors.reduce((s,r)=>s+r.thrustN,0)<target)return {hoverThrottle:null,hoverCurrentA:null,hoverSeconds:null};
 let lo=0,hi=max;
 for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(power(mid).rotors.reduce((s,r)=>s+r.thrustN,0)<target)lo=mid;else hi=mid}
 const hoverThrottle=(lo+hi)/2,p=power(hoverThrottle);
 return {hoverThrottle,hoverCurrentA:p.currentA,hoverVoltageV:p.terminalV,hoverSeconds:usableCapacityAh(setup)/p.currentA*3600};
}
export function applyReference(spec,value) {
 const settings=normalizeReference(value);
 const profile=REFERENCE_PROFILES[settings.profile];
 if(!profile||!['freestyle','racer'].includes(spec.id))return spec;
 // Airframe drag/control dynamics stay explicitly approximate; no KV→rate multiplier.
 const next={...spec,...(settings.airframe==='source-one-v4'?{name:`SOURCE ONE v4 · 5 inç / ${profile.cells}S`}:{}),aerodynamics:settings.aerodynamics,mass:settings.massG/1000,propulsion:settings,dynamics:settings.dynamics,build:{frame:'freestyle',props:'tri',battery:profile.cells===6?'6s1100':'4s1500',motors:String(profile.cells===6?1750:2550)}};
 const metrics=referenceMetrics(next);
 if(settings.battery.mode==='rint')next.referenceHoverThrottle=freshBatteryMetrics(next).hoverThrottle;
 return {...next,maxThrustG:metrics.peakThrustToWeight,endurance:metrics.hoverSeconds||0};
}
