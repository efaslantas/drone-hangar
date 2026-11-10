# Drone Hangar — AWS işletim kaydı

2026-11-02: Kullanıcı Drone simülatörü 2.16 için mevcut Zenth AWS sunucusunu seçti. Canlı adres: https://hangar.18-153-158-209.sslip.io/ . İlk kurulum `v2.16.0-7f5130339846`; güncel sürüm `v2.59.0-01f8df881bcb` (2.59, 2026-11-10).

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

2.37: `v2.37.0-89734fb23807`; bina tabanı sınır hesabı tek geçişe indirildi. 529 uygulama/11 infra, ARM64, 277 manifest/113 çalışan kaynak hash ve HTTPS/WSS geçti. Diğer yedi servis/nginx aynı, rollback ve veri yedeği korunur. `pad-bounds-validation.json`.

2.38: `v2.38.0-44f8624aaa0d`; Şile üç iskeleye kıyı bağlantıları ve rıhtım yüzeyi. 536 uygulama/11 infra testi, GL/WebGPU, 279 manifest/114 çalışan kaynak hash, HTTPS/WSS ve canlı inspection DISARM geçti. Diğer yedi servis/nginx aynı; rollback ve tutarlı veri yedeği korunur. 0 restart,24.2MiB/256MiB. SOURCE ONE 650g/1100mAh/medium/25°/gamepad korunur. `sile-mooring-validation.json`.

2.39: `v2.39.0-e8fe147865f3`; kullanıcının talebiyle ara geçit ve korkuluklar kaldırıldı, iskeleler doğrudan kıyıya uzatıldı. 536 uygulama/11 infra testi, ARM64, 279 manifest/114 kaynak hash, odaklı HTTPS/WSS ve canlı inspectionDISARM geçti. Diğer yedi servis/nginx aynı; rollback/veri yedeği korunur. `direct-piers-validation.json`.


## 2026-11-02 — 2.40 Şile kıyı ve sokak kaynak denetimi

Yaklaşık2×2km kaynak alanı bağımsız GIS ile karşılaştırıldı. Eksik primary_link1025872605, içbükey adacık kıyısı256360436 ve karaya kırpıldığı için görünmeyen yaya köprüsü1531132593 düzeltildi.339kaynak yol/341parça,7kıyı çizgisi/5kara alanı;114adlı parçada isimler korunur. Kıyı0.0067m/yol0.0071m farkı yalnız OSM dönüşüm yuvarlamasıdır, saha doğruluğu değildir. Eski340yol geometrisi,1266bina,10yapı,özgünOSM/DEM ve65×65yükseklik aynı; eski4kara poligonu geometrik olarak aynıdır. Doğrudan3iskele birleşimi korunur. Köprü kaynak merkez çizgisinde, uç kotları arasında temsili yükseklikle çizilir; çizilenFloat32üçgenler temas yüzeyidir.

Bütün yol genişlikleri sınıf tahmini; kaynakta0width etiketi var.30mDSM adacığı0m gösteriyor; yüksekliği uydurulmadı.1485112031/1485112032servis yollarının su/kıyı ilişkisi kaynakta belirsiz; doğrulanmış dolgu/köprü gibi sunulmadan amber işaretlendi. Bayrak Caddesi alt geçiş kot ayrımı da çözülmüş sayılmaz. Kontrol haritası /sile.html#geography-audit üzerinden339kaynak yoluna tıklanır. TümŞile/birebirölçüm/gerçekTX15 veyaİLKEuçuş kabulü değildir.

3GIS/541Node22/11infra,Vite/ARM64 geçti. Bağımsız inceleme temiz;93köprü temas probu geçti. GL/WebGPU kaynak sahne/error[] sabit kamera kanıtı tutulur. Canlıda yeniJS eskiönbellek haritasını yükleyebiliyordu: gerçek tarayıcıda340yol/4kara görüldü; loader cache:no-cache ve RED→GREEN testinden sonra önbelleği silmeden341yol/5kara,error[],DISARM0/3 doğrulandı.

