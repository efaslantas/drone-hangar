# Hangar 2.0 ürün ve mimari özeti

31 Ekim 2026 itibarıyla mevcut sürüm. Güncel doğrulama kanıtı ve fiziksel cihaz sınırları [teslim notunda](SIMULATOR-V2-DELIVERY.md) tutulur.

## Uçuş akışı

Ana ekran son drone/alan seçimiyle hızlı uçuş veya hazırlık sunar. Serbest uçuş ve serbest stil 10 drone ile 6 alanda açılır. Başlangıç yerde ve motorlar kapalıdır. Üç turluk Pist yarış antrenmanı akademiden bağımsız ve sıralama dışıdır. Hikâye ve atölye isteğe bağlıdır.

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
