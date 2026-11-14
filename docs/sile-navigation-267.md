# Şile 2.67 — Genel inceleme ve yerini bulma

Mevcut harita henüz Şile’nin eksiksiz dijital ikizi değil. Bina temelinin dokusunu iyileştirmek bunu tamamlamıyor. Bu değişiklik, yerleşimi tanımayı ve uçarken hangi mahallede/sokağın yakınında olduğunu anlamayı sağlar.

## Genel haritada gördüklerimiz

- Alan yaklaşık 4,5 × 2 km: Şile merkez, liman, fener ve Ağlayankaya yönündeki kıyı. Bütün Şile ilçesi veya bütün kıyı hattı değil. Kumbaba’nın merkezi batıdaki sınırın dışında; mahallenin yalnız kesişen kısmı görünür.
- Mevcut OSM anlık görüntüsünden 466 farklı yol kaydı, kırpılarak 468 yol parçası oluşturulmuş. Bunların 166’sı adlandırılmış; 114 farklı sokak/cadde adı var. Adı olmayan 302 parçaya gerçekmiş gibi isim verilmez. Yol genişlikleri sınıf tahmini; gerçek bordür ve şerit ölçüleri değil.
- Dört merkez mahallenin tam OSM sınırı 14 Kasım 2026’da alındı: Balibey, Hacı Kasım, Çavuş, Kumbaba. Mahalle adları [belediyenin muhtar listesinde](https://sile.bel.tr/tr/kurumsal/muhtarlar/) de var. Sınır geometrisi resmi kadastro/ölçüm verisi olarak sunulmaz.
- Yol ve kıyı çizgilerinin kaynakla uyuşması, gerçek konumlarının santimetre hassasiyetinde ölçüldüğü anlamına gelmez. Önceki `geography-audit.json` dönüşüm farklarını denetliyor; saha doğrulaması değil.
- 30 m DSM; sokak, istinat duvarı, kayalık, kıyı oyuğu ve küçük kot farklarını birebir çözemez. Cephe, çatı ve çoğu bina yüksekliği genel modellerdir. Aynı görünen binalar, eksik bahçe/işletme çevreleri ve basitleşmiş kıyı rölyefi hâlâ Şile hissini azaltıyor. Yeni isim katmanı bu geometrik eksikleri tamamlanmış saymaz.

## Kullanım

Uçuş ekranındaki konum kutusu mahalleyi, üzerinde olduğun veya yakınındaki kaynaklı sokak adını ve önemli bir yere yatay mesafeyi gösterir. Kutuyu açıp kapatarak yakın çevre haritasını kullanabilirsin. Kuzey yukarıdadır; sarı işaret simülasyondaki konumun ve drone gövdesinin yatay yönüdür. Mobilde kutu başlangıçta kapalıdır. MENÜ içinde duraklatılmış uçuşun genel haritası, önemli yerler, ana caddeler ve dört mahalle adı görünür.

Sokak adı bulunmayan bir yolun üzerindeyken “Bu yolun adı kaynakta yok” yazılır. Adlandırılmış bir yola yalnız yakınsan “Yakın” ve yatay mesafe yazılır. Mahalle polygonunun dışında veya mevcut harita sınırının dışındayken önceki konum adı gösterilmez. Bu bir GPS cihaz ölçümü, uçuş koridoru veya otomatik rota değildir.

## Kaynak ve doğrulama

`tools/prepare-sile-navigation.mjs`, tam OSM ilişki üyelerini kapalı dış/iç halkalara birleştirir; kopuk sınırı reddeder. Kaynak sınır/merkezler `public/maps/sile/source-neighbourhoods.json` ve `source-places.json`; üretilmiş veri `navigation.json` içinde tarih, SHA, lisans ve sorgu ile kayıtlıdır. Yol geometrisi ve adları mevcut anlık görüntüden; Kale/Fener/Ağlayan Kayalar Burnu/meydan/liman işaretleri mevcut kaynak kaydından gelir. Etiketin çizildiği yer giriş koordinatı veya uçuş güvenliği kanıtı değildir.

Saf testler dört gerçek mahalle merkezi, polygon boşlukları, bilinmeyen mahalle, uzun yolun orta noktası, adsız/yakın/asıl yol ayrımı, harita dışı/bozuk konum, gerçek quaternion yönü ve etiket çakışmasını kapsar. Gerçek Chrome üzerinde görünüm, güvenli metin, konum değişimi, kapanış, klavye Space sahipliği, masaüstü/mobil ve diğer haritaya geçiş ayrıca kontrol edilir. 3D geometri, çarpışma ve RC verileri değiştirilmez. Yeni fiziksel TX15 veya kullanıcı saha/uçuş kabulü bu yazılım kontrollerinden çıkarılmaz.
