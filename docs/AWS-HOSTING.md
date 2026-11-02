# Drone Hangar — AWS işletim kaydı

2026-11-02: Kullanıcı Drone simülatörü 2.16 için mevcut Zenth AWS sunucusunu seçti. Canlı adres: https://hangar.18-153-158-209.sslip.io/ . İlk kurulum `v2.16.0-7f5130339846`; güncel sürüm `v2.36.0-0296056ce7e4` (2.36, 2026-11-02).

## Yerleşim

EC2 `i-0b40d5bd73f2e3b3a`, `eu-central-1`, ARM64/t4g.small; EIP `18.153.158.209`. Bakım AWS SSM üzerinden; SSH kapısı açılmadı, SG/IAM değiştirilmedi. Yeni VM oluşturulmadı.

`drone-hangar` ayrı konteyner ve `drone-hangar-net` ağı kullanır. `zenth-nginx` bu ek ağa bağlandı; uygulama Zenth veritabanı ağına bağlı değildir ve host portu yayımlamaz. Node22, UID1000:1000, salt okunur kök, 256MiB RAM/384MiB RAM+swap, 0.5CPU, 64PID, capabilities kapalı; `/tmp`16MiB tmpfs. Loglar 2×5MiB ile sınırlı.

Host kökü `/home/ec2-user/drone-hangar` (0700). Kalıcı veriler `data/` (UID1000,0700); yeni rastgele yönetici anahtarı `runtime.env` (0600). Anahtarı loga/belgeye yazma. Azure erişilemediğinden eski skor/yönetici verisi taşınmadı; yerel test verisi alınmadı ve eski veriler silinmedi.

Sürüm dosyaları `releases/v2.16.0-7f5130339846/` altında. Görüntü kimliği `sha256:16cbb7d1f761031eeeb9833aff6707b6f43db7fc05595c6f54f80d51df4e1945`; sıkıştırılmış arşiv SHA256 `b335667058de49f5fc1119ea78a25d6826ce599b927d2c49fd3583801f3224ba`. Yerelde ARM64 derlendi; mevcut özel S3 bucket üzerinden kısa ömürlü imzalı indirme ile aktarıldı. Bucket ACL/IAM genişletilmedi.

## Nginx ve sertifika

`/home/ec2-user/zenth/nginx/default.conf` dosyasının mevcut içeriği aynen korunarak sonuna aşağıdaki dahil etme eklendi:

```nginx
# Drone Hangar auxiliary vhost; managed by drone-hangar/deploy/aws
include /var/www/certbot/.drone-hangar/proxy.conf;
```

Host karşılığı `/home/ec2-user/zenth/certbot/www/.drone-hangar/proxy.conf` (0600); kaynak `deploy/aws/nginx-hangar.conf`. Dinamik Docker DNS upstream `drone-hangar-app:8780`, HTTPS ve WebSocket proxy açıktır.

**Gelecekte tam nginx dosya senkronizasyonunda bu include korunmalı. Nginx konteyneri yeniden oluşturulursa `drone-hangar-net` ağına yeniden bağlanmalı.** Normal Zenth web/backend dağıtımı bunları değiştirmez. Bu uygulama için Zenth `make deploy` çalıştırılmaz.

Let’s Encrypt mevcut hesapla HTTP01 üzerinden `drone-hangar` isimli sertifika verdi; ilk bitiş 2027-01-30. Konteyner yolu `/etc/letsencrypt/live/drone-hangar/`. Mevcut günlük 03:30 `cert-renew.sh` bütün sertifikaları taradığından yenileme kapsamına girer. Yenileme betiği ortak deployment kilidi almaz: bind-mount edilen default.conf dosyasını boşaltarak veya inode değiştirerek yazma. Yayın betiği küçük tek append, hata halinde doğrulanmış suffix truncate kullanır. Geçici ACME deneme dosyası kaldırıldı.

## Bakım ve geri dönüş

`deploy/aws/run-container.sh` ve `publish-proxy.py` **ilk kurulum** betikleridir; mevcut kurulumun üzerine doğrudan yeniden çalıştırılmaz. Gelecekteki güncelleme ayrı gözden geçirilmiş container değiştirme/geri dönüş adımı gerektirir: mevcut image/env/data korunmalı, sağlık kontrolü geçmeden eski image kaldırılmamalı. Kaynak repo dirty; bu teslimatta commit/push/merge yapılmadı.

