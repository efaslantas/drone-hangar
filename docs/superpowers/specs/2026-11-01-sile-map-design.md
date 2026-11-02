# Şile merkez · veri tabanlı serbest uçuş

Kullanıcı önceki öneriyi kabul etti: Şile merkez–liman–fener çevresinde yaklaşık2×2km pilot alan. Mevcut Three.js/Vite simülatörüne yeni harita eklenir; eski haritalar/ilerleme ve TX15 profili korunur. Mühendislik iş akışı, inline uygulama ve tek fresh son inceleme kullanılacak; önceki Azure yayın yetkisi geçerli, commit/push yapılmaz.

## Veri ve doğruluk
OSM API bbox 29.60059,41.16540,29.62445,41.18341 anlık görüntüsü alındı. İlk ham yanıtta9719 node,1701 way,20 relation ve1266 building etiketi var; alan dışına taşan nesneler kırpılacak, tamlığı iddia edilmez. OSM yollar/kıyı/bina izleri konumsal kaynaktır. Bu alanda height etiketi yok, yalnız1 building:levels var; diğer bina yükseklikleri ve cephe/çatılar açıkça temsili olacaktır. Ham kişisel katkıcı metadata'sı dağıtılmaz. Paylaşılabilir kaynak altkümesi ve türetilmiş coğrafi veritabanı ODbL1.0; atıf/kaynak indirme/kapsam sayfası sunulur.

Copernicus DEM GLO-30 public2021 COG N41/E029 indirildi.30m DSM; çıplak arazi ölçümü değildir. Yerel kesit ve örnekleme yöntem/provenansı, kaynak URL/checksum/çözünürlük/sürüm kayıtlanır. Fotogrametri veya güncel birebir dijital ikiz iddiası yoktur.4m taranmış yüzey tekrarları görsel tercihtir, coğrafi görüntü değildir. Uydu/Google/İBB görüntüsü kullanılmaz. Copernicus zorunlu türetim bildirimi ayrı kaynak sayfasında tam verilir.

## Mimari
Offline Python hazırlayıcı OSM geometrisi + DEM'i yerel metrik düzleme dönüştürür; kıyı maskesi,65×65 yükseklik örnekleri, arazi üçgenleri, yollar, bina ayak izleri/varsayımları, önemli noktalar, güvenli açık kalkış konumu ve envanter çıkarır. Harita dosyası yalnız seçilince yerelden yüklenir. Erken/başarısız/çakışan seçim eski haritayı korur ve anlaşılır durum verir. Kaydedilmiş Şile seçimi başlangıçta yüklenir; hata açık Pist fallback mesajıdır.

Runtime buildSile terrain/water/roads/buildings üretir; meshler birleştirilerek drawcall sayısı sınırlanır. Bina ayak izi ve prizma çarpışması aynı halkaları kullanır; AABB yalnız erken elemedir. Arazi çizimi ile iniş yükseklik örneklemesi aynı üçgen interpolasyonunu kullanır. Deniz teması crash/reset, toprakta yumuşak iniş mümkündür. Referans düzlem kalkış yüksekliğidir, HUD Şile'de AGL gösterir. Başlangıç pad koordinatı0,0 olarak taşınır; eski pad/batarya değiştirme sözleşmesi korunur. Tavan/bounds büyük alana göre ayarlanır. Kamera/fog/sky ve menü önizlemesi2km alanı kapsar.

İlk etap serbest uçuş içindir; ders/yarışlar özgün haritalarında kalır. Gerçek kent içinde hazır ders kapıları varsayılmaz. Harita seçimi, yeniden açılış, hızlı reset, RC yerde DISARM ve kalite profilleri çalışır. Kaynak atfı HUD kapalıyken de uygun biçimde erişilebilir; kaynak/kapsam bilgisi hazırlık ve kalıcı sayfadadır.

## Kabul
Projeksiyon/ölçek,65grid üçgenleri ve yükseklik eşleşmesi, kıyı/deniz, bina prizması ve delikler, spawn açıklığı, ray/kenar sınırları, source/schema/hash, async seçim/hata, persisted map, free-only lesson routing; tam test/build/diff. Chrome yeni map yükleme/uçuş/reset/kalite/menü/atıf; performans cihaz/ayar gözlemi, garanti yok. Yedekli Azure imaj aday/üretim, dışHTTPS kaynak dosyaları ve canlı görsel doğrulanır.
