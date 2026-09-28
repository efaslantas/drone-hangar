# EFA Hangar — Drone Akademisi uygulama ve teslim planı

> Historical product and implementation plan. Some proposals have since shipped or changed. Current behavior is documented in `docs/URUN-ANALIZI.md`, `README.md`, and the source code.

Tarih: 12 Eylül 2026. İncelenen temel: `2dbb476`.
Durum: analiz ve uygulama sözleşmesi. Bu dosya geliştirmelerin yapılmış olduğunu göstermez.

## 1. Ürün hedefi ve kapsam kararı

Mevcut uygulama üzerinde, PS koluyla uçuş koordinasyonu ve FPV kontrolü çalışılabilen; gerçek RC kumandasıyla da kullanılabilen bir drone eğitim uygulaması geliştirilecek. Ana döngü: cihaz kontrolü → ders brifingi → kalkış → ölçülen egzersiz → iniş → uçuş değerlendirmesi → tekrar veya sonraki ders.

Ana ürün Türkçe olacak. Altı harita, modeller, sesler, tekrar sistemi ve bağlantı altyapısı kullanılacak. Yeni müfredatın odağı temel uçuş, manuel gaz, acro, çevre yönetimi ve sivil görevler olacak. Muharebe, silah, bot ve takım savaşı akademi arayüzünden çıkarılacak. Eski kod ve kayıtlar sürümlü uyumluluk katmanında korunacak; eski bir bağlantı kullanıcıyı habersizce silahlı oturuma sokmayacak. Yarışlar ileri seviye parkur disiplini olarak korunacak. Serbest antrenman botsuz, ateşsiz başlayacak.

Gerçekçilik iddiası ölçümle sınırlandırılacak. Çalışan testler bir hava aracının uçuş karakterinin doğrulandığı anlamına gelmez. PS kolunun merkezlenen gazı ve kısa stick mesafesi açıkça anlatılacak. Eğitim başarısı gerçek dünya uçuş yetkisi veya sertifikası olarak sunulmayacak. Gerçek hava aracı verisi bulunmayan parametreler “yaklaşım” olarak kaydedilecek.

## 2. Doğrulanan mevcut kusurlar — ilk teslim kapısı

12 Eylül'de mevcut modülleri doğrudan çağıran küçük tekrarlanabilir kontrollerle:

| Bulgu | Kanıt / kod | Gerekli düzeltme |
|---|---|---|
| İleri pitch acro/angle arasında ters | Aynı `pitch: 0.2` komutuyla angle ileri giderken acro geri gidiyor; `src/physics.js` | Dünya/gövde eksen sözleşmesi; her modda dört eksenin yön testi |
| Havada iniş sayılabiliyor | `landedSoft({x:0,y:1,z:0,armed:false,vx:0,vy:0,vz:0})` true | Gerçek temas olayı, temas öncesi hız, hedef pad, disarm ve bekleme |
| Halka geçmeden başarı | Merkez z=-10 olan halkaya z=-8'e yaklaşmak başarı sayılıyor | Yönlü düzlem kesişimi; kesişim noktasında açıklık testi |
| Çapraz stick normalizasyonu bozuk | `radialDeadzone(1,1)` uzunluğu 1.414 | Normalizasyonda gerçek vektör uzunluğu; en fazla 1 çıktı |
| “Gerçekçi acro” dersinde acro zorlanmıyor | `spawn()` modu drone varsayılanından alıyor; mod değiştirilebilir | Dersin `requiredFlightMode` politikası motor ve UI'da uygulanmalı |
| Ders başlangıcı gerçek kalkışı atlıyor | `spawn()` havada ve armed başlıyor | Yeni akademi dersleri pad üzerinde disarmed; özel havada kurtarma egzersizi açıkça ayrı |
| Batarya havada dolabiliyor | `canSwapBattery()` düşük irtifayı yeterli görüyor | Temas + disarm + bilinçli pil değiştir eylemi |
| Rüzgâr hız değil ivme | `world.js` ve `physics.js` doğrudan hıza ekleme | m/s cinsinden hava hızı, göreli hava akışıyla drag |
| Rota testlerinin kapsamı dar | `daily-world.test.js`: props false, temel şablon irtifaları | Yüklenen modeller, tüm irtifa varyantları, bütün dersler, mobil/masaüstü |
| Sonuç ağırlıkla süre | `progress.js`, `server/store.mjs`, `showResult()` | Beceri ölçümü; sürüm ve yardım profiliyle ayrı kayıt |

