# Hangar 2.0 — FPV simülatör deneyimi

Kullanıcı, konuşmada önerilen menü, erişim, bir harita, kamera, HUD, grafik profilleri ve hızlı uçuş/reset paketinin tamamının uygulanmasını istedi. TX15 eşleme/fizik yeniden tasarımı bu etabın ardından gelecek. Mevcut Three.js/Vite altyapısı ve önceki İDA/çatışma temizliği korunur.

## Tasarım kararı

Mevcut ürünü geliştir. Tam motor değişimi veya yalnız kozmetik kaplama yerine doğrudan kullanılabilen bir simülatör kabuğu ve tek iyileştirilmiş referans harita üret. Yeni kimlik: koyu grafit zemin, kırık beyaz tipografi, asit yeşili vurgu; EFA HANGAR adı korunur. Menü arka planında kontrollü 3B sahne, metnin altında opak/kontrastlı yüzey. Tanıtım kartlarını ve taktik süsleri kaldır.

## Davranış

- Yeni kullanıcı serbest uçuşa hikâye/atölye tamamlamadan ulaşır. Hikâye isteğe bağlı; atölye bütün mevcut parçaları açar. Akademi kilitleri ve eski ilerleme korunur.
- Ana menüde Uçuş, Serbest stil, Yarış, Akademi, Atölye, Ayarlar bulunur. Son drone/harita saklanır; Hızlı uçuş en çok iki eylemle uçar. Yarış antrenmanı akademiden bağımsız ve sıralama dışıdır.
- Hazırlıkta drone önizlemesi ve özellikleri, görsel harita kartları, özet ve belirgin Uçuşa başla düğmesi bulunur. Atölye ve eğitim gerektiğinde açılır.
- Grafik profilleri düşük/orta/yüksek; render ölçeği, gölge ve çevre yoğunluğu gerçek render davranışını değiştirir. Ayarlar bozuk/engelli depolamada varsayılana düşer. Fizik/görev çarpışmaları kaliteye göre değişmez.
- Kamera yatay FOV 80–140°, tilt 0–60°, temiz/FPV lens ve bağımsız titreşim. Temiz görüntüde bodycam kapalı, titreşim varsayılan kapalı. Geniş ekranlarda FOV oranı doğru hesaplanır. WebGPU yolu mevcut sözleşmede korunur.
- Pist referans haritadır: doğal ışık, düzgün asfalt/çim geçişleri, pist boyası, modüler hangar detayları, apron çizgileri, uzaktaki çevre ve ölçek referansları. Uçuş koridorları ve ders hedefleri kapanmaz. Düşük kalite aynı engel geometrisini korur.
- HUD sade; hız/irtifa/pil/mod ve gerekliyse hedef. Sahte GPS/REC bodycam süsleri varsayılan görünmez. Duraklatma simülasyon, görev zamanı ve kayıt akışını gerçekten durdurur; devam, reset, hazırlığa dön ve ana menü çalışır.
- Uçuş menüsünden kamera ayarları değişebilir; hızlı reset klavye R ve menüde çalışır. Aynı ayarlar tekrar ve yeniden açılışta korunur.

## Kabul ve sınırlar

Node davranış testleri, üretim derlemesi, masaüstü ve mobil tarayıcı senaryoları, WebGL görüntüsü, mümkünse WebGPU kontrolü; performans ölçümleri test makinesi ve ayarıyla kaydedilir. 60 FPS hedefi garanti diye sunulmaz. Yeni harita/menü ekran görüntüleri teslim edilir. Yeni ücretli varlık veya servis yok, canlı dağıtım yok. Önceki yerel değişiklikleri sıfırlama; kaynakları bu dalda koru.
