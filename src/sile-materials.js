import * as THREE from 'three';

// Authored visual templates, not photographs or surveyed Şile facades.
function texture(draw, color=false, size=256){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;draw(canvas.getContext('2d'),size);
 const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;
 map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;map.userData.visualTemplate=true;return map;
}
function grain(ctx,n,seed){
 let r=seed;for(let i=0;i<1800;i++){r=(Math.imul(r,1664525)+1013904223)>>>0;const x=(r>>>8)%n;r=(Math.imul(r,1664525)+1013904223)>>>0;ctx.fillStyle=i%2?'rgba(255,255,255,.035)':'rgba(0,0,0,.035)';ctx.fillRect(x,r%n,2,2);}
}
export function facadeUvs(positions,base,height){
 const uv=[],floors=Math.max(1,Math.round(height/3));
 // ExtrudeGeometry emits one six-vertex quad per outline edge (steps=1).
 for(let start=0;start<positions.length;start+=18){
  let ax=positions[start],az=positions[start+2],bx=ax,bz=az,max=0;
  for(let i=start;i<start+18;i+=3)for(let j=i+3;j<start+18;j+=3){const dx=positions[j]-positions[i],dz=positions[j+2]-positions[i+2],d=dx*dx+dz*dz;if(d>max){max=d;ax=positions[i];az=positions[i+2];bx=positions[j];bz=positions[j+2];}}
  if(ax>bx||(ax===bx&&az>bz)){[ax,bx]=[bx,ax];[az,bz]=[bz,az];}
  const len=Math.sqrt(max),bays=Math.max(1,Math.round(len/3));
  for(let i=start;i<start+18;i+=3)uv.push(max?((positions[i]-ax)*(bx-ax)+(positions[i+2]-az)*(bz-az))/max*bays:0,(positions[i+1]-base)/height*floors);
 }
 return uv;
}
export function buildingMaterials(){
 const roof=texture((c,n)=>{c.fillStyle='#c5aa92';c.fillRect(0,0,n,n);for(let y=0;y<n;y+=32)for(let x=0;x<n;x+=32){c.fillStyle='#aa8d78';c.fillRect(x,y,3,32);c.fillStyle='#e4c5a7';c.fillRect(x+4,y,4,30);c.fillStyle='#806e61';c.fillRect(x,y+29,32,3);}grain(c,n,29);},true);
 const roofBump=texture((c,n)=>{c.fillStyle='#888';c.fillRect(0,0,n,n);for(let x=0;x<n;x+=32){c.fillStyle='#bbb';c.fillRect(x+6,0,10,n);c.fillStyle='#555';c.fillRect(x,0,3,n);}for(let y=0;y<n;y+=32){c.fillStyle='#555';c.fillRect(0,y,n,2);}});
 const materials=[new THREE.MeshStandardMaterial({map:roof,bumpMap:roofBump,bumpScale:.035,roughness:.9,vertexColors:true})];
 for(const [index,paint] of ['#d1c7b4','#ddd8cb','#bfc2bd','#d9c4aa','#c4cfc7'].entries()){
  const map=texture((c,n)=>{c.fillStyle=paint;c.fillRect(0,0,n,n);grain(c,n,index+91);c.fillStyle='rgba(46,40,32,.12)';c.fillRect(0,247,n,9);c.fillStyle='#9a9283';c.fillRect(64,66,128,145);c.fillStyle='#eee6d4';c.fillRect(68,60,120,144);c.fillStyle=index%2?'#405c64':'#394c52';c.fillRect(77,69,102,123);c.fillStyle='rgba(153,190,193,.25)';c.beginPath();c.moveTo(78,70);c.lineTo(178,70);c.lineTo(78,162);c.fill();c.fillStyle='#d1cdbd';c.fillRect(124,69,5,123);c.fillRect(77,128,102,4);c.fillStyle='#ece6d7';c.fillRect(63,201,130,9);},true);
  const bump=texture(c=>{c.fillStyle='#888';c.fillRect(0,0,256,256);c.fillStyle='#aaa';c.fillRect(68,60,120,144);c.fillStyle='#666';c.fillRect(77,69,102,123);c.fillStyle='#bbb';c.fillRect(63,201,130,9);});
  const rough=texture(c=>{c.fillStyle='#f0f0f0';c.fillRect(0,0,256,256);c.fillStyle='#555';c.fillRect(77,69,102,123);});
  materials.push(new THREE.MeshStandardMaterial({map,bumpMap:bump,bumpScale:.022,roughnessMap:rough,roughness:1}));
 }
 materials.push(rockMaterial());materials.push(new THREE.MeshStandardMaterial({color:0xf0ead5,roughness:.9}));return materials;
}
export function rockMaterial(){
 function stone(c,n,gray){
  c.fillStyle=gray?'#999':'#b6af9e';c.fillRect(0,0,n,n);let seed=77;
  for(let i=0;i<260;i++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=(seed>>>8)%n;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=(seed>>>12)%n,r=7+(seed>>>16)%24;
   c.fillStyle=gray?(i%2?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)'):(i%2?'rgba(194,183,155,.09)':'rgba(70,70,59,.06)');c.beginPath();c.moveTo(x-r,y);c.lineTo(x-r*.3,y-r*.6);c.lineTo(x+r,y-r*.2);c.lineTo(x+r*.6,y+r*.5);c.lineTo(x-r*.4,y+r*.7);c.closePath();c.fill();
   if(i%5===0){c.strokeStyle=gray?'rgba(0,0,0,.07)':'rgba(62,61,51,.10)';c.beginPath();c.moveTo(x-r,y);c.lineTo(x-r*.3,y+r*.12);c.lineTo(x+r*.4,y-r*.15);c.stroke();}
  }
  // Short branching fracture veins: aligned in color/height, no regular courses.
  for(let i=0;i<34;i++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=(seed>>>8)%n,y=(seed>>>18)%n,angle=seed*.001,span=18+(seed>>>12)%72;
   c.lineWidth=gray?2:1;c.strokeStyle=gray?'rgba(0,0,0,.22)':'rgba(81,79,67,.30)';c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(angle)*span*.45,y+Math.sin(angle)*span*.3);c.lineTo(x+Math.cos(angle+.3)*span,y+Math.sin(angle+.3)*span);c.stroke();
  }grain(c,n,55);
 }
 return new THREE.MeshStandardMaterial({map:texture((c,n)=>stone(c,n,false),true,512),bumpMap:texture((c,n)=>stone(c,n,true),false,512),bumpScale:.08,roughness:1,side:THREE.DoubleSide});
}
export {waterMaterial,foamMaterial,tickSileWater} from './sile-water.js';

