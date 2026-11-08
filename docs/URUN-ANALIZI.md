# Hangar 2.0 ürün ve mimari özeti

31 Ekim 2026 itibarıyla mevcut sürüm. Güncel doğrulama kanıtı ve fiziksel cihaz sınırları [teslim notunda](SIMULATOR-V2-DELIVERY.md) tutulur.

## Uçuş akışı

Ana ekran son drone/alan seçimiyle hızlı uçuş veya hazırlık sunar. Serbest uçuş ve serbest stil 10 drone ile 7 alanda açılır. Başlangıç yerde ve motorlar kapalıdır. Üç turluk Pist yarış antrenmanı akademiden bağımsız ve sıralama dışıdır. Hikâye ve atölye isteğe bağlıdır.

Akademi 6 beceri pistinde 36 adım içerir: Uçuş Okulu, Manuel Gaz, Acro Kontrol, Çevre Yönetimi, İleri Parkur ve Görev. Günlük rota UTC tarihinden üretilir. Dersler geri sayım, hedef değerlendirmesi, sonuç ve tekrar akışıyla çalışır. Kazanılmış ilerleme korunur.

## Görüntü ve kontrol

Koyu grafit/yeşil arayüz, 3B drone önizlemesi ve Pist sahnesi kullanılır. Düşük/orta/yüksek kalite; render ölçeği, gölge ve dekoratif yoğunluğu yönetir. Kalite değişimi çarpışmaları etkilemez. Yatay FOV 80–140°, kamera eğimi 0–60°; lens ve titreşim bağımsızdır. WebGL varsayılan, WebGPU deneyseldir.

Klavye, Gamepad API ve iki sanal stick ile Mode 2 kontrolü sunulur. Menü, mobil araç çubuğu, yardım ve sonuç ekranı yerel zamanı durdurur. Başladıktan sonra duraklatılan koşular genel sıralamaya gönderilmez. TX15 kalibrasyonu ve fiziksel doğrulama henüz tamamlanmadı.

## Kodun sorumlulukları

| Katman | Kaynak |
|---|---|
| Arayüz, hazırlık, uçuş orkestrasyonu | `index.html`, `src/main.js`, `src/style.css` |
| Güvenli oturum ve görüntü tercihleri | `src/session-preferences.js`, `src/visual-settings.js` |
| Fizik ve çarpışma | `src/physics.js`, `src/simulation-clock.js`, `src/collide.js` |
| Görev ve beceri ölçümü | `src/missions.js`, `src/goals.js`, `src/assessment.js`, `src/curriculum.js` |
| Harita ve görsel detay | `src/world.js`, `src/airfield-detail.js`, çevre/varlık modülleri |
| Ağ ve sunucu | `src/net.js`, `server/rooms.mjs`, `server/api.mjs` |
| Kalıcı ilerleme ve tekrar | `src/progress.js`, `src/ghost.js`, `server/store.mjs` |

## Veri ve hizmet yüzeyleri

`/` simülatör, `/leaderboard.html` sıralama, `/admin.html` yetkili yönetim ekranıdır. `/ws` odalar ve canlı drone konumlarını taşır. Sunucu görev başlangıç/bitiş süresini kendi saatinden hesaplar. Eski bağlantılar için güvenli yönlendirmeler ve kaldırılmış etkinlik sonuçlarını reddeden kontroller korunur.

Tarayıcıda ilerleme, tercihler ve yerel tekrarlar; sunucuda oda olayları, sıralama ve paylaşılan tekrarlar tutulur. Ayrıntılar [gizlilik belgesindedir](PRIVACY.md). Çalıştırma ve dağıtım için [runbook](DAGITIM.md) kullanılır.


## İLKE ile kullanım amacı — 2 Kasım 2026

