# EFA Hangar 2.0

Tarayıcıda çalışan FPV / stabilize İHA simülatörü. Mevcut uçuş çekirdeği Three.js, Vite ve saf JavaScript modüllerinden oluşur. Bu depo ArduPilot SITL veya MAVLink aracı değildir.

## Çalıştırma ve doğrulama

Depo kökünde Node.js 22 ile:

```sh
npm ci
npm run dev
npm test
npm run build
npm start
```

`npm start`, derlenmiş `dist/` ve WebSocket sunucusunu 8780 portunda sunar. Canlı dağıtım veya fiziksel cihaz doğrulaması yerel testlerin sonucu olarak varsayılmaz.

## Ürün davranışı

- Ana ekran → hazırlık veya son drone/alan seçimiyle hızlı uçuş. Hikâye ve atölye zorunlu değildir.
- Serbest uçuş yerde, DISARM başlar. Serbest stil ve üç turluk yarış antrenmanı akademiden bağımsızdır.
- 10 drone, 7 alan ve 36 akademi adımı. Mevcut uçuş ilerlemesi korunur. Akademide `isOpOpen`, `trackGate`, `nextInTrack` kilitleri yönetir.
- Menü, yardım, sonuç ve mobil araç çubuğu açıkken yerel fizik, görev, tekrar ve dünya zamanı durur. Başladıktan sonra duraklatılan görevler sıralama dışıdır.
- Grafik kalitesi yalnız görüntüyü etkiler; fizik, çarpışma ve hedefleri değiştirmez. Temiz lens ve kapalı titreşim varsayılandır.
- Mode 2: sol gaz/yaw, sağ roll/pitch. Space ARM, R reset, T mod, C kamera, Escape menü. Gamepad ve dokunmatik desteklenir; TX15 fiziksel doğrulaması henüz yapılmadı.

5 inç Freestyle/Racer varsayılan referansı `src/propulsion-reference.js` içindeki kaynaklı statik motor eğrileridir. Ayrı kalıcı tercih `efa-hangar-propulsion-reference-v1` anahtarındadır; generic parçalar korunur. Referans koşuları antrenmandır, ilerleme/rekor/ghost/sıralamaya yazılmaz. Kütle/kapasite varsayımları kullanıcı girdisidir; tam uçuş doğrulaması iddia edilmez. Kaynak doğrulayıcı `tools/verify-propulsion-source.mjs`, sınırlar `docs/PHYSICS-EVIDENCE.md` içindedir.

`rigid-body.js` referans gerçekçi Acro için Euler/RK4, mixer ve rate kontrolünü sahiplenir. `reference-form.js` sayısal taslağı Apply üzerinde atomik kaydeder; manuel J alanlarını her değişimde normalize etmeyin. Atalet ve kontrol parametreleri varsayımdır. `tools/validate-flight-dynamics.mjs` sayısal doğrulama içindir.

## Modül sahipliği

| Alan | Dosyalar |
|---|---|
| Arayüz ve orkestrasyon | `index.html`, `src/main.js`, `src/style.css` |
| Oturum ve grafik tercihleri | `src/session-preferences.js`, `src/visual-settings.js` |
| Fizik ve sabit adım | `src/physics.js`, `src/simulation-clock.js`, `src/collide.js` |
| Girdi ve kalibrasyon | `src/input.js`, `src/controls.js`, `src/rc-input.js`, `src/rc-setup.js` |
| Görev ve değerlendirme | `src/missions.js`, `src/goals.js`, `src/assessment.js`, `src/curriculum.js`, `src/countdown.js` |
| Dünya ve Pist | `src/world.js`, `src/airfield-detail.js`, `src/billboard.js` |
| Görüntü | `src/gfx.js`, `src/post.js`, `src/gfx-webgpu.js`; deneysel WebGPU, varsayılan WebGL |
| Drone ve atölye | `src/catalog.js`, `src/models.js`, `src/fpv-build.js` |
| İlerleme ve tekrar | `src/progress.js`, `src/ghost.js`, `src/pilot-story.js` |
| Günlük ve oda seçimi | `src/daily.js`, `src/rooms.js`, `src/loadout-selection.js` |
| Sunucu | `server/index.mjs`, `server/rooms.mjs`, `server/api.mjs`, `server/store.mjs`, `server/auth.mjs` |

Sıralama için sunucu başlangıç/bitiş zamanını kullanır. Kaldırılmış etkinlik kimlikleri ve oda bağlantıları için güvenli yönlendirme/sonuç reddetme kontrolleri korunur; bu kontroller eski özelliklerin uygulaması değildir.

Depolama erişimini güvenli yardımcılarla yapın. Kullanıcı ilerlemesini silmeyin. `server/data/`, `.env*`, anahtar ve sertifikalar repoya eklenmez. Admin erişimi cookie oturumuyla yönetilir; URL anahtarları yetki vermez. IP veya konum kaydı tutulmaz.

Güncel ürün: `README.md`, `docs/URUN-ANALIZI.md`, `docs/OYUNCU-REHBERI.md`. Doğrulama sınırları: `docs/SIMULATOR-V2-DELIVERY.md`. Dağıtım: `docs/DAGITIM.md`.

RC ayarları `efa-hangar-rc-input-v1`, eski varsayılan gamepad. RC mutlak throttle kullanır ve lift alanını göndermez; Angle altitude-hold yalnız lift yolunda çalışır. Cihaz/kalibrasyon eksikliğinde DISARM ve gaz0; ARM düşük gaz kapısını tüm UI/klavye yollarında `canArmInput` ile koruyun. Fiziksel TX15 doğrulaması yapılmadı.

Şile veri tabanlı serbest uçuş haritasıdır; `sile-data.js` yerel snapshot'ı tembel yükler, `sile-world.js` render/prizma sahipliği, `geo-terrain.js` ortak terrain interpolation ve koordinatlar. `map-selection.js` son seçim/iptal, `startup-gate.js` deep-link başlangıç sırası. Dersleri Şile'ye rastgele taşımayın. Veri/varsayım/lisanslar `/sile.html` ve `public/maps/sile/provenance.json`; kaynak OSM+30m DSM, fotogrametri değil.
