import * as THREE from 'three';
export function pavingGeometry(positions){const g=new THREE.BufferGeometry(),uv=[],colors=[];for(let i=0;i<positions.length;i+=3){const x=positions[i],z=positions[i+2],shade=.94+.035*Math.sin(x*.073+z*.041);uv.push(x,z);colors.push(shade,shade,shade);}g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;}
export function streetPavingMaterial(){
 function texture(channel){const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');c.fillStyle=channel==='color'?'#787b72':channel==='height'?'#555':'#ddd';c.fillRect(0,0,512,512);
  for(let row=0;row<8;row++)for(let col=-1;col<5;col++){const x=col*128+(row%2)*64,y=row*64,n=((row*17+col*31+91)%7+7)%7;c.fillStyle=channel==='color'?['#b0ada1','#a4a79e','#bab7ac','#a9aaa0','#b2b1a5','#a3a79f','#b6b2a6'][n]:channel==='height'?'#aaa':'#eee';c.fillRect(x+2,y+2,124,60);if(channel==='color'){c.fillStyle='rgba(53,55,46,.04)';for(let i=0;i<24;i++)c.fillRect(x+4+(i*29+n*7)%120,y+4+(i*13+n*11)%54,2,2);}if(channel==='height'){c.fillStyle='#888';c.fillRect(x+2,y+59,124,3);}}
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=channel==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;t.userData.visualTemplate=true;return t;
 }
 return new THREE.MeshStandardMaterial({map:texture('color'),bumpMap:texture('height'),bumpScale:.006,roughnessMap:texture('roughness'),roughness:1,vertexColors:true});
}
