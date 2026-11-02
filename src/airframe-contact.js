// Plane support of a model-local AABB. This is a conservative visual envelope,
// not measured landing gear, friction or full rigid-body contact dynamics.
function validBounds(b){return b&&['min','max'].every(k=>Array.isArray(b[k])&&b[k].length===3&&b[k].every(Number.isFinite))&&b.min.every((v,i)=>v<=b.max[i]);}
export function groundSupport(spec,state={},normal=[0,1,0],fallbackMinimum=0){
 const b=spec.contactBounds;if(!validBounds(b))return Math.max(fallbackMinimum,spec.size*.45);
 const [nx,ny,nz]=normal,n=Math.hypot(nx,ny,nz)||1;
 const w=state.qw??1,x=state.qx||0,y=state.qy||0,z=state.qz||0;
 // R^T n: evaluate support in body coordinates, keeping the physics origin.
 const local=[((1-2*(y*y+z*z))*nx+2*(x*y+w*z)*ny+2*(x*z-w*y)*nz)/n,
  (2*(x*y-w*z)*nx+(1-2*(x*x+z*z))*ny+2*(y*z+w*x)*nz)/n,
  (2*(x*z+w*y)*nx+2*(y*z-w*x)*ny+(1-2*(x*x+y*y))*nz)/n];
 const minimum=local.reduce((sum,v,i)=>sum+v*(v>=0?b.min[i]:b.max[i]),0);
 return Math.max(.001,-minimum+.001);
}
export function groundHeight(spec,state,surface){
 return surface.height+groundSupport(spec,state,surface.normal)/Math.max(.05,surface.normal[1]);
}