Canlı v2.40.0-6b3a5ede6c5a:281manifest/114runninghash,8değişenpublicSHA/HTTPS/uniqueIDs/entryassets/WSS geçti.0restart24.65MiB/256MiB;7diğer servis/nginx aynı,Zenthweb/API200,GelişimTLSorigin200;eskiapp/tutarlıbackupkorundu. [Doğrulama](sile-geography-validation.json).


## 2026-11-02 — 2.41 liman beton yüzeyleri

Mevcut rıhtım, mendirek kaplaması ve iskele bağlantılarında kodla üretilen plaka derzleri, mineral gözenekleri ve düzensiz aşınma kullanılır. Rıhtım duvarının koyu/ıslak kuşağı ortalama deniz seviyesine göreUV eşlenir; dikeyclamp tekrarlanan su bandını önler. Albedo sRGB, bump/roughness doğrusal; mipmap/anisotropy açık, dünya başına sahiplik ve temizleme var. Referans: Zach1055,7Haziran2025Şilemendireği, WikimediaCommonsCCBYSA4.0; fotoğraf yalnız tarayıcıda incelendi, varlıklara kopyalanmadı. Modelplaka2m ölçüsü görselvarsayım; yeni kıyı/yol ölçümü değil.

2.40ve2.41dünyalarında position/normal/index/transform/instancecolour ve tüm çarpışma hashleri birebir. YalnızUV/malzeme ve generic harbour-pavingcolourattribute değişir; basegolden bu görünüm farkına güncellendi.3piksel regresyonuRED→GREEN,544/544Node22ARM64concurrency4(128109.319868ms),11infra,Vite/ARM64pass. Mevcut gerçektemas testi denizseviyeliUV ve10kaynakdisposeolayı için genişletildi. GL/WebGPU yakınkaynakdünya sabitkamerası/error[]; görüntü gerçekuçuş değil. Küçükmalzemediffi yazar scopedreview; yeni bağımsızreview yok.

Canlı v2.41.0-26faf677f80f;282manifest115runninghash/odaklıHTTPS/changedpageSHA/WSSpass. Gerçektarayıcı341yol/5kara,DISARM0/3/error[];SOURCEONEf60-1750-6s650g1100medium25/gamepadkorunur.0restart25.75MiB/256MiB;7diğerservis/nginxaynı;oldapp/tutarlıbackupkorunur.2servisyolu1485112031/32belirsizliği ve30mDSMyükseklik/genişliktahminisınırlarısürer;gerçekTX15/İLKEuçuşkabulüyok. [Doğrulama](sile-concrete-validation.json).


## 2026-11-02 — 2.42 uzun kıyı ve kayalık geçişi

Batı sahili, uzun mendirek, liman geneli ve doğu kayalıkları sabit kaynak-dünya kameralarıyla incelendi. Yaklaşık 605.7 m kaynak dış mendirek kenarında 383 parça (281 kaya, 102 beton blok) deniz tarafına yerleştirildi. Boyut/açı/mesafe değişir, parçalar kısmen suya gömülür. 6.844 gerçek Float32 çizim üçgeni mevcut temas motoruna katılır; bir mesh ve iki malzeme grubu kullanılır. Kaynak kıyı/DSM/yol/bina/iskele ve eski fizik kayıtları değişmez; yeni zırh ve köpük RGBA alanı ayrıldığında önceki dünyanın geometri ve çarpışma hashleri aynıdır. Doğal kaya malzemesindeki çatlaklar belirginleştirildi. Açık kıyıda köpük değişken, kaynak liman içinde aynı örneğin %20 şiddetindedir. Boyutlar fotoğrafla desteklenen modelleme yorumudur; ölçülmüş kıyı mühendisliği değildir.

