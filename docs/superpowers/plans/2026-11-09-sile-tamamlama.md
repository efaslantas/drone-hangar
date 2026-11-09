# Şile haritasını tek teslimde tamamlama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Kullanıcı ayrıca istemedikçe uygulama işleri alt ajanlara dağıtılmaz; kod incelemesi ilgili beceriye göre yapılır.

**Goal:** Mevcut Şile merkez haritasının bütün kıyısını, önemli yapıları, sahil mahallelerini ve drone geçişlerini ortak kaliteye getirerek tek bir kabul sürecinden sonra canlıya çıkarmak.

**Architecture:** Three.js/Vite tabanı korunur. Ham coğrafi kaynaklar arşivlenir; yerel arazi, bina ve kıyı düzeltmeleri kaynak kimliğine bağlı türetilmiş katmanlarda tutulur. Çizim ve fizik aynı son geometriyi kullanır; mevcut modüller kendi alanlarını sahiplenir.

**Tech Stack:** JavaScript ES modules, mevcut Three.js/Vite, Node.js 22, mevcut Python/Shapely araçları, AWS ARM64 uygulama konteyneri.

**Spec:** Bu belgedeki kapsam ve kabul sözleşmesi; başlangıç bulguları `docs/sile-realism-audit-2026-11-08.md`, güncel teslim `docs/sile-pavilion-validation.json`.

**Durum:** Kullanıcı 9 Kasım 2026 tarihinde uygulamayı istedi; yazılım uygulaması ve kabulü tamamlandı; canlı dağıtım doğrulaması tamamlandı. Başlangıç main `264a7725c533295c0103fc7fd661159439c3ab81`, canlı `v2.55.0-6f8e573f64c1`. Tamamlama sürümü2.56.0.

## Kapsam ve hazır tanımı

Bu teslim mevcut yaklaşık 4,5×2 km **Şile merkez harita alanını** kapsar. Bütün Şile ilçesinin köylerini ve uzak kıyılarını kapsayan yeni bir harita projesi değildir. Bu sınır içinde kıyı baştan sona incelenir; uzak arka plan da kopuk, yüzen veya bariz hatalı bırakılmaz.

Altı kabul bölgesi:

| Kimlik | Bölge | Kapanacak işler |
|---|---|---|
| S1 | Batı/Ayazma plajı ve liman yaklaşımı | Kesintisiz kum-su birleşimi, kıyı yapıları, plaj çevresi ve bağlantı yolları |
| S2 | Liman, tekneler, rıhtım ve mendirek | Gerçek kıyıyla bağlantı, kıyı kaplaması, bağlama yerleri ve denizin ortasında kalan sahil parçaları |
| S3 | Kale, ada, kayalıklar ve balıkçı çevresi | Dış silüet, kaya dibi kotları, yapı-zemin ilişkisi ve dar geçişler |
| S4 | Fener ve Feneraltı/Zeki Müren Mağarası | Kıyı dış biçimi, mağara ağzı/içi, çevre yapıları ve uçulabilir hacim |
| S5 | Su İçen Fil ve komşu kayalıklar | Doğal kemer ve dış kaya gövdesi, tavan/yan temasları ve kıyı devamlılığı |
| S6 | Ağlayankaya yönü ve doğu harita sonu | Eksiksiz kıyı, kayalık-kum geçişleri, sahil binaları/yolları ve düzgün harita sınırı |

Önerilen kalite: kıyı ön sırası ve önemli noktalar fotoğraflarla karşılaştırılmış; malzemesi, ölçeği ve geçişleri tutarlı; alçak FPV uçuşunda belirgin geometri/çarpışma hatası olmayan Şile sahnesi. Arka mahallelerdeki kaynaklı fakat ayrıntısı bilinmeyen yapılar temsili kalabilir; ön sıradaki yanlış üç katlı kutuların düzeltilmesi zorunludur.

**Gerçeklik sınırı:** Mevcut arazi yaklaşık 31 m aralıklı DSM'ye dayanır; bina yüksekliklerinin çoğu ölçülmedi. İnce üçgenler, daha iyi doku veya fotoğraftan yorum yeni saha ölçümü sayılmaz. Ölçülmüş birebir Şile istenirse izinli ayrıntılı arazi/bina ölçümü ya da fotogrametri ayrı veri bağımlılığıdır. Bu planın yazılımla kapanabilen kapsamı görsel ve uçulabilir simülasyon kalitesidir.

