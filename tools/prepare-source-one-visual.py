"""GPL-3.0: SOURCE ONE v4 DXF -> closed metre rings, flattened at0.035mm.
Requires ezdxf and shapely. Original parts remain under upstream GPL-3.0.
"""
import hashlib,json,shutil
from pathlib import Path
import ezdxf
from ezdxf.path import make_path
from shapely.geometry import LineString
from shapely.ops import polygonize,unary_union
HERE=Path(__file__).resolve()
PUBLIC_COPY=HERE.parent.name=='source-one-v4'
ROOT=next((p for p in HERE.parents if (p/'src/models.js').is_file()),None)
FOLDER=HERE.parent if PUBLIC_COPY else ROOT/'public/airframes/source-one-v4'
manifest=json.loads((FOLDER/'sources.json').read_text())
for record in manifest['files']:
 assert hashlib.sha256((FOLDER/record['file']).read_bytes()).hexdigest()==record['sha256'], 'Upstream source hash mismatch: '+record['file']
PARTS={'arm':('SO_v4_5inch_arm_4mm_4x.dxf',.004),'bottom':('SO_v4_bottom_plate_3mm.dxf',.003),'center':('SO_v4_center_plate_3mm.dxf',.003),'top':('SO_v4_top_plate_2mm.dxf',.002),'camera':('SO_v4_cam_plate_2mm_2x.dxf',.002)}
result={'license':'GPL-3.0','commit':'9ae65b1387f192fb90d07d483178169924b286b5','toleranceMm':.035,'parts':{}}
for name,(file,depth) in PARTS.items():
 doc=ezdxf.readfile(FOLDER/file);assert doc.units==4,'DXF must be millimetres'
 lines=[]
 for entity in doc.modelspace():
  points=[(round(p.x,6),round(p.y,6)) for p in make_path(entity).flattening(.035)]
  if len(points)>1:lines.append(LineString(points))
 polygons=sorted(polygonize(unary_union(lines)),key=lambda p:p.area,reverse=True)
 assert polygons and polygons[0].is_valid
 polygon=polygons[0]
 ring=lambda r:[[round(x/1000,9),round(y/1000,9)] for x,y in list(r.coords)[:-1]]
 result['parts'][name]={'file':file,'sha256':hashlib.sha256((FOLDER/file).read_bytes()).hexdigest(),'depth':depth,'outline':ring(polygon.exterior),'holes':[ring(r) for r in polygon.interiors],'areaM2':polygon.area/1e6}
assert len(result['parts']['bottom']['holes'])>=40
out=FOLDER/'geometry.json';out.write_text(json.dumps(result,separators=(',',':'))+'\n')
# Publish the generator alongside corresponding source; resolve repo when invoked from public copy.
if HERE != FOLDER/'prepare-source-one-visual.py':shutil.copyfile(HERE,FOLDER/'prepare-source-one-visual.py')
module='/*! @license SOURCE ONE v4 CAD data · GPL-3.0 · see /airframes/source-one-v4/LICENSE */\nexport default '+json.dumps(result,separators=(',',':'))+';\n'
if ROOT is not None:(ROOT/'src/source-one-geometry.js').write_text(module)
(FOLDER/'source-one-geometry.js').write_text(module)
(FOLDER/'VISUAL-NOTES.txt').write_text('SOURCE ONE v4 cut geometry from TBS upstream commit '+result['commit']+'\nGPL-3.0: see LICENSE. Raw DXFs and generator supplied.\nAssembly/stand-off positions and other hardware are artistic approximations.\nArms are aligned to simulation symmetric X motor centres; not exact assembled CAD.\nOriginal design: TBS SOURCE ONE; https://github.com/tbs-trappy/source_one\nVisual conversion/assembly changes: EFA Hangar, 2026-11-01.\nF60 Pro IV outer diameter 27.1mm / total height 31.1mm: DroneHiTech 2020-05-23 specs.\nhttps://dronehitech.com/t-motor-f60-pro-iv-review-and-thrust-test/\nMotor internals, pack dimensions, leads, camera and generic families are approximations.\nPropeller motion follows model commands, not measured RPM. Physics/calibration unchanged.\nGenerate: python prepare-source-one-visual.py; install pinned requirements-visual.txt first.\n')
print(json.dumps({k:{'holes':len(v['holes']),'depthMm':v['depth']*1000} for k,v in result['parts'].items()}))
