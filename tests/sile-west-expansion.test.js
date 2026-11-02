import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{createHash}from'node:crypto';
const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
test('western source extension keeps the original core grid samples and launch projection while adding native-resolution coverage',()=>{
 const t=data.terrain;assert.ok(t.cols>=97);assert.equal(t.rows,65);assert.equal(t.heights.length,t.cols*65);assert.ok(t.bounds[0]<-1500);assert.ok(t.bounds[1]>=1439.03);assert.deepEqual(data.spawn,{x:0,z:0});assert.equal(data.projection.offsetX,-438.0811564219137);const core=[];for(let r=0;r<65;r++)for(let c=32;c<97;c++)core.push(t.heights[r*t.cols+c]);assert.equal(createHash('sha256').update(Buffer.from(new Float64Array(core).buffer)).digest('hex'),'c3071f1f2702bf05c2d4ac6e751d52c224f4f1dc040a4f5e981adf007bc71ca2');
});
test('former western crop is now internal source terrain with continuous heights and no artificial boundary segment',async()=>{
 const {surfaceAt}=await import('../src/geo-terrain.js'),oldWest=-563.14,t=data.terrain;
 for(const z of[-400,400,700]){const a=surfaceAt({terrain:t},oldWest-.01,z),b=surfaceAt({terrain:t},oldWest+.01,z);assert.equal(a.water,false);assert.equal(b.water,false);assert.ok(Math.abs(a.height-b.height)<.01,'no vertical step at former crop');}
 assert.equal(surfaceAt({terrain:t},-750,400).water,false);assert.equal(surfaceAt({terrain:t},-750,0).water,true);
 for(const rings of t.land)for(const r of rings)for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length];assert.ok(!(Math.abs(a[0]-oldWest)<.02&&Math.abs(b[0]-oldWest)<.02&&Math.abs(a[1]-b[1])>10),'old crop must not remain a shoreline wall');}
});
test('Ağlayankaya east extension preserves all established centre/west samples and removes the former east crop',async()=>{
 const {surfaceAt}=await import('../src/geo-terrain.js'),t=data.terrain;assert.equal(t.cols,145);assert.ok(t.bounds[1]>2900);const established=[];for(let r=0;r<65;r++)for(let c=0;c<97;c++)established.push(t.heights[r*t.cols+c]);assert.equal(established.length,6305);
 assert.equal(createHash('sha256').update(Buffer.from(new Float64Array(established).buffer)).digest('hex'),'cca83600341eb059014a007ee7ceca57f8f10444ca8b1070d4e68001b6d9a35a');
 for(const z of[600,700,800]){const a=surfaceAt({terrain:t},1439.02,z),b=surfaceAt({terrain:t},1439.04,z);assert.equal(a.water,false);assert.equal(b.water,false);assert.ok(Math.abs(a.height-b.height)<.02);}
 for(const rings of t.land)for(const r of rings)for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length];assert.ok(!(Math.abs(a[0]-1439.03)<.02&&Math.abs(b[0]-1439.03)<.02&&Math.abs(a[1]-b[1])>10),'former east crop must not be an invented cliff');}
 const source=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/source-osm.json',import.meta.url)));assert.equal(createHash('sha256').update(JSON.stringify(source.elements.slice(0,13136))).digest('hex'),'49ae1c64018834f45a90ac4de19a2fa672bd58e5882f0dc11a646fc4f00027da');assert.ok(data.roads.some(r=>r.name==='Ağlayan kaya Caddesi'&&r.points.some(p=>p[0]>1500)));
});