## Yaklaşım kararı

Önerim mevcut sahneyi tek kapsamda tamamlamak. Bir bina veya doku düzeltmesini ayrı canlı sürüm saymak yerine bölgeleri birbiriyle birlikte doğrulayacağız. İçeride küçük, geri alınabilir commitler yapılabilir; son kabul geçene kadar mevcut canlı sürüm korunur.

Motoru değiştirerek yeniden başlamak mevcut çalışma ve kontrol zincirini tekrar kurmayı gerektirir. Doğrudan fotogrametriyle birebir kopya üretmek ise henüz elimizde olmayan ayrıntılı ve yeniden dağıtım izni olan veriye bağlıdır. İkisi bu teslimin önkoşulu yapılmaz. Uygun kaynak bulunursa aynı kayıt düzeniyle içeri alınır.

## Ortak kurallar ve dosya sahipliği

- Kaynak gözlemi, fotoğraftan yorum ve tasarım varsayımı ayrı yazılır. Fotoğraf görüldü diye yükseklik `measured` yapılmaz.
- İlk kaynak incelemesi sonunda veri envanteri sabitlenir. Sonuçsuz kaynak aramasıyla teslim süresiz ertelenmez; eksik ayrıntı temsili modellenir ve belirsizliği kaydedilir. Konumu bilinmeyen mağaza veya bina doğrulanmış gibi eklenmez.
- Aynı yapının OSM, ek bina ve yerel profil üzerinden iki kez üretilmesi önlenir. Öncelik ve kaynak uyuşmazlığında geri dönüş davranışı test edilir.
- Yerel arazi düzeltmesi çizim, `terrainHeight`/`surfaceAt`, bina tabanı ve temas indeksine birlikte yansır. Deniz-kara sınıfı yalnız görsel malzemeyle değiştirilmez.
- Grafik kalitesi, WebGL/WebGPU ve görüş mesafesi fizik dünyasını değiştirmez. Görsel ayrıntı azaltılırken uçulabilir engeller kaybolmaz.
- Mevcut uçuş fiziği, kullanıcı ilerlemesi, RC kalibrasyonu ve kayıt tercihleri korunur. Haritayı tamamlamak amacıyla uçuş parametreleri rastgele değiştirilmez.
- Yeni ana plan açılmaz; bu dosya ilerleme takibidir. Kabul sonuçları tek `docs/sile-completion-acceptance.json` dosyasında toplanır; mevcut tarihsel raporlar korunur.

| Sorumluluk | Mevcut dosyalar / eklenecek kayıt |
|---|---|
| Kaynak ve bölge envanteri | Yeni `src/data/sile-completion.json`; kaynak kimliği, bölge, referans/tarih, ölçüm durumu ve yerel düzeltme kaydı |
| Veri hazırlama ve profil seçimi | `src/sile-data.js`, `src/sile-building-supplement-data.js`, `src/sile-buildings.js`, `src/sile-building-supplement.js`, `src/sile-pavilion.js` |
| Arazi ve yapı tabanları | `src/geo-terrain.js`, `src/sile-neighbourhood.js`, `src/sile-grounding.js`, `src/sile-pads.js`, `src/sile-world.js` |
| Kıyı, liman ve sokaklar | `src/sile-coast.js`, `src/sile-harbour.js`, `src/sile-mooring.js`, `src/sile-streets.js`, `src/sile-shore-armour.js` |
| Kaya, mağara ve deniz | `src/sile-landmarks.js`, `src/sile-rock-view.js`, `src/sile-sea-caves.js`, `src/sile-water.js`, `src/sile-beach.js` ve mevcut malzeme modülleri |
| Cephe ve çevre | `src/sile-building-view.js`, `src/sile-architectural.js`, `src/sile-foliage.js`, `src/sile-context-view.js` |
| Fizik ve doğrulama | `src/collide.js`, `src/terrain-wall-index.js`, mevcut ilgili testler; yeni `tools/verify-sile-completion.mjs`, `tests/sile-completion.test.js` |

