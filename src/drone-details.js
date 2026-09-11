import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function addAirframeDetails(root, spec, { size:s, plateW, plateL, spread, battW, battL }) {
  const topPack = !spec.ducts && !spec.gimbal;
  const packY = topPack ? s*.12 : -s*.068;
  const groups = new Map();
  const steel = new THREE.MeshStandardMaterial({color:0x878b89,metalness:.85,roughness:.34});
  const rubber = new THREE.MeshStandardMaterial({color:0x171a18,metalness:0,roughness:.85});
  const copper = new THREE.MeshStandardMaterial({color:0xa66c38,metalness:.8,roughness:.38});
  const red = new THREE.MeshStandardMaterial({color:0x77322a,roughness:.76});
  function add(geo,mat,x,y,z,rz=0) {
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,rz)),new THREE.Vector3(1,1,1));
    geo.applyMatrix4(matrix);
    if(!groups.has(mat))groups.set(mat,[]);groups.get(mat).push(geo);
  }
  for(const x of [-1,1])for(const z of [-1,1]) {
    // Recessed fasteners and vibration isolators on the flight-controller stack.
    add(new THREE.CylinderGeometry(s*.018,s*.018,s*.007,12),steel,x*plateW*.32,s*.057,z*plateL*.28);
    add(new THREE.BoxGeometry(s*.021,s*.0015,s*.004),rubber,x*plateW*.32,s*.061,z*plateL*.28);
    add(new THREE.CylinderGeometry(s*.025,s*.025,s*.014,12),rubber,x*plateW*.24,s*.013,z*plateL*.2);
    const px=x*spread,pz=z*spread;
    // Copper stator windings visible between the base and motor bell.
    for(let i=0;i<9;i++) {
      const a=i*Math.PI*2/9;
      add(new THREE.CylinderGeometry(s*.009,s*.009,s*.022,6),copper,px+Math.cos(a)*s*.058,s*.036,pz+Math.sin(a)*s*.058);
    }
    for(let i=0;i<3;i++) {
      const offset=(i-1)*s*.012;
      const curve=new THREE.CatmullRomCurve3([
        new THREE.Vector3(x*plateW*.3,s*.012,z*plateL*.2+offset),
        new THREE.Vector3(px*.55,s*.032,pz*.55+offset),
        new THREE.Vector3(px,s*.012,pz+offset),
      ]);
      add(new THREE.TubeGeometry(curve,8,s*.004,5,false),rubber,0,0,0);
    }
  }
  // Flexible power leads curve around the battery, rather than a floating connector.
  for(const [offset,mat] of [[-.018,rubber],[.018,red]]) {
    const curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(offset*s,packY,-battL*.5),
      new THREE.Vector3(s*.12,packY,-battL*.65),
      new THREE.Vector3(s*.13,s*.02,-plateL*.15),
    ]);
    add(new THREE.TubeGeometry(curve,12,s*.007,6,false),mat,0,0,0);
  }
  for(const [mat,geos] of groups) {
    const mesh=new THREE.Mesh(mergeGeometries(geos),mat);mesh.castShadow=mesh.receiveShadow=true;
    mesh.name='airframe-hardware';root.add(mesh);geos.forEach(g=>g.dispose());
  }
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const g=canvas.getContext('2d');
  g.fillStyle='#c7c8bd';g.fillRect(0,0,512,256);
  g.fillStyle='#262e2b';g.fillRect(0,0,512,50);g.fillStyle='#e4e2d7';g.font='bold 30px sans-serif';g.fillText('EFA / FLIGHT PACK',18,36);
  g.fillStyle='#303632';g.font='bold 34px monospace';g.fillText(spec.ducts?'LiPo / MICRO':'LiPo / HIGH DISCHARGE',18,102);
  g.font='22px monospace';g.fillText('BALANCE CHARGE ONLY',18,144);g.fillText('DO NOT PUNCTURE',18,174);
  for(let x=20;x<485;x+=6)g.fillRect(x,201,2+(x%3),34);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(battW*.92,s*.068),new THREE.MeshStandardMaterial({map,roughness:.82,metalness:0}));
  label.position.set(0,packY,topPack ? -plateL*.34+s*.015-.0001 : -battL*.5-.0001);label.rotation.y=Math.PI;label.name='battery-identification';root.add(label);
}
