"""Preserve native ESA WorldCover categorical pixels in Hangar coordinates.
Input is an unresampled EPSG:4326 crop of the documented public v200 tile.
"""
import argparse
import hashlib
import json
from pathlib import Path
import rasterio

URL = 'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N39E027_Map.tif'
ATTRIBUTION = '© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium'

def prepare(path, projection, snapshot):
    with rasterio.open(path) as ds:
        t = ds.transform
        if str(ds.crs) != 'EPSG:4326' or t.b or t.d or t.a <= 0 or t.e >= 0 or ds.count != 1:
            raise ValueError('Expected north-up native EPSG:4326 categorical raster')
        pixels = ds.read(1)
        if not set(pixels.flat).issubset({0,10,20,30,40,50,60,70,80,90,95,100}):
            raise ValueError('Unknown WorldCover class')
        return dict(source='ESA WorldCover 2021 v200', url=URL, year=2021, license='CC-BY-4.0', attribution=ATTRIBUTION,
                    doi='https://doi.org/10.5281/zenodo.7254221', cropSha256=hashlib.sha256(Path(path).read_bytes()).hexdigest(),
                    notice='Native categorical pixels, not individual tree positions or a current ground survey. Tree spacing, species and dimensions are authored.',
                    baseMapSnapshotKey=snapshot, projection=projection, cols=ds.width, rows=ds.height,
                    origin=[(t.c-projection['lon'])*projection['metresLon']-projection['offsetX'],
                            (projection['lat']-t.f)*projection['metresLat']-projection['offsetZ']],
                    step=[t.a*projection['metresLon'], -t.e*projection['metresLat']], classes=pixels.ravel().tolist())

if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('crop');p.add_argument('--map',default='public/maps/sile/map.json');p.add_argument('--snapshot',required=True);p.add_argument('--output',required=True);a=p.parse_args()
    out=prepare(a.crop,json.loads(Path(a.map).read_text())['projection'],a.snapshot)
    Path(a.output).write_text(json.dumps(out,separators=(',',':'),ensure_ascii=False)+'\n')
