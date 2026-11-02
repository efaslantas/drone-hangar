// Independently implemented rigid-body/control equations; no firmware source copied.
// Body axes: x right, y up, z rear. Pitch=x, yaw=y, roll=z.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const bounded=(v,f,a,b)=>Number.isFinite(Number(v))?clamp(Number(v),a,b):f;
const corners=[[1,1],[1,-1],[-1,1],[-1,-1]];
export function normalizeDynamics(value={},massKg=.65) {
 const v=value||{},mass=bounded(massKg,.65,.02,10),wheelbaseMm=bounded(v.wheelbaseMm,225,180,280);
 const arm=wheelbaseMm/1000/Math.sqrt(8);
 // Assumption: 25% point masses at rotors, 75% 120×40×160 mm central box.
 const central=.75*mass,rotors=.25*mass;
 const estimated=[central*(.04**2+.16**2)/12+rotors*arm**2,central*(.12**2+.16**2)/12+2*rotors*arm**2,central*(.12**2+.04**2)/12+rotors*arm**2];
 const manual=[Number(v.inertiaX),Number(v.inertiaY),Number(v.inertiaZ)];
 const valid=manual.every(x=>Number.isFinite(x)&&x>=1e-6&&x<=.1)&&manual.every((x,i)=>x<=manual[(i+1)%3]+manual[(i+2)%3]);
 const useManual=v.inertiaMode==='manual'&&valid;
 const inertia=useManual?manual:estimated;
 return {wheelbaseMm,inertiaMode:useManual?'manual':'estimated',inertiaX:inertia[0],inertiaY:inertia[1],inertiaZ:inertia[2],motorTauMs:bounded(v.motorTauMs,60,5,150),yawTorqueM:bounded(v.yawTorqueM,.012,.002,.04),centerRateDps:bounded(v.centerRateDps,150,20,400),kp:bounded(v.kp,18,4,60),ki:bounded(v.ki,4,0,30),kd:bounded(v.kd,.18,0,1),derivativeHz:25,integralLimit:20,angularDamping:1e-4};
}
export function angularAcceleration(w,tau,j) {
 return [(tau[0]+(j[1]-j[2])*w[1]*w[2])/j[0],(tau[1]+(j[2]-j[0])*w[2]*w[0])/j[1],(tau[2]+(j[0]-j[1])*w[0]*w[1])/j[2]];
}
export function integrateAngularVelocity(w,tau,j,dt) {
 const a=angularAcceleration(w,tau,j);
 const b=angularAcceleration(w.map((x,i)=>x+a[i]*dt/2),tau,j);
 const c=angularAcceleration(w.map((x,i)=>x+b[i]*dt/2),tau,j);
 const d=angularAcceleration(w.map((x,i)=>x+c[i]*dt),tau,j);
 return w.map((x,i)=>x+dt*(a[i]+2*b[i]+2*c[i]+d[i])/6);
}
export function rotorWrench(forces,p) {
 const arm=p.wheelbaseMm/1000/Math.sqrt(8),torqueNm=[0,0,0];
 forces.forEach((f,i)=>{const [sx,sz]=corners[i];torqueNm[0]-=sz*arm*f;torqueNm[1]-=sx*sz*p.yawTorqueM*f;torqueNm[2]+=sx*arm*f});
 return {forceN:forces.reduce((a,b)=>a+b,0),torqueNm};
}
export function allocateRotorForces(collectiveN,tau,p,minForce,maxForce) {
 const arm=p.wheelbaseMm/1000/Math.sqrt(8);
 let deltas=corners.map(([sx,sz])=>-sz*tau[0]/(4*arm)-sx*sz*tau[1]/(4*p.yawTorqueM)+sx*tau[2]/(4*arm));
 const span=Math.max(...deltas)-Math.min(...deltas);
 const scale=span>maxForce-minForce?(maxForce-minForce)/span:1;
 deltas=deltas.map(d=>d*scale);
 const lo=minForce-Math.min(...deltas),hi=maxForce-Math.max(...deltas);
 const base=clamp(collectiveN/4,lo,hi);
 return {forces:deltas.map(d=>clamp(base+d,minForce,maxForce)),saturated:scale<1-1e-9||Math.abs(base-collectiveN/4)>1e-9,scale};
}
export function rateSetpoint(input,maxRad,p) {
 const x=clamp(Number(input)||0,-1,1),center=Math.min(p.centerRateDps*Math.PI/180,maxRad);
 return center*x+(maxRad-center)*x*x*x;
}
export function createRateController(rates=[0,0,0]) {
 return {integral:[0,0,0],previous:[...rates],derivative:[0,0,0],saturated:false};
}
export function rateController(controller,rates,target,p,dt,armed=true) {
 const j=[p.inertiaX,p.inertiaY,p.inertiaZ],alpha=1-Math.exp(-2*Math.PI*p.derivativeHz*dt);
 return rates.map((rate,i)=>{
  const error=target[i]-rate;
  controller.derivative[i]+=(((rate-controller.previous[i])/dt)-controller.derivative[i])*alpha;
  controller.previous[i]=rate;
  if(!armed){controller.integral[i]=0;controller.derivative[i]=0;return 0}
  if(!controller.saturated||error*controller.integral[i]<0)controller.integral[i]=clamp(controller.integral[i]+error*dt,-p.integralLimit,p.integralLimit);
  return j[i]*clamp(p.kp*error+p.ki*controller.integral[i]-p.kd*controller.derivative[i],-3000,3000);
 });
}
