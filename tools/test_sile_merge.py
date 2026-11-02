import hashlib,json,pathlib,subprocess,sys,tempfile,unittest
class MergeTests(unittest.TestCase):
 def run_merge(self,west):
  tmp=tempfile.TemporaryDirectory();root=pathlib.Path(tmp.name);core={'elements':[{'type':'node','id':1,'lat':41,'lon':29},{'type':'node','id':2,'lat':41.1,'lon':29.1},{'type':'way','id':10,'nodes':[1,2],'tags':{'highway':'service'}}]};(root/'core.json').write_text(json.dumps(core));(root/'west.json').write_text(json.dumps(west));out=root/'out'
  result=subprocess.run([sys.executable,str(pathlib.Path(__file__).with_name('merge-sile-osm.py')),'--core',str(root/'core.json'),'--west',str(root/'west.json'),'--out',str(out),'--core-url','https://example.invalid/core','--west-url','https://example.invalid/west','--core-date','2026-11-01','--west-date','2026-11-02'],capture_output=True,text=True)
  return tmp,out,core,result
 def test_conflicting_adjacent_nodes_cannot_move_core_and_receipt_matches_output(self):
  tmp,out,core,result=self.run_merge({'elements':[{'type':'node','id':1,'lat':80,'lon':90},{'type':'node','id':3,'lat':41.2,'lon':29.2},{'type':'way','id':11,'nodes':[2,3]}]})
  with tmp:
   self.assertEqual(result.returncode,0,result.stderr);data=json.loads((out/'merged-osm-raw.json').read_text());self.assertEqual(data['elements'][:3],core['elements']);self.assertEqual(len(data['elements']),5);receipt=json.loads((out/'source-inputs.json').read_text());self.assertEqual(receipt['mergedSha256'],hashlib.sha256((out/'merged-osm-raw.json').read_bytes()).hexdigest())
 def test_incomplete_way_rejects_instead_of_writing_broken_source(self):
  tmp,out,core,result=self.run_merge({'elements':[{'type':'way','id':11,'nodes':[2,999]}]})
  with tmp:
   self.assertNotEqual(result.returncode,0);self.assertIn('Incomplete way node references',result.stderr);self.assertFalse(out.exists())
if __name__=='__main__':unittest.main()