export function launchMaterial(){
 const map=texture((c,n)=>{c.clearRect(0,0,n,n);c.strokeStyle='#e5e3cb';c.lineWidth=9;c.beginPath();c.arc(n/2,n/2,n*.43,0,Math.PI*2);c.stroke();c.fillStyle='#e5e3cb';c.fillRect(85,81,12,94);c.fillRect(159,81,12,94);c.fillRect(85,121,86,12);},true);
 map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;
 return new THREE.MeshStandardMaterial({map,transparent:true,depthWrite:false,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
}

export function castleMaterial(){
 // 4m UV repeat, irregular coursed stone. Shared deterministic layout keeps
 // albedo and relief aligned; these are authored blocks, not a facade scan.
 function masonry(c,n,gray){
  c.fillStyle=gray?'#777':'#9c9077';c.fillRect(0,0,n,n);let seed=643467902;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let row=0;row<16;row++){
   const y=row*n/16,h=n/16;let x=-n/4+random()*n/9;
   while(x<n){const w=n*(.055+random()*.095),shade=random(),warm=random(),chip=random()*2;
    const light=gray?140+shade*34:49+shade*12;c.fillStyle=gray?`rgb(${light},${light},${light})`:`hsl(${32+warm*7},${15+warm*12}%,${light}%)`;
    c.beginPath();c.moveTo(x+1+chip,y+1);c.lineTo(x+w-1,y+1+chip);c.lineTo(x+w-1,y+h-1);c.lineTo(x+1,y+h-1-chip);c.closePath();c.fill();
    c.fillStyle=gray?'rgba(255,255,255,.12)':'rgba(225,214,185,.12)';c.fillRect(x+3,y+2,w-6,1);x+=w;
   }
  }grain(c,n,37);
 }
 return new THREE.MeshStandardMaterial({map:texture((c,n)=>masonry(c,n,false),true,512),bumpMap:texture((c,n)=>masonry(c,n,true),false,512),bumpScale:.035,roughness:.96});
}
