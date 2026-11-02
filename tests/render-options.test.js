import test from 'node:test';import assert from 'node:assert/strict';import * as api from '../src/render-options.js';
test('renderer precision separates centimetre surfaces at Şile range while retaining close FPV clipping',()=>{
 for(const touchUi of [false,true]){const o=api.rendererOptions({touchUi});assert.equal(o.logarithmicDepthBuffer,true);assert.equal(o.antialias,!touchUi);assert.equal(o.powerPreference,touchUi?'low-power':'high-performance');
 const quant=z=>Math.round((o.logarithmicDepthBuffer?Math.log2(z+1)/Math.log2(6501):6500/(6500-.003)-6500*.003/(6500-.003)/z)*(2**24-1));assert.ok(quant(700.035)-quant(700)>10);assert.ok(quant(.008)-quant(.003)>10);}
});