İlk seyrek taş dizisi ve düzenli sinüs tabakaları görsel kontrolde elendi; daha dolu omuz ve düzensiz doku tekrar kontrol edildi. Bağımsız son inceleme temiz: 47.908 Float32 örneğinde kara/liman/iskeleyi ihlal yok, yola en az 10.841 m pay. 20 gerçek temas iniş probu ve kaynak temizleme geçti. İlk tam koşuda iki eski mesh bütçesi güncellendi; son Node22 ARM64 koşusu 548/548 (131770.580964 ms), 11 infra, Vite ve ARM64 paket başarılı. Gerçek GL/GPU hata[]; kameralar sentetik, fiziksel uçuş veya FPS testi değil. İlk paket first-build altında korunur ve canlıya gönderilmedi.

Canlı `v2.42.0-f0d7d412b45f`: 283 manifest/116 çalışan kaynak hash, odaklı HTTPS/kaynak sayfası SHA/WSS başarılı. Tarayıcıda 341 yol/5 kara, DISARM0/3/hata[]; SOURCE ONE f60-1750-6s/650g/1100mAh/medium/25°/gamepad korunur. 0 yeniden başlatma,24.28MiB/256MiB; diğer7servis/nginx aynı, eski uygulama ve tutarlı veri yedeği korunur. Batıdaki 2×2km kesim sınırı hâlâ görünür; gerçek devamı için kaynak kapsamı genişlemeli. İki servis yolu belirsizliği,30mDSM ve tahmini genişlik/yükseklik sınırları sürer. [Doğrulama](sile-shore-armour-validation.json).


## 2026-11-02 — 2.43 batı sahilinin kaynakla genişlemesi

Kanonik Şile haritası batıya yaklaşık1km genişledi: yaklaşık3×2km,97×65grid,1316bina,383yol parçası/381kaynakID,8kıyı çizgisi,10denizyapısı.1Kasım merkez OSM kaydı korunup yalnız2Kasım batı kaydındaki yeni(type,id) öğeleri eklendi;birleştirme kuralı ve hamSHA/tarih/URLmakbuzu source-inputs.json'dadır. Aynı CopernicusGLO30kullanılır. Eski4225gridörneği/projeksiyon/spawnaynı;65536fizikselörnekte yükseklik farkı en çok1.6e-13m,normalleraynı. Bu sayısal tutarlılık ölçüm hassasiyeti değildir.1266eski bina/339yolID/10denizyapısı korunur;eski alan kara farkı.215m²sınır yuvarlamasıdır. Eski batı kesimi artık içeridedir, eğri kıyı ve tepe gerçek kaynakla devam eder. Kaynak alan yine sonludur.

50bina/42yol parçası eklenir. Kesilen mendirek ucu tamamlanır;mevcut modelleme kuralıyla722.755m dış kaynak kenarında468parça(344kaya124blok),8368gerçek temas üçgeni olur. Yeni sahil yerleşiminde şezlong ayaklarının nativeüçgen kırığında havada kalması mevcut testleRED oldu;±3m yerleşim alanında>.012m düzlemsellik farkı olan adaylar reddedildi. Arazi düzleştirilmedi.7contexttestiGREEN ve ek inceleme temiz. Kaynak kutu sırası testleri eski8867sabitinden sahiplik sınırına geçirildi; yeni dünya objeleri için geçerli goldens kaydedildi. Kale ve135cephe detayının orijinal geometri hashleri korunur.

550/550Node22ARM64concurrency4(144898.78532ms),3GIS/2mergeCLI/11infra,Vite/ARM64 başarılı. Varsayılan üretici eski2×2km haritayı byteaynı üretir; yayımlanan temizOSM gerçekleri de yeni haritayı byteaynı üretir. Bağımsız kaynak incelemesinde Critical/Important yok;2×2km yazan güncel görsel makbuzları Minor olarak düzeltildi. GL/GPU eski kesim/yeni batı/liman sabit kameraları ve yeni alanınx=-750noktasına eski sınırı aşan simüle hover probu geçti. Bunlar fiziksel uçuş veyaFPSkabulü değildir.

