import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildWorld, clearWorld, MAPS } from '../src/world.js';
import fs from 'node:fs';

const sileData=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
// Canvas pixels are tested in the browser; this shim exercises world ownership and geometry.
const context = new Proxy({
  createImageData: (w,h) => ({ data: new Uint8ClampedArray(w*h*4) }),
  getImageData: (x,y,w,h) => ({ data: new Uint8ClampedArray(w*h*4) }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
  measureText: () => ({ width: 20 }),
}, { get: (obj,key) => key in obj ? obj[key] : () => {} });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };

test('every world builds finite geometry in desktop/mobile and day/night modes', () => {
  for (const map of MAPS) for (const lite of [false,true]) for (const night of [false,true]) {
    const scene = new THREE.Scene();
    const play = buildWorld(scene,map.id,{lite,night,sileData});
    assert.ok(play.bounds.maxx > play.bounds.minx, map.id);
    scene.traverse(o => {
      const positions = o.geometry?.attributes.position?.array;
      if (positions) assert.ok(positions.every(Number.isFinite), `${map.id}: finite geometry`);
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) if (m?.map?.userData.surface) {
        assert.ok(m.bumpMap && m.roughnessMap, `${map.id}: surface data`);
        assert.notEqual(m.bumpMap, m.roughnessMap);
        assert.equal(m.roughnessMap.colorSpace, THREE.NoColorSpace);
      }
    });
    clearWorld(scene);
    assert.equal(scene.children.length,0);
  }
});

test('ground dressing adds physical scale and map-appropriate wear', () => {
  for (const map of MAPS.filter(m=>m.id!=='sile')) {
    const scene = new THREE.Scene();
    buildWorld(scene, map.id);
    const debris = scene.getObjectByName('loose-ground-debris');
    assert.ok(debris?.isInstancedMesh && debris.count >= 50, `${map.id}: loose debris`);
    assert.equal(debris.material.isMeshStandardMaterial, true, `${map.id}: debris reacts to light`);
    const shouldHaveVehicleWear = !['coast', 'forest'].includes(map.id);
    assert.equal(!!scene.getObjectByName('vehicle-tracks'), shouldHaveVehicleWear, `${map.id}: vehicle tracks`);
    assert.equal(!!scene.getObjectByName('ground-dampness'), shouldHaveVehicleWear, `${map.id}: damp patches`);
    if (shouldHaveVehicleWear) {
      assert.equal(scene.getObjectByName('ground-dampness').material.isMeshStandardMaterial, true);
      assert.ok(scene.getObjectByName('ground-dampness').material.roughness < .5, `${map.id}: dampness catches light`);
    }
    clearWorld(scene);
  }
});

test('world cleanup releases owned GPU resources without disposing later-added craft', () => {
  const scene = new THREE.Scene();buildWorld(scene,'indoor');
  const owned = [...scene.userData.worldResources];let released=0;
  for(const item of owned) if(item.addEventListener) item.addEventListener('dispose',()=>released++);
  const geometry = new THREE.BoxGeometry();const material = new THREE.MeshStandardMaterial();
  let craftDisposed=false;
  geometry.addEventListener('dispose',()=>craftDisposed=true);
  material.addEventListener('dispose',()=>craftDisposed=true);
  scene.add(new THREE.Mesh(geometry,material));
  clearWorld(scene);
  assert.ok(released>0);assert.equal(craftDisposed,false);
  clearWorld(scene); // Repeated cleanup is safe.
  geometry.dispose();material.dispose();
});

test('all ten detailed airframes retain four propellers and finite hardware geometry', async () => {
  const { CATALOG } = await import('../src/catalog.js');
  const { makeDrone } = await import('../src/models.js');
  for (const spec of CATALOG) {
    const craft = makeDrone(spec);
    assert.equal(craft.userData.props.length,4,spec.id);
    assert.equal(craft.userData.discs.length,4,spec.id);
    assert.ok(craft.getObjectByName('battery-identification'),spec.id);
    craft.traverse(o => {
      const positions=o.geometry?.attributes.position?.array;
      if(positions) assert.ok(positions.every(Number.isFinite),spec.id);
    });
  }
});