Kullanıcı, Hangar’ın FPV kullanımının yanında kendi İLKE projesi için de simülasyon ortamı olarak hazırlandığını açıkladı. Bu iki kullanım birlikte korunur. Şile sahnesi İLKE için ortak görsel çevre ve senaryo zemini olarak değerlendirilebilir; bu açıklama mevcut uygulamanın İLKE kontrol yazılımına bağlandığı veya gerçek aracı doğruladığı anlamına gelmez.

Sonraki geliştirmelerde görsel iyileştirmelerle birlikte tekrarlanabilir sivil inceleme görevleri, araç/sensör parametreleri, zamanlı telemetri ve tekrar kayıtları, operatör müdahalesi ve simülasyon çıktısının ölçülebilirliği değerlendirilmelidir. Bunlar bu açıklamayla uygulanmış özellik veya onaylanmış teknik entegrasyon sayılmaz. Gerçek uçuş yazılımına bağlantı ve sensör modeli için İLKE’nin ilgili araç ve görev gereksinimleri esas alınır.

Mevcut SOURCE ONE/F60 5 inç FPV referansı, İLKE aracının ölçülmüş uçuş modeli değildir. Tarayıcıdaki fizik/harita/görsel doğrulama, uçuş yazılımı simülasyonu, fiziksel kumanda ve saha kanıtları kendi koşullarında ayrı raporlanır. ArduPilot SITL/MAVLink entegrasyonu mevcut teslimde yoktur. İLKE’nin kendi yetkili ürün kayıtları korunur; Hangar kendi başına o kayıtların yerine geçmez.


### İlk Şile katmanı — 2.31

Ana ekrandaki **İLKE · Şile inceleme** kale, sahil cephesi ve liman için manuel sivil inceleme senaryosu sunar. Yerel5Hz telemetri/olaylar, simüle320×180JPEG gözlemler, duraklatma/bölge seçimi/durdurma/dönüş, JSON indirme ve kayıtlı poz tekrarı uygulanmıştır. Demo kabul eşikleri hazırlık ve yardımda açıklanır. Kayıtlar sunucuya gönderilmez; son terminal rapor bu tarayıcıda saklanır.

Bu dilim mevcut FPV referansını kullanır; gerçek İLKE aracı, otopilot, SITL/MAVLink veya sensör/kusur tespit modeli eklemez. Gerçek araç kütle/CG ve fiziksel kabul kanıtları bu moddan türetilmez. Şile geometrisi2.30 ile aynı; doğrulama ayrıntıları [Şile inceleme raporunda](sile-inspection-validation.json).


### Şile inceleme yönlendirmesi — 2.32

Manuel yaklaşma için yatay mesafe, kot farkı ve üç boyutlu bölge mesafesi ayrı sunulur; hız ve gözlem çubuğu mevcut kuralları gösterir. Menüde kaynak kara/yol verisinden kuzey yukarı2D harita, numaralı bakış noktaları, başlangıç ve mevcut simülasyon konumu bulunur. Tekrar menüsündeki konum kayıtlı poz, bölge listesi kayıt sonu durum olarak etiketlenir. Gerçek araç, otomatik rota veya güvenli uçuş koridoru eklenmez. Kanıt: [yönlendirme raporu](sile-inspection-navigation-validation.json).


### Hazır Şile önizlemesini koruma — 2.33

Şile zaten seçiliyken inceleme hazırlığına geçişte aynı önizleme korunur; gereksiz tam sahne kurulumu kaldırılmıştır. İlk yükleme ve gerçek harita değişimi hâlâ hazırlık gerektirir. Bu düzeltme geometri, fizik, kumanda profili veya İLKE doğrulama kapsamını değiştirmez. [Doğrulama kaydı](sile-preview-reuse-validation.json).


### Ana ekran ve ilk uçuş hazırlığı — 2.34

Gizli ana uçuş sahnesi ilk başlatmaya kadar oluşturulmaz; ana ekran görünür önizlemeyi hazırlar. İlk uçuşta hazırlık durumu çizilir, yinelenen başlatma engellenir ve hata sonrası yeniden deneme açılır. Kurulum maliyeti yok edilmez; ilk uçuşa taşınır. Aynı uygun uçuş dünyası tekrar kullanılır. Harita/fizik/profil ve İLKE doğrulama sınırları değişmez. [Doğrulama kaydı](lazy-flight-start-validation.json).


