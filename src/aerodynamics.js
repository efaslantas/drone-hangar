// Orthotropic quadratic drag, SI units. CdA values are tunable assumptions,
// not wind-tunnel measurements. Body axes match physics: right/up/rear.
const bounded=(v,f,lo,hi)=>Number.isFinite(Number(v))?Math.min(hi,Math.max(lo,Number(v))):f;
export function normalizeAerodynamics(v={}){
 return {density:bounded(v?.density,1.225,.5,2),cdaX:bounded(v?.cdaX,.012,.0001,.5),cdaY:bounded(v?.cdaY,.045,.0001,.5),cdaZ:bounded(v?.cdaZ,.012,.0001,.5)};
}
function rotate(v,q){
 const [w,x,y,z]=q,[vx,vy,vz]=v,tx=2*(y*vz-z*vy),ty=2*(z*vx-x*vz),tz=2*(x*vy-y*vx);
 return [vx+w*tx+y*tz-z*ty,vy+w*ty+z*tx-x*tz,vz+w*tz+x*ty-y*tx];
}
export function aerodynamicForce(relativeVelocity,q,p){
 const body=rotate(relativeVelocity,[q[0],-q[1],-q[2],-q[3]]),areas=[p.cdaX,p.cdaY,p.cdaZ];
 const force=body.map((v,i)=>-.5*p.density*areas[i]*Math.abs(v)*v);
 return rotate(force,q).map(v=>v===0?0:v);
}