## Uygulama işleri

### Task 1: Bütün haritanın envanteri ve kabul kameraları

**Çıktı:** Altı bölge için hata listesi, kaynak eşlemeleri ve aynı noktadan tekrar çekilebilir önce/sonra görüntüler. Envanter kaydı `{id, region, sourceId, references, evidence, status}`; `evidence` yalnız `measured`, `photo-inferred`, `assumed`, `unknown`; `status` yalnız `open`, `fixed`, `accepted`, `blocked`.

- [x] `node tools/audit-sile-realism.mjs` çıktısını başlangıç sürümüyle kaydet; S1–S6'yı kıyı boyunca ve mahalle bağlantılarında tarayarak hataları tek listede topla.
- [x] `src/data/sile-completion.json` dosyasında her bölgenin sınırını, en az iki sabit kamera konumunu ve kaynak/varsayım kayıtlarını sabitle. Kaynak fotoğrafı oyun varlığına kopyalamak için yeniden kullanım hakkı ayrıca gerekli.
- [x] `tests/sile-completion.test.js` içinde altı bölge kapsamı, benzersiz kimlik, eksik referans ve yanlış `measured` kaydını reddeden testleri önce başarısız çalıştır; envanter doğrulamasını ekleyip geçir.
- [x] Kritik yanlışları önce sırala: kopuk kıyı, yüzen/batık yapı, yanlış yapı ölçeği, geçilemeyen açıklık, görünmez engel. Envanteri commit et.

### Task 2: Kıyı geometrisi, rıhtım ve yerel arazi

**Çıktı:** Altı bölgede kıyının kesintisiz son geometrisi; sonraki binaların oturacağı zemin.

- [x] Envanterdeki her kritik arazi/kıyı hatası için konuma bağlı regresyon testi ekle ve eski sahnede başarısız olduğunu göster. Özellikle tekne bölgesinin su ortasında kalması ve kaya dibindeki yanlış yükselti kapsanacak.
- [x] Mevcut kıyı/liman/zemin sahiplerinde düzelt; ham DSM'yi sakla, gerekiyorsa yerel türetilmiş arazi kullan. Rıhtım, mendirek, kumsal ve bağlantı yollarının birleşimini birlikte çöz.
- [x] Son yüzeyden yükseklik ve temas üret; ekranda görünen zemin ile drone'un bastığı zemini aynı noktalarda karşılaştır. Kaynak sınırı, kara-su maskesi ve komşu parçalarda çatlak/çift yüzey testlerini geçir.
- [x] Bütün S1–S6 kıyı kameralarını yeniden çek; çözülmeyen kritik kayıt varken bina işini bitmiş sayma. Testler ve düzeltmeleri commit et.

### Task 3: Sahil binaları ve mahalle silüeti

**Çıktı:** Ön sıradaki bütün kaynaklı yapıların gözden geçirilmiş profili; doğru yere oturan tabanlar, tutarlı kat/çatı/cephe ölçeği.

- [x] Kıyı ön sırasındaki mevcut 135 OSM adayını, sekiz ek yapıyı ve altı ertelenen adayı envanterde tek tek değerlendir. Bunlar zorunlu eklenecek yapı sayısı değildir; mükerrer/yanlış tespit gerekçeyle çıkarılabilir. Ek eşleşmeler aynı listeye yazılır.
- [x] Fotoğrafla ilişkilendirilebilen yapılar için kaynak kimliğine bağlı kat/saçak/çatı profili oluştur; ölçü yoksa belirsizliğini koru. 2.55 pavyon istisnasını bu düzende bir kez üret; eski özel kod yalnız yerine geçen davranış test edildikten sonra kaldırılabilir.
- [x] Yanlış kaynak kimliği/değişmiş bina izi, birbirine geçen ek yapılar, yüzen taban ve eğimli zemindeki kapılar için başarısız regresyon testlerini yaz; mevcut bina/zemin modüllerinde düzelt ve geçir.
- [x] Sokaktan ve denizden bakışlarda ön sıra ile arka mahalle silüetini birlikte kontrol et. Eğimli çatıda gövde saçakta biter, görünen çatı temas sahibidir. İlgili testleri geçir ve commit et.

