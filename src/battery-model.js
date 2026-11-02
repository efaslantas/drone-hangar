// Rint circuit and voltage scaling are MODEL assumptions, not pack measurements.
const bound=(v,f,a,b)=>Number.isFinite(Number(v))?Math.min(b,Math.max(a,Number(v))):f;
export function normalizeBattery(value={}) {
 return {mode:value?.mode==='rint'?'rint':'bench',cellResistanceMohm:bound(value?.cellResistanceMohm,3,0,30),initialSoc:bound(value?.initialSoc,1,.2,1),cutoffCellV:bound(value?.cutoffCellV,3,2.8,3.6),cutoffDelayS:.2};
}
export function ocvCellV(soc) {
 // Illustrative 4.20 V-class LiPo shape. Not a manufacturer's OCV/SOC table.
 const points=[[0,3.3],[.1,3.55],[.2,3.7],[.5,3.8],[.8,4],[1,4.2]],x=bound(soc,0,0,1);
 for(let i=1;i<points.length;i++)if(x<=points[i][0]){const [a,va]=points[i-1],[b,vb]=points[i];return va+(vb-va)*(x-a)/(b-a)}
 return 4.2;
}
export function usableCapacityAh(setup) {
 return setup.capacityMah/1000*Math.min(setup.usableFraction,setup.battery?.mode==='rint'?setup.battery.initialSoc:1);
}
export function packSoc(setup,budget) {
 const initial=setup.battery.initialSoc;
 return Math.max(0,initial-(1-bound(budget,0,0,1))*Math.min(setup.usableFraction,initial));
}
export function scaleRotor(sample,voltageV) {
 const factor=Math.min(1,Math.max(0,Number(voltageV)||0)/sample.voltageV)**2;
 return {...sample,thrustN:sample.thrustN*factor,currentA:sample.currentA*factor,evidence:'voltage-model',baseEvidence:sample.evidence};
}
export function solveBattery(config,cells,soc,samples,electronicsA=0,powered=true) {
 const openCircuitV=cells*ocvCellV(soc),resistanceOhm=cells*config.cellResistanceMohm/1000;
 if(!powered)return {terminalV:openCircuitV,openCircuitV,cellV:openCircuitV/cells,currentA:0,lossW:0,rotors:samples.map(s=>({...s,thrustN:0,currentA:0})),resistanceOhm};
 const draw=v=>samples.reduce((sum,s)=>sum+scaleRotor(s,v).currentA,0)+electronicsA;
 let lo=0,hi=openCircuitV;
 for(let i=0;i<36;i++){const mid=(lo+hi)/2;if(mid+resistanceOhm*draw(mid)>openCircuitV)hi=mid;else lo=mid}
 const terminalV=(lo+hi)/2,rotors=samples.map(s=>scaleRotor(s,terminalV)),currentA=rotors.reduce((sum,s)=>sum+s.currentA,0)+electronicsA;
 return {terminalV,openCircuitV,cellV:terminalV/cells,currentA,lossW:currentA*currentA*resistanceOhm,rotors,resistanceOhm};
}
export function integrateBattery(state,setup,power,dt) {
 if(!(dt>0))return;
 const current=state.packCutoff?0:power.currentA;
 state.packUsedMah=(state.packUsedMah||0)+current*dt/3.6;
 state.packEnergyWh=(state.packEnergyWh||0)+power.terminalV*current*dt/3600;
 state.packLossWh=(state.packLossWh||0)+(state.packCutoff?0:power.lossW)*dt/3600;
 state.battery=Math.max(0,state.battery-current*dt/(usableCapacityAh(setup)*3600));
 state.packSoc=packSoc(setup,state.battery);state.packVoltageV=power.terminalV;state.packCellV=power.cellV;
 state.packOpenV=power.openCircuitV;
 if(!state.packCutoff&&state.armed&&power.cellV<setup.battery.cutoffCellV)state.packLowTime=(state.packLowTime||0)+dt;
 else state.packLowTime=0;
 if(state.packLowTime>=setup.battery.cutoffDelayS){state.packCutoff=true;state.armed=false;}
}
export function resetBattery(state) {
 state.battery=1;state.packCutoff=false;state.packLowTime=0;state.packUsedMah=0;state.packEnergyWh=0;state.packLossWh=0;
 state.packSoc=null;state.packVoltageV=null;state.packCellV=null;state.packOpenV=null;
}
