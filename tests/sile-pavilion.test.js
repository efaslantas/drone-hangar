import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pavilionProfile,pavilionRoof} from '../src/sile-pavilion.js';
const records=JSON.parse(fs.readFileSync(new URL('../src/data/sile-building-supplement.json',import.meta.url))).records;
const item=records.find(b=>b.id==='19523577-0288-44e7-aa86-ac6ba007cd56');
test('photo-informed pavilion is restricted to the exact source footprint and retains explicit unmeasured dimensions',()=>{
 const before=JSON.stringify(records),p=pavilionProfile(item);assert.ok(p);assert.equal(p.eavesHeight,3.15);assert.equal(p.height,4.35);assert.equal(p.measured,false);assert.equal(pavilionProfile({...item,id:'other'}),null);const changed=structuredClone(item);changed.rings[0][0][0]+=.01;assert.equal(pavilionProfile(changed),null);assert.equal(JSON.stringify(records),before);assert.equal(records.filter(b=>pavilionProfile(b)).length,1);
});
test('hipped roof covers the original footprint once with upward finite sloping triangles',()=>{
 const roof=pavilionRoof({...item,base:2}),p=pavilionProfile(item);assert.equal(roof.positions.length,36);assert.equal(roof.uv.length,24);assert.ok([...roof.positions,...roof.uv].every(Number.isFinite));assert.equal(roof.eaves,2+p.eavesHeight);assert.equal(Math.max(...roof.positions.filter((_,i)=>i%3===1)),2+p.height);
 let area=0;for(let i=0;i<roof.positions.length;i+=9){const t=roof.positions.slice(i,i+9),ny=(t[5]-t[2])*(t[6]-t[0])-(t[3]-t[0])*(t[8]-t[2]);assert.ok(ny>0);area+=ny/2;}const r=item.rings[0],expected=Math.abs(r.reduce((s,a,i)=>{const b=r[(i+1)%r.length];return s+a[0]*b[1]-b[0]*a[1]},0))/2;assert.ok(Math.abs(area-expected)<1e-7);assert.equal(pavilionRoof({...item,id:'other',base:2}),null);
});
