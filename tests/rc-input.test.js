import test from 'node:test';
import assert from 'node:assert/strict';
import * as rc from '../src/rc-input.js';
const axes={roll:{index:0},pitch:{index:1},yaw:{index:3},throttle:{index:2}};
const draft=()=>rc.normalizeRcSettings({mode:'rc',deviceId:'EdgeTX',axes});
const calibrated=()=>rc.finishRcCalibration(draft(),[0,0,-1,0],[-.8,-.9,-1,-.7],[.9,.8,1,.9]);
const pad=(values=[0,0,-1,0])=>({id:'EdgeTX',index:0,axes:values,buttons:[]});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('RC throttle uses endpoints rather than centred hover and other axes use measured asymmetric centres',()=>{
 const c=calibrated();assert.equal(c.calibrated,true);
 near(rc.mapRcInput(pad(),c).throttle,0);near(rc.mapRcInput(pad([0,0,0,0]),c).throttle,.5);near(rc.mapRcInput(pad([0,0,1,0]),c).throttle,1);
 const full=rc.mapRcInput(pad([.9,-.9,1,.9]),c);near(full.roll,1);near(full.pitch,-1);near(full.yaw,1);
 assert.equal(Object.hasOwn(full,'lift'),false);
});
test('calibration rejects missing travel, duplicate axes and invalid data without arming',()=>{
 assert.throws(()=>rc.finishRcCalibration(draft(),[0,0,-1,0],[0,0,-1,0],[0,0,-1,0]));
 const c=calibrated();c.axes.yaw.index=0;assert.equal(rc.mapRcInput(pad(),c).rcReady,false);
 for(const values of [[0,0,-1],[0,NaN,-1,0]]){const out=rc.mapRcInput(pad(values),calibrated());assert.equal(out.rcReady,false);near(out.throttle,0)}
});
test('inverted throttle is learned from its low endpoint; neutral throttle cannot be calibrated as low',()=>{
 const c=rc.finishRcCalibration(draft(),[0,0,1,0],[-1,-1,-1,-1],[1,1,1,1]);
 near(rc.mapRcInput(pad([0,0,1,0]),c).throttle,0);near(rc.mapRcInput(pad([0,0,-1,0]),c).throttle,1);
 assert.throws(()=>rc.finishRcCalibration(draft(),[0,0,0,0],[-1,-1,-1,-1],[1,1,1,1]));
});
test('RC cannot silently use another device or arm with invalid input/high throttle',()=>{
 const c=calibrated();assert.equal(rc.mapRcInput({...pad(),id:'DualSense'},c).rcReady,false);
 assert.equal(rc.canArmInput(rc.mapRcInput(pad(),c)),true);
 assert.equal(rc.canArmInput(rc.mapRcInput(pad([0,0,0,0]),c)),false);
 assert.equal(rc.canArmInput(rc.mapRcInput(null,c)),false);
 assert.equal(rc.canArmInput({controlMode:'gamepad',lift:0}),true);
});
test('legacy/malformed preferences stay bounded and unsafe calibration is not trusted',()=>{
 assert.equal(rc.normalizeRcSettings(null).mode,'gamepad');
 const c=rc.normalizeRcSettings({mode:'rc',deviceId:'EdgeTX',calibrated:true,axes:{roll:{index:NaN}}});
 assert.equal(c.calibrated,false);assert.equal(rc.mapRcInput(pad(),c).rcReady,false);
 const d=calibrated();d.axes.roll.invert=true;near(rc.mapRcInput(pad([.9,0,-1,0]),d).roll,-1);
});
test('losing RC readiness disarms immediately and reconnecting never restores armed state',()=>{
 const state={armed:true};rc.disarmOnInputLoss(state,{controlMode:'rc',rcReady:false});assert.equal(state.armed,false);
 rc.disarmOnInputLoss(state,{controlMode:'rc',rcReady:true});assert.equal(state.armed,false);
 state.armed=true;rc.disarmOnInputLoss(state,{controlMode:'gamepad'});assert.equal(state.armed,true);
});
test('RC start and retry override airborne auto-arm defaults with a grounded disarmed state',()=>{
 const s={y:8,armed:true,motor:.4,throttleOut:.4,altHold:8,grounded:false,groundedFor:0};
 rc.applyRcGroundStart(s,{controlMode:'rc'},.15);
 assert.deepEqual(s,{y:.15,armed:false,motor:0,throttleOut:0,altHold:null,grounded:true,groundedFor:1});
 const ps={y:8,armed:true};rc.applyRcGroundStart(ps,{controlMode:'gamepad'},.15);assert.deepEqual(ps,{y:8,armed:true});
});
test('centered axes accept the declared .2 travel each side independently of throttle range',()=>{
 const c=rc.finishRcCalibration(draft(),[0,0,-1,0],[-.2,-.2,-1,-.2],[.2,.2,1,.2]);
 assert.equal(c.calibrated,true);near(rc.mapRcInput(pad([.2,-.2,-1,.2]),c).roll,1);
});
test('RC persistence reports unavailable storage and failed writes instead of claiming it saved',()=>{
 assert.equal(rc.saveRcSettings(null,calibrated()),false);
 assert.equal(rc.saveRcSettings({setItem(){throw new Error('denied')}},calibrated()),false);
 let saved;assert.equal(rc.saveRcSettings({setItem(k,v){saved=[k,JSON.parse(v)]}},calibrated()),true);
 assert.equal(saved[0],rc.RC_KEY);assert.equal(saved[1].calibrated,true);
});
