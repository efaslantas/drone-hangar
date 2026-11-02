# Kaynaklı yüzeyler ve grafik kalitesi

Kullanıcının görsel gerçekçilik hedefi için mevcut taranmış malzeme sistemi geliştirilir. Asfalt/beton zaten kaynaklıdır; yeniden indirilmeyecek. Eksik çim Grass Ground (Poly Haven, Charlotte Baglioni, CC0) ile tamamlanır. Fizik, çarpışma, pist geometrisi ve ders hedefleri değişmez. Çim normal/roughness haritaları renk bilgisinden tahmin edilmez, kaynak paketinden alınır. 4 m tekrar ölçeği sanatsal seçimdir; kaynak boyutuyla birebir eşleşme iddia edilmez.

Düşük kalite prosedürel dokulara döner; orta 512px, yüksek masaüstünde1024px, dokunmatikte en çok512px GPU dokuları kullanır. Mevcut WebP varyantları yeniden kullanılır. Yeni çim orijinal1k JPEG kanalları yerel sunulur; orta profilde tarayıcı canvas ile512 GPU görüntüsüne küçültür (indirme boyutu aynı). Kullanıcıya bu ayrım açıkça yazılır.

Mevcut görüntü yüklenene kadar kalır. Hata fallback'i bozulmaz; harita/kalite değişiminden kalan geç sonuç yeni sahneye yazamaz. Kalite değişince mevcut sahne yeniden kurulmaz, fizik/ilerleme/kamera korunur. Her malzemenin prosedürel karşılığı korunur; GPU kaynağı değiştirilince boşaltılır, düşük kaliteye dönüşte yeniden yüklenir. Harita temizliğinde tüm owned kopyalar kapatılır; kaynak görüntü önbelleği sahneye ait değildir.

Mevcut sistemin eksik kapsamı: kalite yalnız gölge/dekoru değiştiriyordu, materyal seçimi yalnız dokunmatik bayrağına bağlıydı. Yeni kalite politikası mevcut owner scanned-materials.js içinde kalır. Yeni görüntü kütüphanesi veya shader eklenmez. Kaynak/provenans manifesti, yerel dosya MD5/SHA256 ve kredi bilgisi korunur.

Doğrulama: doku renk uzayları, UV ölçeği, kalite geçişi, eski async işin iptali, hata/fallback, tekrar geçişte sahiplik, çarpışma regresyonu; Chrome Pist gündüz/yüksek/düşük ve kalite değişiminde reset olmaması; build/full tests, tek fresh review, yedekli Azure.