Bu sorunlar giderilmeden yeni ürün “eğitim için tamam” sayılmayacak. Eski 188 test regresyon tabanı olarak korunacak; yanlış davranışı onaylayan testler fizik/görev sözleşmesine göre yeniden yazılacak.

## 3. Kontrol ve uçuş modları

Kontrol profili, uçuş modu ve yardım seviyesi üç ayrı kavram olacak. Üçü de brifingde, uçuş HUD'ında ve raporda gösterilecek.

### Gaz profilleri

- **PS destekli başlangıç:** mevcut hover çevresinde merkezlenen gaz, yalnızca alışma ve serbest çalışmada. Etiket: “merkez gaz desteği”. Manuel gaz yeterliliklerine sayılmaz.
- **PS manuel gaz:** sol stick en alt 0, en üst 1, merkez yaklaşık %50 komut. Hover otomatik merkezlenmez. Merkeze dönen yay nedeniyle kolu aktif tutmak gerektiği gösterilir. R2 gazı değiştirmez.
- **RC kumanda:** kalibre edilmiş gaz ekseni min–max aralığında 0–1; merkez deadzone uygulanmaz. Pitch/roll/yaw merkeze göre kalibre edilir. Herhangi bir cihaz markasına bağlı sabit eksen tahmini yapılmaz.

Mode 2: sol yatay yaw, sol dikey gaz; sağ yatay roll, sağ dikey pitch. Sol gaz ve yaw birbirini değiştirmemeli: ayrı eksen kalibrasyonu kullanılacak. Sağ stick dairesel filtre isteğe bağlı olabilir; dönüş eğrileri gizli ikinci expo içermeyecek.

### Uçuş modları

- **Destekli:** başlangıçta konum/irtifa yardımlarının hangilerinin açık olduğu görünür.
- **Angle:** otomatik doğrultma; manuel gaz dersinde otomatik irtifa, yatış gaz telafisi ve yatay fren kapalı.
- **Acro:** stick açısal hız komutu verir; bırakılınca gövde kendiliğinden düzleşmez. Gaz bağımsızdır.
- Kamera/inceleme platformlarının stabilizasyonu FPV acro ile aynı yeterlilikte puanlanmaz.

Acro dersleri acro, belirlenen kamera ve manuel gaz profilini zorunlu tutar. Yardım değişirse çalışma devam edebilir fakat değerlendirme denemesi biter ve çalışma olarak kaydedilir. Cihaz kopması yeni gaz üretmez: tek kişilik uçuş duraklar, geri dönüşte düşük gaz kontrolü yapılır. Çok oyunculu oturumlarda sunucuya bağlantı kaybı bildirilir; eski komut süresiz tutulmaz.

### Kalibrasyon akışı

1. Cihaz seç, bir düğmeye bas; cihaz adı ve eşleme durumu görünür.
2. Merkezlenen eksenleri 2 saniye serbest bırak; merkez ve gürültü ölçülür.
3. Stick uçlarını gezdir; her eksenin iki ucu kaydedilir.
4. Ekrandaki pitch/roll/yaw/gaz hareketlerini uygula; eşleme ve terslik doğrulanır.
5. Düğmelere ARM, reset ve menü ata; çakışmayı göster.
6. Sonuç ekranında giriş ve normalize çıktı birlikte gösterilir; kaydet/yeniden dene.

Kalibrasyon cihaz kimliği + mapping + eksen/düğme sayısı + profil sürümüyle saklanır. Bozuk, eksik veya NaN kayıt varsayılana düşer ve kullanıcıya bildirilir. Drift için kullanıcı override sunulur. Normal titreşim API'si desteklenirse kısa çarpışma/düşük pil geri bildirimi kullanılır; adaptif tetik desteği vaat edilmez. Desteklenmeyen cihaz sessizce çalışır.

## 4. Fizik ve kamera sözleşmesi

Önce deterministik, anlaşılabilir temel kurulacak; efekt sayısını artırmak gerçekçilik ölçütü olmayacak.

