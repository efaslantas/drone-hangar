import test from 'node:test';
import assert from 'node:assert/strict';
import {bindRcSetup} from '../src/rc-setup.js';
import {RC_KEY,finishRcCalibration,normalizeRcSettings,mapRcInput} from '../src/rc-input.js';
import {getInputSettings} from '../src/input.js';

function setup() {
 const elements=new Map();
 const element=()=>({value:'',checked:false,disabled:false,hidden:false,textContent:'',handlers:{},append(){},replaceChildren(){},addEventListener(name,fn){this.handlers[name]=fn;}});
 const el=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
 globalThis.document={createElement:element,getElementById:el};
 const radio={id:'TX15',index:0,axes:[.03,-.02,-1,.01],buttons:[]};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[radio]}});
 const config=finishRcCalibration(normalizeRcSettings({mode:'rc',deviceId:'TX15'}),[.03,-.02,-1,.01],[-.9,-.8,-1,-.9],[.8,.9,1,.8]);
 let saved=JSON.stringify(config);
 const storage={getItem:key=>key===RC_KEY?saved:null,setItem:(key,value)=>{assert.equal(key,RC_KEY);saved=value;}};
 const root={querySelector:selector=>el(selector.slice(1)),closest:()=>null};
 bindRcSetup(root,storage);
 return {el,radio,config,saved:()=>JSON.parse(saved)};
}

test('reselecting the saved radio preserves calibration and measured ranges after reload',()=>{
 const s=setup();
 s.el('rc-device').value='0';s.el('rc-device').handlers.change();
 assert.deepEqual(s.saved(),s.config);
 assert.equal(mapRcInput(s.radio,getInputSettings()).rcReady,true);
 assert.equal(mapRcInput(s.radio,normalizeRcSettings(s.saved())).rcReady,true);
});

test('the same radio on another USB index retains calibration',()=>{
 const s=setup();s.radio.index=2;
 s.el('rc-device').value='2';s.el('rc-device').handlers.change();
 assert.equal(s.saved().deviceIndex,2);
 assert.equal(s.saved().calibrated,true);
 assert.deepEqual(s.saved().axes,s.config.axes);
});

test('a different radio requires calibration',()=>{
 const s=setup();s.radio.id='Other radio';
 s.el('rc-device').value='0';s.el('rc-device').handlers.change();
 assert.equal(s.saved().calibrated,false);
 assert.equal(mapRcInput(s.radio,getInputSettings()).rcReady,false);
});

test('unchanged axis selection preserves calibration; a changed mapping invalidates it',()=>{
 const s=setup();
 s.el('rc-axis-roll').value='0';s.el('rc-axis-roll').handlers.change();
 assert.equal(s.saved().calibrated,true);
 s.el('rc-axis-roll').value='4';s.el('rc-axis-roll').handlers.change();
 assert.equal(s.saved().calibrated,false);
});
