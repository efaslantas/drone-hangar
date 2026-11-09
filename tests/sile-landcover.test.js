import test from 'node:test';import assert from 'node:assert/strict';
import {landcoverSampler} from '../src/sile-landcover.js';
const source={cols:2,rows:2,origin:[-4,-6],step:[2,3],classes:[10,30,80,50],baseMapSnapshotKey:'fixture',projection:{lat:41}};
const data={completionLayer:1,supplementalSource:{baseMapSnapshotKey:'fixture'},projection:{lat:41}};
test('native north-west raster orientation and half-open bounds remain categorical',()=>{const sample=landcoverSampler(data,source);assert.equal(sample(-4,-6),10);assert.equal(sample(-1,-5),30);assert.equal(sample(-3,-2),80);assert.equal(sample(-1,-1),50);for(const p of [[-4.01,-6],[0,-6],[-4,0],[-4,-6.01]])assert.equal(sample(...p),0);});
test('stale snapshots, projection mismatch and raw maps cannot silently receive land cover',()=>{for(const d of [{...data,completionLayer:0},{...data,projection:{lat:42}},{...data,supplementalSource:{baseMapSnapshotKey:'old'}}])assert.equal(landcoverSampler(d,source)(-4,-6),0);assert.equal(landcoverSampler(data,{...source,classes:[10]})(-4,-6),0);});
