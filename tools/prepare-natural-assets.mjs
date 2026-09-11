// Run fetch-models.mjs for these four IDs first. Keep source downloads outside
// the repository after conversion; the manifest records provenance and sizes.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const base=path.resolve('public/models');
const file=path.join(base,'manifest.json');
const manifest=JSON.parse(fs.readFileSync(file));
for(const id of ['pine_sapling_small','pine_sapling_medium','island_tree_01','island_tree_02','modular_chainlink_fence']) {
  const dir=path.join(base,id),archive=path.join('/tmp/hangar-natural-sources',id);
  const sourceDir=fs.existsSync(path.join(dir,`${id}_1k.gltf`))?dir:archive;
  const raw=path.join(sourceDir,`${id}_1k.gltf`);
  if(!fs.existsSync(raw))continue;
  execFileSync('python3',['tools/prepare-alpha.py',id,raw],{stdio:'inherit'});
  const out=path.join(dir,`${id}.glb`),lod=path.join(dir,`${id}-lod.glb`);
  const fence=id==='modular_chainlink_fence';
  const flags=['--compress','meshopt','--texture-compress','webp','--texture-size','1024','--join','false','--flatten','false','--instance','false'];
  execFileSync('npx',['--yes','@gltf-transform/cli@4','optimize',raw,out,...flags,'--simplify-ratio',fence?'.5':id==='pine_sapling_small'?'.3':id==='pine_sapling_medium'?'.035':'.07','--simplify-error',fence?'.001':'.015'],{stdio:'inherit'});
  if(!fence)execFileSync('npx',['--yes','@gltf-transform/cli@4','optimize',out,lod,...flags,'--simplify-ratio','.45','--simplify-error','.06'],{stdio:'inherit'});
  manifest[id]={...manifest[id],raw:manifest[id].raw||manifest[id].bytes,bytes:fs.statSync(out).size,file:`/models/${id}/${id}.glb`,encoding:'meshopt+webp',...(!fence?{lod:`/models/${id}/${id}-lod.glb`,lodBytes:fs.statSync(lod).size}:{})};
  fs.mkdirSync(archive,{recursive:true});
  for(const name of fs.readdirSync(dir))if(!name.endsWith('.glb'))fs.renameSync(path.join(dir,name),path.join(archive,name));
  fs.writeFileSync(file,JSON.stringify(manifest,null,1)+'\n');
}
