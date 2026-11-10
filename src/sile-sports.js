import * as THREE from 'three';
import source from './data/sile-context.json' with {type:'json'};
import {insidePolygon} from './geo-terrain.js';
import {parkingSurfaces} from './sile-parking.js';
// The footprint is sourced. The inscribed game template is representative;
// conflicting published dimensions never stretch or move the mapped polygon.
export function sportsFrame(r){
 if(r?.length!==4||!r.every(p=>p.length===2&&p.every(Number.isFinite)))return null;
 let a,b,len=0;for(let i=0;i<4;i++){const p=r[i],q=r[(i+1)%4],d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d>len){len=d;a=p;b=q;}}if(len<1)return null;
 const u=[(b[0]-a[0])/len,(b[1]-a[1])/len],v=[-u[1],u[0]],q=r.map(p=>[(p[0]-a[0])*u[0]+(p[1]-a[1])*u[1],(p[0]-a[0])*v[0]+(p[1]-a[1])*v[1]]),lo=[0,1].map(k=>Math.min(...q.map(p=>p[k]))),hi=[0,1].map(k=>Math.max(...q.map(p=>p[k]))),c=lo.map((x,k)=>(x+hi[k])/2);
 for(let scale=.94;scale>=.5;scale-=.04){const length=(hi[0]-lo[0])*scale,width=(hi[1]-lo[1])*scale;if(width<1)return null;const origin=[a[0]+u[0]*(c[0]-length/2)+v[0]*(c[1]-width/2),a[1]+u[1]*(c[0]-length/2)+v[1]*(c[1]-width/2)],point=(x,z)=>[origin[0]+u[0]*x*length+v[0]*z*width,origin[1]+u[1]*x*length+v[1]*z*width];if([[0,0],[1,0],[1,1],[0,1]].every(p=>insidePolygon(...point(...p),[r])))return {origin,u,v,length,width,point};}
 return null;
}
export function sportTextureData(sport,length,width){
 const w=512,h=256,pixels=new Uint8Array(w*h*4),known=['soccer','basketball','tennis'].includes(sport),lineWidth=Math.max(.14,length/w*1.2);
 const base=sport==='basketball'?[130,83,63]:sport==='tennis'?[57,96,105]:[58,105,66];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const u=(x+.5)/w,v=(y+.5)/h,dx=u*length,dz=v*width,edge=.025*width,near=(a,b)=>Math.abs(a-b)<lineWidth/2,range=(x,a,b)=>x>=a&&x<=b;
  const rectangle=(x0,x1,z0,z1)=>(range(dx,x0,x1)&&(near(dz,z0)||near(dz,z1)))||(range(dz,z0,z1)&&(near(dx,x0)||near(dx,x1)));
  let white=known&&(rectangle(edge,length-edge,edge,width-edge)||(near(dx,length/2)&&range(dz,edge,width-edge)));
  if(sport==='soccer'){white ||=Math.abs(Math.hypot(dx-length/2,dz-width/2)-width*.135)<lineWidth/2;for(const flip of [false,true]){const xx=flip?length-dx:dx;white ||=rectangle(flip?length-edge-length*.15:edge,flip?length-edge:edge+length*.15,width*.2,width*.8);if(Math.hypot(xx-length*.11,dz-width/2)<lineWidth)white=true;}}
  if(sport==='basketball'){white ||=Math.abs(Math.hypot(dx-length/2,dz-width/2)-width*.115)<lineWidth/2;for(const xx of [dx,length-dx])white ||=Math.abs(Math.hypot(xx-length*.055,dz-width/2)-width*.39)<lineWidth/2||((near(xx,length*.2)&&range(dz,width*.34,width*.66))||(range(xx,edge,length*.2)&&(near(dz,width*.34)||near(dz,width*.66))));}
  if(sport==='tennis')white ||=rectangle(edge,length-edge,width*.12,width*.88)||rectangle(length*.24,length*.76,width*.12,width*.88)||(near(dz,width/2)&&range(dx,length*.24,length*.76));
  const shade=sport==='soccer'?(Math.floor(u*12)%2?1:.91):1,i=(y*w+x)*4;for(let k=0;k<3;k++)pixels[i+k]=white?231:Math.round(base[k]*shade);pixels[i+3]=255;
 }
 return {width:w,height:h,pixels};
}
export function mappedSportsSurfaces(data,positions){
 if(data.completionLayer!==1||!Object.entries(source.projection).every(([k,v])=>data.projection?.[k]===v))return {ground:positions,sports:[]};
 let ground=positions;const sports=[],occupied=[...data.buildings,...data.structures,...(data.supplementalBuildings||[])].map(b=>b.rings);
 for(const feature of source.sports){const frame=sportsFrame(feature.rings[0]);if(!frame)continue;const split=parkingSurfaces(ground,[feature.rings]),safe=parkingSurfaces(split.paved,occupied);ground=[...split.ground,...safe.paved];if(safe.ground.length)sports.push({feature,frame,positions:safe.ground});}
 return {ground,sports};
}
export function addSportsGrounds(scene,parts){
 if(!parts.length)return;const positions=[],uv=[],materials=[],g=new THREE.BufferGeometry();let start=0;
 for(const {feature,frame,positions:p}of parts){positions.push(...p);for(let i=0;i<p.length;i+=3){const x=p[i]-frame.origin[0],z=p[i+2]-frame.origin[1];uv.push((x*frame.u[0]+z*frame.u[1])/frame.length,(x*frame.v[0]+z*frame.v[1])/frame.width);}const t=sportTextureData(feature.sport,frame.length,frame.width),map=new THREE.DataTexture(t.pixels,t.width,t.height);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.generateMipmaps=true;map.anisotropy=8;map.needsUpdate=true;materials.push(new THREE.MeshStandardMaterial({map,roughness:.96}));g.addGroup(start,p.length/3,materials.length-1);start+=p.length/3;}
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();const mesh=new THREE.Mesh(g,materials);mesh.name='sile-sports-grounds';mesh.receiveShadow=true;scene.add(mesh);scene.userData.sileSportsStats={fields:parts.length,sourceIds:parts.map(p=>p.feature.id),measuredLines:false,grading:false,materialAndLinesAssumed:true};
}
