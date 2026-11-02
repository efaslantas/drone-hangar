"""Offline Şile pilot: source OSM JSON + Copernicus COG -> local metric data.
Run in the recorded GIS environment; no network access during conversion.
"""
import argparse,hashlib,json,math,pathlib,datetime
import numpy as np
import rasterio
from rasterio.windows import from_bounds,Window
from shapely.geometry import Polygon,LineString,Point,box,mapping
from shapely.ops import polygonize,unary_union
from shapely import constrained_delaunay_triangles
from sile_geography import coast_land_classifier,road_features

parser=argparse.ArgumentParser();parser.add_argument('--osm',required=True);parser.add_argument('--dem',required=True);parser.add_argument('--out',default='public/maps/sile');args=parser.parse_args()
out=pathlib.Path(args.out);out.mkdir(parents=True,exist_ok=True)
rawpath=pathlib.Path(args.osm);dempath=pathlib.Path(args.dem);raw=json.loads(rawpath.read_text());elements=raw['elements'];nodes={e['id']:e for e in elements if e['type']=='node'};ways={e['id']:e for e in elements if e['type']=='way'}
lat0,lon0=41.1744067,29.6125216;phi=math.radians(lat0);e2=.00669437999014;den=math.sqrt(1-e2*math.sin(phi)**2);mx=math.pi/180*6378137/den*math.cos(phi);my=math.pi/180*6378137*(1-e2)/den**3
bbox=[29.60059,41.16540,29.62445,41.18341]
def project(lon,lat):return ((lon-lon0)*mx,(lat-lat0)*my)
def ll(x,y):return lon0+x/mx,lat0+y/my
area=box(*project(bbox[0],bbox[1]),*project(bbox[2],bbox[3]))
def coords(e):return [project(nodes[n]['lon'],nodes[n]['lat']) for n in e['nodes'] if n in nodes]
def polygons(g):return [g] if g.geom_type=='Polygon' else [p for p in getattr(g,'geoms',[]) if p.geom_type=='Polygon']
coasts=[LineString(coords(e)) for e in ways.values() if e.get('tags',{}).get('natural')=='coastline']
on_land=coast_land_classifier(coasts)
faces=polygonize(unary_union([area.boundary,*[l.intersection(area) for l in coasts]]));land=unary_union([p for p in faces if on_land(p.representative_point())]).buffer(0)
if not .3<land.area/area.area<.95:raise ValueError('Unexpected coastline polygonization')
# Polygon ways and building multipolygons, excluding relation-member duplicates.
features=[];relation_members=set()
for e in elements:
 tags=e.get('tags',{})
 if e['type']=='relation' and tags.get('building') not in [None,'no']:
  outer=[];inner=[]
  for m in e.get('members',[]):
   if m['type']=='way' and m['ref'] in ways:
    relation_members.add(m['ref']);(inner if m.get('role')=='inner' else outer).append(LineString(coords(ways[m['ref']])))
  geometry=unary_union(list(polygonize(unary_union(outer))))
  if inner:geometry=geometry.difference(unary_union(list(polygonize(unary_union(inner)))))
  features.append((e,geometry))
for e in ways.values():
 if e.get('tags',{}).get('building') not in [None,'no'] and e['id'] not in relation_members:
  xy=coords(e)
  if len(xy)>3 and xy[0]==xy[-1]:features.append((e,Polygon(xy).buffer(0)))
buildings=[]
for e,g in features:
 for p in polygons(g.intersection(area).intersection(land)):
  p=p.simplify(.3,preserve_topology=True)
  if p.area>=4:buildings.append((e,p))
obstacles=unary_union([p for _,p in buildings]);park=Polygon(coords(ways[875156654])).buffer(0)
# Select an open, source-park launch point. The pad itself is an authored aid.
candidates=[]
for x in np.arange(park.bounds[0],park.bounds[2],2):
 for y in np.arange(park.bounds[1],park.bounds[3],2):
  p=Point(x,y)
  if park.covers(p) and land.covers(p):candidates.append((min(p.distance(obstacles),p.distance(park.boundary)),x,y))
