import test from 'node:test';import assert from 'node:assert/strict';
import {pinSourceOne,SOURCE_ONE_PRESET} from '../src/flight-presets.js';
import {readReferences,applyReference} from '../src/propulsion-reference.js';import {droneById} from '../src/catalog.js';
test('SOURCE ONE preset persists complete measured/assumed setup without touching RC or other drones',()=>{
 const values=new Map([['efa-hangar-rc-input-v1','unchanged']]),storage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)};
 const other={racer:{profile:'f60-2550-4s'}};const result=pinSourceOne(storage,other);assert.equal(result.saved,true);assert.deepEqual(other,{racer:{profile:'f60-2550-4s'}});
 const restored=readReferences(storage);assert.equal(restored.freestyle.airframe,'source-one-v4');assert.equal(restored.freestyle.dynamics.wheelbaseMm,226);assert.equal(restored.freestyle.profile,'f60-1750-6s');assert.equal(restored.freestyle.battery.mode,'rint');assert.equal(restored.freestyle.massG,650);assert.equal(restored.racer.profile,'f60-2550-4s');assert.equal(values.get('efa-hangar-rc-input-v1'),'unchanged');
 assert.match(applyReference(droneById('freestyle'),restored.freestyle).name,/SOURCE ONE/);assert.match(SOURCE_ONE_PRESET.source,/9ae65b/);
});
test('preset reports blocked persistence rather than claiming it was saved',()=>{assert.equal(pinSourceOne({setItem(){throw Error('blocked')}},{}).saved,false)});
test('generic selection cannot retain an active SOURCE ONE reference marker',async()=>{
 const {normalizeReference}=await import('../src/propulsion-reference.js');
 const pinned=pinSourceOne(null,{}).setups.freestyle;
 assert.equal(normalizeReference({...pinned,profile:'generic'}).airframe,null);
});