İlk yayın makbuzu `/home/ec2-user/drone-hangar/publication-receipt.json`; başlangıç nginx yedeği `backups/nginx-before-v2.16.0-7f5130339846.conf`. Önceki dosya SHA256 `65092dcd266e8cd7ac94cfd54e82d2cb9a3f938d8a40dd37d2d5595d292d0b30`. Geri dönüşte ortak ve uygulama deployment kilitleri alınır, mevcut dosyanın yedek+yalnız bize ait include olduğu doğrulanır; **aynı inode** üzerinde eski uzunluğa truncate, fsync, `nginx -t`, graceful reload uygulanır. Eşzamanlı başka değişiklik varsa otomatik üstüne yazılmaz. Yalnız Hangar bağlantısı/proxy kaldırılabilir; Zenth servisleri, veri/env/image/sertifika silinmez.

Salt okunur sağlık: `GET /api/health` doğru sürümü ve `ok:true` vermeli. İki istemcili WSS join/state/leave, giriş varlıkları ve kaynak hash kontrolü bu teslimatta geçti. İnfra regresyonları: `python3 -m unittest discover -s deploy/aws -p 'test_*.py'` (6 test). Zenth web/API200; Gelişim dış adresi dağıtımdan önce de bağlantı reddediyordu, ancak TLS/SNI korunarak localhost origin200 doğrulandı. DNS değiştirilmedi; bu kayıt Gelişim dış erişiminin düzeldiği anlamına gelmez.

## Kullanıcı durumu

Yeni origin üzerinde SOURCE ONE v4/F60IV1750KV,6S,650g,1100mAh,Şile,medium,25°tilt ve RC giriş seçimi reload ile doğrulandı. TX15 kalibrasyonu origin bazlıdır: eski alan adından kendiliğinden taşınmaz; yeni adreste cihaz seçimi/kalibrasyon bir kez yapılmalı. Son ekran FPV/DISARM ve RC girişi bekliyor. Gerçek TX15 uçuşu veya uçuş-log eşleştirmesi bu teslimatta yapılmadı. Şile adasındaki4.5m kabartma temsili; ölçülmüş dijital ikiz iddiası yok.


## 2.17 app-only güncelleme prosedürü

`deploy/aws/update-container.py RELEASE` SSM ile root olarak, doğrulanmış ARM64 görüntü yüklendikten sonra çalışır. Uygulama ve Zenth deployment kilitlerini alır; mevcut Config/HostConfig (veri/env/kaynak sınırları) korunur, yalnız image/RELEASE_SHA değiştirilir. Yazar konteyner durduktan sonra tutarlı0700dizin/0600tar veri yedeği alınır; her deneme ayrı zaman damgalı yedek kullanır. Eski konteyner `drone-hangar-before-RELEASE` olarak korunur. Yeni aynı isim/ağ-alias ile açılır;55sHTTPS sürüm kontrolü30sDockerDNSönbelleğini kapsar. Başarısızlıkta yalnız oluşturduğu candidate ID temizlenir; silme başarısızsa durdurup ayrı isme almayı, eskiyi yeniden adlandırıp başlatmayı bağımsız dener. Tam toparlanamazsa manuel kurtarma ihtiyacını bildirir. Nginx, sertifika veya diğer7servise mutation yapmaz. Başarı makbuzu kendi sürüm dizininde0600saklanır. Güncelleme kısa uygulama kesintisi içerir; paylaşılmış Zenth servislerine yeniden başlatma gerekmez.

Regresyon paketi artık11test: snapshot sırası/hatası, candidate başlangıç/sağlık/temizlik hatası, eski isim geri dönüşü ve ilk proxy kurulumu. Yeni adreste TX15 kalibrasyonu yine kullanıcı adımıdır.


2.18yayını: `v2.18.0-b27b8592b4ad`, https://hangar.18-153-158-209.sslip.io/; aynıreviewedapp-onlyupdater,245manifest/93runninghash/HTTPS/WSSpass;eskiappcontainer+consistentdatabackupkorundu,7tenant/nginxaynı. Ayrıntı `entire-coast-validation.json`.


2.19 yayını: `v2.19.0-f442fab3123f`, aynı uygulama güncelleyicisi;250manifest/96çalışan kaynak hash/HTTPS/WSS doğrulandı. Önceki konteyner ve tutarlı veri yedeği korundu; diğer7servis ve nginx aynı.0restart,19.12MiB/256MiB. Ayrıntı `sile-town-validation.json`.


