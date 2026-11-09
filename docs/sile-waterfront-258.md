# Şile kıyı yerleşimi 2.58

2.57 için kullanıcı geri bildirimi: sahil boş, henüz tam Şile değil. Bu geri bildirim başarısız görsel kullanıcı kabulü olarak tarihsel raporda korunur. Yazılım testleri görünümün gerçek ilçeye birebir benzediğini kanıtlamaz.

## Değişiklikler

- Aynı Microsoft/Overture kaynağındaki yüksek güvenli bina izi seçimi kıyıdan100m yerine500m kuşağına genişledi:129aday,119uygun yapı;10aday çakışma/eğim nedeniyle ertelendi. Önceki14kaynak kimliği korunur. Varsayılan7,5m yükseklik, cephe/çatı görünümü varsayımdır. Orta eğimde en az yaklaşık3m üst açıklık aranır; düşük pavyonun1,2m arazi farkı sınırı korunur. Görünen Float32 kabuk temas yüzeyidir.
- Görsel OSM cephe kuşağı350m içinde680yapıya ulaştı. Mevcut135yapılık ön sıra; arazi tesviyesi, giriş yüksekliği, balkon ve diğer fiziksel donatı sahipliğini korur. Arka sıraya yeni varsayımsal balkon engeli eklenmez.
- ESA WorldCover2021v200 özgün kategorik piksel kesiti ağaçlık/çalılık/çayır örtüsüne yön verir. OSM'nin açık park/orman/çalılık, plaj, çim, otopark ve liman kayıtları önceliklidir. Bütçe1.600ağaçtır; kıyıya öncelik verilir. İlk bağımsız incelemenin yakaladığı parkların orman gibi doldurulması hatası, önce başarısız olan regresyon testiyle düzeltildi.
- Hazırlanmış sahnedeki yaz donatısı72yerine420şemsiye/çift şezlong takımı üst sınırı kullanır. Mevcut uygun kum yüzeyi, destek ayağı, yol ve yapı kontrolleri korunur. Bu sayı güncel plaj envanteri değildir.
-15OSM otopark/paved poligonu kalan arazi yüzeyinden ayrılır; ayrı üst üste levha oluşturulmaz. Park çizgileri temsili boyadır; yeni çarpışma engeli değildir. Yüzey etiketi olmayan otoparkların asfalt görünümü varsayımdır.
- Kullanıcının ff74280 aynı joystick yeniden seçildiğinde kalibrasyonu koruma düzeltmesi aynen korunur.

## Kaynaklar ve doğruluk sınırı

[Şile Belediyesi plajları](https://sile.bel.tr/tr/sile-plajlari/) yaz donatısı ve sahil dokusu için görsel referanstır; fotoğraflar uygulamaya kopyalanmadı. [ESA WorldCover erişim bilgisi](https://esa-worldcover.org/en/data-access) ve [2021v200 veri yayını](https://doi.org/10.5281/zenodo.7254221) yaklaşık10m arazi sınıfı sağlar.2021sınıfları,2026arazi ölçümü veya tek tek ağaç koordinatları değildir. Ağaç konumu/aralığı/türü/boyu model seçimidir. Yerel GeoTIFF yeniden örneklenmedi; kesit SHA'sı ve dönüşüm bilgisi `public/maps/sile/landcover.json` içindedir. Kesit SHA'sı, küresel kaynak dosyasının SHA'sı değildir.

© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium — CC BY 4.0.

Özgün ana harita, OSM ve DSM değişmedi. Yaklaşık31m örnekli DSM, yakın uçuş için gerçek kaya kabartısını veya çıplak zemini çözmez. Ayazma/limanda kaynakta izi bulunmayan boş alanlar, balıkçı işletmeleri ve bina cephelerinin bireysel fotoğraf eşleştirmeleri hâlâ eksiktir. Bu sürüm kaynaklı yerleşim ve bitki örtüsünü iyileştirir; ölçülmüş dijital ikiz değildir. Fiziksel TX15 ve yeni sürümün kullanıcı görsel/uçuş kabulü ayrıca yapılmalıdır.

## Kanıt

Kanonik güncel durum `sile-completion-acceptance.json` ve `followups.waterfront258` içindedir.642/642Node22AlpineARM64,13/13coğrafi veri testi,11/11altyapı testi geçti. Altı bölgenin deniz/kara kamerası WebGL ve WebGPU ile alındı; kale, fener, mağara ve doğal geçit yakın görüntüleri ayrıca kaydedildi. İki yönlü12rota geometrik süpürülen temas kontrolüdür; pilot uçuşu veya kumanda/fizik kalibrasyonu değildir. Yeni900s orta kalite performans koşusu ve canlı teslim kimliği, tamamlandığında kanonik rapora yazılır; eski koşu yeni sürümün ölçümü sayılmaz.
