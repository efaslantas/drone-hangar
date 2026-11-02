"""Fetch checksum-verified CC0 visual sources and make local bounded textures."""
import concurrent.futures,hashlib,io,json,urllib.request
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
HEADERS={'User-Agent':'drone-hangar-asset-fetch/1.0'}
def fetch(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers=HEADERS),timeout=45) as response:return response.read()
def metadata(asset):return json.loads(fetch('https://api.polyhaven.com/files/'+asset))
wall=metadata('damaged_plaster');sky=metadata('overcast_soil_puresky')
entries=[('damaged_plaster',channel,wall[key]['1k']['jpg'],f'public/materials/damaged_plaster/{channel}.jpg') for channel,key in [('color','Diffuse'),('normal','nor_gl'),('roughness','Rough')]]
entries.append(('overcast_soil_puresky','hdri',sky['hdri']['1k']['hdr'],'public/arcade-assets/overcast_soil_puresky_1k.hdr'))
def download(entry):
 asset,channel,source,name=entry;path=ROOT/name
 data=path.read_bytes() if path.exists() else fetch(source['url'])
 assert hashlib.md5(data).hexdigest()==source['md5'],name
 path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
 record={'asset':asset,'channel':channel,'source':source['url'],'license':'CC0','page':'https://polyhaven.com/a/'+asset,'md5':source['md5'],'sha256':hashlib.sha256(data).hexdigest(),'file':'/'+name.removeprefix('public/'),'bytes':len(data)}
 if channel!='hdri':
  image=Image.open(io.BytesIO(data)).convert('RGB');record['variants']={}
  for size in [512,1024]:
   out=ROOT/f'public/materials/web-v1/{size}/{asset}/{channel}.webp';out.parent.mkdir(parents=True,exist_ok=True)
   image.resize((size,size),Image.Resampling.LANCZOS).save(out,'WEBP',quality=90 if channel=='normal' else 85,method=6)
   encoded=out.read_bytes();record['variants'][str(size)]={'file':'/'+str(out.relative_to(ROOT/'public')),'sha256':hashlib.sha256(encoded).hexdigest(),'bytes':len(encoded)}
 return record
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:records=list(pool.map(download,entries))
out=ROOT/'public/arcade-assets/sources.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps({'verified':len(records),'sourceBytes':sum(r['bytes'] for r in records),'webBytes':sum(v['bytes'] for r in records for v in r.get('variants',{}).values())}))
