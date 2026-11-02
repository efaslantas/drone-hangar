// Reproducible derivation from the already-published ODbL snapshot; no network.
import fs from 'node:fs';import crypto from 'node:crypto';import {projectCoordinate} from '../src/geo-terrain.js';
const base=new URL('../',import.meta.url),raw=fs.readFileSync(new URL('public/maps/sile/source-osm.json',base)),osm=JSON.parse(raw),map=JSON.parse(fs.readFileSync(new URL('public/maps/sile/map.json',base))),nodes=new Map(osm.elements.filter(e=>e.type==='node').map(e=>[e.id,e]));
const features=[];
for(const e of osm.elements){if(e.type!=='way'||!['beach','bare_rock'].includes(e.tags?.natural)||e.nodes[0]!==e.nodes.at(-1)||e.nodes.some(id=>!nodes.has(id)))continue;
 const ring=e.nodes.slice(0,-1).map(id=>{const n=nodes.get(id);return projectCoordinate(map.projection,n.lon,n.lat).map(v=>Math.round(v*1e6)/1e6);});
 features.push({id:e.id,kind:e.tags.natural==='beach'?'sand':'rock',rings:[ring]});
}
const data={source:'existing source-osm.json snapshot',sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),license:'ODbL-1.0',projection:map.projection,features};
const serialized=JSON.stringify(data,null,2)+'\n';
fs.writeFileSync(new URL('src/data/sile-coast.json',base),serialized);fs.writeFileSync(new URL('public/maps/sile/coast-surfaces.json',base),serialized);console.log('Derived coastal surface polygons:',features.length);
