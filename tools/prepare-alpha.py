"""Embed Poly Haven's separate alpha masks in glTF base-color images.
The source exports use JPEG diffuse maps, which cannot carry leaf/wire alpha.
Requires Pillow; curl handles the asset service's TLS configuration.
"""
import json, pathlib, subprocess, sys
from PIL import Image
model, source = sys.argv[1], pathlib.Path(sys.argv[2])
doc = json.loads(source.read_text())
meta = json.loads(subprocess.check_output(['curl','-fsS','--retry','3','https://api.polyhaven.com/files/'+model]))
for material in doc.get('materials', []):
    if material.get('alphaMode') not in ('MASK','BLEND'): continue
    group = material['name'].removeprefix(model+'_')
    entry = meta.get(group+'_alpha',{}).get('1k',{}).get('png')
    if not entry: raise RuntimeError('Missing opacity map: '+material['name'])
    texture = doc['textures'][material['pbrMetallicRoughness']['baseColorTexture']['index']]
    image = doc['images'][texture['source']]
    diffuse = source.parent/image['uri']
    if diffuse.suffix == '.png': continue
    mask = source.parent/'textures'/(material['name']+'_alpha.png')
    subprocess.run(['curl','-fsS','--retry','3',entry['url'],'-o',str(mask)],check=True)
    color = Image.open(diffuse).convert('RGBA')
    alpha = Image.open(mask).convert('L').resize(color.size,Image.Resampling.LANCZOS)
    color.putalpha(alpha)
    target = diffuse.with_suffix('.png'); color.save(target)
    image['uri'] = str(target.relative_to(source.parent))
    image.pop('mimeType',None)
    material['alphaMode']='MASK';material['alphaCutoff']=.4
source.write_text(json.dumps(doc))
