import unittest,copy
from sile_building_supplement import select_footprints

def feature(id='a',x=40,z=-50,confidence=.999):
 ring=[[x,z],[x+8,z],[x+8,z+6],[x,z+6],[x,z]]
 return {'id':id,'type':'Feature','geometry':{'type':'Polygon','coordinates':[[[a,-b] for a,b in ring]]},'properties':{'sources':[{'dataset':'Microsoft ML Buildings','license':'ODbL-1.0','confidence':confidence}], 'is_underground':False}}
def fixture():
 return {'projection':{'lat':0,'lon':0,'metresLat':1,'metresLon':1,'offsetX':0,'offsetZ':0},'terrain':{'bounds':[-200,200,-200,200],'land':[[[[-200,-100],[200,-100],[200,200],[-200,200]]]]},'buildings':[{'rings':[[[100,-50],[110,-50],[110,-40],[100,-40]]]}],'structures':[],'roads':[]}
class SupplementTest(unittest.TestCase):
 def test_accepted_footprints_preserve_source_geometry_and_explicit_height_limit(self):
  m=fixture();f=feature();before=copy.deepcopy((m,f));r=select_footprints(m,{'features':[f]});self.assertEqual(len(r),1);self.assertEqual(r[0]['rings'][0],[[40,-50],[48,-50],[48,-44],[40,-44]]);self.assertEqual(r[0]['heightSource'],'assumed-7.5m');self.assertEqual(r[0]['height'],7.5);self.assertEqual((m,f),before)
 def test_confidence_license_underwater_old_building_road_and_spawn_are_rejected(self):
  cases=[]
  f=feature(confidence=.98);cases.append((fixture(),f));f=feature();f['properties']['sources'][0]['license']='unknown';cases.append((fixture(),f));f=feature();f['properties']['is_underground']=True;cases.append((fixture(),f));cases.extend([(fixture(),feature(z=-103)),(fixture(),feature(x=100)),(fixture(),feature(x=0,z=0))]);m=fixture();m['roads']=[{'points':[[35,-48],[55,-48]],'width':4}];cases.append((m,feature()))
  for m,f in cases:
   with self.subTest(f=f):self.assertEqual(select_footprints(m,{'features':[f]}),[])
 def test_selection_is_order_independent_and_rejects_duplicate_overlap(self):
  f=[feature('b',x=42),feature('a')];self.assertEqual(select_footprints(fixture(),{'features':f}),select_footprints(fixture(),{'features':list(reversed(f))}));self.assertEqual(len(select_footprints(fixture(),{'features':f})),1)
 def test_map_cut_border_is_not_a_coastline(self):
  m=fixture();m['terrain']['land']=[[[[-200,-200],[200,-200],[200,200],[-200,200]]]];self.assertEqual(select_footprints(m,{'features':[feature(x=170,z=0)]}),[])
if __name__=='__main__':unittest.main()