clearance,px,py=max(candidates)
if clearance<6:raise ValueError('No safe open launch point')
with rasterio.open(dempath) as ds:
 w=from_bounds(*bbox,ds.transform).round_offsets().round_lengths();w=Window(w.col_off-2,w.row_off-2,w.width+4,w.height+4)
 crop=ds.read(1,window=w);transform=ds.window_transform(w);inverse=~transform
 profile=ds.profile.copy();profile.update(width=crop.shape[1],height=crop.shape[0],transform=transform,compress='deflate',tiled=False)
 # GeoTIFF source crop preserves native samples and CRS, separately downloadable.
 profile.pop('blockxsize',None);profile.pop('blockysize',None)
 with rasterio.open(out/'source-dem.tif','w',**profile) as target:target.write(crop,1)
 def sample(x,y):
  lon,lat=ll(x,y);c,r=inverse*(lon,lat);c-=.5;r-=.5;c=max(0,min(crop.shape[1]-1.001,c));r=max(0,min(crop.shape[0]-1.001,r));i,j=int(c),int(r);u,v=c-i,r-j
  return float(crop[j,i]*(1-u)*(1-v)+crop[j,i+1]*u*(1-v)+crop[j+1,i]*(1-u)*v+crop[j+1,i+1]*u*v)
 datum=round(sample(px,py),2)
 cols=rows=65;minx,miny,maxx,maxy=area.bounds;xs=np.linspace(minx,maxx,cols);ys=np.linspace(maxy,miny,rows);heights=[round(sample(x,y),2) for y in ys for x in xs]
# Runtime uses x east,z south, y height relative to the launch point.
def xz(x,y):return [round(x-px,2),round(py-y,2)]
def rings(p):return [[xz(x,y) for x,y in list(r.coords)[:-1]] for r in [p.exterior,*p.interiors]]
bounds=[round(minx-px,2),round(maxx-px,2),round(py-maxy,2),round(py-miny,2)]
terrain={'cols':cols,'rows':rows,'bounds':bounds,'heights':heights,'datum':datum,'land':[rings(p) for p in polygons(land)]}
def gridheight(x,y):
 u=(x-minx)/(maxx-minx)*(cols-1);v=(maxy-y)/(maxy-miny)*(rows-1);i=max(0,min(cols-2,int(u)));j=max(0,min(rows-2,int(v)));u=max(0,min(1,u-i));v=max(0,min(1,v-j));a,b,c,d=heights[j*cols+i],heights[j*cols+i+1],heights[(j+1)*cols+i],heights[(j+1)*cols+i+1]
 return a+(b-a)*u+(c-a)*v if u+v<=1 else b*(1-v)+c*(1-u)+d*(u+v-1)
# Clip each terrain triangle against the real coastline; elevation remains on
# that same triangle plane, preserving runtime collision/sample agreement.
positions=[]
for j in range(rows-1):
 for i in range(cols-1):
  a=(xs[i],ys[j]);b=(xs[i+1],ys[j]);c=(xs[i],ys[j+1]);d=(xs[i+1],ys[j+1])
  for triangle in [Polygon([a,c,b]),Polygon([b,c,d])]:
   for part in polygons(triangle.intersection(land)):
    for tri in constrained_delaunay_triangles(part).geoms:
     pts=list(tri.exterior.coords)[:3]
     # With z=-north, source XY CCW becomes upward winding in runtime X/Y/Z.
     if not tri.exterior.is_ccw:pts.reverse()
     for x,y in pts:
      q=xz(x,y);positions.extend([q[0],round(gridheight(x,y)-datum,2),q[1]])
roads=road_features(ways,coords,area,xz)
structures=[]
for e in ways.values():
 kind=e.get('tags',{}).get('man_made')
 if kind not in ['pier','breakwater','groyne','quay']:continue
 xy=coords(e)
 if len(xy)<2:continue
 width=8 if kind=='breakwater' else 4
 try:width=max(1,min(30,float(e.get('tags',{}).get('width',width))))
 except ValueError:pass
 g=Polygon(xy).buffer(0) if len(xy)>3 and xy[0]==xy[-1] else LineString(xy).buffer(width/2,cap_style=2,join_style=2)
 for p in polygons(g.intersection(area)):
  if p.area>3:structures.append({'id':e['id'],'kind':kind,'rings':rings(p),'base':round(-datum-2,2),'height':3.5 if kind=='pier' else 3,'heightSource':'assumed-marine-structure'})
result_buildings=[];landmarks=[]
for e,p in buildings:
 tags=e.get('tags',{});height=7.5;source='assumed-7.5m'
 if tags.get('building:levels'):
  try:height=max(2,min(80,float(tags['building:levels'])*3));source='OSM-levels-x3m'
  except ValueError:pass
 if tags.get('height'):
  try:height=max(2,min(100,float(tags['height'].replace(' m',''))));source='OSM-height'
  except ValueError:pass
 if tags.get('man_made')=='lighthouse':height=19;source='KEGM-tower-height'
 if tags.get('historic')=='castle':height=12;source='assumed-castle-12m'
 base=min(gridheight(x,y) for x,y in p.exterior.coords)-datum
 record={'id':e['id'],'rings':rings(p),'base':round(base,2),'height':height,'heightSource':source}
 if tags.get('man_made')=='lighthouse':record['landmark']='lighthouse'
 if tags.get('historic')=='castle':record['landmark']='castle'
 result_buildings.append(record)
 if record.get('landmark'):
  q=p.centroid;x,z=xz(q.x,q.y);landmarks.append({'name':tags['name'],'x':x,'z':z,'kind':record['landmark'],'id':e['id'],'heightSource':source})