2.20 yayını: `v2.20.0-0bbae6d8f741`; aynı uygulama güncelleyicisi. 252 manifest ve 97 çalışan kaynak hash, HTTPS/kaynak varlıkları ve WSS doğrulandı. Önceki konteyner/tutarlı veri yedeği korundu; diğer 7 servis ve nginx aynı. 0 restart, 19.22 MiB/256 MiB. Ayrıntı `sile-harbour-validation.json`.


2.21 yayını: `v2.21.0-395ad3ff12e2`; aynı uygulama güncelleyicisi. 257 manifest ve 100 çalışan kaynak hash, HTTPS/kaynak varlıkları ve WSS doğrulandı. Diğer 7 servis ve nginx aynı; önceki konteyner/tutarlı veri yedeği korundu. 0 restart,18.44 MiB/256 MiB. Ayrıntı `sile-buildings-validation.json`.


2.22 yayını: `v2.22.0-f237ea6e62b5`; aynı uygulama güncelleyicisi. 260 manifest ve 102 çalışan kaynak hash, HTTPS/kaynak varlıkları ve WSS doğrulandı. Önceki konteyner/tutarlı veri yedeği korundu; diğer 7 servis ve nginx aynı. 0 restart,18.62 MiB/256 MiB. Ayrıntı `sile-neighbourhood-validation.json`.


2.23 yayını: `v2.23.0-8f66e2a5a84a`; aynı uygulama güncelleyicisi.263manifest/104çalışan kaynak hash,HTTPS/kaynak varlıkları/WSS doğrulandı. Diğer7servis ve nginx aynı;önceki konteyner/tutarlı veri yedeği korundu.0restart18,86MiB/256MiB. Ayrıntı `sile-streets-validation.json`.


2.24 yayını: `v2.24.0-9660654a4365`; aynı uygulama güncelleyicisi.264manifest/105çalışan kaynak hash,HTTPS/kaynak varlıkları/WSS doğrulandı. Diğer7servis ve nginx aynı;önceki konteyner/tutarlı veri yedeği korundu.0restart18,98MiB/256MiB. Ayrıntı `sile-facades-validation.json`.


2.25 yayını: `v2.25.0-d1dc4cb9b99d`; aynı uygulama güncelleyicisi.265manifest/106çalışan kaynak hash,HTTPS/kaynak varlıkları/WSS doğrulandı. Diğer7servis ve nginx aynı;önceki konteyner/tutarlı veri yedeği korundu.0restart19,5MiB/256MiB. Ayrıntı `sile-rocks-validation.json`.


2.26 yayını: `v2.26.0-ccad8ed1f2c5`;266manifest/107runninghash/HTTPS/WSS pass.7tenant/nginx aynı,oldapp/tutarlı yedek korundu;0restart19,9MiB/256MiB. Ayrıntı sile-grounding-validation.json.


2.27 yayını: `v2.27.0-7e2da499e70a`;268manifest/108runninghash/HTTPS/WSS pass.7tenant/nginx aynı,oldapp/tutarlı yedek korundu;0restart25,32MiB/256MiB. Ayrıntı sile-pads-validation.json.


## 2026-11-02 — Kamera filtresi çözünürlüğü 2.28

`v2.28.0-f3cbb587f514` uygulama kapsamındaki aynı güncelleme akışıyla yayımlandı. Filtre gerçek çizim hedefinin piksel boyutunu kendisi izler; ana uygulamanın mantıksal ekran boyutu yazımı kaldırıldı. Kontrol sahnesindeki yatay bant 1×1 varsayılan boyuttan kaynaklandı; canlıda aynı aydınlatma hatası varmış gibi raporlanmaz. Harita geometrisi ve ışık kaynakları değişmedi. 465 Node22/11 infra, Vite/ARM64, bağımsız inceleme, WebGL/WebGPU görüntü ve HTTPS/WSS geçti. 108 çalışan kaynak hash doğrulandı; yedi diğer servis/nginx aynı; eski konteyner ve tutarlı yedek korundu. 0 restart, 24,38 MiB/256 MiB. Ayrıntı `docs/sile-lighting-validation.json`.


## 2026-11-02 — Sahil cephe derinliği 2.29

