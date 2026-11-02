"""App-only image update via SSM; preserve own state and stopped old container.
No nginx configuration, tenant container or network mutations. Brief app downtime
includes Docker DNS cache expiry (proxy valid=30s). Never print Config/Env.
"""
import copy,http.client,json,re,socket,subprocess,sys,tarfile,time,urllib.request
from pathlib import Path

class UnixHTTP(http.client.HTTPConnection):
 def connect(self):
  self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.settimeout(90);self.sock.connect('/var/run/docker.sock')
def docker(method,path,payload=None):
 c=UnixHTTP('localhost');body=None if payload is None else json.dumps(payload)
 c.request(method,path,body,{'Content-Type':'application/json'});r=c.getresponse();raw=r.read();c.close()
 if r.status>=400:raise RuntimeError('Docker operation failed: '+method+' '+path+' status '+str(r.status))
 return json.loads(raw) if raw else None

def update(release,api,verify,backup):
 assert re.fullmatch(r'v[0-9]+\.[0-9]+\.[0-9]+-[a-zA-Z0-9]+',release),'Invalid release'
 old=api('GET','/containers/drone-hangar/json');assert old['State']['Running'],'Existing app must be healthy/running'
 assert list(old['NetworkSettings']['Networks'])==['drone-hangar-net'],'Unexpected app network'
 payload=copy.deepcopy(old['Config']);payload['Image']='drone-hangar:'+release;payload['Hostname']=''
 payload['Env']=[v for v in payload.get('Env',[]) if not v.startswith('RELEASE_SHA=')]+['RELEASE_SHA='+release]
 payload['HostConfig']=copy.deepcopy(old['HostConfig']);payload['NetworkingConfig']={'EndpointsConfig':{'drone-hangar-net':{'Aliases':['drone-hangar-app']}}}
 # Snapshot only after stopping the writer: store JSON writes are truncating.
 new_id=None;stopped=False;renamed=False
 try:
  stopped=True;api('POST','/containers/'+old['Id']+'/stop?t=20');backup()
  api('POST','/containers/'+old['Id']+'/rename?name=drone-hangar-before-'+release);renamed=True
  new_id=api('POST','/containers/create?name=drone-hangar',payload)['Id'];api('POST','/containers/'+new_id+'/start')
  verify(release)
 except BaseException as primary:
  recovery_errors=[]
  if new_id:
   try:api('DELETE','/containers/'+new_id+'?force=true')
   except Exception:
    # Failed deletion must not prevent old recovery. Stop/quarantine only the
    # candidate ID we created; keep its evidence for a later safe cleanup.
    for path in ['/containers/'+new_id+'/stop?t=20','/containers/'+new_id+'/rename?name=drone-hangar-failed-'+release]:
     try:api('POST',path)
     except Exception:recovery_errors.append(path)
  if renamed:
   try:api('POST','/containers/'+old['Id']+'/rename?name=drone-hangar')
   except Exception:recovery_errors.append('restore old name')
  if stopped:
   try:api('POST','/containers/'+old['Id']+'/start')
   except Exception:recovery_errors.append('restart old app')
  if recovery_errors:raise RuntimeError('Update failed; manual recovery required: '+', '.join(recovery_errors)) from primary
  raise

 return old['Id'],new_id

def verify(release):
 # Grace period accommodates nginx's30s Docker DNS cache; TLS stays verified.
 deadline=time.monotonic()+55
 while True:
  try:
   with urllib.request.urlopen('https://hangar.18-153-158-209.sslip.io/api/health',timeout=5) as r:
    h=json.load(r);assert r.status==200 and h.get('ok') and h.get('version')==release
   return
  except Exception:
   if time.monotonic()>deadline:raise RuntimeError('New release failed HTTPS health/version')
   time.sleep(1)

if __name__=='__main__':
 import fcntl,hashlib,os
 release=sys.argv[1];root=Path('/home/ec2-user/drone-hangar')
 with (root/'.deploy.guard').open('a') as own,open('/home/ec2-user/zenth/.deploy.guard','a') as shared:
  fcntl.flock(shared,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(own,fcntl.LOCK_EX|fcntl.LOCK_NB)
  services=['zenth-web','zenth-backend','gelisim-web','gelisim-backend','zenth-postgres','zenth-nginx','zenth-redis']
  def tenants():
   records=json.loads(subprocess.check_output(['docker','inspect',*services]));return [(r['Id'],r['Image'],r['State']['Running']) for r in records]
  before=tenants();assert all(r[2] for r in before)
  nginx=Path('/home/ec2-user/zenth/nginx/default.conf');nginx_before=nginx.read_bytes()
  image=docker('GET','/images/drone-hangar:'+release+'/json');assert image['Architecture']=='arm64'
  def backup():
   p=root/'backups'/('data-before-'+release+'-'+str(time.time_ns())+'.tgz');p.parent.mkdir(mode=0o700,exist_ok=True)
   fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
   with os.fdopen(fd,'wb') as f,tarfile.open(fileobj=f,mode='w:gz') as archive:archive.add(root/'data',arcname='data')
  old_id,new_id=update(release,docker,verify,backup)
  assert tenants()==before,'Concurrent tenant changes; inspect separately'
  assert nginx.read_bytes()==nginx_before,'Concurrent nginx changes; inspect separately'
  receipt={'release':release,'oldContainerId':old_id,'newContainerId':new_id,'imageId':image['Id'],'tenantIdentitiesUnchanged':True,'nginxSha256':hashlib.sha256(nginx_before).hexdigest(),'httpsHealth':'pass'}
  p=root/'releases'/release/'update-receipt.json';p.write_text(json.dumps(receipt,indent=2)+'\n');p.chmod(0o600)
  print('HTTPS update healthy:',release);print('Old container/data backup retained;7tenant identities and nginx bytes unchanged')