### Task 4: Kale, kaya dibi yapıları, fener ve doğal geçitler

**Çıktı:** S3–S6'daki belirgin noktaların birbirleriyle tutarlı dış biçimi ve geçilebilir hacimleri.

- [x] Kale adası, balıkçı kaya dibi, Feneraltı ve Su İçen Fil için referans-kamera eşlemelerini tamamla; önceden yapılmış mağara işini yeniden yazmak yerine farkları düzelt.
- [x] Önce dış kaya silüetini ve zemin bağlantısını, sonra mağara ağzı/iç hacmini düzelt. Balıkçı birimlerini yanlış biçimde kale platformuna veya pavyonun yerine yerleştirme.
- [x] Her değişen açıklıkta merkez hattı dışında kenar, tavan, ters yönde giriş, hızlı yanal yaklaşma ve girişte reset senaryolarını önce test et; çizilen Float32 yüzlerden temas üretip testleri geçir.
- [x] Açıklık genişliği ve kullanılan referans drone'un boyutlarıyla geçilebilirliği kaydet. Geçit uçuşu saha doğrulaması olarak sunulmaz. Görselleri karşılaştır, commit et.

### Task 5: Deniz, malzemeler ve sahil çevresi

**Çıktı:** Bütün sahilde aynı görsel kalite; boşlukların yerin gerçek kullanımına uygun düzenlenmesi.

- [x] Kıyı sığlık rengi, ıslak kum/kaya, köpük ölçeği ve malzeme tekrarlarını altı bölgede birlikte ayarla. Batimetri yoksa renk/şeffaflık tasarımını ölçülmüş derinlik gibi sunma.
- [x] Sokak bağlantıları, kaldırım bitişleri, duvar/çit, bitki ve kıyı işletmesi çevresini referansa göre tamamla. Boşluğu rastgele eşya veya bina ekleyerek doldurma; gerçek boş alanı koru.
- [x] Yakın geçişe etki eden yeni engeller için temas, düşük/yüksek kalite eşitliği ve sahne temizliğinde kaynakların bir kez bırakılması testlerini yaz/geçir. Yalnız malzeme değişimine uygulamayı tekrarlayan test ekleme.
- [x] Her bölgenin yakın ve uzak görüntüsünü WebGL/WebGPU'da kontrol et; geometri kabulünden sonra malzeme işini commit et.

### Task 6: Uçuş, yükleme ve performans kabulü

**Çıktı:** Aynı profil ile altı rotanın yeniden çalıştırılabilir test kaydı ve gerçek tarayıcı performans ölçümü.

- [x] S1–S6 için iki yönlü birer rota tanımla; en az bir plaj, rıhtım, bina arası, kaya dibi, mağara ve kemer geçişi kapsansın. Referans drone/profil, hızlar, kalite ve kamera ayarları raporda sabitlensin.
- [x] Yeni `tools/verify-sile-completion.mjs`, `node tools/verify-sile-completion.mjs docs/sile-completion-acceptance.json` komutuyla bölge/rota sonuçlarını denetlesin; bütün zorunlu koşullar geçerse çıkış 0, eksik/başarısız koşulda çıkış 1 ve JSON hata listesi üretsin. Eksik bölge, belirsiz ölçüm, kaynak uyuşmazlığı ve atlanmış rota testlerini önce başarısız çalıştır, sonra geçir.
- [x] Her rotada yavaş destek, hızlı yüzey geçişi, yan/tavan teması, su, reset ve pause/resume kontrolü yap. Duraklatma fiziği ilerletmesin; kalite değişimi sonucu değiştirmesin.
- [x] Gerçek tarayıcıda orta kalite ve 1280×720 sabit render boyutunda ölç: 60 FPS hedef, 1% düşük FPS en az 30; her rotada en az 60 saniye, toplam en az 15 dakika. Ölçüm cihazı ve tarayıcı sürümü İş 1 sonunda sabitlensin; temel ölçüm mevcut kullanıcı Mac mini/Chrome üzerinde yapılır, farklı cihazlarda sonuç ayrı tutulur. Backend, çizim çağrısı, bellek ve yükleme süresi raporlansın. Bunlar önerilen teslim hedefidir; henüz elde edilmiş ölçüm değildir.
- [x] Soğuk/sıcak yükleme, harita değiştirme ve iptal, iki kez Şile'ye dönme testlerini yap. Önce ana ekran önizlemesindeki uzun senkron blokları ölç; hedef cihazda 50 ms üstü hazırlama bloklarını böl, yükleniyor/iptal davranışını doğrula. Uygulama süresi ölçülmeden hız sözü verme.
- [x] Kullanıcı TX15 ile yönler, merkezler, gaz, failsafe/DISARM ve kısa uçuşu dener. Cihaz erişimi yoksa bu alan `not-run` kalır; yazılım kabulü ve fiziksel kumanda kabulü ayrı raporlanır.

