// Authored toy motion and contacts for the fictional, local-only arcade game.
export const ARCADE = {
 id:'arcade-contact',kind:'arcade',name:'Arcade · Hareketli nesneler',
 blurb:'İki araba, bir uçak ve bir drone. Sırayı sen seç; her temastan sonra yeni drone ile devam et.',
 mapName:'Enkaz sahası',worldVariant:'aftermath',
 map:'airfield',lockMap:true,drone:'freestyle',lockDrone:false,
 optional:true,academy:false,ranked:false,startGrounded:true,spawn:{x:0,y:0,z:0},
 limit:0,drain:1,wind:{x:0,z:0},steps:[],
};
export function createArcade(){
 return {t:0,drones:1,wait:0,needsSpawn:false,previous:null,burst:null,targets:[
  {id:'car-coral',name:'Mercan araba',kind:'car',color:0xff785d,cx:-19,cz:-46,rx:7,rz:14,y:1.3,period:24,phase:0,r:2.1},
  {id:'car-blue',name:'Mavi araba',kind:'car',color:0x58bfff,cx:19,cz:-46,rx:7,rz:14,y:1.3,period:28,phase:2,r:2.1},
  {id:'plane-gold',name:'Sarı uçak',kind:'plane',color:0xffd36a,cx:0,cz:-52,rx:24,rz:18,y:16,period:32,phase:1,r:2.7},
  {id:'drone-mint',name:'Yeşil drone',kind:'drone',color:0x6cf2c1,cx:0,cz:-29,rx:12,rz:7,y:8,period:20,phase:3,r:1.8},
 ].map(t=>({...t,done:false}))};
}
export function arcadePose(target,time){
 const a=time*Math.PI*2/target.period+target.phase;
 return {x:target.cx+target.rx*Math.sin(a),y:target.y,z:target.cz+target.rz*Math.cos(a),yaw:Math.atan2(target.rx*Math.cos(a),-target.rz*Math.sin(a))};
}
function contactFraction(a,b,r){
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
 const c=a.x*a.x+a.y*a.y+a.z*a.z-r*r;
 if(c<=0)return 0;
 const n=dx*dx+dy*dy+dz*dz;
 if(n<1e-12)return Infinity;
 const dot=a.x*dx+a.y*dy+a.z*dz,disc=dot*dot-n*c;
 if(disc<0)return Infinity;
 const t=(-dot-Math.sqrt(disc))/n;
 return t>=0&&t<=1?t:Infinity;
}
export function renewArcadeDrone(a){
 a.wait=0;a.needsSpawn=false;a.previous=null;a.drones++;
}
export function tickArcade(a,s,dt){
 a.t+=Math.max(0,dt);
 if(a.wait>0){a.wait=Math.max(0,a.wait-dt);if(!a.wait)a.needsSpawn=true;return;}
 if(a.needsSpawn)return;
 if(!s)return;
 if(s.crashed){a.wait=1.4;a.previous=null;return;}
 if(!s.armed){a.previous=null;return;}
 let first=null,firstFraction=Infinity;
 for(const target of a.targets){
  if(target.done)continue;
  const p=arcadePose(target,a.t),prev=a.previous;
  const q=arcadePose(target,prev?.t??a.t);
  const start=prev?{x:prev.x-q.x,y:prev.y-q.y,z:prev.z-q.z}:{x:s.x-p.x,y:s.y-p.y,z:s.z-p.z};
  const fraction=contactFraction(start,{x:s.x-p.x,y:s.y-p.y,z:s.z-p.z},target.r);
  if(fraction<firstFraction){firstFraction=fraction;first={target,p};}
 }
 if(first){
  first.target.done=true;a.burst={...first.p,color:first.target.color,t:a.t};
  a.previous=null;
  if(a.targets.some(t=>!t.done))a.wait=1.4;
  return;
 }
 a.previous={x:s.x,y:s.y,z:s.z,t:a.t};
}
