# Şile 2.64 — Sokak donatıları

Sahil gerisindeki bina girişleri ve yol kenarlarında, mevcut kaldırım ve sokak bağlantılarını tamamlayan 24 sokak lambası, 24 saksı ve 6 bank eklendi. Yerleşimler yol ve bina verilerinden türetilir; gerçek belediye donatı envanteri veya birebir saha ölçümü değildir.

İlk 135 çekirdek bina için önceki yerleşim sırası korunur. Yeni donatılar kıyıdan 100–350 metre uzaklıkta, çekirdek bina ayak izlerinden en az 6 metre dışarıda seçilir. Yol açıklıkları, 318 giriş koridoru, mevcut katılar, spor alanları, liman, sahil ve ek bina ayak izleri korunur. Saksı ve banklar eğim ve ayrı destek noktaları üzerinden elenir; zeminde havada kalan ayaklar kabul edilmez.

Yeni 54 donatı, 204 çarpışma kutusu ve hızlı geçişte ince direklerin içinden geçmeyi önleyen 2448 kapalı üçgen temas yüzeyi içerir. Mevcut çarpışma motoru kullanılır. Yeni etiketli kutu ve yüzeyler dışarıda bırakıldığında önceki fizik SHA256 değeri `60f7c49bf756bf227095431834bfb94a8dd3f2f5a89490acf77003ecd26254bd` korunur. Arazi, 1530 bina prizması, önceki 14343 kutu ve 100227 yüzey, 367 arka giriş ve 4 platform değiştirilmedi.

Node 22 ARM64 altında 675 test, 11 altyapı testi ve 12 geometrik rota geçti. Regresyonlar ince direğe hızlı yaklaşma, açık yanından geçme, korunan yüzeyler, geçersiz ek bina verisi ve sahne temizliğini kapsar. Sabit kameralarda WebGL/WebGPU kontrolü ve yeni 180 saniyelik görünür performans kaydı ayrı kabul dosyasındadır. Önceki 900 saniyelik kayıt 2.58 sürümüne aittir. Bu sürüm için kullanıcı uçuş kabulü ve fiziksel TX15 testi yapılmadı.

Yerleşim kaydı: `public/maps/sile/district-furniture-visuals.json`. Canlı teslim ve güncel performans kanıtı: `docs/sile-completion-acceptance.json`, `followups.furniture264`.
