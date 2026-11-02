"""One-time auxiliary vhost activation; run as root through authorized SSM.
Preserves the existing bind-mounted nginx inode and rolls its bytes back on failure.
"""
import hashlib,json,os,subprocess,time,urllib.request
from pathlib import Path
from urllib.parse import urlsplit

ROOT=Path('/home/ec2-user/drone-hangar')
BASE=Path('/home/ec2-user/zenth/nginx/default.conf')
PROXY=Path('/home/ec2-user/zenth/certbot/www/.drone-hangar/proxy.conf')
INCLUDE=b'\n# Drone Hangar auxiliary vhost; managed by drone-hangar/deploy/aws\ninclude /var/www/certbot/.drone-hangar/proxy.conf;\n'
HOST='hangar.18-153-158-209.sslip.io'
EXPECTED_BASE='65092dcd266e8cd7ac94cfd54e82d2cb9a3f938d8a40dd37d2d5595d292d0b30'
EXISTING=['zenth-web','zenth-backend','gelisim-web','gelisim-backend','zenth-postgres','zenth-nginx','zenth-redis']

def run(*args):
    return subprocess.check_output(args,text=True,stderr=subprocess.STDOUT)
def identities():
    records=json.loads(run('docker','inspect',*EXISTING))
    return {r['Name']:{'id':r['Id'],'image':r['Image'],'running':r['State']['Running']} for r in records}
def health(url,release=None,origin=False):
    if origin:
        host=urlsplit(url).hostname
        status=run('curl','--fail','--silent','--show-error','--max-time','15','--resolve',host+':443:127.0.0.1','--output','/dev/null','--write-out','%{http_code}',url)
        assert status.strip()=='200',url
        return
    with urllib.request.urlopen(url,timeout=15) as response:
        assert response.status==200,url
        if release:assert json.load(response)['version']==release,url

def publish(release,config):
    before=identities();assert all(r['running'] for r in before.values())
    original=BASE.read_bytes()
    assert hashlib.sha256(original).hexdigest()==EXPECTED_BASE,'Nginx changed since preflight; inspect before modifying'
    assert not PROXY.exists(),'Existing Hangar proxy file requires a separate update procedure'
    for url in ['https://zenth.finance/','https://api.zenth.finance/health']:health(url)
    health('https://gelisimgunlugu.app/',origin=True)
    backup=ROOT/'backups'/('nginx-before-'+release+'.conf');backup.parent.mkdir(mode=0o700,exist_ok=True)
    if backup.exists():assert backup.read_bytes()==original,'Existing backup differs; do not overwrite recovery bytes'
    else:
        with backup.open('xb') as f:f.write(original)
    backup.chmod(0o600)
    network='drone-hangar-net';nginx=json.loads(run('docker','inspect','zenth-nginx'))[0]
    attached=network in nginx['NetworkSettings']['Networks']
    PROXY.parent.mkdir(mode=0o700,exist_ok=True)
    connected=False;created=False;changed=False
    try:
        with PROXY.open('xb') as f:created=True;f.write(config)
        PROXY.chmod(0o600)
        if not attached:
            run('docker','network','connect',network,'zenth-nginx');connected=True
        # Write through the original inode: Docker bind-mount is inode based.
        assert BASE.read_bytes()==original,'Nginx changed during preparation; no append performed'
        changed=True
        # One small unbuffered append never exposes an empty existing vhost file.
        with BASE.open('ab',buffering=0) as f:
            assert f.write(INCLUDE)==len(INCLUDE),'Partial append'
            os.fsync(f.fileno())
        run('docker','exec','zenth-nginx','nginx','-t')
        run('docker','exec','zenth-nginx','nginx','-s','reload')
        for attempt in range(5):
            try:health('https://'+HOST+'/api/health',release);break
            except Exception:
                if attempt==4:raise
                time.sleep(1)
        for url in ['https://zenth.finance/','https://api.zenth.finance/health']:health(url)
        health('https://gelisimgunlugu.app/',origin=True)
        assert identities()==before,'Existing service identity/state changed; inspect concurrent operations'
    except BaseException:
        restored=not changed
        try:
            if changed:
                current=BASE.read_bytes()
                assert current.startswith(original) and INCLUDE.startswith(current[len(original):]),'Concurrent nginx edits; retain proxy/network and recover manually'
                with BASE.open('r+b',buffering=0) as f:
                    f.truncate(len(original));os.fsync(f.fileno())
                run('docker','exec','zenth-nginx','nginx','-t')
                run('docker','exec','zenth-nginx','nginx','-s','reload')
                restored=True
        finally:
            if restored:
                if connected:run('docker','network','disconnect',network,'zenth-nginx')
                if created:PROXY.unlink()
        raise
    receipt={'release':release,'host':HOST,'baseBeforeSha256':EXPECTED_BASE,'baseAfterSha256':hashlib.sha256(BASE.read_bytes()).hexdigest(),'backup':str(backup),'existingServicesUnchanged':before,'proxySha256':hashlib.sha256(config).hexdigest()}
    p=ROOT/'publication-receipt.json';p.write_text(json.dumps(receipt,indent=2)+'\n');p.chmod(0o600)
    print('HTTPS healthy:',release)
    print('Existing Zenth/Gelişim containers unchanged:',len(before))
    print('Nginx backup retained:',backup)

if __name__=='__main__':
    import fcntl,sys
    with open('/home/ec2-user/zenth/.deploy.guard','a') as shared,open(ROOT/'.deploy.guard','a') as owned:
        fcntl.flock(shared,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(owned,fcntl.LOCK_EX|fcntl.LOCK_NB)
        publish(sys.argv[1],Path(sys.argv[2]).read_bytes())