### Hazırlık hatasından klavyeyle devam — 2.35

Hazırlık hatası sonrasında odak önceki görünür düğmeye, o düğme gizlendiyse mevcut ekranın başlatma düğmesine döner. Enter ile yeniden denenebilir; başarılı uçuş gizli hazırlık ekranına odak taşımaz. [Doğrulama](start-focus-validation.json).

### Şile kurulumunda yol sorgusu — 2.36

Bina çevresi zemin rengi hesaplanırken yakın yol parçaları 48 m hücreli bir indeksle seçilir. Kaynak sırası ve son mesafe hesabı korunur; 83.025 Float64 örneği ile tam sahnenin geometri ve çarpışma özetleri önceki sürümle birebir aynıdır. Yerel iki kurulum ölçümünde yaklaşık %9 azalma görüldü; bu bir FPS veya cihaz yükleme süresi garantisi değildir. [Doğrulama](sile-build-profile-validation.json).

### Bina tabanı hesaplaması — 2.37

Kırpma parçalarının sınır hesabı dört geçici dizi yerine tek geçiş kullanır. Sayısal sahne/çarpışma kayıtları aynıdır; yerel iki kurulumda yaklaşık %6 azalma görüldü. Bu bir FPS garantisi değildir. [Doğrulama](pad-bounds-validation.json).

### Limanın kıyıyla bağlantısı — 2.38

Teknelerin bulunduğu üç iskele kaynak kara sınırından kopuk görünüyordu. Kaynak iskeleleri ve tekneleri taşımadan, mevcut kıyıya ulaşan üç eğimli geçit, korkuluklar ve iç liman kıyısına rıhtım yüzeyi eklendi. 2024 liman fotoğrafıyla karşılaştırıldı; boyutlar ve yapı yorumu temsili, ölçülmüş liman mühendisliği değildir. Çarpışma çizilen yüzeylerle eşleşir ve alt geçişlerde görünmez dolgu yoktur. [Doğrulama](sile-mooring-validation.json).

### İskeleleri doğrudan birleştirme — 2.39

Kullanıcı ayrı bağlantı elemanlarını istemedi. 2.38’in dar geçitleri ve korkulukları kaldırıldı; üç iskele mevcut model genişliği ve doğrultusunda kıyıya doğrudan uzatıldı. Uzantıların gövde tabanı mevcut iskeleyle eşleşir, yüzeyleri çizilen geometriyle temas eder. [Doğrulama](direct-piers-validation.json).


### Şile kaynak geometrisi denetimi — 2.40

Eksik bağlantı yolu, adacık kıyısı ve kaynak yaya köprüsü düzeltildi.2×2km alandaki339kaynak yol/7kıyı çizgisi denetlendi; kontrol haritası kaynak yollarına bağlanır. Genişlikler tahmini,30mDSM ve iki belirsiz sahil servis yolu açıkça belirtilir. Eski haritayı yükleyen tarayıcı önbellek sorunu da giderildi. [Doğrulama](sile-geography-validation.json).


### Liman beton görünümü — 2.41

Mevcut kıyı konumu ve uçuş temas geometrisi korunarak plaka derzleri, gözenekler, düzensiz aşınma ve deniz seviyesine bağlı rıhtım ıslaklığı eklendi. Görsel referans fotoğraf kaynak sayfasında bağlantılı; malzeme ölçülmüş yapı iddiası taşımaz. [Doğrulama](sile-concrete-validation.json).


### Uzun kıyı ve koruma kayalıkları — 2.42

