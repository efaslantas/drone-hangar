import test from 'node:test';import assert from 'node:assert/strict';import {createStartupGate} from '../src/startup-gate.js';import * as startup from '../src/startup-gate.js';
test('a fast shared-link result waits until slow map/application initialization completes',async()=>{
 const gate=createStartupGate(),events=[];const pending=Promise.resolve('ghost').then(value=>gate.run(()=>events.push(value)));
 await Promise.resolve();await Promise.resolve();assert.deepEqual(events,[]);events.push('app-ready');gate.complete();await pending;assert.deepEqual(events,['app-ready','ghost']);
});

test('flight preparation paints busy feedback before constructing the world and collapses double start',async()=>{
 const events=[];let release;
 const begin=startup.createFlightStartGate({busy:on=>events.push(on?'busy':'idle'),paint:()=>new Promise(r=>release=r),start:()=>events.push('world'),error:()=>assert.fail('unexpected error')});
 const pending=begin();assert.deepEqual(events,['busy']);assert.equal(await begin(),false);assert.deepEqual(events,['busy']);
 release();assert.equal(await pending,true);assert.deepEqual(events,['busy','world','idle']);
});
test('failed world preparation clears busy and allows a successful retry',async()=>{
 const events=[];let fails=true;
 const begin=startup.createFlightStartGate({busy:on=>events.push(on),paint:async()=>{},start(){if(fails)throw Error('world unavailable');events.push('started');},error:e=>events.push(e.message)});
 assert.equal(await begin(),false);assert.deepEqual(events,[true,'world unavailable',false]);
 fails=false;assert.equal(await begin(),true);assert.deepEqual(events.slice(3),[true,'started',false]);
});
test('paint failure never starts a hidden world and keeps the start gate retryable',async()=>{
 let starts=0,paints=0;const busy=[],errors=[];
 const begin=startup.createFlightStartGate({busy:on=>busy.push(on),paint:async()=>{if(++paints===1)throw Error('frame unavailable');},start:()=>starts++,error:e=>errors.push(e.message)});
 assert.equal(await begin(),false);assert.equal(starts,0);assert.deepEqual(busy,[true,false]);assert.deepEqual(errors,['frame unavailable']);
 assert.equal(await begin(),true);assert.equal(starts,1);
});
