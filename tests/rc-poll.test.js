import test from 'node:test';
import assert from 'node:assert/strict';
import * as input from '../src/input.js';
import {finishRcCalibration,normalizeRcSettings} from '../src/rc-input.js';
import {step,createState} from '../src/physics.js';
import {droneById} from '../src/catalog.js';
let pads=[];Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pads}});
const radio={id:'EdgeTX',index:0,axes:[0,0,-1,0],buttons:Array.from({length:10},()=>({pressed:true,value:1}))};
const cfg=()=>finishRcCalibration(normalizeRcSettings({mode:'rc',deviceId:'EdgeTX'}),[0,0,-1,0],[-1,-1,-1,-1],[1,1,1,1]);
test('RC poll preserves absolute throttle, suppresses PS button actions and drives zero/half/full physics output',()=>{
 input.setInputSettings(cfg());pads=[radio];
 for(const [raw,expected] of [[-1,0],[0,.5],[1,1]]) {
  radio.axes[2]=raw;const command=input.poll();assert.equal(command.throttle,expected);assert.equal(Object.hasOwn(command,'lift'),false);assert.equal(command.r2,0);
  const s=createState(0,30,0);s.armed=true;step(s,{...command,angleMode:false},droneById('freestyle'),.01,{real:false,assists:{tiltComp:false}});assert.equal(s.motor,expected);
 }
 for(const action of ['arm','reset','cam','mode','help'])assert.equal(input.consume(action),false);
});
test('RC device disappearance cannot fall back to another pad and reconnect does not request ARM',()=>{
 radio.axes[2]=-1;input.setInputSettings(cfg());pads=[radio];assert.equal(input.poll().rcReady,true);
 pads=[{...radio,id:'DualSense',axes:[0,0,1,0]}];let c=input.poll();assert.equal(c.rcReady,false);assert.equal(c.throttle,0);
 pads=[];assert.equal(input.poll().rcReady,false);
 pads=[radio];assert.equal(input.poll().rcReady,true);assert.equal(input.consume('arm'),false);
 input.setInputSettings({mode:'gamepad'});pads=[{...radio,axes:[0,0,0,0],buttons:[]}];assert.equal(Math.abs(input.poll().lift),0);assert.equal(Object.hasOwn(input.poll(),'throttle'),false);
});
test('absolute RC throttle is never replaced by Angle altitude hold',()=>{
 input.setInputSettings(cfg());pads=[radio];radio.axes=[0,0,-1,0];
 for(const [raw,expected] of [[-1,0],[0,.5],[1,1]]) {
  radio.axes[2]=raw;const s=createState(0,30,0);s.armed=true;
  step(s,{...input.poll(),angleMode:true},{...droneById('freestyle'),holdAlt:true},.01,{real:false});
  assert.equal(s.motor,expected);assert.equal(s.altHold,null);
 }
});
test('banking in Angle does not add tilt compensation to absolute RC throttle',()=>{
 const s=createState(0,30,0);s.armed=true;s.qw=Math.cos(Math.PI/8);s.qz=Math.sin(Math.PI/8);
 step(s,{throttle:.5,controlMode:'rc',angleMode:true,pitch:0,roll:0,yaw:0},droneById('freestyle'),.001,{real:false});
 assert.equal(s.motor,.5);
});
