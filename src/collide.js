import {terrainWallCandidates} from './terrain-wall-index.js';
import {Triangle,Vector3} from 'three';
import {groundSupport} from './airframe-contact.js';
import {insidePolygon,surfaceAt} from './geo-terrain.js';
export function aabbFromBox(x, y, z, w, h, d, yaw = 0) {
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const hx = (w / 2) * c + (d / 2) * s;
  const hz = (w / 2) * s + (d / 2) * c;
  const hy = h / 2;
  return {
    minx: x - hx,
    maxx: x + hx,
    miny: y - hy,
    maxy: y + hy,
    minz: z - hz,
    maxz: z + hz,
  };
}

function crashAt(state, reason) {
  state.crashed = true;
  state.crashReason = reason;
  state.armed = false;
  state.vx = 0;
  state.vy = 0;
  state.vz = 0;
  state.altHold = null;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

const CRASH_V = 7;

function hitNormal(state, nx, ny, nz, pen, reason) {
  state.x += nx * pen;
  state.y += ny * pen;
  state.z += nz * pen;
  const vn = state.vx * nx + state.vy * ny + state.vz * nz;
  if (vn >= 0) return;
  const impact = -vn;
  state.vx -= vn * nx;
  state.vy -= vn * ny;
  state.vz -= vn * nz;
  state.vx *= 0.35;
  state.vy *= 0.35;
  state.vz *= 0.35;
  if (state.armed && impact > CRASH_V) crashAt(state, reason);
}

function hitAabb(state, box, r) {
  const px = clamp(state.x, box.minx, box.maxx);
  const py = clamp(state.y, box.miny, box.maxy);
  const pz = clamp(state.z, box.minz, box.maxz);
  let dx = state.x - px;
  let dy = state.y - py;
  let dz = state.z - pz;
  const d2 = dx * dx + dy * dy + dz * dz;
  if (d2 > r * r && d2 > 1e-10) return;

  let nx;
  let ny;
  let nz;
  let pen;
  if (d2 < 1e-10) {
    const left = state.x - box.minx;
    const right = box.maxx - state.x;
    const down = state.y - box.miny;
    const up = box.maxy - state.y;
    const back = state.z - box.minz;
    const fwd = box.maxz - state.z;
    const m = Math.min(left, right, down, up, back, fwd);
    nx = 0;
    ny = 0;
    nz = 0;
    if (m === left) {
      nx = -1;
      pen = r + left;
    } else if (m === right) {
      nx = 1;
      pen = r + right;
    } else if (m === down) {
      ny = -1;
      pen = r + down;
    } else if (m === up) {
      ny = 1;
      pen = r + up;
    } else if (m === back) {
      nz = -1;
      pen = r + back;
    } else {
      nz = 1;
      pen = r + fwd;
    }
  } else {
    const d = Math.sqrt(d2);
    nx = dx / d;
    ny = dy / d;
    nz = dz / d;
    pen = r - d;
  }
  hitNormal(state, nx, ny, nz, pen, "çarptı");
}

function hitPrism(state,prism,r) {
 const [minx,maxx,minz,maxz]=prism.bounds;
 if(state.x<minx-r||state.x>maxx+r||state.z<minz-r||state.z>maxz+r||state.y<prism.miny-r||state.y>prism.maxy+r)return;
 const inside=insidePolygon(state.x,state.z,prism.rings);
 let best=Infinity,qx=0,qz=0,edgeX=0,edgeZ=0;
 for(const ring of prism.rings)for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
  if(!length)continue;
  const t=clamp(((state.x-a[0])*dx+(state.z-a[1])*dz)/length,0,1),x=a[0]+t*dx,z=a[1]+t*dz,d=(state.x-x)**2+(state.z-z)**2;
  if(d<best){best=d;qx=x;qz=z;edgeX=dx;edgeZ=dz;}
 }
 const side=Math.sqrt(best);let nx=0,ny=0,nz=0,pen=0;
 if(inside&&state.y>=prism.miny&&state.y<=prism.maxy){
  const roof=prism.maxy-state.y,floor=state.y-prism.miny;
  if(roof<=side&&roof<=floor){ny=1;pen=r+roof;}
  else if(floor<=side){ny=-1;pen=r+floor;}
  else {
   if(side>1e-8){nx=(qx-state.x)/side;nz=(qz-state.z)/side;}
   else{const len=Math.hypot(edgeX,edgeZ)||1,tx=-edgeZ/len,tz=edgeX/len,sign=insidePolygon(state.x+tx*.001,state.z+tz*.001,prism.rings)?-1:1;nx=tx*sign;nz=tz*sign;}
   pen=r+side;
  }
 }else{
  const qy=clamp(state.y,prism.miny,prism.maxy),dx=inside?0:state.x-qx,dz=inside?0:state.z-qz,dy=state.y-qy,d=Math.hypot(dx,dy,dz);
  if(d>=r)return;
  if(d>1e-8){nx=dx/d;ny=dy/d;nz=dz/d;pen=r-d;}
  else{
   // Centre exactly on a wall: find which perpendicular points outside.
   for(const ring of prism.rings)for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
    if(!len)continue;const tx=-dz/len,tz=dx/len;
    if(Math.abs((state.x-a[0])*dz-(state.z-a[1])*dx)>1e-6)continue;
    const sign=insidePolygon(state.x+tx*.001,state.z+tz*.001,prism.rings)?-1:1;nx=tx*sign;nz=tz*sign;pen=r;break;
   }
  }
 }
 if(ny>.5)state.worldTouchdown={verticalSpeed:Math.max(0,-state.vy),horizontalSpeed:Math.hypot(state.vx,state.vz)};
 hitNormal(state,nx,ny,nz,pen,'binaya çarptı');
 if(ny>.5&&!state.crashed)state.grounded=true;
}
// Squared distance to a convex triangle is convex along a line segment.
// Minimize that actual distance, then bisect its first radius crossing. This
// includes the face, all three edge capsules and vertex spheres without an
// inflated solid wall box. Broadphase bounds only discard impossible contacts.
function sweptTriangleSphere(start,end,triangle,r){
 const point=new Vector3(),nearest=new Vector3(),delta=end.clone().sub(start);
 const distance=t=>{point.copy(start).addScaledVector(delta,t);triangle.closestPointToPoint(point,nearest);return point.distanceToSquared(nearest);};
 const radius2=r*r,d0=distance(0);let left=0,right=1;
 const ratio=(Math.sqrt(5)-1)/2;let a=right-ratio*(right-left),b=left+ratio*(right-left),da=distance(a),db=distance(b);
 for(let i=0;i<48;i++){if(da<db){right=b;b=a;db=da;a=right-ratio*(right-left);da=distance(a);}else{left=a;a=b;da=db;b=left+ratio*(right-left);db=distance(b);}}
 let minimum=(left+right)/2;if(distance(1)<distance(minimum))minimum=1;
 if(distance(minimum)>radius2+1e-12)return null;
 let lo=0,hi=minimum;
 if(d0>radius2)for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(distance(mid)>radius2)lo=mid;else hi=mid;}
 else hi=0;
 distance(hi);const centre=point.clone(),normal=centre.clone().sub(nearest),length=normal.length();
 if(length>1e-9)normal.multiplyScalar(1/length);else{triangle.getNormal(normal);if(normal.dot(delta)>0)normal.negate();}
 // An existing overlap that is separating needs no swept stop; its final
 // position still receives the exact discrete triangle contact below.
 if(hi===0&&normal.dot(delta)>=0)return null;
 return {time:hi,centre,normal,penetration:Math.max(0,r-length)};
}
function hitTerrainWalls(state,walls,r){
 if(!walls?.length)return;
 const end=new Vector3(state.x,state.y,state.z),start=state.motionStart?new Vector3(state.motionStart.x,state.motionStart.y,state.motionStart.z):null,triangles=[];let earliest=null;
 for(const w of terrainWallCandidates(walls,[Math.min(end.x,start?.x??end.x)-r,Math.max(end.x,start?.x??end.x)+r,Math.min(end.z,start?.z??end.z)-r,Math.max(end.z,start?.z??end.z)+r])){
  const vertices=w.vertices,cb=w.contactBounds||(vertices?[0,1,2].flatMap(k=>[Math.min(...vertices.map(v=>v[k])),Math.max(...vertices.map(v=>v[k]))]):null);
  const minx=(vertices?cb[0]:Math.min(w.a[0],w.b[0]))-r,maxx=(vertices?cb[1]:Math.max(w.a[0],w.b[0]))+r,minz=(vertices?cb[4]:Math.min(w.a[1],w.b[1]))-r,maxz=(vertices?cb[5]:Math.max(w.a[1],w.b[1]))+r,miny=(vertices?cb[2]:Math.min(w.height,w.ya,w.yb))-r,maxy=(vertices?cb[3]:Math.max(w.height,w.ya,w.yb))+r;
  if(Math.min(end.x,start?.x??end.x)>maxx||Math.max(end.x,start?.x??end.x)<minx||Math.min(end.z,start?.z??end.z)>maxz||Math.max(end.z,start?.z??end.z)<minz||Math.min(end.y,start?.y??end.y)>maxy||Math.max(end.y,start?.y??end.y)<miny)continue;
  const faces=vertices?[vertices.map(v=>new Vector3(...v))]:(()=>{const a=new Vector3(w.a[0],w.height,w.a[1]),b=new Vector3(w.b[0],w.height,w.b[1]),c=new Vector3(w.a[0],w.ya,w.a[1]),d=new Vector3(w.b[0],w.yb,w.b[1]);return [[a,b,c],[b,d,c]];})();
  for(const face of faces){const triangle=new Triangle(...face);if(triangle.getNormal(new Vector3()).lengthSq()<1e-20)continue;triangle.contactReason=w.reason||'istinat duvarına çarptı';triangle.landing=w.landing===true;triangles.push(triangle);if(start){const hit=sweptTriangleSphere(start,end,triangle,r);if(hit&&(!earliest||hit.time<earliest.time))earliest={...hit,reason:triangle.contactReason,landing:triangle.landing};}}
 }
 if(earliest){const {centre,normal,penetration}=earliest;state.x=centre.x;state.y=centre.y;state.z=centre.z;const landing=earliest.landing&&normal.y>.5;if(landing)state.worldTouchdown={verticalSpeed:Math.max(0,-state.vx*normal.x-state.vy*normal.y-state.vz*normal.z),horizontalSpeed:Math.hypot(state.vx,state.vz)};hitNormal(state,normal.x,normal.y,normal.z,penetration,earliest.reason);if(landing&&!state.crashed)state.grounded=true;if(state.crashed)return;}
 const centre=new Vector3(),nearest=new Vector3();
 for(const triangle of triangles){centre.set(state.x,state.y,state.z);triangle.closestPointToPoint(centre,nearest);const distance=centre.distanceTo(nearest);if(distance>=r)continue;const normal=centre.clone().sub(nearest);if(distance>1e-8)normal.multiplyScalar(1/distance);else triangle.getNormal(normal);const landing=triangle.landing&&normal.y>.5;if(landing&&!state.worldTouchdown)state.worldTouchdown={verticalSpeed:Math.max(0,-state.vx*normal.x-state.vy*normal.y-state.vz*normal.z),horizontalSpeed:Math.hypot(state.vx,state.vz)};hitNormal(state,normal.x,normal.y,normal.z,r-distance,triangle.contactReason);if(landing&&!state.crashed)state.grounded=true;if(state.crashed)return;}
}
function hitTerrain(state,spec,play){
 const surface=surfaceAt(play,state.x,state.z,state.y),r=groundSupport(spec,state,surface.normal,.06),[nx,ny,nz]=surface.normal;
 const distance=(state.y-surface.height)*ny;
 if(distance>=r)return;
 if(surface.water){crashAt(state,'suya düştü');return;}
 // A coastline can be a vertical cliff even where the coarse DSM triangle
 // is flat. Intercept a sea→land crossing below its lip before resolving the
 // sloped ground plane, so it cannot lift a drone through the rock face.
 if(state.motionStart&&surfaceAt(play,state.motionStart.x,state.motionStart.z,state.motionStart.y).water&&state.y<surface.height-r){
  let closest=Infinity,qx=0,qz=0;
  for(const polygon of play.terrain.land)for(const ring of polygon)for(let i=0;i<ring.length;i++){
   const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;if(!length)continue;
   const u=clamp(((state.x-a[0])*dx+(state.z-a[1])*dz)/length,0,1),x=a[0]+u*dx,z=a[1]+u*dz,d=(state.x-x)**2+(state.z-z)**2;
   if(d<closest){closest=d;qx=x;qz=z;}
  }
  const d=Math.sqrt(closest);
  if(d>1e-8){hitNormal(state,(qx-state.x)/d,0,(qz-state.z)/d,d+r,'kıyıya çarptı');return;}
 }
 const impact=-(state.vx*nx+state.vy*ny+state.vz*nz);
 const penetration=r-distance;state.x+=nx*penetration;state.y+=ny*penetration;state.z+=nz*penetration;
 state.worldTouchdown={verticalSpeed:Math.max(0,impact),horizontalSpeed:Math.hypot(state.vx,state.vz)};
 if(impact>0){state.vx+=impact*nx;state.vy+=impact*ny;state.vz+=impact*nz;}
 state.vx*=.45;state.vz*=.45;state.grounded=true;
 if(state.armed&&impact>9)crashAt(state,'sert iniş');
}

