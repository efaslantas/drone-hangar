// Authored visual roofs only. Existing total height and footprint are the envelope.
const cross=(a,b,c)=>{const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);return [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];};
function triangle(target,a,b,c,direction){
 const n=cross(a,b,c);if(n.reduce((s,v,i)=>s+v*direction[i],0)<0)[b,c]=[c,b];target.push(...a,...b,...c);
}
export function buildingRoof(item){
 if(item.kind||item.landmark||Math.abs(item.id)%5===0||item.rings.length!==1||item.rings[0].length!==4||item.height<4||item.height>20)return null;
 let ring=item.rings[0].map(p=>p.slice());
 if(!ring.every(p=>p.length===2&&p.every(Number.isFinite))||!Number.isFinite(item.base)||!Number.isFinite(item.height))return null;
 const edges=ring.map((p,i)=>ring[(i+1)%4].map((v,k)=>v-p[k])),lengths=edges.map(e=>Math.hypot(...e));
 if(Math.min(...lengths)<3||Math.max(...lengths)>45||Math.max(...lengths)/Math.min(...lengths)>4)return null;
 const turns=edges.map((e,i)=>e[0]*edges[(i+1)%4][1]-e[1]*edges[(i+1)%4][0]);
 if(!turns.every(v=>v>0)&&!turns.every(v=>v<0))return null;
 if(edges.some((e,i)=>Math.abs(e.reduce((s,v,k)=>s+v*edges[(i+1)%4][k],0)/lengths[i]/lengths[(i+1)%4])>.2))return null;
 // The ridge runs parallel to the longer pair of opposite edges.
 if(lengths[0]+lengths[2]<lengths[1]+lengths[3])ring=[...ring.slice(1),ring[0]];
 const width=Math.min(Math.hypot(...ring[1].map((v,k)=>v-ring[2][k])),Math.hypot(...ring[0].map((v,k)=>v-ring[3][k])));
 const top=item.base+item.height,eaves=top-Math.min(1.8,width*.25,item.height*.2),p=ring.map(([x,z])=>[x,eaves,z]);
 const a=[(p[0][0]+p[3][0])/2,top,(p[0][2]+p[3][2])/2],b=[(p[1][0]+p[2][0])/2,top,(p[1][2]+p[2][2])/2];
 const positions=[],gables=[];
 for(const [q,r] of [[p[0],p[1]],[p[3],p[2]]]){triangle(positions,q,r,b,[0,1,0]);triangle(positions,q,b,a,[0,1,0]);}
 const center=p.reduce((s,v)=>s.map((n,i)=>n+v[i]/4),[0,0,0]);
 for(const [q,r,tip] of [[p[0],p[3],a],[p[1],p[2],b]])triangle(gables,q,r,tip,[tip[0]-center[0],0,tip[2]-center[2]]);
 const axis=[b[0]-a[0],b[2]-a[2]],len=Math.hypot(...axis);axis[0]/=len;axis[1]/=len;
 const uv=[];
 for(let i=0;i<positions.length;i+=3){const dx=positions[i]-a[0],dz=positions[i+2]-a[2],u=dx*axis[0]+dz*axis[1],across=dx*axis[1]-dz*axis[0];uv.push(u/1.92,Math.hypot(across,positions[i+1]-top)/2.56);}
 return {eaves,positions,uv,gables};
}
