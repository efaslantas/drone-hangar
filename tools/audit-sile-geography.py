import json,collections,math
from pathlib import Path
from shapely.geometry import Polygon,LineString,MultiLineString,box
from shapely.ops import unary_union
root=Path(__file__).resolve().parents[1];d=json.loads((root/'public/maps/sile/map.json').read_text());s=json.loads((root/'public/maps/sile/source-osm.json').read_text());prov=json.loads((root/'public/maps/sile/provenance.json').read_text());p=d['projection'];nodes={e['id']:e for e in s['elements'] if e['type']=='node'}
def xy(lon,lat):return [(lon-p['lon'])*p['metresLon']-p['offsetX'],-(lat-p['lat'])*p['metresLat']-p['offsetZ']]
def line(e):return LineString([xy(nodes[n]['lon'],nodes[n]['lat']) for n in e['nodes']])
bb=prov['bbox'];a=xy(bb[0],bb[3]);b=xy(bb[2],bb[1]);area=box(*a,*b)
land=unary_union([Polygon(r[0],r[1:]) for r in d['terrain']['land']]);marine=unary_union([Polygon(r['rings'][0],r['rings'][1:]) for r in d['structures']]);solid=unary_union([Polygon(r['rings'][0],r['rings'][1:]) for r in d['buildings']]);coast=unary_union([line(e).intersection(area) for e in s['elements'] if e['type']=='way' and e.get('tags',{}).get('natural')=='coastline'])
modelCoast=[];bounds=d['terrain']['bounds']
for rings in d['terrain']['land']:
 for ring in rings:
  for aa,bb in zip(ring,ring[1:]+ring[:1]):
   if any(abs(aa[k//2]-v)<.015 and abs(bb[k//2]-v)<.015 for k,v in enumerate(bounds)):continue
   modelCoast.append(LineString([aa,bb]))
modelCoast=unary_union(modelCoast)
records=[];missing=[];water=[];conflicts=[]
for e in s['elements']:
 if e['type']!='way' or not e.get('tags',{}).get('highway') or len(e['nodes'])<2:continue
 geom=line(e).intersection(area)
 if geom.length<1:continue
 parts=[LineString(r['points']) for r in d['roads'] if r['id']==e['id']]
 if not parts:missing.append({'id':e['id'],'kind':e['tags']['highway'],'name':e['tags'].get('name',''),'lengthM':geom.length});continue
 model=unary_union(parts);diff=geom.segmentize(2).hausdorff_distance(model.segmentize(2));records.append({'id':e['id'],'maxSourceDeviationM':diff,'sourceLengthM':geom.length,'modelLengthM':model.length})
 gap=geom.difference(land.union(marine).buffer(.05))
 if gap.length>1:water.append({'id':e['id'],'name':e['tags'].get('name',''),'kind':e['tags']['highway'],'bridge':e['tags'].get('bridge'),'waterGapM':gap.length})
 blocked=geom.intersection(solid.buffer(-.15))
 if blocked.length>1:conflicts.append({'id':e['id'],'name':e['tags'].get('name',''),'kind':e['tags']['highway'],'buildingOverlapM':blocked.length})
report={'scope':'Existing2x2km snapshot source fidelity, not surveyed real-world accuracy','coast':{'sourceWays':sum(e['type']=='way' and e.get('tags',{}).get('natural')=='coastline' for e in s['elements']),'sourceLengthM':coast.length,'modelLengthM':modelCoast.length,'sourceConversionMaxDeviationM':coast.segmentize(2).hausdorff_distance(modelCoast.segmentize(2))},'roads':{'sourceWaysChecked':len(records)+len(missing),'modelPieces':len(d['roads']),'modelUniqueWayIds':len(set(r['id'] for r in d['roads'])),'missing':missing,'maxSourceConversionDeviationM':max(r['maxSourceDeviationM'] for r in records),'worst':sorted(records,key=lambda r:r['maxSourceDeviationM'],reverse=True)[:5],'overWaterNotOnSourcePier':water,'buildingCenterlineConflicts':conflicts},'sourceWidthTags':sum('width' in e.get('tags',{}) for e in s['elements'] if e['type']=='way' and e.get('tags',{}).get('highway'))}
report['sourceDate']=prov['osm']['retrievedDate']
report['roads']['namedModelPieces']=sum(bool(r.get('name')) for r in d['roads'])
report['roads']['namedSourceWays']=sum(bool(e.get('tags',{}).get('name')) for e in s['elements'] if e['type']=='way' and e.get('tags',{}).get('highway'))
report['roads']['waterBridgeSourceIds']=[e['id'] for e in water if e['bridge']]
report['roads']['unresolvedSourceSupportIds']=[e['id'] for e in water if not e['bridge']]
report['limits']=['Residuals are conversion rounding against OSM, NOT surveyed positional accuracy','All source road widths absent; model widths use class estimates','Native DSM is30m; missing islet has native elevation0m, no surveyed relief','Two service routes cross mapped water without bridge/support tags; no inferred landfill or invented bridges','Bayrak Caddesi source bridge is in the road network; underside/ground separation is not resolved by the DSM']
(root/'public/maps/sile/geography-audit.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(report,indent=2,ensure_ascii=False))
# A source-derived review map, not third-party map imagery.
import html
from math import atan2,degrees
lo,hi,top,bottom=d['terrain']['bounds'];width=hi-lo;height=bottom-top
items=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{lo} {top-100} {width} {height+200}" role="img" aria-labelledby="title desc"><title id="title">Şile merkez kaynak kıyı ve sokak kontrolü</title><desc id="desc">Mevcut yaklaşık2x2km alan. Sokaklara tıklayarak kaynak OSM kaydı açılır. Turuncu kesikli çizgiler kaynak desteği belirsiz iki servis güzergâhıdır. Saha ölçümü değildir.</desc><rect x="{lo}" y="{top-100}" width="{width}" height="{height+200}" fill="#dcebf1"/><g fill="#d8d1b2" stroke="#4c7563" stroke-width="1.2">']
for rings in d['terrain']['land']:
 path=' '.join('M'+' L'.join(f'{x},{z}' for x,z in ring)+' Z' for ring in rings);items.append(f'<path d="{path}" fill-rule="evenodd"/>')
items.append('</g>');warnings=set(report['roads']['unresolvedSourceSupportIds']);labels={}
for r in d['roads']:
 name=r.get('name') or 'Kaynakta isimsiz yol';kind=r['kind'];line=LineString(r['points']);color='#c17621' if r['id'] in warnings else '#7c609d' if r.get('bridge') else '#7e8a86' if kind in ['footway','path','steps','cycleway'] else '#3e4c53';dash='stroke-dasharray="7 5"' if r['id'] in warnings else '';path='M'+' L'.join(f'{x},{z}' for x,z in r['points']);title=html.escape(f"{name} · {kind} · model genişliği {r['width']}m (tahmini) · OSM {r['id']}")
 items.append(f'<a href="https://www.openstreetmap.org/way/{r["id"]}" target="_blank" rel="noopener"><path d="{path}" fill="none" stroke="{color}" stroke-width="{max(1.5,r["width"])}" stroke-linecap="round" {dash}><title>{title}</title></path></a>')
 if r.get('name') and kind in ['primary','secondary','tertiary'] and (name not in labels or line.length>labels[name].length):labels[name]=line
for name,line in labels.items():
 q=line.interpolate(.5,normalized=True);items.append(f'<text x="{q.x}" y="{q.y-8}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" fill="#132b3d" stroke="#eef4ef" stroke-width="3" paint-order="stroke">{html.escape(name)}</text>')
items.append(f'<g font-family="system-ui,sans-serif" fill="#132b3d"><text x="{lo+20}" y="{top-60}" font-size="32">Şile merkez · kıyı ve sokak kontrolü</text><text x="{lo+20}" y="{top-25}" font-size="19">OSM {report['sourceDate']} · {report['roads']['sourceWaysChecked']} yol kaydı / {report['roads']['modelPieces']} parça · {report['coast']['sourceWays']} kıyı çizgisi · genişlikler tahmini</text><text x="{lo+20}" y="{bottom+35}" font-size="18">Turuncu: taşıyıcı bilgisi belirsiz servis yolu · Mor: kaynakta köprü · Kuzey yukarı</text><text x="{lo+20}" y="{bottom+70}" font-size="18">© OpenStreetMap contributors · ODbL · Kaynağa tıklanabilir · Yerinde ölçüm değildir</text></g></svg>')
(root/'public/maps/sile/geography-check.svg').write_text(''.join(items)+'\n')