### Task 7: Toplu düzeltme ve teslim kapısı

**Çıktı:** Tek tamamlanma raporu; bütün bölgelere ait kanıt; açık kritik hata bulunmayan yayımlanabilir paket.

- [x] `docs/sile-completion-acceptance.json` içinde S1–S6, referanslar, önce/sonra görüntüler, rota sonuçları, performans ve sınırlara yer ver. `unknown`, `blocked`, `not-run` kayıtları başarıya çevrilmez.
- [x] Kabul: kaynak/zemin/çizim-temas uyuşmazlığı, kopuk kıyı, belirgin yüzen/batık yapı, kaynaklı geçidi kapatan engel ve tarayıcı hatası **sıfır**. Render ile türetilmiş fizik yüzeyi örnekleme farkı en fazla 2 cm; bu saha konum doğruluğu değildir. Altı bölgenin ve 12 yönlü rota kaydının tamamı bulunmalı.
- [x] Bütün testleri Node22 ARM64 üzerinde, mevcut coğrafya ve dağıtım Python kontrollerini kendi ortamlarında çalıştır. Test sayısı sabitlenmez; sıfır hata ve eksiksiz kabul aranır. Native tarayıcı görselleri sayısal testlerin yerine geçmez.
- [x] Bağımsız son kod incelemesini yaptır; görsel karşılaştırma ve uçuş sorunlarını kapat. Çözülemeyen kritik varsa tek teslim hazır değildir; hangi veri/işlem gerektiğini açıkça kaydet.
- [x] `public/sile.html`, `docs/URUN-ANALIZI.md`, README ve mevcut audit'i yeni kapsama göre güncelle; measured/temsili ayrımı korunur.

### Task 8: Main, canlı ve kullanıcı kabulü

- [x] Kabul edilmiş commitlerden ARM64 sürüm üret; manifest ve kaynak hashlerini doğrula, main'e birleştir/gönder. Yerelde unutulmuş uygulanmamış dal veya değişiklik bırakma.
- [x] Mevcut AWS app-only yöntemiyle yayımla; komşu uygulamaları ve nginx'i koru. HTTPS, WebSocket, kaynak hashleri, canlı Şile açılışı ve kısa canlı rota kontrolü yap; eski sürüm/veri yedeği geri dönüş için dursun.
- [x] Kullanıcıya tek canlı adres, altı bölgeli kısa deneme rotası ve karşılaştırma görsellerini ver. Kullanıcının görsel/uçuş kabulünü ayrıca kaydet. Otomatik testler kullanıcının kabulü yerine imzalanmaz.
- [x] Kalan belirsizlikler yalnız veri doğruluğu/ölçülmemiş ayrıntılar ve yapılmamış fiziksel testler olabilir; bilinen geometri veya işlev hatası bunların arasına saklanmaz.

## İncelemede özellikle aranacak durumlar

1. Bina profili yanlış kayda uygulanıyor veya aynı yapı iki kez çiziliyor → İş 3 kimlik/iz/mükerrerlik testleri.
2. Kaya dibi/liman zemini görselde düzelip fizik eski kotta kalıyor → İş 2 ortak yüzey örnekleme testi.
3. Mağara orta eksende açık fakat drone gövdesi kenarda görünmez yüzeye çarpıyor → İş 4 kenar/tavan/ters yön testleri.
4. Düşük kalite veya harita değiştirme engelleri kaldırıyor / kaynak biriktiriyor → İş 5 ve 6 kalite/lifecycle/dönüş testleri.
5. Eksik bölge, ölçülmemiş yükseklik ya da yapılmamış TX15 testi raporda tamamlandı görünüyor → İş 1 ve 6 kayıt doğrulaması, İş 7 teslim kapısı.

