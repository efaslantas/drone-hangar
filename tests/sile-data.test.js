import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import * as api from '../src/sile-data.js';import {terrainHeight,insidePolygon,projectCoordinate,surfaceAt} from '../src/geo-terrain.js';
const data=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/map.json',import.meta.url)));
test('Şile snapshot schema, source hashes, geographic landmarks and spawn are verifiable',()=>{
 assert.equal(api.validateSileData(data),data);
 const p=JSON.parse(fs.readFileSync(new URL('../public/maps/sile/provenance.json',import.meta.url)));
 for(const [name,info] of Object.entries(p.files)){const b=fs.readFileSync(new URL('../public/maps/sile/'+name,import.meta.url));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),info.sha256);}
 assert.ok(data.buildings.length>1000);assert.equal(data.stats.measuredBuildingHeights,0);assert.ok(data.landmarks.some(l=>l.name==='Şile Feneri'));assert.ok(data.landmarks.some(l=>l.name==='Şile Kalesi'));
 assert.equal(surfaceAt({terrain:data.terrain},0,0).water,false);assert.ok(Math.abs(terrainHeight(data.terrain,0,0))<.15);
 for(const b of data.buildings)assert.equal(insidePolygon(0,0,b.rings),false);
 for(let i=0;i<data.positions.length;i+=3){const [x,y,z]=data.positions.slice(i,i+3);assert.ok(Math.abs(y-terrainHeight(data.terrain,x,z))<.06,`mesh/physics mismatch ${x},${z}`);}
});
test('Şile loader is lazy, shares an inflight request and retries a failure',async()=>{
 let count=0,resolve;const loader=api.createSileLoader(()=>{count++;return new Promise(r=>resolve=r)});assert.equal(count,0);assert.equal(loader.get(),null);
 const a=loader.load(),b=loader.load();assert.equal(count,1);resolve({ok:true,json:async()=>data});assert.equal(await a,data);assert.equal(await b,data);assert.equal(loader.get(),data);
 let fail=true;const retry=api.createSileLoader(async()=>{if(fail)throw new Error('offline');return {ok:true,json:async()=>data}});await assert.rejects(retry.load());fail=false;assert.equal(await retry.load(),data);
 assert.throws(()=>api.validateSileData({...data,terrain:{...data.terrain,heights:[NaN]}}));
});
