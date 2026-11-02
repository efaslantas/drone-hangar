import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{createHash}from'node:crypto';
const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
test('western source extension keeps the original core grid samples and launch projection while adding native-resolution coverage',()=>{
 const t=data.terrain;assert.equal(t.cols,97);assert.equal(t.rows,65);assert.equal(t.heights.length,97*65);assert.ok(t.bounds[0]<-1500);assert.equal(t.bounds[1],1439.03);assert.deepEqual(data.spawn,{x:0,z:0});assert.equal(data.projection.offsetX,-438.0811564219137);const core=[];for(let r=0;r<65;r++)for(let c=32;c<97;c++)core.push(t.heights[r*97+c]);assert.equal(createHash('sha256').update(Buffer.from(new Float64Array(core).buffer)).digest('hex'),'c3071f1f2702bf05c2d4ac6e751d52c224f4f1dc040a4f5e981adf007bc71ca2');
});
test('former western crop is now internal source terrain with continuous heights and no artificial boundary segment',async()=>{
 const {surfaceAt}=await import('../src/geo-terrain.js'),oldWest=-563.14,t=data.terrain;
 for(const z of[-400,400,700]){const a=surfaceAt({terrain:t},oldWest-.01,z),b=surfaceAt({terrain:t},oldWest+.01,z);assert.equal(a.water,false);assert.equal(b.water,false);assert.ok(Math.abs(a.height-b.height)<.01,'no vertical step at former crop');}
 assert.equal(surfaceAt({terrain:t},-750,400).water,false);assert.equal(surfaceAt({terrain:t},-750,0).water,true);
 for(const rings of t.land)for(const r of rings)for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length];assert.ok(!(Math.abs(a[0]-oldWest)<.02&&Math.abs(b[0]-oldWest)<.02&&Math.abs(a[1]-b[1])>10),'old crop must not remain a shoreline wall');}
});
