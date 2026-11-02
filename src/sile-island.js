import {ShapeUtils,Vector2,Color} from 'three';
import {drapeTerrainTriangles,insidePolygon} from './geo-terrain.js';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function noise(x,z,scale){
 const a=Math.floor(x/scale),b=Math.floor(z/scale),u=smooth(0,1,x/scale-a),v=smooth(0,1,z/scale-b),hash=(i,j)=>{let h=(Math.imul(i,374761393)^Math.imul(j,668265263))>>>0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
 return (hash(a,b)*(1-u)+hash(a+1,b)*u)*(1-v)+(hash(a,b+1)*(1-u)+hash(a+1,b+1)*u)*v;
}
function distanceToRing(x,z,ring){let distance=Infinity;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l)):0;distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));}return distance;}
// An authored local grid, not a new DEM. The source shoreline and castle base
// stay fixed; a wide level foundation keeps the entire castle grounded.
export function createCastleIsland(rings,castle,datum){
 const ring=rings[0],bounds=[Math.min(...ring.map(p=>p[0])),Math.max(...ring.map(p=>p[0])),Math.min(...ring.map(p=>p[1])),Math.max(...ring.map(p=>p[1]))],cols=Math.ceil((bounds[1]-bounds[0])/3)+1,rows=Math.ceil((bounds[3]-bounds[2])/3)+1,heights=[];
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  const x=bounds[0]+c/(cols-1)*(bounds[1]-bounds[0]),z=bounds[2]+r/(rows-1)*(bounds[3]-bounds[2]),coast=distanceToRing(x,z,ring),foundation=insidePolygon(x,z,castle.rings)?0:distanceToRing(x,z,castle.rings[0]);
  const ridge=1.5*(noise(x,z,17)-.5)+.8*(noise(x+27,z-41,5)-.5),shore=1.05+.65*(noise(x,z,9)-.5),upland=4.4+ridge;
  const relief=shore+(upland-shore)*smooth(0,15,coast),blend=smooth(5,17,foundation);
  heights.push(castle.base+datum+(relief-castle.base-datum)*blend);
 }
 return {bounds,cols,rows,heights,datum};
}
export function islandSurface(grid,rings){
 const vectors=rings.map(r=>r.map(([x,z])=>new Vector2(x,z))),points=vectors.flat(),triangles=ShapeUtils.triangulateShape(vectors[0],vectors.slice(1)),flat=[];
 for(const indices of triangles){const t=indices.map(i=>points[i]);if((t[1].x-t[0].x)*(t[2].y-t[0].y)-(t[1].y-t[0].y)*(t[2].x-t[0].x)>0)t.reverse();for(const p of t)flat.push(p.x,0,p.y);}
 const positions=drapeTerrainTriangles(grid,flat,0),uv=[],colors=[],dry=new Color(0xd8c9a7),green=new Color(0x73905a),wet=new Color(0x857b68),color=new Color();
 for(let i=0;i<positions.length;i+=3){const [x,y,z]=positions.slice(i,i+3),patch=noise(x,z,17)*.65+noise(x+47,z-19,4)*.35,cover=smooth(.35,.64,patch)*smooth(.8,2.9,y+grid.datum);color.copy(dry).lerp(green,cover*.9).lerp(wet,1-smooth(.8,2,y+grid.datum));uv.push(x/4,z/4);colors.push(color.r,color.g,color.b);}
 return {positions,uv,colors};
}
