import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function addAirframeDetails(root, spec, { size:s, plateW, plateL, spread, battW, battL,packH,packY,packZ,motorMounts,cells,capacityMah }) {
  const topPack = !spec.ducts && !spec.gimbal;
  const groups = new Map();
  const steel = new THREE.MeshStandardMaterial({color:0x878b89,metalness:.85,roughness:.34});
  const rubber = new THREE.MeshStandardMaterial({color:0x171a18,metalness:0,roughness:.85});
  const red = new THREE.MeshStandardMaterial({color:0x77322a,roughness:.76});
  function add(geo,mat,x,y,z,rz=0) {
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,rz)),new THREE.Vector3(1,1,1));
    geo.applyMatrix4(matrix);
    if(!groups.has(mat))groups.set(mat,[]);groups.get(mat).push(geo);
  }
  for(const x of [-1,1])for(const z of [-1,1]) {
    const px=x*spread,pz=z*spread;
    for(let i=0;i<3;i++) {
      const offset=(i-1)*s*.012;
      const curve=new THREE.CatmullRomCurve3([
        new THREE.Vector3(x*plateW*.3,s*.012,z*plateL*.2+offset),
        new THREE.Vector3(px*.55,s*.032,pz*.55+offset),
        new THREE.Vector3(px,(motorMounts?.find(m=>Math.abs(m.position.x-px)<1e-7&&Math.abs(m.position.z-pz)<1e-7)?.position.y||0)+.002,pz+offset),
      ]);
      add(new THREE.TubeGeometry(curve,8,s*.004,5,false),rubber,0,0,0);
    }
  }
  // Flexible power leads curve around the battery, rather than a floating connector.
  for(const [offset,mat] of [[-.018,rubber],[.018,red]]) {
    const curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(offset*s,packY,packZ+battL*.5),
      new THREE.Vector3(battW*.6,packY-packH*.25,packZ+battL*.5+.015),
      new THREE.Vector3(battW*.6+offset*s,packY-packH*.25,packZ+battL*.5+.008),
    ]);
    add(new THREE.TubeGeometry(curve,12,s*.007,6,false),mat,0,0,0);
  }
  for(let i=1;i<cells;i++)for(const side of [-1,1])add(new THREE.BoxGeometry(.00025,.00025,battL*.94),steel,side*(battW/2+.0001),packY-packH/2+i*packH/cells,packZ);
  for(const [mat,geos] of groups) {
    const mesh=new THREE.Mesh(mergeGeometries(geos),mat);mesh.castShadow=mesh.receiveShadow=true;
    mesh.name='airframe-hardware';root.add(mesh);geos.forEach(g=>g.dispose());
  }
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;
  const g=canvas.getContext('2d');
  g.translate(0,512);g.rotate(-Math.PI/2);
  g.fillStyle='#c7c8bd';g.fillRect(0,0,512,256);
  g.fillStyle='#262e2b';g.fillRect(0,0,512,50);g.fillStyle='#e4e2d7';g.font='bold 30px sans-serif';g.fillText('EFA / FLIGHT PACK',18,36);
  g.fillStyle='#303632';g.font='bold 34px monospace';g.fillText(`${cells}S / ${Math.round(capacityMah)} mAh`,18,102);
  g.font='22px monospace';g.fillText('BALANCE CHARGE ONLY',18,144);g.fillText('DO NOT PUNCTURE',18,174);
  for(let x=20;x<485;x+=6)g.fillRect(x,201,2+(x%3),34);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(battW*.92,battL*.82),new THREE.MeshStandardMaterial({map,roughness:.82,metalness:0}));
  label.position.set(0,packY+(topPack?1:-1)*(packH/2+.00015),packZ);label.rotation.x=topPack?-Math.PI/2:Math.PI/2;label.name='battery-identification';root.add(label);root.userData.ownedTextures.push(map);
}