`v2.29.0-298729911b76` aynı app-only SSM güncellemesiyle yayımlandı. 134 binada 384 pencere takımı ve 160 saçak şeridi;1696 katı parçanın gerçek dönüşümünden konservatif çarpışma kutuları, iki ek mesh. Mimari ayrıntılar temsili. 473 Node22/11infra,8yeni/36bağımsız odaklı,Vite/ARM64 ve GL/GPU kontrolleri geçti. 270manifest/109çalışan kaynak hash/HTTPS/WSS/FPVDISARM doğrulandı. Eski9059kutu/1286prizma/4teras ve mevcut mesh geometrileri aynen korunur. Yedi diğer servis/nginx aynı; önceki konteyner/tutarlı yedek saklandı.0restart26,07MiB/256MiB. Ayrıntı `docs/sile-architectural-validation.json`.


## 2026-11-02 — Sahil bitki görünümü 2.30

`v2.30.0-d5fc927a38fd` app-only SSM ile yayımlandı. Mevcut3200yaprak tacı katmanlı yapraklara,36bitkilik üstü toprak görünümüne geçti; yeni mesh/yerleşim/çarpışma yok. Tüm10755kutu/1286prizma/4teras ve bitki dışı geometri birebir korunur.479Node22/11infra,6yeni/22bağımsız odaklı,Vite/ARM64 veGL/GPUkontrolleri geçti.272manifest/110çalışan kaynak hash/HTTPS/WSS/FPVDISARM doğrulandı.7diğer servis/nginx aynı;geri dönüş/tutarlı yedek saklandı.0restart24,5MiB/256MiB. Ayrıntı `docs/sile-foliage-validation.json`.


2.31 yayını: `v2.31.0-b2bdbccd35e4`, ilk Şile İLKE manuel inceleme/yerel kayıt katmanı;276manifest/112çalışan kaynak hash/HTTPS/WSS/yeni mod FPVDISARM geçti.0restart22.9MiB/256MiB;7diğer servis/nginx aynı, geri dönüş/tutarlı yedek saklandı. SOURCEONE650g1100medium25/gamepad korunur. Gerçek İLKE modeli/SITL/hardware doğrulaması yok. Ayrıntı `sile-inspection-validation.json`.


2.32 yayını: `v2.32.0-f52f89ea77ff`, Şile manuel yönlendirme paneli ve kaynak2D harita özeti;277manifest/113çalışan kaynak hash/HTTPS/WSS/FPVDISARM/yeni menü/error[] doğrulandı.0restart25.05MiB/256MiB;7diğer servis/nginx aynı, geri dönüş/tutarlı yedek saklandı. SOURCEONE650g1100medium25/gamepad korunur. `sile-inspection-navigation-validation.json`.


2.33 yayını: `v2.33.0-49b01ebfc1b8`, aynı Şile önizlemesinin gereksiz tekrar kurulması kaldırıldı.277manifest/113çalışan kaynak hash/HTTPS/WSS/FPVDISARM/error[] doğrulandı; canlı hazır-Şile→inceleme etkileşimi297/273ms.0restart22.98MiB/256MiB;7diğer servis/nginx aynı, geri dönüş/tutarlı yedek saklandı. SOURCEONE650g1100medium25/gamepad korunur. `sile-preview-reuse-validation.json`.


2.34 yayını: `v2.34.0-86cadc92fbdd`, gizli uçuş dünyasını ilk başlatmaya erteleme ve çizilen hazırlık ekranı.277manifest/113runninghash/HTTPS/WSS/ilk+tekrarFPVDISARM/error[];0restart24.01MiB/256MiB.7diğer servis/nginx aynı; eski app/tutarlı yedek korundu. SOURCEONE650g1100medium25/gamepad korunur. `lazy-flight-start-validation.json`.


2.35 yayını: `v2.35.0-c37c3a8426e3`, hazırlık hatası sonrası klavye odağını geri verme.277manifest/113runninghash/HTTPS/WSS/normalEnterstartFPVDISARM/error[];0restart24.48MiB/256MiB.7diğer servis/nginx aynı; eski app/tutarlı yedek korunur. SOURCEONE650g1100medium25/gamepad korunur. `start-focus-validation.json`.

2.36 yayını: `v2.36.0-0296056ce7e4`, Şile zemin rengi yol sorgusunda yerel indeks. 529 uygulama/11 infra testi, GL/WebGPU, 277 manifest/113 çalışan kaynak hash ve HTTPS/WSS geçti. Diğer yedi servis ve nginx aynı; eski uygulama ve tutarlı veri yedeği korunur. 0 restart, 24.41 MiB/256 MiB. SOURCE ONE 650 g/1100 mAh/medium/25°/gamepad korunur. `sile-build-profile-validation.json`.
