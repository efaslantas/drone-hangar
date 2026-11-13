# Şile 2.65 — Asfalt ve kaldırım yüzeyleri

Mevcut asfaltın kenarına temsili aşınma/toz tonları eklendi. Yol dokusu kaynak yol yönünü izler ve 1,5 metre ölçeğini korur. Parke taşlarının ortak renk, yükseklik ve pürüzlülük şablonunda derz pahı ve ince taneler belirginleştirildi. Bina çevresindeki mevcut döşeme aynı malzemeyi kullanır.

Yol genişliği, kaldırım ve bina boyutları, arazi ve bütün 2.64 fizik kayıtları korunur. Yeni yol, çukur, basamak veya çarpışma engeli eklenmez. Görsel kenar bandı mevcut asfalt üzerinde kaynak yol şeritlerinin 55 cm iç birleşimiyle ayrılır. Kavşakların içi kaynak şerit birleşimini izler. Bu görünüm Şile'deki gerçek yol aşınmasının veya tek tek döşeme taşlarının envanteri değildir.

Bölme, mevcut üçgenlerin düzlemlerini korur. Float32 toplam alanı önceki 362496,736 m² yüzeye göre yaklaşık 0,365 m² farklıdır; test toleransı 0,8 m², yaklaşık 2,2 ppm'dir. Fizik geometrisi byte düzeyinde korunur: tam SHA256 `8fcd8220a21cfceefcdba074a93af0709b54adf7d8c8d1a265cdb29326453775`. Görsel asfalt köşe sayısı 661839'dan 2532960'e yükseldiği için canlı teslim öncesinde yeni görünür performans ölçümü yapılır.

Regresyonlar eğimli yüzey alanı/kotu, ters yönlü yol, kavşak iç bölgesi, genel yüzey hazırlığından sonra renk/UV korunumu, taranmış doku ve düşük kaliteye dönüş, gerçek dünya fizik özeti ve kaynak temizliğini kapsar. Güncel test, performans ve teslim kanıtı `docs/sile-completion-acceptance.json`, `followups.weathering265` bölümündedir. Önceki 900 saniyelik ölçüm 2.58'e aittir. Yeni kullanıcı uçuş kabulü ve fiziksel TX15 testi yapılmadı.

Canlı teslim: `v2.65.0-7a57ec1eeba5`, uygulama commit’i `57f6d75`. Son Node22 ARM64 koşusunda 682/682 test, 11 altyapı ve 12 geometrik rota geçti. WebGL/WebGPU toplam 30 sabit görünüm kontrol edildi. Yeni 180 saniyelik görünür ölçümde altı bölgede yaklaşık 60 FPS, en düşük %1 kare hızı 56,34 FPS ve gizli sekme süresi 0. 485 paket kaynak SHA, çalışan 139 kaynak dosya, HTTPS, iki istemcili WSS ve canlı Şile DISARM/0 km/h/0 m AGL kontrolü geçti.
