import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../src/visual-settings.js').catch(()=>({}));

test('clean defaults have no lens effect or artificial vibration',()=>{
  assert.equal(typeof api.normalizeVisualSettings,'function');
  const settings=api.normalizeVisualSettings(null);
  assert.equal(settings.lens,0);assert.equal(settings.vibration,false);
  assert.equal(api.lensIntensity(settings),0);
});

test('malformed preferences and unsafe camera values normalize predictably',()=>{
  const settings=api.normalizeVisualSettings({quality:'ultra-broken',fov:Infinity,tilt:-90,renderScale:9,lens:'bad',vibration:'false'});
  assert.equal(settings.quality,'medium');assert.equal(settings.fov,110);
  assert.equal(settings.tilt,0);assert.equal(settings.renderScale,1.5);
  assert.equal(settings.vibration,false);
  assert.deepEqual(api.readVisualSettings({getItem(){throw new Error('denied');}}),api.normalizeVisualSettings(null));
});

test('horizontal FOV is consistent on wide and portrait screens',()=>{
  for(const aspect of [16/9,21/9,9/16]){
    const vertical=api.verticalFov(110,aspect)*Math.PI/180;
    const horizontal=2*Math.atan(Math.tan(vertical/2)*aspect)*180/Math.PI;
    assert.ok(Math.abs(horizontal-110)<1e-8);
  }
});

test('quality and resolution change renderer cost without changing physics',()=>{
  const low=api.visualProfile(api.normalizeVisualSettings({quality:'low'}),2);
  const high=api.visualProfile(api.normalizeVisualSettings({quality:'high'}),2);
  assert.ok(low.pixelRatio<high.pixelRatio);assert.equal(low.shadows,false);assert.equal(high.shadows,true);
  assert.ok(low.detailCount<high.detailCount);
  const half=api.visualProfile(api.normalizeVisualSettings({quality:'high',renderScale:.5}),2);
  assert.equal(half.pixelRatio,high.pixelRatio/2);
  assert.equal(api.visualProfile(api.normalizeVisualSettings({quality:'high',shadows:'off'}),1).shadows,false);
});

test('environment density controls decorative batches across maps without hiding solid objects',()=>{
  assert.equal(typeof api.applySceneDetail,'function');
  const grass={name:'ground-vegetation',count:700,userData:{}};
  const debris={name:'loose-ground-debris',count:100,userData:{}};
  const solid={name:'map-architecture',visible:true,userData:{}};
  const scene={traverse(fn){[grass,debris,solid].forEach(fn);}};
  api.applySceneDetail(scene,120);
  assert.ok(grass.count<700);assert.ok(debris.count<100);assert.equal(solid.visible,true);
  api.applySceneDetail(scene,560);
  assert.equal(grass.count,700);assert.equal(debris.count,100);
});
