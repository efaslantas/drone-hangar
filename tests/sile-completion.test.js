import test from 'node:test';import assert from 'node:assert/strict';
import {validateSileInventory} from '../src/sile-completion.js';
import inventory from '../src/data/sile-completion.json' with {type:'json'};
test('inventory covers all six regions, finite paired cameras and immutable source references',()=>{assert.deepEqual(validateSileInventory(inventory),[]);assert.deepEqual(inventory.regions.map(r=>r.id),['S1','S2','S3','S4','S5','S6']);});
test('inventory rejects missing regions, duplicate IDs, absent references and invented measured evidence',()=>{
 for(const mutate of [d=>d.regions.pop(),d=>d.issues.push(d.issues[0]),d=>d.issues[0].references=[],d=>{d.issues[0].evidence='measured';delete d.issues[0].measurement;}]){const copy=structuredClone(inventory);mutate(copy);assert.ok(validateSileInventory(copy).length);}
});
