import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('simulator controls have unique IDs so help and calibration bind to the intended field',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 const duplicates=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];assert.deepEqual(duplicates,[]);
});