- SI birimleri: konum m, hız m/s, ivme m/s², kütle kg; kullanıcı rate ayarları derece/saniye, iç hesap radyan/saniye.
- Sabit 120 Hz simülasyon: accumulator ve sınırlı catch-up. Fizik, görev geçişi, pil, rüzgâr ve telemetri aynı alt adımda ilerler. Sadece fiziği alt adımlara bölmek yeterli değildir.
- Görüntü önceki/güncel poz arasında interpolate edilir. Kamera, reticle ve drone aynı render pozu kullanır. Ağ gönderimi render FPS'inden ayrı aralıkta yapılır.
- Uzun sekme askısı catch-up patlamasına yol açmaz. Çalışma duraklar; sınav zaman bütünlüğü bozulursa deneme puan dışı kalır. Rapor yavaş çalışan cihazı da belirtir.
- Gerçek/başlangıç modu artık yanlış yön, ekstra aşağı kuvvet veya gizli fren farkı yaratmaz; yardımlar açık politikalar olur.
- Throttle komutu → motor cevabı → itki eğrisi → batarya etkisi ayrı hesaplanır. Eski doğrusal hover hesabı yeni itki eğrisine göre yeniden kalibre edilir.
- Hava akışı = drone dünya hızı − hava hızı. Drag hareketin tersine işler; durgun havada enerji üretmez. Rüzgâr seed'li ve zaman tabanlı olur.
- Gövde eksenlerinde sürüklenme ve açısal cevap; ölçü bilinmiyorsa açıkça tahmini parametre. Sabit rate tercihi platform değişince gizlice farklı hassasiyete dönüşmez.
- Temas olayı: dünya konumu, normal, yüzey/pad kimliği, temas öncesi normal/teğetsel hız, gövde açısı ve zaman. Çarpışma sonrası sıfırlanmış hız iniş kalitesi hesabında kullanılmaz.
- İnce duvarlar için süpürülmüş çarpışma. Görseldeki açık kapı gerçek açıklığa sahip olur; dönen engellerde dünya AABB'si gereksiz kapalı alan üretmez.
- Ground effect ve propwash ancak temel profil doğrulandıktan sonra ayrı, sınırlı özellikler olarak eklenir. Ground effect en yakın taşıyıcı yüzeye göre; propwash kontrollü alçalma/airflow'a göre, rastgele kamera sallama olarak değil.
- FOV yatay açı olarak tanımlanır, en-boy oranından dikey FOV türetilir. Eğitim için ilk aday 100° yatay FOV ve 15° tilt; bunlar kullanıcı testiyle ayarlanır. Lens çarpıtması ve yapay titreşim sınavda kapalı.

İlk referans platformlar: 65–75 mm whoop, 3 inç toothpick, 5 inç freestyle ve stabilize kamera quad. Diğer altı model aynı parametre doğrulama sürecinden geçirilmeden onaylı referans sayılmaz. Boyut/itki/hover/rate verisi için kaynak veya ölçüm kaydı tutulur. Gerçek uçuş kaydı olmayan model “birebir aynı” diye tanıtılmaz.

## 5. Haritalar ve eğitim alanları

| Harita | Kullanım | Düzenleme |
|---|---|---|
| Kapalı hangar | İlk kalkış, hover, konum ve iniş | 5 m grid, ölçülü koniler, ayrı çalışma kutuları, pad ve yükseklik referansları |
| Pist | Düz hat, frenleme, dönüş, acro kurtarma | Slalom, sekiz, dönüş koridorları, rüzgâr tulumu; hızlı egzersizler için saha büyütme |
| Depo | Dar geçiş, yüzey yakınlığı, kargo | Ölçülü kapı ve konteyner açıklıkları, yük teslim yüzeyleri |
| Şehir | Cephe inceleme, kontrollü yaklaşma | Tam bina kabukları, geçilebilir kapılar, yüzeyden mesafe bölgeleri |
| Orman | Hat seçimi ve arama | Sabit ağaç düzeni, kanopi/trunk uyumu, açık koridor ve acil iniş noktaları |
| Kıyı | Rüzgâr, enerji, dönüş kararı | Kara tarafında eğitim, görünür saha sınırı, su temas kuralı ve dönüş alanı |

Mevcut pist yaklaşık 96×110 m; kıyı yaklaşık 88×66 m. Bunlar otomatik olarak yüksek hızlı kurtarma veya “uzun menzil” için uygun sayılamaz. Önce hız sınırı, gereken dönüş yarıçapı ve durma mesafesi hesaplanacak; egzersiz sığmıyorsa harita büyütülecek. Mevcut ~170 m orman parkuru gerçek uzun menzil diye sunulmayacak; ilk sürüm adı “enerji ve dönüş planlama”.

Rota doğrulaması: spawn, yaklaşma koridoru, kapı açıklığının tamamı, dönüş hacmi, iniş ve alternatif iniş dahil. Props ve ağaç modelleri yüklenmeden sınav başlamaz. Kaynak model sınırları ve collider verisi aynı manifestten üretilir. Mobilde görsel detay azalabilir; sınavın çarpışma geometrisi değişmez. Hareketli kapılar sınavda belirlenmiş zaman/seed ile çalışır veya sabitlenir.

