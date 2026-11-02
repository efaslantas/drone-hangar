import {normalizeReference,REFERENCE_KEY} from './propulsion-reference.js';
export const SOURCE_ONE_PRESET=Object.freeze({
 id:'source-one-v4',name:'SOURCE ONE v4 · 5 inç / 6S',
 source:'https://github.com/tbs-trappy/source_one/tree/9ae65b1387f192fb90d07d483178169924b286b5',
 license:'https://github.com/tbs-trappy/source_one/blob/9ae65b1387f192fb90d07d483178169924b286b5/LICENSE',
});
export function pinSourceOne(storage,existing){
 const setup=normalizeReference({airframe:SOURCE_ONE_PRESET.id,profile:'f60-1750-6s',massG:650,capacityMah:1100,usableFraction:.8,electronicsA:.5,battery:{mode:'rint'},dynamics:{wheelbaseMm:226}});
 const setups={...existing,freestyle:setup};let saved=false;
 try{if(storage?.setItem){storage.setItem(REFERENCE_KEY,JSON.stringify(setups));saved=true;}}catch{}
 return {setups,saved};
}
