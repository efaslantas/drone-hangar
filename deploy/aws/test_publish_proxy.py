import hashlib,importlib.util,json,subprocess,tempfile,unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('proxy',Path(__file__).with_name('publish-proxy.py'))
proxy=importlib.util.module_from_spec(spec);spec.loader.exec_module(proxy)

class ProxyRollbackTests(unittest.TestCase):
    def test_bad_nginx_config_restores_original_inode_and_detaches_only_new_network(self):
        for attached in [False,True]:
            with self.subTest(attached=attached),tempfile.TemporaryDirectory() as directory:
                root=Path(directory);base=root/'default.conf';base.write_bytes(b'# original\n');inode=base.stat().st_ino;target=root/'mounted'/'proxy.conf';calls=[];fail=[True]
                def run(*args):
                    calls.append(args)
                    if args==('docker','inspect','zenth-nginx'):return json.dumps([{'NetworkSettings':{'Networks':{'drone-hangar-net':{}} if attached else {}}}])
                    if args[-1]=='-t' and fail[0]:fail[0]=False;raise subprocess.CalledProcessError(1,args,'bad vhost')
                    return ''
                with patch.multiple(proxy,ROOT=root,BASE=base,PROXY=target,EXPECTED_BASE=hashlib.sha256(base.read_bytes()).hexdigest()),patch.object(proxy,'identities',return_value={'zenth':{'running':True}}),patch.object(proxy,'health'),patch.object(proxy,'run',side_effect=run):
                    with self.assertRaises(subprocess.CalledProcessError):proxy.publish('v2.16.0-test',b'bad config')
                self.assertEqual(base.read_bytes(),b'# original\n');self.assertEqual(base.stat().st_ino,inode)
                self.assertFalse(target.exists(),'failed owned config must not prevent a safe retry')
                disconnected=('docker','network','disconnect','drone-hangar-net','zenth-nginx') in calls
                self.assertEqual(disconnected,not attached)

    def test_changed_existing_configuration_is_rejected_before_any_network_or_file_mutation(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);base=root/'default.conf';base.write_bytes(b'concurrent change');target=root/'proxy.conf'
            with patch.multiple(proxy,ROOT=root,BASE=base,PROXY=target,EXPECTED_BASE='oldhash'),patch.object(proxy,'identities',return_value={'zenth':{'running':True}}),patch.object(proxy,'run') as run:
                with self.assertRaisesRegex(AssertionError,'changed since preflight'):proxy.publish('release',b'new')
                run.assert_not_called()
            self.assertFalse(target.exists());self.assertEqual(base.read_bytes(),b'concurrent change')

    def test_failed_network_attach_does_not_disconnect_another_operators_network(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);base=root/'default.conf';base.write_bytes(b'original');target=root/'mount'/'proxy.conf';calls=[]
            def run(*args):
                calls.append(args)
                if args==('docker','inspect','zenth-nginx'):return json.dumps([{'NetworkSettings':{'Networks':{}}}])
                if args[:3]==('docker','network','connect'):raise subprocess.CalledProcessError(1,args,'attach failed')
                return ''
            with patch.multiple(proxy,ROOT=root,BASE=base,PROXY=target,EXPECTED_BASE=hashlib.sha256(base.read_bytes()).hexdigest()),patch.object(proxy,'identities',return_value={'zenth':{'running':True}}),patch.object(proxy,'health'),patch.object(proxy,'run',side_effect=run):
                with self.assertRaises(subprocess.CalledProcessError):proxy.publish('release',b'new')
            self.assertFalse(any(c[:3]==('docker','network','disconnect') for c in calls))
            self.assertEqual(base.read_bytes(),b'original')

    def test_a_reader_never_observes_truncation_of_existing_virtual_hosts(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);base=root/'default.conf';base.write_bytes(b'# original\n');target=root/'mount'/'proxy.conf';observed=[];real_open=Path.open
            def observe(path,mode='r',*args,**kwargs):
                f=real_open(path,mode,*args,**kwargs)
                if path==base and mode in ['wb','ab','r+b']:observed.append(base.read_bytes())
                return f
            def run(*args):
                if args==('docker','inspect','zenth-nginx'):return json.dumps([{'NetworkSettings':{'Networks':{'drone-hangar-net':{}}}}])
                return ''
            with patch.multiple(proxy,ROOT=root,BASE=base,PROXY=target,EXPECTED_BASE=hashlib.sha256(base.read_bytes()).hexdigest()),patch.object(proxy,'identities',return_value={'zenth':{'running':True}}),patch.object(proxy,'health'),patch.object(proxy,'run',side_effect=run),patch.object(Path,'open',observe):proxy.publish('release',b'config')
            self.assertTrue(observed);self.assertTrue(all(v.startswith(b'# original\n') for v in observed),'reload reader saw empty or partial original config')

    def test_same_release_retry_reuses_identical_retained_backup(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);base=root/'default.conf';base.write_bytes(b'original');target=root/'mount'/'proxy.conf';fail=[True]
            def run(*args):
                if args==('docker','inspect','zenth-nginx'):return json.dumps([{'NetworkSettings':{'Networks':{'drone-hangar-net':{}}}}])
                if args[-1]=='-t' and fail[0]:fail[0]=False;raise subprocess.CalledProcessError(1,args)
                return ''
            with patch.multiple(proxy,ROOT=root,BASE=base,PROXY=target,EXPECTED_BASE=hashlib.sha256(base.read_bytes()).hexdigest()),patch.object(proxy,'identities',return_value={'zenth':{'running':True}}),patch.object(proxy,'health'),patch.object(proxy,'run',side_effect=run):
                with self.assertRaises(subprocess.CalledProcessError):proxy.publish('release',b'bad')
                self.assertEqual(base.read_bytes(),b'original')
                proxy.publish('release',b'good')
            self.assertEqual((root/'backups/nginx-before-release.conf').read_bytes(),b'original')
            self.assertEqual(base.read_bytes(),b'original'+proxy.INCLUDE)

    def test_origin_health_retains_tls_verification_and_explicit_host_routing(self):
        with patch.object(proxy,'run',return_value='200') as run:
            proxy.health('https://gelisimgunlugu.app/',origin=True)
            args=run.call_args.args
            self.assertIn('--resolve',args);self.assertIn('gelisimgunlugu.app:443:127.0.0.1',args)
            self.assertNotIn('--insecure',args);self.assertEqual(args[-1],'https://gelisimgunlugu.app/')

if __name__=='__main__':unittest.main()
