import importlib.util,unittest,copy
from pathlib import Path
from unittest.mock import patch
p=Path(__file__).with_name('update-container.py');spec=importlib.util.spec_from_file_location('update',p);m=importlib.util.module_from_spec(spec)
if p.exists():spec.loader.exec_module(m)
class UpdateTests(unittest.TestCase):
 def fake(self,fail=None):
  old={'Id':'old','Config':{'Image':'old-image','Env':['ADMIN_KEY=do-not-print','RELEASE_SHA=old']},'HostConfig':{'NetworkMode':'drone-hangar-net','Mounts':[{'Source':'own-data','Target':'/app/server/data'}]},'NetworkSettings':{'Networks':{'drone-hangar-net':{'Aliases':['drone-hangar-app'],'IPAddress':'old-ip'}}},'State':{'Running':True}};calls=[]
  def api(method,path,payload=None):
   calls.append((method,path,copy.deepcopy(payload)))
   if path=='/containers/drone-hangar/json':return copy.deepcopy(old)
   if path=='/containers/create?name=drone-hangar':return {'Id':'new'}
   if path=='/containers/new/start' and fail=='start':raise RuntimeError('start failed')
   return {}
  return api,calls
 def test_update_preserves_private_state_and_alias_without_static_endpoint(self):
  self.assertTrue(hasattr(m,'update'),'reviewable update entry point required');api,calls=self.fake();m.update('v2.17.0-test',api,lambda release:None,lambda:None)
  payload=next(c[2] for c in calls if c[1]=='/containers/create?name=drone-hangar');self.assertIn('ADMIN_KEY=do-not-print',payload['Env']);self.assertIn('RELEASE_SHA=v2.17.0-test',payload['Env']);self.assertEqual(payload['HostConfig']['Mounts'][0]['Source'],'own-data');self.assertEqual(payload['NetworkingConfig']['EndpointsConfig'],{'drone-hangar-net':{'Aliases':['drone-hangar-app']}});self.assertFalse(any(c[0]=='DELETE' for c in calls))
 def test_unhealthy_new_container_is_removed_by_id_and_old_restarted(self):
  self.assertTrue(hasattr(m,'update'));api,calls=self.fake()
  with self.assertRaisesRegex(RuntimeError,'unhealthy'):m.update('v2.17.0-test',api,lambda release:(_ for _ in ()).throw(RuntimeError('unhealthy')),lambda:None)
  self.assertIn(('DELETE','/containers/new?force=true',None),calls);self.assertIn(('POST','/containers/old/rename?name=drone-hangar',None),calls);self.assertIn(('POST','/containers/old/start',None),calls)
 def test_snapshot_is_after_stop_and_snapshot_failure_restarts_original(self):
  self.assertTrue(hasattr(m,'update'));api,calls=self.fake()
  def backup():
   self.assertIn(('POST','/containers/old/stop?t=20',None),calls)
   raise RuntimeError('snapshot')
  with self.assertRaisesRegex(RuntimeError,'snapshot'):m.update('v2.17.0-test',api,lambda release:None,backup)
  self.assertIn(('POST','/containers/old/start',None),calls);self.assertFalse(any('/rename?' in c[1] for c in calls))
 def test_candidate_cleanup_failure_does_not_prevent_old_restart(self):
  self.assertTrue(hasattr(m,'update'));api,calls=self.fake('start')
  def wrapped(method,path,payload=None):
   if method=='DELETE':raise RuntimeError('cleanup')
   return api(method,path,payload)
  with self.assertRaises(RuntimeError):m.update('v2.17.0-test',wrapped,lambda release:None,lambda:None)
  self.assertIn(('POST','/containers/old/start',None),calls)
 def test_failed_rename_restarts_original_without_deleting_another_container(self):
  self.assertTrue(hasattr(m,'update'));api,calls=self.fake()
  def wrapped(method,path,payload=None):
   if path=='/containers/old/rename?name=drone-hangar-before-v2.17.0-test':raise RuntimeError('rename')
   return api(method,path,payload)
  with self.assertRaisesRegex(RuntimeError,'rename'):m.update('v2.17.0-test',wrapped,lambda release:None,lambda:None)
  self.assertIn(('POST','/containers/old/start',None),calls);self.assertFalse(any(c[0]=='DELETE' for c in calls))
if __name__=='__main__':unittest.main()