Dış mendireğin yaklaşık606m hattına, kaynak kıyıyı ve yolları taşımadan suya kısmen gömülen383kaya/blok eklendi. Çizilen yüzeyler gerçek simülasyon temasına katılır. Kayalık doku ve açık/sakin kıyı köpüğü ayrışır. Batıdaki2×2km veri kesimi görünür; kaynak kapsamı sınırı sürer. [Doğrulama](sile-shore-armour-validation.json).


### Batı kıyısının gerçek kaynakla devamı — 2.43

Harita yaklaşık3×2km oldu. Önceki batıdaki yapay kesim içeride kaldı;50bina42yol parçası, daha uzun kıyı ve tamamlanan mendirek ucu kaynakla eklenir. Eski merkezin zemin örnekleri ve kumanda profili korunur; şezlonglar arazi kırıklarından uzak yerleştirilir. Kaynak kapsamı hâlâ sonlu ve arazi30mDSMdir. [Doğrulama](sile-west-expansion-validation.json).

## 2.44 — Şile kum görünümü

Mevcut plaj yüzeyleri ince tane, düzensiz küçük dalgacık ve filtreli PBR malzemeyle güncellendi.4m tekrar ve milimetre kabarıklık temsili görseldir; kaynak arazi/çarpışmalar değişmedi. v2.44.0-9a2633331605 canlı;553/553test,11infra,WebGL/WebGPU ve dosyaSHA kontrolleri geçti. [Doğrulama](sile-sand-validation.json).

## 2.45 — Su-kum birleşimi

Geniş batı plajındaki dik DSM kum kenarı, araziye bağlanan temsili bir yaklaşımla düzeltildi. Dar kuru-kum/su çizgisi boşlukları en fazla2m iç ıslak kum şeridiyle tamamlanır; görünen kum ve temas aynıFloat32üçgenleri kullanır. Nominal18m/%8 başlangıç,3cm su üstü uç ve2m alçaltma sınırı ölçülmüş mikroarazi değildir. Kaynak harita/su çizgisi/yol/bina verileri aynı. v2.45.0-fbd27ca93aaa canlı;560/560test,11infra,GL/GPU ve bağımsızinceleme geçti. [Doğrulama](sile-waterline-validation.json).

## 2.46 — Kayalık temas düzeltmesi

Merkez hâlâ su üzerindeyken gövdenin kaya yüzüne girmesi düzeltildi. Çizilen indeksliFloat32kayaüçgenleri mevcut süpürülen/statik küre temasını kullanır; sabit duvarindeksi çizim veya araziyi değiştirmez. v2.46.0-16eb380405d8 canlı;567/567test,11infra,GL/GPU ve bağımsızinceleme geçti. Küresel gövde yaklaşımı/saha kalibrasyonu sınırları sürer. [Doğrulama](sile-cliff-contact-validation.json).

## 2.47 — Şile yerel dalga köpüğü

Köpük farklı kıyı noktalarında ilerler; alçak kum üzerinde yayılıp geri çekilir. Mutlak simülasyon zamanına bağlı atlas, duraklatma/geri sarma sırasında deterministiktir. Seyrek üçgenlerde ara dalga tepesi doku örneklemesiyle korunur. Temaslar ve foamUV dışındaki görsel geometri2.46 ile aynı.571/571 Node22ARM64,8focused,11infra,ViteARM64,GL/GPU ve AWS canlı/HTTPS/WSS doğrulandı. Temsili6,4s/25,6s görsel modeldir; hidrodinamik/saha/TX15 doğrulaması değildir. Kanıt: `docs/sile-surf-motion-validation.json`.

## 2.48 — Kayalık yüzey ve ıslaklık geçişi

Şile kıyı kayalıklarında ıslak-kuru malzeme çizgisi yerine deniz seviyesine bağlı yumuşak pürüzlülük geçişi kullanılır. Hücresel desen hafifletildi; temsili katman/çatlak ve geniş lekeler eklendi. Dokular kale adası ve kıyı tahkimatında da kullanılır. Yeniuv1 ve kıyı kaya rengi dışında geometri/temaslar2.47 ile aynı.575/575Node22ARM64,11infra,ViteARM64,bağımsız inceleme veGL/GPU/AWS doğrulandı. KaynakOSM/DSM/CAD korunur;gerçek kaya türü,gelgit veya saha doğrulaması değildir. Ayrıntı: `docs/sile-rock-weathering-validation.json`.