test('airframe wheelbases and propeller diameters use metres rather than collision size', async () => {
  const { CATALOG } = await import('../src/catalog.js');
  const { makeDrone, AIRFRAME_DIMENSIONS, spinProps } = await import('../src/models.js');
  for(const spec of CATALOG) {
    const root=makeDrone(spec),props=root.userData.props;
    const dimensions=AIRFRAME_DIMENSIONS[spec.id];
    assert.ok(Math.abs(props[0].position.distanceTo(props[3].position)-dimensions.wheelbase)<1e-8,spec.id);
    assert.ok(Math.abs(root.userData.discs[0].geometry.parameters.radius/.95*2-dimensions.propDiameter)<1e-8,spec.id);
    assert.ok(props[0].position.distanceTo(props[1].position)>dimensions.propDiameter,`${spec.id}: adjacent rotors clear`);
    assert.equal(props[0].userData.spin,-props[1].userData.spin);
    assert.equal(props[0].userData.spin,props[3].userData.spin);
    assert.ok(root.userData.discs.every(d=>!d.visible));
    spinProps(root,1,1/60);
    assert.ok(root.userData.discs.every(d=>d.material.opacity<=.12));
  }
});


test('camera model preserves the selected FPV tilt for every airframe', async () => {
  const { CATALOG } = await import('../src/catalog.js');
  const { makeDrone, setCamPodTilt, CAM_POD } = await import('../src/models.js');
  for (const spec of CATALOG) for (const deg of [15, 30, 45]) {
    const tilt = deg * Math.PI / 180;
    const craft = makeDrone(spec, tilt);
    craft.updateMatrixWorld(true);
    const pod = craft.getObjectByName(CAM_POD);
    assert.ok(pod, spec.id);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(pod.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(forward.distanceTo(new THREE.Vector3(0, Math.sin(tilt), -Math.cos(tilt))) < 1e-6);
    setCamPodTilt(craft, 0.5);
    assert.equal(pod.rotation.x, 0.5);
  }
});

test('workshop prop selection appears on every rotor and battery selection changes its envelope', async () => {
  const { droneById } = await import('../src/catalog.js');
  const { makeDrone } = await import('../src/models.js');
  const { applyFpvBuild, DEFAULT_BUILD } = await import('../src/fpv-build.js');
  const spec=droneById('freestyle');
  const build=props=>makeDrone(applyFpvBuild(spec,{...DEFAULT_BUILD,props}));
  for(const [id,count] of [['bi',2],['tri',3],['quad',4]]) {
    const root=build(id);
    for(const rotor of root.userData.props) {
      let blades=0;rotor.traverse(o=>{if(o.name==='pitched-propeller-blade')blades++});
      assert.equal(blades,count,id);
    }
  }
  const a=makeDrone(applyFpvBuild(spec,{...DEFAULT_BUILD,battery:'6s1100'}));
  const b=makeDrone(applyFpvBuild(spec,{...DEFAULT_BUILD,battery:'6s1300'}));
  const batterySize=root=>new THREE.Box3().setFromObject(root.getObjectByName('build-battery')).getSize(new THREE.Vector3());
  assert.ok(batterySize(b).z>batterySize(a).z);
});

test('reference preview wheelbase follows the geometry used by the rotor mixer',async()=>{
 const {droneById}=await import('../src/catalog.js');const {applyReference}=await import('../src/propulsion-reference.js');
 const {makeDrone}=await import('../src/models.js');
 const craft=makeDrone(applyReference(droneById('freestyle'),{profile:'f60-1750-6s',dynamics:{wheelbaseMm:260}}));
 assert.ok(Math.abs(craft.userData.props[0].position.distanceTo(craft.userData.props[3].position)-.26)<1e-8);
});

test('pilot SOURCE ONE model renders CAD parts and a single selected visible flight pack',async()=>{
 const {makeDrone}=await import('../src/models.js');const {droneById}=await import('../src/catalog.js');const {applyReference}=await import('../src/propulsion-reference.js');
 const spec=applyReference(droneById('freestyle'),{airframe:'source-one-v4',profile:'f60-1750-6s',capacityMah:1100,dynamics:{wheelbaseMm:226}}),before=JSON.stringify(spec),root=makeDrone(spec);
 assert.ok(root.getObjectByName('source-one-cad-frame'));assert.equal(root.getObjectByName('build-battery').visible,true);
 assert.equal(root.userData.activeBattery,root.getObjectByName('build-battery'));assert.equal(root.userData.visual.pack.cells,6);assert.equal(root.userData.visual.pack.capacityMah,1100);
 assert.equal(root.userData.motors.length,4);assert.equal(JSON.stringify(spec),before);
 root.userData.motors.forEach((motor,i)=>{assert.equal(motor.position.x,root.userData.props[i].position.x);assert.equal(motor.position.z,root.userData.props[i].position.z);motor.updateMatrixWorld(true);const size=new THREE.Box3().setFromObject(motor).getSize(new THREE.Vector3());assert.ok(Math.abs(size.x-.0271)<.0001);});
});

test('owned drone disposal frees label textures once and retains shared carbon maps',async()=>{
 const {makeDrone,disposeDrone,makeNametag}=await import('../src/models.js');const {droneById}=await import('../src/catalog.js');
 const a=makeDrone(droneById('freestyle')),b=makeDrone(droneById('racer'));a.add(makeNametag('test'));
 const label=a.getObjectByName('battery-identification').material.map;let owned=0,shared=0;label.addEventListener('dispose',()=>owned++);
 const maps=new Set();a.traverse(o=>{if(o.material?.map&&o.material.map!==label&&!o.isSprite)maps.add(o.material.map)});maps.forEach(map=>map.addEventListener('dispose',()=>shared++));
 disposeDrone(a);assert.equal(owned,1);assert.equal(shared,0);disposeDrone(a);assert.equal(owned,1);assert.equal(b.userData.disposed,undefined);disposeDrone(b);
});

test('disarmed visual rotors stop and reference motor commands drive independent blur',async()=>{
 const {makeDrone,spinProps}=await import('../src/models.js');const {droneById}=await import('../src/catalog.js');const root=makeDrone(droneById('freestyle'));
 const angles=root.userData.props.map(p=>p.rotation.y);spinProps(root,0,.1);assert.deepEqual(root.userData.props.map(p=>p.rotation.y),angles);
 spinProps(root,.5,.1,[0,.3,.7,1]);assert.equal(root.userData.props[0].rotation.y,angles[0]);assert.ok(root.userData.discs[1].material.opacity<root.userData.discs[2].material.opacity);assert.ok(!root.userData.discs[0].visible);
});

test('guarded and camera airframes keep rotor planes clear of their equipment shell',async()=>{
 const {makeDrone}=await import('../src/models.js');const {CATALOG}=await import('../src/catalog.js');
 for(const spec of CATALOG.filter(d=>d.ducts||d.gimbal)){
  const root=makeDrone(spec),shell=root.getObjectByName('formed-equipment-shell'),top=new THREE.Box3().setFromObject(shell).max.y;
  assert.ok(root.userData.props.every(p=>p.position.y>=top+.003-1e-6),`${spec.id}: clear shell`);
  if(spec.ducts){assert.equal(root.userData.guards.length,4);root.userData.guards.forEach((guard,i)=>{const b=new THREE.Box3().setFromObject(guard);assert.ok(b.max.y-b.min.y<=(spec.id==='cinewhoop'?.018:.01),`${spec.id}: shallow prop guard`);assert.ok(b.min.y<root.userData.props[i].position.y&&b.max.y>root.userData.props[i].position.y);});}
 }
});

test('SOURCE ONE laminate edges remain distinct from carbon faces without losing CAD cutouts',async()=>{
 const {makeDrone,disposeDrone}=await import('../src/models.js');const {droneById}=await import('../src/catalog.js');const {applyReference}=await import('../src/propulsion-reference.js');
 const root=makeDrone(applyReference(droneById('freestyle'),{airframe:'source-one-v4',profile:'f60-1750-6s',dynamics:{wheelbaseMm:226}}));
 const bottom=root.getObjectByName('source-one-bottom');assert.ok(Array.isArray(bottom.material));assert.equal(bottom.material.length,2);assert.notEqual(bottom.material[0],bottom.material[1]);assert.equal(bottom.material[1].metalness,0);
 assert.ok(bottom.geometry.groups.some(g=>g.materialIndex===0));assert.ok(bottom.geometry.groups.some(g=>g.materialIndex===1));assert.equal(bottom.userData.holes,52);disposeDrone(root);
});

test('owned electronics fit each body and a ghost uses only its existing craft-owned materials',async()=>{
 const {makeDrone,disposeDrone,setDroneOpacity}=await import('../src/models.js');const {CATALOG}=await import('../src/catalog.js');
 for(const spec of CATALOG){const root=makeDrone(spec),electronics=root.getObjectByName('flight-electronics');assert.ok(electronics,spec.id);assert.equal(electronics.userData.boardCount,['micro','whoop'].includes(spec.id)?1:2);assert.equal(electronics.userData.mountCount,4);assert.ok(electronics.userData.boardSpan<=root.userData.visual.plateW+.0001,spec.id);assert.ok(electronics.userData.boardSpan<=root.userData.visual.plateL+.0001,spec.id);
 const before=new Set();root.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])before.add(m);});const other=makeDrone(spec);
 setDroneOpacity(root,.32);const after=new Set();root.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])after.add(m);});assert.deepEqual(after,before);assert.ok([...after].every(m=>m.opacity===.32&&!m.depthWrite));assert.equal(other.getObjectByName('build-battery').material.opacity,1);
 let freed=0;for(const m of before)m.addEventListener('dispose',()=>freed++);disposeDrone(root);assert.equal(freed,before.size);disposeDrone(root);assert.equal(freed,before.size);disposeDrone(other);}
});

