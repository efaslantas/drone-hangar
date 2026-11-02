import test from 'node:test';
import assert from 'node:assert/strict';
const api = await import('../src/session-preferences.js').catch(() => ({}));
const memory = value => ({ getItem: () => value });

test('new pilots can start with the reference freestyle setup', () => {
  assert.equal(typeof api.readSession, 'function');
  assert.deepEqual(api.readSession(memory(null)), { drone: 'freestyle', map: 'airfield' });
});

test('last valid setup survives a reload while obsolete IDs fall back', () => {
  assert.deepEqual(api.readSession(memory(JSON.stringify({ drone: 'seven', map: 'coast', name: 'pilot' }))), { drone: 'seven', map: 'coast' });
  assert.deepEqual(api.readSession(memory('{broken')), { drone: 'freestyle', map: 'airfield' });
  assert.deepEqual(api.readSession(memory(JSON.stringify({ drone: 'ida-1', map: 'removed' }))), { drone: 'freestyle', map: 'airfield' });
  assert.deepEqual(api.readSession({ getItem() { throw new Error('denied'); } }), { drone: 'freestyle', map: 'airfield' });
});

test('race and freestyle practice are open without completing the academy', async () => {
  const { opById, isOpOpen } = await import('../src/missions.js');
  for (const id of ['freestyle', 'race-practice']) {
    const op = opById(id);
    assert.equal(op.id, id);
    assert.equal(op.ranked, false);
    assert.equal(isOpOpen(op, { done: {} }), true);
  }
});

test('menus, controls and results freeze simulation while normal flight advances', () => {
  assert.equal(typeof api.isFlightPaused, 'function');
  assert.equal(api.isFlightPaused({}), false);
  for (const key of ['menuOpen','helpOpen','resultOpen']) assert.equal(api.isFlightPaused({ [key]:true }), true);
});

test('touch toolbar also pauses flight and paused attempts never enter rankings',()=>{
  assert.equal(api.isFlightPaused({touchMenuOpen:true}),true);
  assert.equal(api.shouldRankRun({op:{ranked:true},paused:true}),false);
  assert.equal(api.shouldRankRun({op:{ranked:true},paused:false}),true);
  assert.equal(api.shouldRankRun({op:{ranked:false}}),false);
});

test('world animations exclude pause time including moving collision geometry',()=>{
  assert.equal(typeof api.advanceWorldTime,'function');
  assert.equal(api.advanceWorldTime(12,.05,true),12);
  assert.equal(api.advanceWorldTime(12,.05,false),12.05);
});

test('blocked browser storage access returns a safe optional handle',()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('policy blocked');}});
  try{assert.equal(api.getBrowserStorage(),null);}finally{
    if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;
  }
});

test('practice race matches its three-lap briefing',async()=>{
  const { opById }=await import('../src/missions.js');
  assert.equal(opById('race-practice').laps,3);
  assert.match(opById('race-practice').steps[0].hint,/3 tur/);
});

test('free sessions wait disarmed on the pad instead of starting unattended in the air',async()=>{
  const { opById }=await import('../src/missions.js');
  for(const id of ['free','freestyle']){
    assert.equal(opById(id).startGrounded,true);
    assert.equal(opById(id).spawn.y,0);
  }
});

test('measurement-reference training never submits a generic leaderboard result',()=>{
  assert.equal(api.shouldRankRun({op:{ranked:true},reference:true}),false);
});
test('saved Şile free-flight choice survives reopening',()=>{
 assert.equal(api.readSession({getItem:()=>JSON.stringify({drone:'freestyle',map:'sile'})}).map,'sile');
});