Tek görsel dil: grafit ve sıcak beton yüzeyler, kontrollü amber aktif görev işaretleri, cyan rehber çizgiler; başarı yeşil, kritik uyarı kırmızı. Malzemeler, drone boyutu, kamera FOV'u ve ölçek referansları birlikte incelenir. Gece dersleri ileri aşamaya alınır; zorlaştırmak için hedefler görünmez yapılmaz.

## 6. Müfredat: 30 ders + 6 uygulama görevi

Eşikler ilk ürün tasarımıdır, fiziksel havacılık standardı değildir. Pilot denemesiyle sürümlenir. Başlangıç dersleri çalışma ve sınav olmak üzere iki seçenek taşır. Önceden açılan dersin çalışması kapanmaz; yeni yeterlilikler sadece yeni şartlarda kazanılır.

| ID | Ders | Mod / saha | Ölçülen davranış |
|---|---|---|---|
| A01 | Kumanda ve ARM | Pad / hangar | Eksen doğrulama, düşük gazda ARM ve DISARM |
| A02 | İlk kalkış | Destekli / hangar | Pad'den 2 m'ye kalkış, limit aşmama |
| A03 | Sabit hover | Destekli / hangar | 10 s kesintisiz hedef hacmi |
| A04 | Yüksel–alçal | Destekli / hangar | 2/4/2 m hedeflerinde dengelenme |
| A05 | Konum değişimi | Destekli / hangar | İleri/geri/yan; hedefte durma |
| A06 | İlk iniş | Destekli / hangar | Gerçek pad teması, düşük hız, disarm |
| B01 | Manuel gaz tanıma | Angle / hangar | Otomatik hover kapalıyken gazı bulma |
| B02 | Manuel hover | Angle / hangar | 15 s irtifa ve yatay konum kontrolü |
| B03 | Düz hat | Angle / pist | Koridorda irtifa ve hız bandı |
| B04 | Yavaşlama | Angle / pist | Hedef kutuda durma; mesafe ve hız |
| B05 | Kare parkur | Angle / pist | Dört köşe, yön ve durma kontrolü |
| B06 | Temel yeterlilik | Angle / pist | Kalkış → hat → dönüş → iniş |
| C01 | Acro yön kontrolü | Acro / pist | Doğru pitch/roll/yaw; auto-level yok |
| C02 | Küçük yatışlar | Acro / pist | Komut ver, kes, ters düzeltmeyle toparla |
| C03 | Sabit acro hat | Acro / pist | İrtifa, hız ve koridor |
| C04 | Koordineli dönüş | Acro / pist | Sağ/sol dönüşte yatış–yaw–gaz |
| C05 | Sekiz çizme | Acro / pist | İki yön, kesintisiz kontrollü çizgi |
| C06 | Acro yeterlilik | Acro / pist | Manuel gaz ve yardımsız tam uçuş |
| D01 | Kamera ve hız | Acro / pist | 15°/30° tilt ile hedef hız; ayrı bölümler |
| D02 | İrtifa kurtarma | Acro / geniş pist | Belirlenmiş yatıştan düz uçuşa dönüş |
| D03 | Kontrollü alçalma | Acro / geniş pist | Düşey hız limiti ve toparlama yüksekliği |
| D04 | Slalom | Acro / pist | Geçiş yönü, merkez sapması, ritim |
| D05 | Dar geçit | Acro / depo | Açıklık, yaklaşma açısı, temas |
| D06 | Hassas FPV iniş | Acro / pist | Hedef merkez ve temas öncesi hız |
| E01 | Yan rüzgâr | Angle/Acro ayrı / pist | Rüzgâr düzeltmesi; otomatik yaw önerisi yok |
| E02 | Karşı–arka rüzgâr | Acro / kıyı | Yer hızı, hava hızı ve enerji farkı |
| E03 | Değişken hava | Acro / pist | Seed'li rüzgârda koridor tutma |
| E04 | Enerji ve dönüş | Acro / genişletilmiş rota | Pil rezerviyle geri dönme |
| E05 | Düşük ışık | Acro / orman | Hat seçimi, yön ve iniş |
| E06 | Uçuş yeterlilik finali | Acro / pist–depo senaryosu | Tam döngü, güvenli rezerv ve temiz iniş |

