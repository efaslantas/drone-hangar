// Photo-informed architecture, not a surveyed or branded replica. Operator
// gallery/contact: https://silefora.com/galeri/ https://silefora.com/iletisim/
// The place marker is ~30 m west of this ML roofprint; the association, roof
// shape and dimensions are modeling inferences. Never propagate to other roofs.
const profile=Object.freeze({id:'western-harbor-low-pavilion',eavesHeight:3.15,height:4.35,measured:false,paint:0xd7dedc,entry:Object.freeze([-338.9,-176.2])});
const footprint=[[[-301.670822,-166.511982],[-304.55743,-179.43905],[-317.211513,-176.6293],[-314.324905,-163.713339]]];
export function pavilionProfile(item){
 return item?.id==='19523577-0288-44e7-aa86-ac6ba007cd56'&&JSON.stringify(item.rings)===JSON.stringify(footprint)?profile:null;
}
export function pavilionRoof(item){
 const p=pavilionProfile(item);if(!p||!Number.isFinite(item.base))return null;
 const eaves=item.base+p.eavesHeight,ring=item.rings[0],center=ring.reduce((s,a)=>[s[0]+a[0]/4,s[1]+a[1]/4],[0,0]),apex=[center[0],item.base+p.height,center[1]],positions=[],uv=[];
 for(let i=0;i<4;i++){
  let a=[ring[i][0],eaves,ring[i][1]],b=[ring[(i+1)%4][0],eaves,ring[(i+1)%4][1]];
  if((b[2]-a[2])*(apex[0]-a[0])-(b[0]-a[0])*(apex[2]-a[2])<0)[a,b]=[b,a];
  const dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz),along=((apex[0]-a[0])*dx+(apex[2]-a[2])*dz)/length,across=Math.abs(dx*(apex[2]-a[2])-dz*(apex[0]-a[0]))/length;
  positions.push(...a,...b,...apex);uv.push(0,0,length/1.8,0,along/1.8,Math.hypot(across,apex[1]-eaves)/1.8);
 }
 return {eaves,positions,uv};
}
