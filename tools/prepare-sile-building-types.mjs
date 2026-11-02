import fs from 'node:fs';import crypto from 'node:crypto';
const root=new URL('../',import.meta.url),raw=fs.readFileSync(new URL('public/maps/sile/source-osm.json',root)),osm=JSON.parse(raw),map=JSON.parse(fs.readFileSync(new URL('public/maps/sile/map.json',root))),ids=new Set(map.buildings.map(b=>b.id));
const types=Object.fromEntries(osm.elements.filter(e=>e.type==='way'&&ids.has(e.id)).map(e=>[e.id,e.tags?.building||'yes']));
const result={license:'ODbL-1.0',sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),projection:map.projection,buildingCount:map.buildings.length,types};
const text=JSON.stringify(result,null,2)+'\n';fs.writeFileSync(new URL('src/data/sile-building-types.json',root),text);fs.writeFileSync(new URL('public/maps/sile/building-types.json',root),text);console.log('Source building types:',Object.keys(types).length);
