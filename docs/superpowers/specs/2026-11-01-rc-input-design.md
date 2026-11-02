# RC USB giriş profili

Kullanıcının Liftoff benzeri FPV ve TX15 hedefi için mevcut Gamepad API yoluna ayrı RC profili eklenir. Fiziksel cihaz testi kullanıcıya en sonda bırakılır. Mevcut JS/Vite yapısı ve PS/klavye/dokunmatik davranışı korunur. USB cihazına yeni erişim izni veya WebHID gerekmez.

Karar: PS profilini kumandaya uyarlamak yerine ayrı mutlak gaz yolu. Roll/pitch/yaw -1..1, gaz 0..1 doğrudan fiziğe gider; PS hover merkezleme/expo/rate çarpanı ve R2 kullanılmaz. Eksen sırası varsayılmaz; dört benzersiz indeks ve yön kullanıcı tarafından seçilir. ARM ilk sürümde Space/ekran düğmesidir; kumanda butonları otomatik ARM yapmaz.

Ayarlar ayrı localStorage anahtarında kalıcıdır. Cihaz ID eşleşmesi gerekir; aynı ID'li cihazlarda port indeksi tercih edilir, ID seri numarası değildir. Başka cihaza sessiz geçiş yoktur. Eski kullanıcılar gamepad profilinde kalır. RC seçiliyken eksik/kalibre edilmemiş/geçersiz giriş sıfır kuvvet komutu ve DISARM üretir; klavye/touch gazına sessiz geçilmez. Bağlantı geri gelince otomatik ARM yoktur. ARM için hazır RC ve gaz ≤%5 şarttır; DISARM her zaman serbesttir.

Kalibrasyon iki aşama: diğer eksenler merkezde/gaz en altta başlangıcı al; dört saniye tüm uçları gezdir. Üç merkezli eksen için iki tarafta ≥.2 açıklık, gaz için ≥.5 toplam açıklık gerekir. Başlangıç gazı uçlardan birine yakın olmalı; terslik buna göre çıkarılır. Eksen eşleme veya cihaz değişikliği kalibrasyonu geçersiz kılar. Yön tersleme geçerli kalibrasyonu korur. Başarısız/yarım işlem kaydedilmez. Merkezli eksenlerde %2 yeniden ölçeklenmiş ölü bölge, gazda ölü bölge/expo yoktur. RC rate eğrisi zaten fizik kontrolcüsündedir.

Kontroller sekmesi cihaz seçimi, eksen/yönler, iki adımlı kalibrasyon, ham eksen ve işlenmiş komut göstergesini barındırır. Cihaz yokken açık mesaj gösterir. Düşük gaz ve giriş hatası tam/sade/gizli HUD'da görünür. Metinler ölçülmemiş TX15 desteğini doğrulanmış diye sunmaz.

Yöntem: EdgeTX resmi USB Joystick / Joystick Mapping belgeleri. Classic kanalları sıralı aktarır; tarayıcıdaki anlam evrensel değildir. Açık eksen eşlemesi bu yüzden gereklidir. Fiziksel TX15/USB/tarayıcı uyumu, kumanda RF ayarları veya firmware programlama bu teslimde yapılmaz.

Kabul: gaz min/orta/max=0/.5/1 ve fizik hover telafisinden bağımsız; asimetrik uçlar/terslik/merkez; eksik/nonfinite/aynı eksen reddi; cihaz kaybı ve dönüşünde ARM davranışı; PS/touch regresyonu; tarayıcıda cihaz yok UI/kalıcılık; tam test/build, bağımsız inceleme ve Azure sağlık kontrolü.
