# Şile 2.59 — Spor sahaları ve rıhtım yüzeyleri

Kaynak OSM verisindeki beş spor alanı sahneye işlendi: Şile Stadyumu futbol sahası, bir basketbol, iki tenis ve spor türü belirtilmeyen bir saha. Eski context kayıtları korundu. Bilinmeyen spor türüne oyun çizgisi eklenmez; bilinen türlerin çizgileri kaynak poligonu içindeki temsili şablonlardır.

[İBB Spor Envanteri](https://sporenvanteri.ibb.istanbul/public/en/facility/sile-city-stadium) stadyumu suni çim olarak ve 68 × 105 m oyun alanıyla kaydeder. OSM izi bu ölçüyle tam uyuşmadığından uzatılmadı. Yaklaşık DSM zeminini izleyen modelde yeni düz kot veya tribün eklenmedi. Saha izi, boyalı çizgiler ve gerçek saha ölçüsü aynı kanıt değildir.

Liman poligonunun %96,47’si su alanıdır. Bu poligon karaya çevrilmez. Mevcut rıhtımın aynı kaynak kıyı kenarlarında 10 m olan döşeme yorumu, kara yönünde varsayımsal 30 m bandıyla genişletildi. Yol, yapı, otopark, plaj, yeşil alan ve spor sahaları korunur. Malzeme ve genişlik saha ölçümü değildir; sahadaki gerçek döşeme sınırı farklı olabilir.

Yeni yüzeyler kalan arazi üçgenlerinden ayrılır; üst üste ikinci zemin oluşturulmaz. Görünen kot, son fiziksel araziyle karşılaştırıldı. Float32 dönüşümünden sonra su tarafında kalan 20 ince parçanın toplam 0,0002883 m² alanı ayıklandı; desteklenen köşeler taşınmadı.

649/649 Node 22 ARM64 testi, 11 altyapı testi ve 12 geometrik rota geçti. Bağımsız inceleme bulgusuzdur. Altı bölge ve stadyum WebGL/WebGPU ile kaydedildi. Yeni 180,0092 saniyelik görünür 1280 × 720 medium koşusunda ortalamalar yaklaşık 60 FPS; en düşük %1 değeri 56,40 FPS. Bu kayıt, önceki 2.58 sürümünün 900 saniyelik koşusundan ayrıdır; eski koşu 2.59 ölçümü olarak sunulmaz.

Kaynaklar ve varsayımlar: `public/maps/sile/context-data.json`, `public/maps/sile/sports-quay-visuals.json` ve `/sile.html`. Kanonik durum `sile-completion-acceptance.json` içindeki `followups.grounds259` alanındadır. Fiziksel TX15 ve yeni kullanıcı görsel/uçuş kabulü henüz yapılmadı. Kayıp sahil yapıları ve yaklaşık DSM sınırları sürer; bu bir ölçülmüş dijital ikiz tamamlanma iddiası değildir.