Canlıv2.43.0-8d4c747f78ad:284manifest116runninghash/19değişenpublicSHA/HTTPS/uniqueIDs/entryassets/WSS geçti. Yeni canlı sekmede383yol/5kara,DISARM0/3,RuntimeException[]/consoleerror[];SOURCEONEf60-1750-6s650g1100medium25/gamepadkorunur. Eski tekrar kullanılan sekmede3message-channeluyarısı görüldü;kaynağı kesin atanamadı,yeni kök oturumda tekrarlanmadı;hamkanıt saklandı.0restart25.08MiB/256MiB;diğer7servis/nginx aynı,eskiapp/tutarlıbackupkorundu.30mDSM/tahminigenişlikyükseklik/iki servis yolu belirsizliği ve yeni dış kesim sınırı sürer. [Doğrulama](sile-west-expansion-validation.json).

Geometriyi çevrimdışı yeniden üretmek için yayımlanan source-osm.json, aynı hashli Copernicus kaynakTIFF ve `git show 477324d:public/maps/sile/map.json` içindeki eski coregrid kullanılır. prepare-sile-map.py seçenekleri: `--bbox 29.58866 41.16540 29.62445 41.18341 --cols 97 --rows 65 --preserve-grid CORE.json`. Ardından mevcut prepare-sile-context/coast/building-types araçları ve audit-sile-geography çalıştırılır. Orijinal ham kaynak makbuzunu yeniden üretmek için merge-sile-osm.py ve iki ham girdi gerekir; temiz kaynakla geometri aynıdır, ham provenanceSHAfarklıdır.

## 2.44 — Yakın kum yüzeyi

v2.44.0-9a2633331605: mevcut kaynak plajlarına uygulama için üretilmiş 4m PBR kum dokusu. Geometri/çarpışma aynı; saha ölçümü değil. 553/553 Node22 ARM64,11infra,Vite/ARM64,gerçek WebGL/WebGPU görsel kontrol ve bağımsız inceleme geçti.285paket/117çalışan kaynak SHA,HTTPS/WSS doğrulandı;0restart,28.04MiB.7diğer servis/nginx aynı;geri dönüş konteyneri ve veri yedeği korundu. Kanıt: [kum doğrulaması](sile-sand-validation.json).

## 2.45 — Deniz-kum geometrisi ve temas

v2.45.0-fbd27ca93aaa: batı geniş plajında denize inen temsili yaklaşım, en fazla2m iç ıslak kum şeridi ve aynıFloat32üçgenlerden yükseklik/normal sorgusu. KaynakOSM/DSM değişmedi; profil yeni saha ölçümü değil.560/560Node22ARM64,21odaklı,11infra,Vite/ARM64,gerçekGL/GPU ve bağımsız inceleme geçti.287paket/119çalışankaynakSHA,HTTPS/WSS doğrulandı.0restart24.18MiB;7diğer servis/nginx aynı;geri dönüş konteyneri/veri yedeği korundu. [Doğrulama](sile-waterline-validation.json).

## 2.46 — Kıyı kayalıklarında gövde teması

v2.46.0-16eb380405d8:52.290çizilen kayaüçgeni mevcut küre/üçgen temasına eklendi. Gövde merkezi su tarafında kalırken görünen kayaya girme düzeldi; sabit duvarindeksi yakın adayları seçer. Görsel/sourcegeometri aynı;567/567Node22ARM64,7focused,11infra,Vite/ARM64,GL/GPU ve bağımsızinceleme geçer.288paket/120runningSHA,HTTPS/WSSpass.0restart24.51MiB;7tenant/nginx aynı;oldcontainer/data yedeği korundu. [Doğrulama](sile-cliff-contact-validation.json).

## 2026-11-02 — 2.47 yerel kıyı köpüğü

