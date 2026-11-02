"""Source geography conversion shared by the offline Şile producer and tests."""
from shapely.geometry import LineString,Polygon
ROAD_KINDS={'primary','primary_link','secondary','secondary_link','tertiary','tertiary_link','residential','unclassified','service','living_street','pedestrian','footway','path','steps','track','cycleway'}
WIDTHS={'primary':8,'secondary':7,'tertiary':6,'residential':5,'service':4,'pedestrian':3,'footway':1.5,'path':1.5,'steps':2}
def coast_land_classifier(coasts):
 # At a concave corner the nearest point can be an endpoint; the sign of
 # either incident segment alone does not classify a polygon interior.
 closed=[Polygon(l.coords) for l in coasts if l.is_ring and Polygon(l.coords).is_valid]
 segments=[(a,b) for l in coasts for a,b in zip(list(l.coords),list(l.coords)[1:]) if a!=b]
 def on_land(point):
  containing=[p for p in closed if p.covers(point)]
  if containing:return min(containing,key=lambda p:p.area).exterior.is_ccw
  nearest=(float('inf'),False)
  for a,b in segments:
   dx,dy=b[0]-a[0],b[1]-a[1];s=dx*dx+dy*dy;t=max(0,min(1,((point.x-a[0])*dx+(point.y-a[1])*dy)/s));qx,qy=a[0]+t*dx,a[1]+t*dy;d=(point.x-qx)**2+(point.y-qy)**2
   if d<nearest[0]:nearest=(d,dx*(point.y-a[1])-dy*(point.x-a[0])>0)
  return nearest[1]
 return on_land

def road_features(ways,coords,area,xz):
 roads=[]
 for e in ways.values():
  tags=e.get('tags',{});kind=tags.get('highway')
  if kind not in ROAD_KINDS:continue
  points=coords(e)
  if len(points)<2:continue
  width=WIDTHS.get(kind,4)
  try:width=max(.8,min(15,float(tags.get('width',width))))
  except (ValueError,TypeError):pass
  g=LineString(points).intersection(area)
  for line in ([g] if g.geom_type=='LineString' else getattr(g,'geoms',[])):
   if line.geom_type!='LineString' or line.length<1:continue
   line=line.segmentize(8)
   road={'id':e['id'],'kind':kind,'width':width,'points':[xz(x,y) for x,y in line.coords]}
   if tags.get('name'):road['name']=tags['name']
   if tags.get('bridge') not in (None,'no'):road['bridge']=True
   roads.append(road)
 return roads
