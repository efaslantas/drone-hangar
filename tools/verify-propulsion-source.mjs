// Checks transcription against the primary publisher, not physical lab accuracy.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BENCH_SOURCE, REFERENCE_PROFILES, sampleReference, STANDARD_GRAVITY } from '../src/propulsion-reference.js';
const response=await fetch(BENCH_SOURCE,{signal:AbortSignal.timeout(20000)});
assert.equal(response.status,200);
const html=await response.text();
const tables=[...html.matchAll(/<table\b[\s\S]*?<\/table>/gi)].map(([table])=>[...table.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(([row])=>[...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(([,cell])=>Number(cell.replace(/<[^>]+>/g,'').replace(/&[^;]+;/g,'').trim().replace(/,/g,'')))).filter(row=>row.length===6&&row.every(Number.isFinite)));
let checked=0;
const heldOut=[];
for(const profile of Object.values(REFERENCE_PROFILES)) {
 const rows=tables.find(table=>table.some(row=>row[0]===2000&&row[1]===profile.points.at(-1)[1]));
 assert.ok(rows,profile.id+': source table not found; review the publisher manually');
 for(const point of profile.points){assert.deepEqual(rows.find(row=>row[0]===point[0])?.slice(0,4),point,profile.id+' PWM '+point[0]);checked++}
 const unused=rows.filter(row=>!profile.points.some(point=>point[0]===row[0]));
 const errors=unused.map(row=>{const sample=sampleReference(profile.id,(row[0]-1000)/1000);return {thrust:Math.abs(sample.thrustN/(row[1]*STANDARD_GRAVITY/1000)-1),current:Math.abs(sample.currentA/row[3]-1)}});
 const maxThrust=Math.max(0,...errors.map(e=>e.thrust)),maxCurrent=Math.max(0,...errors.map(e=>e.current));
 assert.ok(maxThrust<.05,profile.id+': held-out thrust error >5%');assert.ok(maxCurrent<.1,profile.id+': held-out current error >10%');
 heldOut.push({profile:profile.id,points:unused.length,maxThrustErrorPercent:Math.round(maxThrust*10000)/100,maxCurrentErrorPercent:Math.round(maxCurrent*10000)/100});
}
console.log(JSON.stringify({source:BENCH_SOURCE,checkedPoints:checked,heldOut,status:'published rows match',retrievedAt:new Date().toISOString(),pageSha256:createHash('sha256').update(html).digest('hex')}));