v2.47.0-5f986166dd40: kıyıya ilerleyen köpük tepesi ve kum üzerinde yayılıp çekilen görsel swash. Tek standart malzeme atlası, sabit RGBA ve temaslar; foam UV dışında tüm görsel geometri aynı. 571/571 Node22ARM64,8focused,11infra,ViteARM64 ve gerçekGL/GPU görüntüleri geçti. 288manifest/120runningSHA,HTTPS/WSS pass.0restart26MiB;7tenant/nginx aynı,eski konteyner/veri yedeği korundu. Ayrıntı: `docs/sile-surf-motion-validation.json`. Ölçülmüş dalga iklimi veya gerçek uçuş doğrulaması değildir.

## 2026-11-03 — 2.48 kayalık yüzey ve ıslaklık geçişi

v2.48.0-b2c6d496aef2: düzensiz katman/çatlak dokusu, geniş renk lekeleri ve deniz seviyesine bağlı yumuşak pürüzlülük geçişi. Yeniuv1 ve kaya rengi dışında görsel geometri ve tüm fiziksel temaslar2.47 ile birebir.575/575Node22ARM64,10reviewerfocused,11infra,ViteARM64 ve gerçekGL/GPU görünüm kontrolü geçti.288manifest/120runningSHA,HTTPS/WSS pass.7tenant/nginx aynı;eski konteyner/veri yedeği korunur. Kanıt: `docs/sile-rock-weathering-validation.json`. Temsili malzeme görünümüdür.

## 2026-11-03 — 2.49 Ağlayankaya doğu kapsamı

v2.49.0-7737887e5d1c: doğuya48sütun/~1.5km eklenir;145×65/~4.5×2km.6305eskiyükseklik/projeksiyon/kalkış/13136sourceprefix korunur;1331bina/468yolparçası. Eski crop binası414800231tamamlanır. Yalnız309193706batıplajında doğrulanmış tesviye;doğukum nativeDSM.576/576Node22ARM64,7GIS,11infra,ViteARM64;bağımsız10coast/beach+6source/coverage geçer.288manifest/120runningSHA/HTTPS/WSS pass;7tenant/nginx aynı. Mağara hacimleri modellenmedi;WebGPUuzakağaç beyazlığı kaydedildi,varsayılanWebGLnormal. Kanıt: `docs/sile-east-coast-validation.json`.


## 2026-11-03 — 2.50 uçulabilir mağara ve doğal geçit

v2.50.0-e90c470d8afd: Feneraltı kapalı uçlu deniz mağarası/kum zemini ve Su İçen Fil iki ağızlı geçit. Kıyı yüzleri kırpılır; ortak Float32 iç yüzler ve korunmuş üst arazi temasları mevcut süpürülen gövde çözücüsünü kullanır. Fotoğrafa dayalı temsili konum/iç ölçüler;26kaynakvarlığı2.49ileSHAeşit. Tek ek çizim nesnesi,52tam dünya/51kaynak sahne bütçesi.584/584Node22ARM64,11infra,ViteARM64,GL/GPU682/682geçiş ve SOURCEONE240fizikadımı/hermağara geçti.292manifest/122runningSHA,HTTPS/5asset/252ID/WSS pass;0restart20.97MiB/256MiB,UID1000readonly.7tenant/nginx aynı;eskiapp/veriyedeği korunur,Zenthweb/API/GelişimTLSorigin200. DeneyselGPUuzakfoliagebeyazlığı önceki kayıt olarak kalır. Kanıt: `docs/sile-sea-caves-validation.json`.


## 2026-11-07 — 2.51 son görüntü hatası ve teslim kontrolü

