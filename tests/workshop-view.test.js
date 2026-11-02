import test from 'node:test';
import assert from 'node:assert/strict';
import * as view from '../src/workshop-view.js';
import { DEFAULT_BUILD, buildMetrics } from '../src/fpv-build.js';
import { droneById } from '../src/catalog.js';
test('workshop comparison uses the same airframe baseline and real tuned metrics',()=>{
 const spec=droneById('freestyle');
 const unchanged=view.workshopComparison(spec,DEFAULT_BUILD);
 assert.ok(unchanged.every(row=>row.delta===0));
 const altered={...DEFAULT_BUILD,motors:'1750',props:'bi'};
 const rows=view.workshopComparison(spec,altered);
 assert.equal(rows.find(row=>row.key==='endurance').value,buildMetrics(spec,altered).endurance);
 assert.ok(rows.find(row=>row.key==='endurance').delta>0);
 assert.ok(rows.find(row=>row.key==='thrust').delta<0);
});
test('all available parts have distinct labelled illustrations and useful descriptions',()=>{
 for(const type of ['frame','motors','battery','props']) {
  const cards=view.workshopChoices(type);
  assert.equal(cards.length,3);
  assert.equal(new Set(cards.map(c=>c.svg)).size,3);
  for(const c of cards){assert.match(c.svg,/<svg/);assert.ok(c.description.length>15);assert.ok(c.name)}
 }
});