projection={'lat':lat0,'lon':lon0,'metresLat':my,'metresLon':mx,'offsetX':px,'offsetZ':-py}
mapdata={'version':1,'id':'sile','projection':projection,'terrain':terrain,'positions':positions,'roads':roads,'buildings':result_buildings,'landmarks':landmarks,'structures':structures,'spawn':{'x':0,'z':0},'stats':{'buildings':len(result_buildings),'roads':len(roads),'marineStructures':len(structures),'terrainTriangles':len(positions)//9,'measuredBuildingHeights':sum(b['heightSource']=='OSM-height' for b in result_buildings),'sourceBuildingLevels':sum(b['heightSource']=='OSM-levels-x3m' for b in result_buildings),'landFraction':round(land.area/area.area,4),'spawnClearanceM':round(clearance,2)}}
(out/'map.json').write_text(json.dumps(mapdata,separators=(',',':'),ensure_ascii=False)+'\n')
# Shareable ODbL source subset: retain geographic facts/tags, omit contributor metadata.
clean={'version':.6,'license':'https://opendatacommons.org/licenses/odbl/1-0/','attribution':'© OpenStreetMap contributors','bounds':bbox,'elements':[{k:e[k] for k in ['type','id','lat','lon','nodes','members','tags'] if k in e} for e in elements]}
(out/'source-osm.json').write_text(json.dumps(clean,separators=(',',':'),ensure_ascii=False)+'\n')
notice='produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved'
provenance={'generatedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'bbox':bbox,'projection':projection,'verticalDatum':'EGM2008 source; runtime relative to launch '+str(datum)+'m','osm':{'url':'https://api.openstreetmap.org/api/0.6/map.json?bbox='+','.join(map(str,bbox)),'license':'ODbL-1.0','rawSha256':hashlib.sha256(rawpath.read_bytes()).hexdigest(),'retrievedDate':'2026-11-01'},'dem':{'url':'https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N41_00_E029_00_DEM/Copernicus_DSM_COG_10_N41_00_E029_00_DEM.tif','sourceSha256':hashlib.sha256(dempath.read_bytes()).hexdigest(),'release':'2021 public GLO-30 DSM','sampling':'native crop, bilinear to65x65, triangle interpolation; no bare-earth correction','notice':notice},'lighthouse':{'url':'https://www.kiyiemniyeti.gov.tr/yer-detay/612/SILE-FENERI','towerHeightM':19,'appearance':'authored schematic; not scanned'},'assumptions':['Most building heights7.5m; OSM levels converted at3m/level','Castle12m assumed; facades/roofs schematic','Road widths follow OSM width if numeric, otherwise class defaults','DSM includes roofs/vegetation; no bare-earth or centimetre collision accuracy','Synthetic launch pad in an OSM park; not a real designated flying site','No imagery, no bathymetry, no real-time or complete city replica'], 'stats':mapdata['stats']}
provenance['files']={p.name:{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in out.iterdir() if p.name in ['map.json','source-osm.json','source-dem.tif']}
(out/'provenance.json').write_text(json.dumps(provenance,indent=2,ensure_ascii=False)+'\n')
# A source-derived map-card preview, not a copied tile/image.
w,h=640,440;scale=min((w-20)/(maxx-minx),(h-20)/(maxy-miny))
def svgpoint(x,y):return (10+(x-minx)*scale,10+(maxy-y)*scale)
paths=[]
for p in polygons(land):
 path=' '.join('M'+' L'.join(f'{svgpoint(x,y)[0]:.1f},{svgpoint(x,y)[1]:.1f}' for x,y in r.coords)+' Z' for r in [p.exterior,*p.interiors]);paths.append(f'<path d="{path}" fill="#71815f" fill-rule="evenodd"/>')
for road in roads:
 points=' '.join(f'{10+(x+px-minx)*scale:.1f},{10+(z-py+maxy)*scale:.1f}' for x,z in road['points']);paths.append(f'<polyline points="{points}" fill="none" stroke="#c9c7b6" stroke-width="1"/>')
(out/'preview.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"><rect width="{w}" height="{h}" fill="#28596a"/>'+''.join(paths)+'<text x="18" y="420" fill="white" font-size="14">Şile · OSM / Copernicus · veri tabanlı taslak</text></svg>')
print(json.dumps(mapdata['stats'],ensure_ascii=False));print('datum',datum,'spawn',ll(px,py));print('bytes', (out/'map.json').stat().st_size)
