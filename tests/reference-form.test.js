import test from 'node:test';
import assert from 'node:assert/strict';
import * as form from '../src/reference-form.js';
import { normalizeReference } from '../src/propulsion-reference.js';
class Field extends EventTarget {constructor(value='',disabled=false){super();this.value=value;this.disabled=disabled}change(value){this.value=value;this.dispatchEvent(new Event('change'))}}
test('manual inertia remains editable through invalid intermediate triples and commits the complete draft only on Apply',()=>{
 const fields={'reference-profile':new Field('f60-1750-6s'),'reference-apply':new Field(),'dyn-inertia-mode':new Field('estimated'),'dyn-inertia-x':new Field('.002',true),'dyn-inertia-y':new Field('.003',true),'dyn-inertia-z':new Field('.002',true)};
 let commits=0,result=null;
 form.bindReferenceForm({getElementById:id=>fields[id]},()=>{commits++;result=normalizeReference({profile:fields['reference-profile'].value,dynamics:{inertiaMode:fields['dyn-inertia-mode'].value,inertiaX:Number(fields['dyn-inertia-x'].value),inertiaY:Number(fields['dyn-inertia-y'].value),inertiaZ:Number(fields['dyn-inertia-z'].value)}})});
 fields['dyn-inertia-mode'].change('manual');assert.equal(commits,0);
 for(const id of ['dyn-inertia-x','dyn-inertia-y','dyn-inertia-z']){assert.equal(fields[id].disabled,false);fields[id].change('.01');assert.equal(commits,0)}
 fields['reference-apply'].dispatchEvent(new Event('click'));
 assert.equal(commits,1);assert.equal(result.dynamics.inertiaMode,'manual');assert.equal(result.dynamics.inertiaX,.01);assert.equal(result.dynamics.inertiaY,.01);assert.equal(result.dynamics.inertiaZ,.01);
 fields['dyn-inertia-mode'].change('estimated');assert.equal(fields['dyn-inertia-x'].disabled,true);
});
