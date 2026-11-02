import test from 'node:test';
import assert from 'node:assert/strict';
import * as battery from '../src/battery-model.js';
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const sample={thrustN:4,currentA:5,voltageV:24};
test('Rint solves terminal voltage/current together and satisfies electrical power balance',()=>{
 const cfg=battery.normalizeBattery({mode:'rint',cellResistanceMohm:5});
 const p=battery.solveBattery(cfg,6,1,[sample,sample,sample,sample],.5,true);
 assert.ok(p.terminalV<25.2&&p.terminalV>0);
 near(p.terminalV,p.openCircuitV-p.currentA*.03,1e-7);
 near(p.openCircuitV*p.currentA,p.terminalV*p.currentA+p.lossW,1e-6);
 const higher=battery.solveBattery(cfg,6,1,Array(4).fill({...sample,currentA:20}),.5,true);
 assert.ok(higher.terminalV<p.terminalV);
});
test('zero resistance, disarm and scaling limits do not invent extra measured thrust',()=>{
 const cfg=battery.normalizeBattery({mode:'rint',cellResistanceMohm:0});
 const p=battery.solveBattery(cfg,6,1,Array(4).fill(sample),.5,true);
 near(p.terminalV,25.2);near(p.rotors[0].thrustN,4);near(p.currentA,20.5);
 const off=battery.solveBattery(cfg,6,1,Array(4).fill(sample),.5,false);
 near(off.currentA,0);near(off.terminalV,off.openCircuitV);
 const reduced=battery.scaleRotor(sample,12);near(reduced.thrustN,1);near(reduced.currentA,1.25);
 near(battery.scaleRotor(sample,30).thrustN,4);
});
test('SOC budget and mAh/Wh integral preserve dimensions and do not consume an empty source',()=>{
 const setup={capacityMah:1000,usableFraction:.8,battery:battery.normalizeBattery({mode:'rint',initialSoc:.5})};
 near(battery.usableCapacityAh(setup),.5);
 const state={battery:1};const power={currentA:10,terminalV:20,lossW:2,openCircuitV:20.2,cellV:3.4};
 battery.integrateBattery(state,setup,power,3.6);
 near(state.battery,.98);near(state.packSoc,.49);near(state.packUsedMah,10);near(state.packEnergyWh,.2);near(state.packLossWh,.002);
});
test('undervoltage cutoff latches without erasing remaining SOC and resets with a new pack',()=>{
 const setup={capacityMah:1000,usableFraction:.8,battery:battery.normalizeBattery({mode:'rint',cutoffCellV:3.2})};
 const state={battery:1,armed:true};const low={currentA:2,terminalV:18,cellV:3,openCircuitV:24,lossW:12};
 battery.integrateBattery(state,setup,low,.1);assert.ok(!state.packCutoff);
 battery.integrateBattery(state,setup,low,.11);assert.ok(state.packCutoff);assert.equal(state.armed,false);assert.ok(state.battery>.9);
 battery.integrateBattery(state,setup,{...low,cellV:4,currentA:0},1);assert.ok(state.packCutoff);
 battery.resetBattery(state);assert.equal(state.packCutoff,false);assert.equal(state.battery,1);assert.equal(state.packUsedMah,0);
});
test('legacy settings stay bench and malformed battery parameters are bounded',()=>{
 assert.equal(battery.normalizeBattery().mode,'bench');
 const b=battery.normalizeBattery({mode:'rint',cellResistanceMohm:Infinity,initialSoc:-1,cutoffCellV:99});
 assert.ok(Number.isFinite(b.cellResistanceMohm));assert.equal(b.initialSoc,.2);assert.equal(b.cutoffCellV,3.6);
});