v2.51.0-28f5c63c08a8: deneysel WebGPU’da gökyüzünün uzak ağaçların üzerine çizilmesinden kaynaklanan beyazlık giderildi. Gökyüzü opak sahneden önce çizilir, derinliğe yazmaz. Geometri, gövde temasları,26kaynakvarlığı ve uçuş/kumanda modelleri2.50ileaynı.585/585Node22ARM64(262098.866103ms),6focused,11infra,ViteARM64,freshreview bulgusuz;GPUdoğukıyı/gecepist,GLmağara682/682 ve canlımenu/pause/resume/DISARM0AGL/error[] doğrulandı.293manifest/122runningSHA,HTTPS5entry252IDvecanlılazyGPUchunktafix,WSS2clientjoinstateleavepass.0restart23.67MiB/256MiB,UID1000readonly.7tenant/nginx aynı;oldapp/databackupkorundu,Zenthweb/API/GelişimTLSorigin200. Sonrapor `docs/sile-final-delivery-validation.json`;fizikselTX15pilotkabulü ve ölçülmemişmağara/sourcebelirsizlikleri raporda açık.

## 2026-11-08 — 2.52 doğal mağara biçimi

v2.52.0-738c03deaf55 ARM64 yayımlandı. Image `sha256:bed28cd9aedb97b8ea245ccefee38dfb6ce79a505c931e309e5fd61537fc3fd7`; arşiv SHA256 `05ba0644ec0059485b2b7aa268817b10d387fe4a4c8d6a00e9830a0ca42495df`. 293 paket manifesti/122 çalışan kaynak SHA doğrulandı. HTTPS,2 istemcili WSS,0restart,UID1000/salt okunur kök,7 komşu servis kimliği ve nginx dosya bütünlüğü doğrulandı. Eski konteyner/veri yedeği korundu. Zenth web/API ve Gelişim TLS origin200. Kanıt: `docs/sile-natural-caves-validation.json`.

## 2026-11-08 — 2.53 eğimli bina temasları

v2.53.0-adbdc325a24c ARM64 yayımlandı. Image `sha256:9cdde7a6d76d891ccbc2f0d8d05634f535503980b80296b241bdd30205b2d0ca`; arşiv SHA256 `eca185413008456220de46d7bd6273228fdae8f6fb6cedfeaff67d3f72883bb2`.294manifest/122çalışan kaynak SHA,HTTPS/lazyGPUskyfix/WSS/liveUI;0restart,UID1000readonly,7tenant/nginxkimliğiaynı. Eskiapp/veriyedeği korundu. Kanıt `docs/sile-roof-contact-validation.json`.

## 2026-11-09 — 2.54 ek kıyı bina izleri

v2.54.0-de2756816913 ARM64 yayımlandı.Image `sha256:e8ec840de6d03cc6c9b225a90a384e2e9daeb4b39c762e8b3bfb7cd50d398ebb`;archiveSHA256 `989999ad2654eefe6956cfe7cd8bb45bd36a619270181b211d8d8a2e9efbf461`.302manifest/125runningSHA,HTTPS/5entry252ID/lazyGPUskyfix/ikiyeniODbLassetSHA/WSS/liveUI doğrulandı. Eskiapp/veriyedeği ve7tenant/nginxkorundu;UID1000readonly,0restart. Kanıt `docs/sile-building-supplement-validation.json`.

## 2026-11-09 — 2.55 batı liman pavyonu

v2.55.0-6f8e573f64c1 ARM64 app-only yayımlandı. Image `sha256:9c221782f0a3bd112460ef72c8472865367dfe04e02e9706fb58596c7939f30d`; archiveSHA256 `b1d0d3db8f6decbaedf70cfe9f2decba389467eb7f9917009cd8c7a27317b28d`.304 manifest kaynağı, çalışan kaynak SHA kontrolleri, HTTPS/meta2.55/mapSHA/lazyGPU ve iki istemcili WSS doğrulandı. 7 komşu tenant ve nginx aynı, eski konteyner/veri yedeği korundu; UID1000 readonly ve0restart. Kanıt `docs/sile-pavilion-validation.json`.


## 2026-11-09 — 2.56 altı bölgeli Şile teslimi

