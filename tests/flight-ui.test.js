import test from 'node:test';import assert from 'node:assert/strict';
import {armPresentation,controlPresentation,paintInputHelp} from '../src/flight-ui.js';
const missing={controlMode:'rc',rcReady:false,rcFault:'RC cihazı bulunamadı.',throttle:0};
test('ARM affordance matches RC gate while DISARM and reset/result actions stay available',()=>{
 assert.equal(armPresentation({input:missing,state:{armed:false}}).disabled,true);
 assert.equal(armPresentation({input:{...missing,rcReady:true,throttle:.06},state:{}}).disabled,true);
 assert.equal(armPresentation({input:{...missing,rcReady:true,throttle:0},state:{}}).disabled,false);
 assert.deepEqual(armPresentation({input:missing,state:{armed:true}}),{label:'DISARM',touchLabel:'DISARM',disabled:false});
 assert.equal(armPresentation({input:missing,state:{crashed:true}}).disabled,false);
 assert.equal(armPresentation({input:missing,state:{packCutoff:true}}).disabled,true);
 assert.equal(armPresentation({input:missing,state:{},countdown:true}).disabled,true);
 assert.equal(armPresentation({input:missing,state:{},run:{won:true}}).disabled,false);
 assert.equal(armPresentation({input:missing,state:{},replay:true}).disabled,false);
});
test('saved calibration is distinct from a connected ready radio and absolute throttle is explained',()=>{
 const cfg={mode:'rc',deviceId:'TX15 Joystick (Vendor: 1209)',calibrated:true};
 const waiting=controlPresentation(cfg,missing,{});assert.match(waiting.title,/TX15/);assert.equal(waiting.tone,'waiting');assert.match(waiting.detail,/kalibrasyon kayıtlı/i);
 const high=controlPresentation(cfg,{...missing,rcReady:true,throttle:.6},{});assert.equal(high.tone,'blocked');assert.match(high.detail,/%5/);
 const ready=controlPresentation(cfg,{...missing,rcReady:true,throttle:0},{});assert.equal(ready.tone,'ready');
 assert.match(ready.help,/0–100/);assert.match(ready.help,/hover/);
 assert.equal(controlPresentation({mode:'gamepad'},{controlMode:'gamepad',connected:false},{}).rc,false);
});
test('help indicators refresh from live RC input independently of paused simulation',()=>{
 const fields=Object.fromEntries(['m-l','m-r','m-r2','help-middle-label','pad-stat','help-rc','help-gamepad','help-touch','help-key-flight','help-key-flight-axes'].map(id=>[id,{style:{},querySelector(){return this}}]));
 const root={getElementById:id=>fields[id]};
 paintInputHelp(root,{...missing,viz:{lx:0,ly:1,rx:0,ry:0,r2:0}});assert.equal(fields['help-middle-label'].textContent,'GAZ');assert.equal(fields['help-gamepad'].hidden,true);assert.match(fields['pad-stat'].textContent,/RC/);
 paintInputHelp(root,{...missing,rcReady:true,throttle:.7,viz:{lx:.2,ly:-.4,rx:.3,ry:-.6,r2:0}});assert.equal(fields['m-r2'].style.width,'70%');assert.match(fields['pad-stat'].textContent,/hazır/);assert.match(fields['m-r'].style.transform,/5.4/);
});
test('countdown blocks ARM button even when a training start is already armed',()=>{assert.equal(armPresentation({input:{},state:{armed:true},countdown:true}).disabled,true)});
test('touch action captions fit a small button while full action names remain available',()=>{
 for(const scenario of [{},{state:{armed:true}},{state:{crashed:true}},{state:{packCutoff:true}},{run:{won:true}},{run:{lost:true}},{replay:true},{countdown:true}]){
  const action=armPresentation(scenario);assert.ok(action.touchLabel?.length>0&&action.touchLabel.length<=6,`compact caption for ${action.label}`);assert.ok(action.label.length>0);
 }
 const reset=armPresentation({state:{crashed:true}});assert.equal(reset.touchLabel,'RESET');assert.equal(reset.label,'Yeniden kur');assert.equal(reset.disabled,false);
 const replay=armPresentation({replay:true});assert.equal(replay.touchLabel,'BİTİR');assert.equal(replay.label,'Tekrarı bitir');
});