Altı görev: (M01) cephe inceleme, (M02) çatı tarama, (M03) ormanda arama, (M04) hassas kargo, (M05) enerji bütçeli keşif, (M06) düşük güçte alternatif iniş. M01–M03 için yalnızca hedefe yaklaşmak yeterli değil: kamera görüş açısı, yüzeye mesafe, bakış süresi ve görüşü engelleyen nesneler kontrol edilir. M04 yük alırken/alçaltırken temas, hız ve stabilizasyon ölçer. Arama-kurtarma bir oyun senaryosu olarak kalır; gerçek operasyon eğitimi sertifikası sunmaz.

Günlük görev artık yeterlilik düzeyine uygun bir beceri egzersizi seçer. Gün, ders/harita/fizik sürümü ve seed sabittir. Rastgele doğrulanmamış rota yok. Günlük çalışma ileri derslerin kilidini atlamaz. Başlangıç/ileri günlük grupları ve yardım profilleri ayrı değerlendirilir.

## 7. Görev motoru ve puanlama

Yeni ders modeli en az şu bilgileri içerir: `id`, `version`, `prerequisites`, `mapVersion`, `physicsVersion`, `droneProfile`, `requiredFlightMode`, `allowedInputProfiles`, `assists`, `spawnPolicy`, `environmentSeed`, `objectives`, `rubric`, `failureRules`.

Görev yaşam döngüsü: hazırlık → yerde/disarmed → arm kontrolü → kalkış → egzersiz → yaklaşma → temas → disarm → sonuç. Açık havada kurtarma gibi istisnalar ayrı spawn politikasına sahip olur. Ders başarısı iniş gerektiriyorsa son halkada tamamlanmaz. Çalışma checkpoint'i sınav puanıyla karışmaz.

Yeni hedefler: `takeoff`, `hold`, `corridor`, `heading`, `gate`, `speed`, `recover`, `inspect`, `land`, `batteryReturn`. Mevcut görev çeşitleri adaptörle çalışır. İrtifa hatası mutlak y yerine zeminden/pad'den yüksekliğe göre gerektiğinde AGL hesaplanır.

**Başarı kuralları:** yalnızca skorla ciddi hatalar telafi edilemez. Zorunlu hedef sırası, gerekli uçuş profili, çarpışmasız bitirme ve iniş ön koşuldur. Görev sırasında yanlış mod, atlanan hedef, reset veya kritik sınır ihlali sınavı geçersiz yapar. Çalışma modunda eğitmen açıklamasıyla tekrar yapılabilir.

**Ölçüm tanımları:**

- Rota: aktif, yönlü rota segmentine yatay RMS sapma; bütün rota üzerindeki en yakın noktayı seçip kısayolu ödüllendirmez.
- İrtifa: hedef profilinden zaman ağırlıklı RMS sapma.
- Hover: konum + irtifa + hız + gerektiğinde heading bandında kesintisiz kalış; çıkınca birikim sıfırlanır, sınırda titreme için kısa histerezis kullanılır.
- Kapı: önceki/güncel konum arasındaki süpürülmüş segment, doğru yönde düzlemi kesmeli. Kesim noktası drone açıklık payıyla iç çemberde olmalı. Yaklaşma, ters geçiş ve aynı kapıda bekleme başarı sayılmaz.
- Akıcılık: sabit frekansta kayıtlı rate/gaz komutlarının değişimi; kasıtlı kurtarma ve görevce gerekli sert düzeltme bölümleri ayrı değerlendirilir. Süre uzatarak puanı şişirmek mümkün olmaz.
- İniş: temas öncesi düşey/yatay hız, pad merkezine uzaklık, gövde yatışı, doğru yüzey ve disarm. Temastan sonra en az 1 s stabil kalış.
- Enerji: modelin kullanılabilir pil rezervi; havada otomatik dolum yok.

İlk kabul eşikleri: başlangıç hover 0.8 m yatay / 0.5 m düşey / 0.5 m/s hız, 10 s; manuel hover 0.6 m / 0.4 m, 15 s; temel iniş ≤0.8 m/s düşey, ≤0.5 m/s yatay, ≤0.75 m merkez hatası ve ≤15° yatış; hassas iniş ≤0.5 m/s düşey ve ≤0.4 m merkez hatası. Bunlar sürüm başına pilot testiyle onaylanır.

