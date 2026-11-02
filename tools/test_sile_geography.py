import json,unittest
from pathlib import Path
from shapely.geometry import LineString,Polygon,box
try:
 from sile_geography import coast_land_classifier,road_features
except ImportError:
 coast_land_classifier=road_features=None
class GeographySourceTests(unittest.TestCase):
 def test_actual_concave_closed_coast_is_land(self):
  self.assertTrue(callable(coast_land_classifier))
  raw=json.loads((Path(__file__).parents[1]/'public/maps/sile/source-osm.json').read_text());nodes={e['id']:e for e in raw['elements'] if e['type']=='node'}
  w=next(e for e in raw['elements'] if e['type']=='way' and e['id']==256360436);coast=LineString([(nodes[n]['lon'],nodes[n]['lat']) for n in w['nodes']]);p=Polygon(coast.coords)
  self.assertTrue(p.is_valid);self.assertTrue(coast_land_classifier([coast])(p.representative_point()))
 def test_closed_water_hole_stays_water(self):
  self.assertTrue(callable(coast_land_classifier))
  outer=LineString([(0,0),(20,0),(20,20),(0,20),(0,0)]);hole=LineString([(5,5),(5,10),(10,10),(10,5),(5,5)]);q=coast_land_classifier([outer,hole])
  from shapely.geometry import Point
  self.assertTrue(q(Point(2,2)));self.assertFalse(q(Point(7,7)));self.assertFalse(q(Point(30,10)))
 def test_link_classes_and_bridge_name_survive_source_conversion(self):
  self.assertTrue(callable(road_features));ways={1:{'id':1,'tags':{'highway':'primary_link','name':'Bağlantı','oneway':'yes'},'coords':[(-20,0),(20,0)]},2:{'id':2,'tags':{'highway':'footway','bridge':'yes','name':'Kıyı bağlantısı'},'coords':[(0,-5),(0,5)]}}
  out=road_features(ways,lambda e:e['coords'],box(-10,-10,10,10),lambda x,y:[round(x,2),round(y,2)])
  self.assertEqual({r['id'] for r in out},{1,2});self.assertEqual(out[0]['kind'],'primary_link');self.assertEqual(out[0]['name'],'Bağlantı');self.assertEqual(out[1]['bridge'],True);self.assertEqual(out[0]['points'][0],[-10,0]);self.assertEqual(out[0]['points'][-1],[10,0])
if __name__=='__main__':unittest.main()