## 2.49 — Ağlayankaya yönünde doğu kıyı kapsamı

Alan yaklaşık4.5×2km/145×65oldu;doğu kıyı/koy/yollar yeniOSMkaydıyla devam eder. Eski6305nativeyükseklik/projeksiyon/kalkış/13136sourceprefix korunur.1331bina/468yolparçası;15yeni bina/85yolparçası. DoğubeachnativeDSM,tesviyeyalnızdoğrulanmışbatı309193706. Bütünkumköşeleri/üçgenmerkezleri0.2mmqueryguardgeçer.576/576Node22ARM64,7GIS,11infra,ViteARM64,bağımsızinceleme ve canlıHTTPS/WSS doğrulandı. Mağara/kemer boşlukları henüz modellenmedi;referans incelemesi `docs/sile-coastal-caves-evidence.md`. WebGPUuzakağaç renk farkı açık;WebGLdefault kontrol edildi. Ayrıntı `docs/sile-east-coast-validation.json`.


## 2.50–2.51 — uçulabilir mağaralar ve son görüntü düzeltmesi

Feneraltı/Zeki Müren Mağarası kapalı uçlu deniz hacmi ve temsili arka kum zemini; Su İçen Fil iki açık ağızlı geçit olarak modellenir. Görünen iç kaya ve kum üçgenleri fiziksel temasları da sahiplenir; üst arazi korunur. İç ölçüler fotoğrafa dayalı tasarım varsayımıdır. Geçişler [mağara doğrulamasında](sile-sea-caves-validation.json) kayıtlıdır.

2.51, deneysel WebGPU’da uzak ağaçlar üzerine gökyüzünün çizilmesinden doğan beyazlık hatasını kapatır. Gökyüzü opak sahneden önce çizilir ve derinliğe yazmaz. Geometri, gövde temasları, kaynak veri ve kumanda profili korunur. Güncel teslim kontrolü [son doğrulama kaydındadır](sile-final-delivery-validation.json).

## 2.52 — doğal mağara biçimi

Feneraltı asimetrik daralan kesitle, Su İçen Fil açılı dış baş/hortum kaya hacmi ve asimetrik açıklıkla güncellendi. İç/dış yüzler aynı Float32 temas geometrisini kullanır; kaynak harita değişmedi. v2.52.0-738c03deaf55 canlı;588/588 Node22 ARM64,11infra,682/682 merkez hattı örneği,WebGL/WebGPU ve canlı HTTPS/WSS geçti. Bu etap tamamlandı; tüm Şile gerçekçilik denetimi kapanmadı. Bina yükseklikleri,31m DSM ve ölçülmemiş mağara şekilleri sınırdır. [Kanıt](sile-natural-caves-validation.json).

## 2.53 — eğimli çatı ile eşleşen temas

589 eğimli binada8246 çatı/alın/duvar üçgeni mevcut süpürülen küre çözücüsüne girer; saçak altı gövde prizması ve orijinal yerleşim zarfı ayrı tutulur. Yeni gövde/çatı kaydı bina zemin duvarları kurulurken korunur. Başlangıç destek temasından sonra teğetsel yer değiştirme yeniden süpürülerek yana hareket kaybı giderilir. Görsel geometri ve26kaynak GIS dosyası2.52ile aynıdır. v2.53.0-adbdc325a24c canlı;595/595Node22ARM64,31focused,11infra,bağımsız inceleme,nativeGL/GPU/liveUI ve HTTPS/WSS doğrulandı. Bina yüksekliği/çatı türü hâlâ çoğunlukla varsayım;ölçülmüş Şile veya fizikselTX15kabulü değildir. [Kanıt](sile-roof-contact-validation.json).