Puan: rota %30, irtifa %25, kontrol akıcılığı %20, iniş %25. Uygulanmayan boyut çıkarılıp ağırlıklar normalize edilir; eksik telemetri 100 puan getirmez. Başarı için zorunlu koşullar + en az 70 puan; bronz 70, gümüş 85, altın 95. İki ardışık başarılı yeterlilik denemesi bölüm belgesini açar. Süre yalnızca aynı koşullarda eşit puana yardımcı ölçüt; ilk derslerde hız teşviki yok.

## 8. Rapor, kayıt ve sunucu

Uçuş raporu: başarı nedeni, yardım/mod/cihaz profili, ölçülen hata ve eşik, en fazla üç düzeltme önerisi, rota üstten görünümü, irtifa ve gaz grafiği, temas işaretleri ve tekrar oynatma. Uçuşun başarısız bölümü zaman çizgisinden seçilebilir. Eğitmen mesajları ölçüm tetiklerine dayanır, aynı anda tek kısa komut ve tekrar sınırlaması kullanır.

Telemetri fizik adımında ölçülür; gösterim/kayıt için 20–30 Hz'e örneklenir. Veri: zaman, poz, quaternion, hız, komutlar, motor çıkışı, pil, rüzgâr, mod, aktif hedef ve temas olayları. Bellek ve kayıt bütçesi tanımlanır: en fazla 15 dakikalık detaylı deneme; daha uzun serbest uçuşta dönen tampon. IndexedDB'de son 20 detaylı deneme + seçilen kişisel referanslar; özetler kalıcı. Kota dolarsa en eski ayrıntı silinir, başarı kaydı korunur.

Eski `efa-hangar-ops-v1` ve ghost kayıtları otomatik silinmez. `academy-v1` ayrı şema: geçmiş denemeler, yeterlilikler, en iyi kalite, cihaz profili ve sürümler. Eski bitirme yeni manuel/acrolu yeterlilik sayılmaz; “önceki sürüm geçmişi” görünür. Görev kimliği veya fizik değişince eski ve yeni skor tek listede karıştırılmaz.

Başlangıçta akademi kalite raporu yerel ve açıkça “yerel değerlendirme”dir. Kamuya açık doğrulanmış sıralama ancak sunucu aynı sürümlü hedef/puanlama kurallarını doğrulayabiliyorsa açılır. İstemcinin gönderdiği toplam puana güvenilmez. Upload isteğe bağlı; payload boyutu, örnek sayısı, zaman sırası, finite sayı, ders sürümü ve oturum eşleşmesi sınırları uygulanır. Sunucu zamanı tek başına fizik doğruluğu kanıtı sayılmaz.

Çok oyunculu eğitimde aynı harita/physics sürümü ve ders hedefleri eşlenir. Diğer pilotların görünümü şahsi hedef ilerlemesini etkilemez. Eğitmen izleme salt okunur; uzaktan kumanda kontrolü ilk sürüm kapsamına alınmaz. Eski `training` odasının bot davranışı kaldırılır; oda adları istemci/sunucuda ortak sözleşmeden gelir.

## 9. Arayüz ve kod ayrımı

Ana ekran: “Eğitime devam”, “Akademi”, “Görevler”, “Serbest çalışma”, “Uçuş kayıtları”. Kumanda durumu ve kalibrasyon erişimi sürekli görünür. Hazırlıkta yalnızca ders için anlamlı ayarlar gösterilir. Brifing beceri, araç/mod, gaz profili, hava, başarı eşiği ve tahmini süreyi söyler. HUD gaz, irtifa, hız, pil, aktif hedef ve tek eğitmen mesajıyla sadeleşir; ateş/kill/HP unsurları görünmez.

`main.js` tek başına büyütülmez. Önerilen modüller:

| Modül | Sorumluluk |
|---|---|
| `src/simulation-clock.js` | Sabit adım, duraklama, interpolate zamanı |
| `src/controller-profile.js` | Eksen kalibrasyonu, cihaz profili, gaz/rate eşlemesi |
| `src/academy/curriculum.js` | 30 ders + 6 görev, ön koşul ve sürümler |
| `src/academy/session.js` | Başlangıç, mod zorunluluğu, reset ve başarı yaşam döngüsü |
| `src/academy/objectives.js` | Fizikten bağımsız hedef geçiş kuralları |
| `src/academy/assessment.js` | Ölçüler, rubric, geçiş ve öneri |
| `src/academy/telemetry.js` | Örnekleme, tampon, tekrar verisi |
| `src/academy/storage.js` | IndexedDB ve eski kayıt uyumluluğu |
| `src/academy/ui.js` | Akademi, brifing, HUD, kalibrasyon ve rapor |
| `src/world-manifest.js` | Ortak görsel/çarpışma ölçüleri ve sürümler |
| `server/academy.mjs` | Sürümlü oturum ve gerektiğinde sonuç doğrulama |