test('final chase camera retains the whole craft beyond its near plane at steep pitch',async()=>{
 const {chaseFraming,chaseOffset}=await import('../src/airframe-view.js');const {makeDrone,disposeDrone}=await import('../src/models.js');const {CATALOG}=await import('../src/catalog.js');
 for(const spec of CATALOG)for(const aspect of [9/16,16/9])for(const degrees of [75,90,110]){
  const root=makeDrone(spec);root.rotation.x=degrees*Math.PI/180;root.updateMatrixWorld(true);
  const camera=new THREE.PerspectiveCamera(82,aspect,.1,50),forward=new THREE.Vector3(0,0,-1).applyQuaternion(root.quaternion),offset=chaseOffset(chaseFraming(spec,aspect),forward.toArray(),{x:0,z:-1});camera.position.set(offset.x,offset.y,offset.z);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  const point=new THREE.Vector3();root.traverse(o=>{const p=o.geometry?.attributes.position;if(p)for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse);assert.ok(-point.z>camera.near,`${spec.id}/${aspect}/${degrees}: geometry crosses near plane`);}});disposeDrone(root);
 }
});

test('video transmitter and flight-controller boards do not intersect in any aircraft',async()=>{
 const {makeDrone,disposeDrone}=await import('../src/models.js');const {CATALOG}=await import('../src/catalog.js');
 for(const spec of CATALOG.filter(s=>!['micro','whoop'].includes(s.id))){const root=makeDrone(spec),fc=root.getObjectByName('flight-controller-board'),vtx=root.getObjectByName('video-transmitter-board');assert.ok(fc&&vtx,spec.id);assert.equal(new THREE.Box3().setFromObject(fc).intersectsBox(new THREE.Box3().setFromObject(vtx)),false,spec.id);disposeDrone(root);}
});
