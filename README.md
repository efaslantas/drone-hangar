# Drone Hangar

Tarayıcı FPV oyunu. `drone-simulator` (ArduPilot SITL) **değil**.

## Çalıştır

```bash
cd ~/Desktop/drone-hangar
npm install
npm run dev          # LAN: http://192.168.1.200:5173
npm test
```

Public: https://efa-hangar.germanywestcentral.cloudapp.azure.com/?room=hangar&name=pilot

## Pistler

Hangar → **2 · Oyun modu**. Dört bağımsız pist; pist içinde kilit bir önceki kayıttan açılır (`localStorage`). Okulun **Kapılar** dersi diğer üç pisti açar.

- **Uçuş Okulu** (6 ders, 6/6 diploma): Havada kal (3 hover küresi) → Kapılar (4 kapı) → Rüzgârda kapı (pist, yan rüzgâr) → Dar geçit (sanayi, binalar arası) → Acro'ya geçiş (gerçekçi fizik zorunlu) → Gece seyri (orman, gece)
- **Muharebe:** Devriye (6 hedef) → Köpek dövüşü (dalga 3/5/7) → Depo çatışması (8 skor) → Arena (8 bot, 15 skor, 7 dk) → Ağır tank (heavy lift zırhlı bot, 10 isabet; 1 sonra 2)
- **Yarış** (3-2-1 geri sayım, tur süresi): Kıyı GP → Pist sprint (4 tur) → Orman rallisi (5 kapı) → Sokak devresi (cinewhoop)
- **Görev:** Keşif (kent, 4 işaret) → Arama-kurtarma (gece orman, 5 nokta) → Menzil (7", uzak kapılar, ortada pade inip pil değiştir) → Kargo (heavy lift, 3 koli: alçal-al, çatı/kule/pade bırak; yük gazı ve pili yer, çarpınca koli düşer)
- **Takım savaşı** (`team` odası, her zaman açık): sunucu Kırmızı–Mavi dağıtır (dengeli), can/düşme/skor/saat sunucuda. İki pilot girince 3 dakikalık maç başlar, 20 sayı biter, 8 sn ara, yeniden. Rakibi vurunca istemci "isabet" der, sunucu menzil (≤190 m), sıra, taraf ve canlılık kontrolüyle sayar; düşen 4 sn sonra yeniden doğar. Pist haritası, taraflar apronun iki ucundan kalkar; rakip isim etiketi kırmızı/mavi, izleri görünür. `team-<ad>` odaları da takım odasıdır (özel maç).
- **Günün görevi** (her zaman açık): rota tarihten türer (`daily-YYYY-MM-DD`, UTC gün; 03:00 TR'de yenilenir). Harita, gövde (kilitli), 7-9 kapı, bazen bir hover küresi, rüzgâr ve gece seed'den gelir; herkes aynı rotayı aynı gövdeyle uçar, sıralama o güne özel. Ana ekranda "Günün Görevi" düğmesi.
- **Otonom Operasyon** (her zaman açık, sıralamasız): "Kıyı Gözetleme ve Müdahale" kartını başlat. İHA kıyıyı tarar, olayı bulunca en yakın yeterli bataryalı İDA otomatik sevk edilir ve iki araç olay noktasını birlikte doğrular. Panelden görevi duraklatabilir, İHA'yı veya seçili İDA'yı devralabilir, kontrolü tekrar otonomiye verebilir ya da görevi iptal edebilirsin. İlk sürüm tek operatörlü arcade simülasyondur; gerçek SITL/MAVLink bağlantısı içermez.
- **Operasyon Masası** (ana ekrandan doğrudan): bir İHA ile iki İDA'yı tek PS koluyla serbestçe yönet. Filo kartı veya L1/R1 araç seçer; seçilen araç manuel, önceki araç güvenli beklemededir. Taktik haritada rota çizip uygulayabilir, düzeni yerel senaryo olarak kaydedip yükleyebilirsin. Senaryolar `efa-hangar-operations-v1` anahtarında, yalnız bu tarayıcıda saklanır. Tam editör masaüstü odaklıdır; dar ekranda temel görünüm ve eylemler korunur.

**Serbest** = eski deathmatch. **Bot Antrenmanı** aynı deathmatch, ayrı oda — kalabalık genel lobiden bağımsız pratik için. **Gece**, **Gerçekçi acro**, kamera açısı, ateş hızı hangarda. Gerçekçi acro kapalıyken okul/angle aynı. Açıkken acro’da otomatik gaz yok.

## Modeller

Haritalardaki varil, kasa, lastik, bariyer, jeneratör, kütük, kaya, çalı, hidrant, sokak lambası, merdiven, duvar lambası, çöp kutusu, rögar kapağı gibi prop'lar [Poly Haven](https://polyhaven.com) taranmış modelleridir (CC0). `node tools/fetch-models.mjs` 1k glTF'leri indirir, `node tools/optimize-models.mjs` meshopt + WebP `.glb`'ye sıkıştırır (27 model, 65.2 MB → 11.7 MB) ve `public/models/manifest.json` yazar. Ağaçlar artık Poly Haven'ın ayrıntılı CC0 modelleridir: [küçük çam](https://polyhaven.com/a/pine_sapling_small), [orta çam](https://polyhaven.com/a/pine_sapling_medium), [kıyı ağacı 1](https://polyhaven.com/a/island_tree_01) ve [kıyı ağacı 2](https://polyhaven.com/a/island_tree_02). Depo, pist ve kent sınırlarında [modüler tel çit](https://polyhaven.com/a/modular_chainlink_fence) kullanılır. `node tools/prepare-natural-assets.mjs` ağaç ve çit dosyalarını işler: Pillow ile ayrı saydamlık maskelerini renk dokusuna gömer, 1k WebP + meshopt GLB üretir ve ağaçlar için uzak geometri oluşturur. Yakın model 32 metreden sonra hafif modele geçer; kaynaklar örnekler arasında paylaşılır. Kaynak indirmeleri `/tmp/hangar-natural-sources` içine taşınır, oyunda yalnız sıkıştırılmış modeller kullanılır. Manifest kaynak, lisans ve dosya boyutlarını kaydeder. Masaüstünde yükleme bitene kadar prosedürel model görünür kalır; mobil hafif mod düşük maliyetli çevreyi korur.

## Grafik

Oyun varsayılan olarak klasik WebGL ile açılır. Tarayıcın destekliyorsa deneysel WebGPU yolunu (bloom, FXAA, GTAO ortam gölgelemesi) Ayarlar → "WebGPU (deneysel)" ile açabilirsin; `?gpu=1` tek oturumluk açar, `?gpu=0` kapatır.

## Kontroller

Mode 2. Sol yaw+gaz (orta = hover), sağ pitch/roll.

- **Klavye:** W/S irtifa, A/D yaw, oklar veya IJKL pitch/roll, F ateş, Space ARM, T mod, C kamera, R reset, H yardım, M ses, Esc (2x) hangar
- **PS kol:** USB/BT, sayfaya tıkla + bir tuşa bas. Sol stick yaw+gaz, sağ pitch/roll, R2 punch, R1 ateş, ✕ ARM, ○ reset, △ mod, □ kamera
- **Mobil tarayıcı:** yatay tut. Sol başparmak gaz+yaw, sağ pitch+roll, ATEŞ basılı, ☰ menü

Otonom operasyonda devralınan araç aynı klavye/gamepad/mobil girdilerini kullanır. İDA için gaz ileri hareketi, yaw ise dümeni kontrol eder; "Otonomiye ver" seçildiğinde rota takibi kaldığı yerden sürer.

Operasyon Masası'nda İHA Mode 2 kullanır; İDA'da sol stick dikeyi ileri/geri, sağ stick yatayı dümendir. L1/R1 araç değiştirir, □ kamera değiştirir, ○ çalışma alanını sıfırlar, Options yardımı açar. L2+R2 en az 700 ms tutulunca tüm filo kilitli acil duruşa geçer; ekrandaki yeniden etkinleştirme düğmesi olmadan hareket başlamaz.