v2.56.0-618a82e72259 ARM64 app-only yayımlandı. Image `sha256:ee037f8ddd72603aa9514e22f8e1ad80ff02fa42fd43aaaf0ac3cabdff06ad46`,archiveSHA256 `6d95112f50143d53d5021ccfdd24eeea081da2f4484e66e7e5fde8ebeb9a4b79`. 445paket kaynağı ve çalışan src/server kaynaklarıSHA ile doğrulandı. HTTPS/meta2.56/tekilHTMLID/lazyGPUskyfix/yeniworkerchunk/CC0rockassetSHA ve2istemciliWSSjoin/state/leave geçti. UID1000readonly/0restart,7tenantve nginxaynı;eskiapp/veriyedeğikorundu. Zenthweb/API/GelişimTLSorigin200. Kanıt `docs/sile-completion-acceptance.json`.


## 2026-11-09 — 2.57 hazırlık kare sınırları

v2.57.0-e89963741523 ARM64app-only yayımlandı. Image`sha256:fc8adb753f47cea6bbe95e0318a1e2474458c31ce52b1d27b7cc8c74623bbab2`;archiveSHA`356b97bc24fd85d005df7dba74a7ddf97867ef519ea4c21b3d308982a25e76bc`. 445manifest/134runningSHA,HTTPS2.57/253ID/lazyGPUskyfix/worker/assetSHA veWSS2client doğrulandı.7tenant/nginxaynı,UID1000readonly/0restart,oldcontainer/databackupkorundu,Zenthweb/API/GelişimTLSorigin200.628/628Node22ARM64 ve11infra geçti. Fizik/haritaverisideğişmedi;GPU241msilkçizimkalır. Tekrapor docs/sile-completion-acceptance.json followups.loading257.


## 2026-11-10 — Şile kıyı yerleşimi 2.58

v2.58.0-47520f3ee55f ARM64 app-only yayımlandı. Image `sha256:c3323d44340e95bed74a66924acf2368b42ae50152610ae74a614894094605ea`; archive SHA `cea007b947df2a27f247487abe4bef765016098d2c63d9394860056301ab3bed`. 460 HEAD/worktree/package SHA eşleşti; çalışan kaynaklar ve HTTPS/worker/GPU/harita/ESA veri SHA kontrolü, 2 istemcili WSS, canlı DISARM/0AGL/0hız doğrulandı. 7 tenant/nginx aynı; UID1000 readonly/0restart, eski uygulama ve veri yedeği korundu. 642/642 Node22ARM64,13GIS,11infra geçti. Yeni900s görünür medium1280×720 koşusunda tüm bölgeler ~60FPS, en düşük1%53.444FPS.119ek kaynak yapı,680görsel OSMcephe,1600ağaç bütçesi,420temsili plaj takımı; ana OSM/DSM ve kullanıcıRCfix korunur, türetilmiş kaynaklar değişti. Birebir ölçülmüş Şile değildir; yeni kullanıcı/TX15 kabulü yapılmadı. Kanonik rapor: docs/sile-completion-acceptance.json followups.waterfront258.


## 2026-11-10 — Şile spor sahaları ve rıhtım 2.59

v2.59.0-01f8df881bcb ARM64 app-only yayımlandı. Image `sha256:dd49a978fedbd8b2449b878a31b4f4ff607e60adacb112f9dfa8be04e8298cce`; archive SHA `5ce9380d4f6ea69c4788f09985d1a1ef2954615918ffd673869f741b740775b2`. 467 paket kaynak SHA eşleşti; çalışan kaynaklar/HTTPS/worker/GPU/yenilenen context/metadata SHA,2istemciWSS,canlıDISARM0AGL0hız doğrulandı.7tenant/nginxaynı;eskiuygulama/veriyedeğikorundu.649/649Node22ARM64,11infra,12geometrikrota;nativeGL/GPU6bölge+stadyum. Bu sürümün yeni180sgörünürperformanskontrolü followups.grounds259.performance içindedir; önceki900s2.58kaydıtarihseldir.5OSMpitchkaydı/temsiliçizgiler,varsayımsal30mkararıhtımbandı;kökenharita/OSM/DSM/RCfixaynı,ölçülmüşkot/tribüneklenmedi. Kullanıcı/TX15kabulünot-run.