Mevcut `physics.js`, `collide.js`, `catalog.js`, `world.js`, `input.js`, `goals.js`, `progress.js`, `ghost.js`, `briefing.js`, `missions.js`, `rooms.js` ve sunucu bağlantıları bu sınırlarla kademeli adapte edilir. DOM veya render bağımlılığı ölçüm/fizik modüllerine sokulmaz.

## 10. Uygulama sırası ve ara teslimler

| Aşama | Çıktı | Çıkış koşulu |
|---|---|---|
| P0 | Mevcut durum kaydı, başarısız yön/iniş/kapı/stick regresyonları | Dört kusur testle görünür; temel commit ve veri yedeği kayıtlı |
| P1 | Eksen düzeltmesi, temas ve yönlü kapı, mod politikası | Hatalar giderilmiş; ilk ders tek başına gerçek kalkış–iniş çalışıyor |
| P2 | Sabit saat, pil/rüzgâr birimleri, dört referans model | Aynı seed/komut akışı 30/60/120 FPS'de aynı sonuç |
| P3 | Kalibrasyon, manuel PS/RC, rate ayarları, kopma davranışı | Gerçek cihazla eksen testi + saklama + yeniden bağlama |
| P4 | Bir tam örnek ders: brifing → uçuş → ölçüm → rapor → kayıt | Başarılı/başarısız uçuşun bütün döngüsü tarayıcıda çalışıyor |
| P5 | 30 ders, 6 görev ve harita koridorları | Her ders için başarı ve her kritik hata senaryosu geçiyor |
| P6 | Akademi arayüzü, rapor grafikleri, günlük egzersiz ve ağ uyumu | Silahsız ana akış, eski kayıtlar, tekrar ve kopma doğrulanmış |
| P7 | Görsel/işitsel son geçiş, ground effect/propwash doğrulaması | Düşük/yüksek grafik aynı uçuş sonucu; efektler temel fiziği bozmuyor |
| P8 | Staging, gerçek kol denemesi, Azure dağıtımı ve geri dönüş provası | Aşağıdaki teslim matrisinin tüm zorunlu satırları kanıtlı |

Her aşama ayrı küçük commitlerle gelir. Sadece test sayısını artırmak veya menü metni değiştirmek aşamayı tamamlamaz. Herhangi bir aşama eksikse toplam iş “tamamlandı” olarak raporlanmaz. İlk altı derslik çalışan örnek, 30 dersi çoğaltmadan önce kullanılır; hatalı ders motoru çoğaltılmaz.

## 11. Test ve teslim matrisi

