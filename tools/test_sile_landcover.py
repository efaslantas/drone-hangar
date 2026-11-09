import importlib.util
import tempfile
import unittest
from pathlib import Path
import numpy as np
import rasterio
from rasterio.transform import Affine
s=importlib.util.spec_from_file_location('prep',Path(__file__).with_name('prepare-sile-landcover.py'));prep=importlib.util.module_from_spec(s);s.loader.exec_module(prep)
class NativePixels(unittest.TestCase):
    def test_native_pixels_and_north_west_projection(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'crop.tif'
            with rasterio.open(p,'w',driver='GTiff',width=2,height=2,count=1,dtype='uint8',crs='EPSG:4326',transform=Affine(.1,0,29,0,-.2,42)) as ds:
                ds.write(np.array([[10,30],[80,50]],dtype='uint8'),1)
            q=dict(lon=28,lat=43,metresLon=100,metresLat=200,offsetX=5,offsetZ=7)
            r=prep.prepare(p,q,'fixture')
            self.assertEqual(r['classes'],[10,30,80,50]);self.assertEqual(r['origin'],[95,193]);self.assertEqual(r['step'],[10,40]);self.assertEqual((r['cols'],r['rows']),(2,2));self.assertEqual(len(r['cropSha256']),64)
if __name__=='__main__':unittest.main()
