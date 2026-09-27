import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildWorld, clearWorld, MAPS } from '../src/world.js';
import fs from 'node:fs';

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
    const play = buildWorld(scene,map.id,{lite,night});
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
  for (const map of MAPS) {
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

test('the gun pod is aimed where the rounds go, at every hangar tilt', async () => {
  const { CATALOG } = await import('../src/catalog.js');
  const { makeDrone, setCamPodTilt, CAM_POD } = await import('../src/models.js');
  const { aimDir } = await import('../src/combat.js');
  for (const spec of CATALOG) {
    for (const deg of [15,30,45]) {
      const tilt = deg*Math.PI/180;
      const craft = makeDrone(spec,tilt);
      craft.updateMatrixWorld(true);
      const pod = craft.getObjectByName(CAM_POD);
      assert.ok(pod,spec.id);
      const f = new THREE.Vector3(0,0,-1).applyQuaternion(pod.getWorldQuaternion(new THREE.Quaternion()));
      const [ax,ay,az] = aimDir(1,0,0,0,tilt);
      assert.ok(ay > 0, `uptilt ${deg}`); // camera looks up from the frame plane
      assert.ok(Math.hypot(f.x-ax,f.y-ay,f.z-az) < 1e-6, `${spec.id} ${deg}: ${f.y} vs ${ay}`);
    }
  }
  // Changing the hangar tilt re-aims a craft that is already built.
  const craft = makeDrone(CATALOG[0],0);
  setCamPodTilt(craft,0.5);
  assert.equal(craft.getObjectByName(CAM_POD).rotation.x,0.5);
});

test('surface vehicle is a finite steerable Three.js model with a camera target', async () => {
  const { makeSurfaceVehicle } = await import('../src/models.js');
  const boat = makeSurfaceVehicle({ id: 'ida-1', color: 0x284f68, accent: 0xffb020 });
  assert.equal(boat.isGroup, true);
  assert.equal(boat.userData.vehicleType, 'surface');
  assert.ok(boat.userData.rudder?.isObject3D);
  assert.ok(boat.userData.cameraTarget?.isObject3D);
  boat.traverse((o) => {
    const positions = o.geometry?.attributes.position?.array;
    if (positions) assert.ok(positions.every(Number.isFinite));
  });
});

test('home page exposes one operations console entry and every console region', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal((html.match(/id=["']home-operations["']/g) || []).length, 1);
  assert.match(html, />Operasyon Masası</);
  for (const id of ['operations-console', 'operations-fleet', 'operations-main-view', 'operations-map', 'operations-status', 'operations-scenarios', 'operations-emergency']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('surface vehicle exposes deck and follow camera anchors', async () => {
  const { makeSurfaceVehicle } = await import('../src/models.js');
  const boat = makeSurfaceVehicle({ id: 'ida-1' });
  assert.ok(boat.getObjectByName('surface-deck-camera'));
  assert.ok(boat.getObjectByName('surface-follow-camera'));
});
