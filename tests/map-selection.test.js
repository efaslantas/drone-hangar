import test from 'node:test';import assert from 'node:assert/strict';import {createMapSelector} from '../src/map-selection.js';
test('a delayed Şile load never overwrites a newer map selection',async()=>{
 let done;const commits=[],busy=[];const select=createMapSelector({load:()=>new Promise(r=>done=r),commit:id=>commits.push(id),busy:v=>busy.push(v),error:()=>{throw new Error('unexpected')}});
 const pending=select('sile');await select('airfield');done();await pending;assert.deepEqual(commits,['airfield']);assert.equal(busy.at(-1),false);
});
test('failed Şile download keeps the active map and restores controls for retry',async()=>{
 let fail=true;const commits=[],errors=[],busy=[];const select=createMapSelector({load:async()=>{if(fail)throw new Error('offline')},commit:id=>commits.push(id),busy:v=>busy.push(v),error:e=>errors.push(e.message)});
 await select('sile');assert.deepEqual(commits,[]);assert.deepEqual(errors,['offline']);assert.equal(busy.at(-1),false);fail=false;await select('sile');assert.deepEqual(commits,['sile']);
});
test('an operation change cancels a pending geographic selection and restores controls',async()=>{
 let done;const commits=[],busy=[];const select=createMapSelector({load:()=>new Promise(r=>done=r),commit:id=>commits.push(id),busy:v=>busy.push(v),error:()=>{}});
 const pending=select('sile');select.cancel();done();await pending;assert.deepEqual(commits,[]);assert.equal(busy.at(-1),false);
});
