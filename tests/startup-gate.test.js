import test from 'node:test';import assert from 'node:assert/strict';import {createStartupGate} from '../src/startup-gate.js';
test('a fast shared-link result waits until slow map/application initialization completes',async()=>{
 const gate=createStartupGate(),events=[];const pending=Promise.resolve('ghost').then(value=>gate.run(()=>events.push(value)));
 await Promise.resolve();await Promise.resolve();assert.deepEqual(events,[]);events.push('app-ready');gate.complete();await pending;assert.deepEqual(events,['app-ready','ghost']);
});
