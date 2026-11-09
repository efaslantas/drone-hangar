import test from 'node:test';import assert from 'node:assert/strict';
import {validateSileInventory} from '../src/sile-completion.js';
import inventory from '../src/data/sile-completion.json' with {type:'json'};
test('inventory covers all six regions, finite paired cameras and immutable source references',()=>{assert.deepEqual(validateSileInventory(inventory),[]);assert.deepEqual(inventory.regions.map(r=>r.id),['S1','S2','S3','S4','S5','S6']);});
test('inventory rejects missing regions, duplicate IDs, absent references and invented measured evidence',()=>{
 for(const mutate of [d=>d.regions.pop(),d=>d.issues.push(d.issues[0]),d=>d.issues[0].references=[],d=>{d.issues[0].evidence='measured';delete d.issues[0].measurement;}]){const copy=structuredClone(inventory);mutate(copy);assert.ok(validateSileInventory(copy).length);}
});

test('a malformed inventory is rejected rather than crashing the acceptance checker',()=>{for(const d of [null,{}, {regions:[null],issues:[null]}])assert.ok(validateSileInventory(d).length);});

import {validateSileAcceptance}from '../src/sile-completion.js';
function completeReport(){return {inventoryVersion:inventory.schema,sourceSnapshotKey:inventory.sourceSnapshotKey,regions:inventory.regions.map(r=>({id:r.id,checks:Object.fromEntries(['geometry','grounding','architecture','landmarks','appearance','contacts','backend'].map(k=>[k,{status:'pass',evidence:['fixture-evidence']}]))})),routes:inventory.regions.flatMap(r=>['forward','reverse'].map(direction=>({region:r.id,direction,status:'pass',samples:10,path:direction==='forward'?[[r.bounds[0]+10,5,r.bounds[2]+10],[r.bounds[0]+11,5,r.bounds[2]+10]]:[[r.bounds[0]+11,5,r.bounds[2]+10],[r.bounds[0]+10,5,r.bounds[2]+10]],speedsMps:[3,25],sampleStepM:.5,airframeSizeM:.22,failures:[],evidence:['fixture-trace']}))),performance:{status:'complete',hiddenMs:0,durationSeconds:900,backend:'webgl',quality:'medium',renderSize:[1280,720],userAgent:'fixture',regions:inventory.regions.map(r=>({id:r.id,durationSeconds:150,frames:9000,fps:60,low1PercentFps:45}))},physicalTX15:{status:'not-run'},humanAcceptance:{status:'not-run'}};}
test('acceptance requires actual coverage and preserves physical/human acceptance as independent not-run states',()=>{const report=completeReport();assert.deepEqual(validateSileAcceptance(report,inventory,{allowOpenInventory:true}),[]);assert.equal(report.physicalTX15.status,'not-run');assert.equal(report.humanAcceptance.status,'not-run');const open=structuredClone(inventory);open.issues[0].status='open';assert.ok(validateSileAcceptance(report,open).length);});
test('acceptance rejects omitted regions/routes/evidence, short performance runs and failed regional metrics',()=>{
 for(const mutate of [r=>r.sourceSnapshotKey='incompatible',r=>r.regions.pop(),r=>r.routes.pop(),r=>r.regions[0].checks.geometry.evidence=[],r=>r.regions[0].checks.grounding.status='not-run',r=>r.performance.durationSeconds=30,r=>r.performance.regions[0].low1PercentFps=12]){const r=completeReport();mutate(r);assert.ok(validateSileAcceptance(r,inventory,{allowOpenInventory:true}).length);}
});

test('contradictory unfinished performance and empty or failed route proofs cannot pass delivery',()=>{for(const mutate of [r=>r.performance.status='not-run',r=>r.performance.regions[0].durationSeconds=30,r=>r.routes[0].path=[],r=>r.routes[0].speedsMps=[],r=>r.routes[0].failures=[{reason:'collision'}]]){const r=completeReport();mutate(r);assert.ok(validateSileAcceptance(r,inventory,{allowOpenInventory:true}).length);}});
