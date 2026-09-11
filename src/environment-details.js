import * as THREE from 'three';

function texture(draw, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function batch(scene, name, entries, map, opacity, lit = false, roughness = 1) {
  if (!entries.length) { map.dispose(); return; }
  const material = lit
    ? new THREE.MeshStandardMaterial({ map, transparent: true, opacity, depthWrite: false, roughness, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1 })
    : new THREE.MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false, toneMapped: false });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, entries.length);
  mesh.name = name;
  const transform = new THREE.Object3D();
  entries.forEach((entry, index) => {
    transform.position.set(entry.x, entry.y, entry.z);
    transform.rotation.set(-Math.PI / 2, 0, entry.yaw);
    transform.scale.set(entry.w, entry.d, 1);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  });
  mesh.computeBoundingSphere();
  scene.add(mesh);
}

/** Decorative layers are separate from collision geometry and share one draw per layer. */
export function addEnvironmentDetails(scene, play, mapId) {
  const footprints = [];
  const containers = [];
  scene.traverse(object => {
    const footprint = object.userData.groundFootprint;
    if (footprint) footprints.push({ ...footprint, x: object.position.x, z: object.position.z, y: .028 });
    if (object.userData.shippingContainer) containers.push(object);
  });
  const contact = texture((g, size) => {
    // Rectangular ambient contact, strongest beneath an object, transparent outside it.
    for (let i = 20; i >= 0; i--) {
      const inset = 6 + (20-i)*1.5;
      g.fillStyle = 'rgba(0,0,0,.018)';
      g.fillRect(inset,inset,size-inset*2,size-inset*2);
    }
  });
  batch(scene, 'ground-contact', footprints.map(p => ({...p,w:p.w+.8,d:p.d+.8})), contact, .65);

  let seed = 941 + mapId.length;
  const random = () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
  const dirt = texture((g,size) => {
    for(let i=0;i<55;i++) {
      const x=50+random()*(size-100), y=50+random()*(size-100), radius=12+random()*40;
      const gradient=g.createRadialGradient(x,y,0,x,y,radius);
      gradient.addColorStop(0,'rgba(34,29,21,.07)');gradient.addColorStop(1,'rgba(34,29,21,0)');
      g.fillStyle=gradient;g.fillRect(x-radius,y-radius,radius*2,radius*2);
    }
  });
  const patches=[];
  for(let i=0;i<(scene.userData.lite ? 12 : 28);i++) {
    const x=play.bounds.minx+5+random()*(play.bounds.maxx-play.bounds.minx-10);
    const z=play.bounds.minz+5+random()*(play.bounds.maxz-play.bounds.minz-10);
    if (Math.hypot(x,z)<8) continue;
    if (mapId==='forest' && Math.hypot(x-play.bounds.minx*.35,z-((play.bounds.minz+play.bounds.maxz)/2-10))<15) continue;
    patches.push({x,z,y:.025,w:3+random()*6,d:2+random()*5,yaw:random()*Math.PI});
  }
  batch(scene,'ground-weathering',patches,dirt,.45);

  if (mapId !== 'coast' && mapId !== 'forest') {
    const damp = texture((g,size) => {
      for(let i=0;i<34;i++) {
        const x=35+random()*(size-70),y=35+random()*(size-70);
        const rx=18+random()*52,ry=10+random()*28;
        const gradient=g.createRadialGradient(x,y,2,x,y,Math.max(rx,ry));
        gradient.addColorStop(0,'rgba(20,24,23,.42)');gradient.addColorStop(.7,'rgba(32,35,31,.16)');gradient.addColorStop(1,'rgba(28,30,27,0)');
        g.save();g.translate(x,y);g.scale(1,ry/rx);g.fillStyle=gradient;g.beginPath();g.arc(0,0,rx,0,Math.PI*2);g.fill();g.restore();
      }
    });
    const dampPatches=[];
    const count=scene.userData.lite?3:7;
    for(let i=0;i<count;i++) dampPatches.push({
      x:play.bounds.minx+10+random()*(play.bounds.maxx-play.bounds.minx-20),
      z:play.bounds.minz+10+random()*(play.bounds.maxz-play.bounds.minz-20),
      y:.031,w:2.5+random()*5,d:1.3+random()*3.4,yaw:random()*Math.PI,
    });
    batch(scene,'ground-dampness',dampPatches,damp,.46,true,.32);

    const tracks=texture((g,size) => {
      const grad=g.createLinearGradient(0,0,size,0);
      grad.addColorStop(0,'rgba(30,29,26,0)');grad.addColorStop(.16,'rgba(30,29,26,.34)');
      grad.addColorStop(.22,'rgba(30,29,26,.08)');grad.addColorStop(.78,'rgba(30,29,26,.08)');
      grad.addColorStop(.84,'rgba(30,29,26,.34)');grad.addColorStop(1,'rgba(30,29,26,0)');
      g.fillStyle=grad;g.fillRect(0,0,size,size);
      g.globalCompositeOperation='destination-in';
      const fade=g.createLinearGradient(0,0,0,size);fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(.18,'#000');fade.addColorStop(.82,'#000');fade.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=fade;g.fillRect(0,0,size,size);
    });
    const trackEntries=[];
    const trackCount=scene.userData.lite?2:5;
    for(let i=0;i<trackCount;i++) trackEntries.push({x:(random()-.5)*14,z:-12+i*13,y:.034,w:2.2,d:12+random()*12,yaw:(random()-.5)*.16});
    batch(scene,'vehicle-tracks',trackEntries,tracks,.38,true,.92);
  }

  // A small amount of real geometry gives the ground scale at landing height.
  const debrisCount=scene.userData.lite?16:54;
  const debrisGeo=new THREE.IcosahedronGeometry(.07,0);
  const debrisMat=new THREE.MeshStandardMaterial({color:mapId==='forest'?0x514c35:0x6d675c,roughness:.96,metalness:0});
  const debris=new THREE.InstancedMesh(debrisGeo,debrisMat,debrisCount);
  debris.name='loose-ground-debris';
  const debrisTransform=new THREE.Object3D();
  for(let i=0;i<debrisCount;i++) {
    const scale=.35+random()*1.25;
    debrisTransform.position.set(play.bounds.minx+4+random()*(play.bounds.maxx-play.bounds.minx-8),.035+scale*.025,play.bounds.minz+4+random()*(play.bounds.maxz-play.bounds.minz-8));
    debrisTransform.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);
    debrisTransform.scale.set(scale*(.65+random()*.5),scale*.4,scale);
    debrisTransform.updateMatrix();debris.setMatrixAt(i,debrisTransform.matrix);
  }
  debris.receiveShadow=true;debris.castShadow=!scene.userData.lite;debris.computeBoundingSphere();scene.add(debris);

  if (!containers.length) return;
  const label = texture((g,size) => {
    g.fillStyle='#c7c6b5';g.fillRect(8,48,size-16,144);
    g.fillStyle='#293b3b';g.fillRect(8,48,size-16,12);
    g.font='bold 27px sans-serif';g.fillText('EFA / CARGO',20,99);
    g.font='17px monospace';g.fillText('MAX 30 480 KG',20,130);
    g.fillText('KEEP CLEAR',20,157);
    for(let x=20;x<236;x+=5) g.fillRect(x,167,2,15);
  });
  const material=new THREE.MeshStandardMaterial({map:label,transparent:true,alphaTest:.1,roughness:.9,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const labels=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.05,1.05),material,containers.length*2);
  labels.name='container-identification';
  const transform=new THREE.Object3D();const matrix=new THREE.Matrix4();let i=0;
  for(const container of containers) for(const side of [-1,1]) {
    container.updateMatrix();
    transform.position.set(-1.75,1.58,side*1.215);
    transform.rotation.set(0,side<0?Math.PI:0,0);transform.updateMatrix();
    matrix.multiplyMatrices(container.matrix,transform.matrix);labels.setMatrixAt(i++,matrix);
  }
  labels.computeBoundingSphere();scene.add(labels);
}
