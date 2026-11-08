import {sampleTriangleSurface} from './triangle-surface.js';
// Convex, faceted arch. All render clipping and physics queries share these
// planes; dimensions describe an authored simulation, not surveyed clearance.
export function caveVolume(spec){
 const c={...spec},[dx,dz]=c.axis,l=Math.hypot(dx,dz);c.axis=[dx/l,dz/l];c.side=[dz/l,-dx/l];
 c.taper=c.taper||0;
 if(c.profile)c.section=c.profile.map(([u,h])=>[u,c.sea+h]);
 else{c.section=[[-c.halfWidth,c.sea-1.2],[c.halfWidth,c.sea-1.2]];for(let i=0;i<=16;i++){const a=i*Math.PI/16;c.section.push([c.halfWidth*Math.cos(a),c.sea+c.sideHeight+c.rise*Math.sin(a)]);}}
 if(Math.min(1+c.taper*c.minD,1+c.taper*c.maxD)<=0)throw new RangeError('Cave taper must remain positive');
 for(let i=0;i<c.section.length;i++){const a=c.section[i],b=c.section[(i+1)%c.section.length],q=c.section[(i+2)%c.section.length];if((b[0]-a[0])*(q[1]-b[1])-(b[1]-a[1])*(q[0]-b[0])<-1e-8)throw new RangeError('Cave profile must be convex');}
 c.planes=[];
 for(let i=0;i<c.section.length;i++){
  const a=c.section[i],b=c.section[(i+1)%c.section.length],nu=b[1]-a[1],ny=a[0]-b[0],localD=nu*a[0]+ny*a[1],along=-(localD-ny*c.sea)*c.taper,n=[nu*c.side[0]+along*c.axis[0],ny,nu*c.side[1]+along*c.axis[1]],len=Math.hypot(...n);
  c.planes.push({n:n.map(v=>v/len),d:(localD+n[0]*c.origin[0]+n[2]*c.origin[1])/len,kind:i===0?'bottom':'shell'});
 }
 c.planes.push({n:[-c.axis[0],0,-c.axis[1]],d:-c.minD-c.axis[0]*c.origin[0]-c.axis[1]*c.origin[1],kind:'entry'},{n:[c.axis[0],0,c.axis[1]],d:c.maxD+c.axis[0]*c.origin[0]+c.axis[1]*c.origin[1],kind:c.blind?'back':'exit'});return c;
}
export const planeDistance=(p,v)=>p.n[0]*v[0]+p.n[1]*v[1]+p.n[2]*v[2]-p.d;
export function insideCave(c,x,y,z){return c.planes.every(p=>planeDistance(p,[x,y,z])<=1e-8);}
export function caveColumnAt(c,x,y,z){return c.planes.every(p=>p.kind==='bottom'||planeDistance(p,[x,y,z])<=1e-8);}
export function caveFloor(c,x,z){const floor=sampleTriangleSurface(c.floorSurface,x,z);return floor&&floor.height>c.sea?{...floor,water:false}:{height:c.sea,normal:[0,1,0],water:true};}
export function caveClearance(c,x,y,z){if(!insideCave(c,x,y,z))return Infinity;return Math.min(...c.planes.filter(p=>p.kind==='shell'||p.kind==='back').map(p=>-planeDistance(p,[x,y,z])));}
export function clipPlane(poly,plane,inside=true){
 if(!poly.length)return [];const out=[];let a=poly.at(-1),da=planeDistance(plane,a),ia=inside?da<=0:da>=0;
 for(const b of poly){const db=planeDistance(plane,b),ib=inside?db<=0:db>=0;if(ia!==ib){const t=da/(da-db);out.push(a.map((v,k)=>v+(b[k]-v)*t));}if(ib)out.push(b);a=b;da=db;ia=ib;}return out;
}
export function clipSolid(poly,planes){for(const p of planes){poly=clipPlane(poly,p);if(poly.length<3)return [];}return poly;}
export function subtractCave(poly,c){const out=[];for(const p of c.planes){const outside=clipPlane(poly,p,false);if(outside.length>=3)out.push(outside);poly=clipPlane(poly,p);if(poly.length<3)break;}return out;}
export function cavePoint(c,u,y,d){const scale=1+(c.taper||0)*d;return [c.origin[0]+c.side[0]*u*scale+c.axis[0]*d,c.sea+(y-c.sea)*scale,c.origin[1]+c.side[1]*u*scale+c.axis[1]*d];}
