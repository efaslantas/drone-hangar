"""Offline merge: retain established core objects, append adjacent source IDs."""
import argparse,hashlib,json,pathlib
p=argparse.ArgumentParser();p.add_argument('--core',required=True);p.add_argument('--west',required=True);p.add_argument('--out',required=True);p.add_argument('--core-url',required=True);p.add_argument('--west-url',required=True);p.add_argument('--core-date',required=True);p.add_argument('--west-date',required=True);a=p.parse_args()
core,west=pathlib.Path(a.core),pathlib.Path(a.west);old=json.loads(core.read_bytes());new=json.loads(west.read_bytes());elements=list(old['elements']);seen={(e['type'],e['id'])for e in elements}
if len(seen)!=len(elements):raise ValueError('Duplicate core IDs')
for e in new['elements']:
 key=e['type'],e['id']
 if key not in seen:elements.append(e);seen.add(key)
nodes={e['id']for e in elements if e['type']=='node'}
if any(n not in nodes for e in elements if e['type']=='way' for n in e['nodes']):raise ValueError('Incomplete way node references')
out=pathlib.Path(a.out);out.mkdir(parents=True,exist_ok=True);merged=out/'merged-osm-raw.json';merged.write_text(json.dumps({**old,'elements':elements},separators=(',',':'))+'\n')
inputs={'mergePolicy':'Existing core objects win by(type,id); append only newly fetched objects, preserving original core node coordinates and tags','inputs':[{'role':role,'url':url,'retrievedDate':date,'rawSha256':hashlib.sha256(path.read_bytes()).hexdigest()}for role,path,url,date in [('core',core,a.core_url,a.core_date),('west',west,a.west_url,a.west_date)]],'mergedSha256':hashlib.sha256(merged.read_bytes()).hexdigest(),'coreElements':len(old['elements']),'westElements':len(new['elements']),'mergedElements':len(elements)}
(out/'source-inputs.json').write_text(json.dumps(inputs,indent=2)+'\n');print(json.dumps({k:v for k,v in inputs.items()if k!='inputs'},indent=2))