function hitBounds(state, bounds, r) {
  const { minx, maxx, minz, maxz } = bounds;
  if (state.x < minx + r) hitNormal(state, 1, 0, 0, minx + r - state.x, "saha dışı");
  else if (state.x > maxx - r) hitNormal(state, -1, 0, 0, state.x - (maxx - r), "saha dışı");
  if (state.z < minz + r) hitNormal(state, 0, 0, 1, minz + r - state.z, "saha dışı");
  else if (state.z > maxz - r) hitNormal(state, 0, 0, -1, state.z - (maxz - r), "saha dışı");
}

export function applyWorld(state, spec, play) {
  if (!play || state.crashed) return state;
  const r = Math.max(0.06, spec.size * 0.48);
  hitTerrainWalls(state,play.terrainWalls,r);
  if(state.crashed)return state;
  if(play.terrain)hitTerrain(state,spec,play);
  if(state.crashed)return state;
  if (play.ceil != null && state.y + r > play.ceil) {
    const impact = state.vy;
    state.y = play.ceil - r;
    state.vy = Math.min(0, state.vy);
    if (state.armed && impact > CRASH_V) crashAt(state, "tavan");
  }
  if (play.bounds) hitBounds(state, play.bounds, r);
  if (state.crashed) return state;
  const boxes = play.boxes || [];
  for (let i = 0; i < boxes.length; i++) {
    hitAabb(state, boxes[i], r);
    if (state.crashed) return state;
  }
  for(const prism of play.prisms||[]){hitPrism(state,prism,r);if(state.crashed)return state;}
  return state;
}