## Uygulamanın yürütülmesi

Sıra **envanter → ortak zemin/kıyı → binalar → önemli noktalar → çevre/malzeme → rotalar/performans → toplu kabul → tek canlı teslim**. Her ara iş sonrakinin zeminini hazırlar; kullanıcıdan her bina için tekrar “devam” istenmez. Kapsam büyüten yeni istek çıkarsa bu planda açıkça değişiklik olarak kaydedilir.

Takvim ve saat sözü ilk envanter/performance ölçümü olmadan verilmez. “Tek teslim” tek komutla bütün Şile'nin ölçülmüş hâle gelmesi anlamına gelmez; sonu tanımlı, birikimli çalışılıp birlikte kabul edilen sürüm anlamına gelir. Mevcut kullanıcı yetkisi korunur; bu mesajdaki istek plan içindir, bu plan yazılırken ürün kodu veya canlı değiştirilmez.


## Uygulama sonucu ve açık doğrulama sınırı

Task3–7 işaretleri temsili yazılım/model teslimini ifade eder.149aday kaynak/zemin bakımından gözden geçirildi; bireysel fotoğraf eşleştirmesi yoksa ölçü/tam silüet doğrulaması yapılmış sayılmadı. Kaynak dondurma kuralı uygulandı. Mevcut doğru kıyı/kale/2.52mağara geometrisi korundu; veri olmayan balıkçı sırası uydurulmadı.

12rota geometrik temas tekrarlarıdır; manuel/kapalıçevrim altı uçuşun yerine geçtiği iddia edilmez. Yan/tavan/kenar/hızlı temas, reset/pause/kalite eşitliği mevcut testlerle doğrulandı.15dakika kaydı sabitbölge kameralarında gerçek renderer/composer içindir, tam uygulama manuel uçuşu değildir.50ms hazırlık hedefi son native oturumda76/217ms initialization ve118ms ön-kayıt etkileşim bloklarıyla kaçırıldı; çok-saniyelik CPU hazırlığı worker'a alındı, iptal/retry doğrulandı. Bu istisnalar kabul raporunda saklanır.

FizikselTX15 ve kullanıcı kabulü **not-run**; ilgili Task6 cihaz maddesi kontrol prosedürünün ayrılıp kaydedildiğini ifade eder, cihaz testinin geçtiğini ifade etmez. Son rapor docs/sile-completion-acceptance.json. Ölçülü saha modeline dönüşüm ek veri gerektirir.

Canlı teslim: v2.56.0-618a82e72259; kullanıcı/TX15 kabulü raporda not-run kalır.


## 2.57 devamı — hazırlık bloklarını ayırma

Kullanıcı devam istedi. İlk native profil: ObjectLoader21.5ms+metadata4ms+fizik clone26.2ms aynı task içinde73msblok. Mevcut yieldFrame/AbortSignal sınırları, ilk allocationöncesi, sahne/fizikverisiarasında ve sonwallindexöncesine eklenir. Geometri/veri/fizik değişmez. Önce ikiiptalregresyonu eskiyolda başarısız,sonra7payload/cachetesti geçti. Bağımsız dar inceleme bulgusuz. Native ölçümde hazırlıkaralığında50msüzeri iş yok;ilkGPU/composer241msvebaşlangıç67msayrıkalır. İptal/tekraraçmaDISARM0hızdoğrulandı;v2.57.0-e89963741523 canlı.628/628Node22ARM64/11infra/HTTPS/WSS/nativeUIgeçti. FizikselTX15/kullanıcıkabulünot-run kalır.


## 10 Kasım — kullanıcı görsel kabulü: sahil hâlâ boş