- **Kontrol:** ileri/geri/sağ/sol/yaw tüm modlarda doğru; tam diagonal, bozuk merkez, eksik eksen, standard/nonstandard mapping, tek kol/iki kol, Bluetooth kopması; gaz/yaw birbirini etkilemiyor.
- **Fizik:** sabit 120 Hz'de aynı seed ve aynı zaman damgalı komut akışıyla 30/60/120 render FPS; aynı alt adım sayısında konum ve quaternion farkı 1e-6 altında. Canlı manuel girişin örnekleme farkı bu deterministik teste karıştırılmaz.
- **Temas:** hızlı harekette ince duvar delinmiyor; gerçek kapı açıklığı geçiliyor; çatı teması yerdeki pad sayılmıyor; havada disarm iniş sayılmıyor; normal/sert iniş temas öncesi hızla ayrılıyor.
- **Görev:** yaklaşma/ters geçiş/aynı halkada bekleme/iki hedef atlama başarısız; tek hızlı geçiş bir kez sayılıyor; hover kesintisiz; acro dersi angle ile geçilemiyor; checkpoint/reset sınav sonucu üretmiyor.
- **Skor:** ideal uçuş ≥95, kontrollü sınırda uçuş yaklaşık 70, rota kesme veya başarısız iniş puana rağmen geçmiyor. Telemetri eksikse ölçüm “yok” ve sınav puan dışı; NaN/Infinity kabul edilmiyor.
- **Harita:** altı harita, bütün dersler, günlük seed ve yükseklik varyantları; props yüklü, kapılar farklı aşamalarda, mobil/masaüstü aynı kollider. Referans rota ve iniş hacimleri kontrol ediliyor.
- **Kayıt:** eski kayıt korunuyor; yeni şema iki kez taşınsa da bozulmuyor; fizik sürümü değişince skor ayrılıyor; kota ve IndexedDB erişim hatası uçuşu çökertmiyor.
- **UI:** yeni kullanıcı cihaz kurulumundan ilk iniş raporuna gidiyor; kilitli ders nedenini görüyor; tekrar/sonraki ders/kayıt açma çalışıyor; Türkçe metinlerde eski savaş tanımları kalmıyor.
- **Grafik:** WebGL ve WebGPU'da gündüz/gece, FPV/chase, 16:9 ve geniş ekran; kapılar, bina kabukları ve gövde ölçeği gözle inceleniyor. Kamera/reticle dönüşte ayrışmıyor.
- **Performans:** test makinesi ve ayarı raporda yazılı; hedef masaüstünde 60 FPS ve p95 frame ≤20 ms, p95 120 Hz fizik adımı <8.33 ms. 15 dakikalık ders/tekrar döngüsünde sürekli bellek büyümesi yok. Hedef sağlanmazsa gölge/props kalitesi düşer, fizik hızı değişmez.
- **Donanım:** en az bir gerçek DualSense veya DualShock ile USB uçuş, mümkünse Bluetooth; RC bağlantısı gerçek cihaz varsa denenir. Araç üzerinden tuş simülasyonu fiziksel kol testinin yerine yazılmaz. Cihaz erişimi yoksa ilgili satır açık bırakılır.
- **Canlı:** sürüm hash'i, asset/model yüklemeleri, API ve WebSocket, eski istemci uyarısı, data mount korunması, restart sayısı, hata logları, canlı ilk ders ve rollback doğrulanır.

## 12. Yayın ve son kabul

Önce ayrı staging oturumunda ve mevcut Azure düzenine uygun imajla test edilir. Kaynak commit + fizik/müfredat/harita sürümü rapora yazılır. Veritabanı/kayıt geçişinden önce yedek, geri dönüşte hem eski hem yeni veriyi okuyabilen yol hazırlanır. Canlıya alma yetkisi önceki konuşmada var; bununla birlikte başarısız zorunlu test veya eksik fiziksel cihaz doğrulaması gizlenmez.

“Tamamıyla çalışır teslim” şu pakettir: uygulanmış 30 ders + 6 görev; çalışan kalibrasyon ve kayıt; sürümlü ölçüm/puanlama; tüm zorunlu test sonuçları; fiziksel kumanda denemesi kaydı; WebGL/WebGPU görselleri; erişilebilir canlı URL; dağıtılan commit; geri dönüş yöntemi; varsa açık sınırlamalar. Kullanıcıya “her şey kusursuz” denmez; doğrulanan kapsam açıkça söylenir.

## 13. Sol ile uygulamaya devam talimatı

Bu dosyayı ve güncel git durumunu okuyarak başla. Önce P0 kusurlarını bağımsız davranış testleriyle üret, P1'de düzelt. P2–P8 sırasıyla devam et; her adımda mevcut başarılı kayıtları ve eski ID'leri koru. Yeni müfredatı sadece yeniden adlandırılmış halkalarla doldurma: tabloda belirtilen beceriyi gerçekten ölçen hedef ve raporu bağla. Fiziksel doğrulaması olmayan model/efekt için gerçekçilik iddiası üretme. Her aşamanın kanıtını `ACADEMY-DELIVERY.md` dosyasına işle; başarısız, denenmedi ve geçti durumlarını ayır. Son kabul matrisi tamamlanmadan işin bittiğini söyleme.

## 14. Teknik referanslar

Betaflight rate eşlemesi ve parametre adları resmi [Rate Calculator](https://betaflight.com/docs/wiki/guides/current/Rate-Calculator) ile doğrulanacak; merkez hassasiyeti/azami hız/expo ayrımı korunacak. Destekli acro davranışı için resmi [PID Tuning Tab](https://betaflight.com/docs/wiki/app/pid-tuning-tab) referans alınabilir; bu, burada tam Betaflight uçuş kontrolcüsü emülasyonu yapıldığı anlamına gelmez. USB kumanda akışının üretici referansı: [RadioMaster EdgeTX kılavuzu](https://radiomasterrc.freshdesk.com/support/solutions/articles/64000308557-edgetx-for-beginners-a-comprehensive-guide). Geri kalan sayısal ders eşikleri ve performans bütçeleri bu ürün için önerilen kabul koşullarıdır.
