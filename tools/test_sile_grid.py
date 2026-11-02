import unittest
from sile_grid import preserve_grid
class PreserveGrid(unittest.TestCase):
 def setUp(self):self.old={'cols':3,'rows':2,'bounds':[0,20,0,10],'heights':[1,2,3,4,5,6]}
 def test_east_and_west_keep_old_samples_exactly(self):
  for side,bounds,raw,expected in [('east',[0,40,0,10],[1.001,2,3,7,8,4,5.001,6,9,10],[1,2,3,7,8,4,5,6,9,10]),('west',[-20,20,0,10],[7,8,1.001,2,3,9,10,4,5.001,6],[7,8,1,2,3,9,10,4,5,6])]:
   result=preserve_grid(self.old,5,2,bounds,raw,side);self.assertEqual(result['heights'],expected);self.assertEqual(result['extra'],2)
 def test_rejects_real_sample_drift_or_wrong_edge(self):
  for bounds,raw in [([0,40,0,10],[2,2,3,7,8,4,5,6,9,10]),([1,41,0,10],[1,2,3,7,8,4,5,6,9,10])]:
   with self.assertRaises(ValueError):preserve_grid(self.old,5,2,bounds,raw,'east')
if __name__=='__main__':unittest.main()
