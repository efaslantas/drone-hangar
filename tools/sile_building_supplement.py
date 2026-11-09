"""Conservative, offline selection of source-reported ML roofprints; heights unknown."""
import argparse,json,hashlib,pathlib,subprocess,math
from shapely.geometry import Polygon,LineString,Point,shape
from shapely.ops import transform,unary_union

def select_footprints(data,collection,context=None):
 q=data['projection'];project=lambda x,y,z=None:((x-q['lon'])*q['metresLon']-q['offsetX'],(q['lat']-y)*q['metresLat']-q['offsetZ'])
 polygons=lambda items:[Polygon(a['rings'][0],a['rings'][1:]) for a in items]
 land=unary_union([Polygon(r[0],r[1:]) for r in data['terrain']['land']]);bounds=data['terrain']['bounds'];edges=[]
 for poly in data['terrain']['land']:
  for ring in poly:
   for a,b in zip(ring,ring[1:]+ring[:1]):
    if not any(abs(a[0 if k<2 else 1]-v)<.05 and abs(b[0 if k<2 else 1]-v)<.05 for k,v in enumerate(bounds)):edges.append(LineString([a,b]))
 if not edges:return []
 coast=unary_union(edges);occupied=unary_union(polygons(data['buildings']+data['structures'])).buffer(2);roads=unary_union([LineString(r['points']).buffer(r['width']/2+1.5) for r in data['roads']]);excluded=unary_union(polygons([a for k in ['beaches','green'] for a in (context or {}).get(k,[]) if a['kind'] in ['beach','park']]))
 result=[];seen=set()
 for f in sorted(collection['features'],key=lambda a:str(a.get('id',''))):
  id=f.get('id');t=f.get('properties') or {};sources=t.get('sources') or []
  if not id or id in seen or t.get('is_underground') or not sources or not all(s.get('dataset')=='Microsoft ML Buildings' and s.get('license')=='ODbL-1.0' and isinstance(s.get('confidence'),(int,float)) and math.isfinite(s['confidence']) and .99<=s['confidence']<=1 for s in sources):continue
  seen.add(id)
  try:p=transform(project,shape(f['geometry']))
  except (ValueError,TypeError,KeyError):continue
  if p.geom_type!='Polygon' or p.interiors or not p.is_valid or not 30<=p.area<=600 or not land.covers(p.buffer(1)) or coast.distance(p)>100 or p.distance(Point(0,0))<30 or p.intersects(occupied) or p.intersects(roads) or p.intersects(excluded):continue
  result.append({'id':id,'rings':[[[round(x,6),round(z,6)] for x,z in list(p.exterior.coords)[:-1]]],'height':7.5,'heightSource':'assumed-7.5m','confidence':min(s['confidence'] for s in sources),'source':'Microsoft ML Buildings / Overture Maps','sourceHeightAvailable':False});occupied=unary_union([occupied,p.buffer(2)])
 return result

def main():
 p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--map',default='public/maps/sile/map.json');p.add_argument('--context',default='src/data/sile-context.json');p.add_argument('--out',default='src/data/sile-building-supplement.json');p.add_argument('--public-out',default='public/maps/sile/building-supplement.json');p.add_argument('--source-out',default='public/maps/sile/source-overture-buildings.geojson');a=p.parse_args();data=json.loads(pathlib.Path(a.map).read_text());raw=pathlib.Path(a.input).read_bytes();collection=json.loads(raw);records=select_footprints(data,collection,json.loads(pathlib.Path(a.context).read_text()));ids={r['id'] for r in records};subset={'type':'FeatureCollection','attribution':'© Microsoft, Overture Maps Foundation; ODbL-1.0','release':'2026-10-21.0','features':sorted([f for f in collection['features'] if f.get('id') in ids],key=lambda f:f['id'])};source=(json.dumps(subset,separators=(',',':'),ensure_ascii=False)+'\n').encode();pathlib.Path(a.source_out).write_bytes(source)
 script='import fs from "node:fs";import c from "node:crypto";console.log(c.createHash("sha256").update(JSON.stringify(JSON.parse(fs.readFileSync(process.argv[1])))).digest("hex"))';digest=subprocess.check_output(['node','--input-type=module','-e',script,a.map],text=True).strip()
 key_script='import fs from "node:fs";import {buildingSnapshotKey}from"./src/sile-building-supplement-data.js";console.log(buildingSnapshotKey(JSON.parse(fs.readFileSync(process.argv[1]))))';snapshot_key=subprocess.check_output(['node','--input-type=module','-e',key_script,a.map],text=True).strip()
 result={'baseMapSnapshotKey':snapshot_key,'version':1,'date':'2026-11-09','license':'ODbL-1.0','release':'2026-10-21.0','attribution':'© Microsoft, Overture Maps Foundation','baseMapCanonicalSha256':digest,'sourceSubsetSha256':hashlib.sha256(source).hexdigest(),'sourceUrl':'https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com/release/2026-10-21.0/theme=buildings/type=building/','sourceDocs':'https://docs.overturemaps.org/guides/buildings/','notice':'ML-derived footprint candidates, not field-verified buildings. Height7.5m and flat roof are assumptions. Runtime also rejects occupied or steep locations.','records':records};text=json.dumps(result,indent=2,ensure_ascii=False)+'\n'
 for name in [a.out,a.public_out]:pathlib.Path(name).write_text(text)
 print(json.dumps({'selected':len(records),'baseMapSha256':digest,'sourceSubsetSha256':result['sourceSubsetSha256']}))
if __name__=='__main__':main()