Kullanıcı son commitleri gönderdi ve sahilin boş kaldığını, henüz Şile'ye benzemediğini bildirdi. ff74280 RCkalibrasyon düzeltmesi ff-onlyalındı ve korunur. Önceki yazılım testleri görsel kullanıcı kabulü sayılmaz;2.57için görsel kabul başarısız olarak kaydedilir. Kullanıcının önceki kesintisiz uygulama/main/canlı yetkisi sürer; mevcut planın3/5işleri yeniden açılır, yeni ana plan veya onay turu açılmaz.

MevcutThree.js/OSM/DSMüstünde:500m kıyı mahalle bandındaki aynıMicrosoft/Overture.99+izler;7.5mvarsayımsal gövdeye en az3m üstkot açıklığı sağlanan eğimli izler;350m görsel cephe bandı(core135zemin/fizikprofilikorunur);ESAWC2021CCBY4yaklaşık10maraziörtüsüyle eksikvejetasyon;OSMpark/başlıkkıyı/yollaröncelikli;OSMotoparkyüzeylerivefotoğrafreferanslıtemsiliyazplajdüzeni. Raster2021ölçülmüş2026ağaç/binaenvanterideğil;fotoğraflar ürüne kopyalanmaz. Arazi ve bina yükseklikleri yeniölçüm sayılmaz. Rastgelebinaekleme/fizikileçizimiayırmayok.

### Task 9: Kaynaklı kıyı mahalle izleri ve eğimli yapı desteği
- [x] Mesafe parametresi/deduplikasyon/sahil kesim sınırı için Python RED; eğimli izde görünür çatı/kalan açıklık ve aşırıeğim RED.
- [x] Açık500m seçimi,129aday/orijinal14korunumu;max-min<=height-3modelkriteri,diğertümoccupied/road/water/.99güven/lisanskapılarıkorunur.
- [x] Kaynak/veri/provenansüret,render-temas/kot testlerini geçir;ölçüsüzlüketiketlerinikoru.

### Task 10: Arazi örtüsü ve plaj dokusu
- [x] ESA2021nativecropdönüşüm/kategori/yanlışsnapshot/kenartestleriRED→GREEN; kaynakpixelaynılığı,CCBYatıfvecropSHAkaydı.
- [x] OSMdahaöncelikli,ESAağaç/çalı/çim boşlukdoldurur;1600ağaçbütçesikıyıyıönceler. Vejetasyonlu yamaçları otomatik çıplakkayaya dönüştürme.
- [x] Hazırlanmış sahnede420üstlimitli temsiliyazşemsiye/şezlong; bütünsertparçalaraynıgörünenkontaktansahip,ham/rawdavranışıkorunur.

### Task 11: Cepheler ve otopark
- [x] Görsel350m680cephebandı(core100m135profilaynı);gövdeyiyenidençizmeyinenvepostpadrefresh'tekaybolmayıyakalayantest. Yeniuydurmabalkonengeli/yükseklikdeğişikliğiolmamalı.
- [x] Kaynak15otoparkmaskesini kalan zeminden ayır;görünenaynıeğim/kot/renkdeğişimi,delik/çiftyüzeyolmasın. Beyazyerçizgilerivarsayımsaldır,yeniçarpışmaengelideğildir.

### Task 12: Bütün kıyı görsel/işlev kabulü ve tek canlı teslim
- [x] S1–S6aynıkameraGL/GPUönce/sonra,kaynak/crop/doğruluk/temas/12rotakontrolü;tamNode22/ilgiliPython/bağımsızinceleme.
- [x] Yeni1280×720medium15dk görünürbenchmark;eskiFPSyenisürümdiyeetiketlenmez.
- [x] Kanonikkabul/provenans/krediler/ürünbelgeleri;RCcommitkorunur;app-onlyAWS/mainhash/HTTPS/WSS/canlıaçılış;fizikselTX15vekullanıcısonkabulüyapılmadıolarakkalır.


2.58 teslim kanıtı: v2.58.0-47520f3ee55f canlı;642Node22/13GIS/11infra/12rota,900.0039s görünür~60FPS/min1%53.444,460SHA ve HTTPS/WSS/nativeUI geçti. Kullanıcının2.57görselreddi korunur;2.58görsel/uçuş kabulü henüz yapılmadı. Kaynak eksik sahil yapıları ve31mDSM sınırı nedeniyle birebir dijital ikiz tamamlandı iddiası yok.
