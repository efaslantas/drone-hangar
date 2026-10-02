# Drone Hangar

Tarayıcıda FPV / stabilize drone oyunu. `drone-simulator` (ArduPilot SITL ARGE aracı) ile **aynı ürün değil** — karistirma.

## Neden ayrı repo

SITL native process + MAVLink + 20-40 s EKF settle. Telefonda "gir uç çık" ve FPV kamera üretmez. Bu proje arcade fizik + WebGL; herkes URL açıp oynar.

İleride gerçekçi mod istenirse SITL köprüsü **ayrı kapı** olur, varsayılan yol olmaz.

## Canlı (2026-09-05)

Public: `https://efa-hangar.germanywestcentral.cloudapp.azure.com/?room=hangar&name=pilot`
Sıralama: `/leaderboard.html` (görev bitince süre; 1. = en hızlı).
Admin: `/admin.html` — kullanıcı adı/parola ile kısa ömürlü `HttpOnly`, `Secure`, `SameSite=Strict` oturum cookie’si alır; eski `?key=` bağlantıları yetki vermez. Canlı giriş/çıkış ve kazanç/kayıp akışı gösterilir; IP adresi veya konum kaydı tutulmaz. Anahtar yalniz korumali `server/data/admin.key` dosyasindan veya `ADMIN_KEY` ortam degiskeninden okunur; asla build ya da sunucu loguna yazilmaz.
Azure `zenth-lens-vm` 24/7, Caddy LE, auto-shutdown KAPALI. Detay: `~/notes/infra-reference.md` Hangar maddesi.

## Çalıştır

```
cd ~/Desktop/drone-hangar
npm install
npm run dev          # LAN: http://<mini-ip>:5173
npm test
npm run build && npm start   # dist + WS, :8780
```

## Kontroller

Mode 2. Sol: yaw + gaz. Sağ: roll + pitch.
- Klavye: WASD gaz/yaw, oklar (veya IJKL) pitch/roll, Space arm, T açı/acro, C FPV/chase, R reset, Esc (2x) hangar — tek yanlış tuş kombo ortasında çıkış yapmasın diye 1.5s içinde 2. basış ister
- DualSense / herhangi gamepad (Gamepad API)
- Mobil: iki stick + ATEŞ + ☰ (üst bar yok). ☰ açıkken (`#flight.menu-open`) ve sonuç kartında (`#flight.has-result`) stick/ATEŞ/ARM/pusula gizlenir; dar dikeyde pusula HUD kutularının altına iner; kısa yatayda hazırlık ekranındaki 3B vitrin gizlenir. Telefon ölçüleri için headless Chrome + CDP denetimi (`cdp-mobile.mjs` deseni: taşma, küçük dokunma hedefi, HUD çakışması)

## Operasyon

Gorunur kampanya 6 bagimsiz pistte 36 adimdan olusur: Ucus Okulu, Manuel Gaz, Acro Kontrol, Cevre Yonetimi, Ileri Parkur ve Gorev. Pist ici kilit onceki adimin kaydiyla acilir; diger pistler kendi `requires` kapisina baglidir. Kazanilmis operasyon yeniden kilitlenmez (`isOpOpen`); eski kimlikler (`school/patrol/waves/race/recon/final`) ilerleme ve siralama uyumlulugu icin korunur. `OPS` siralama icin duz listedir. Legacy combat tanimlari (`patrol`, `waves`, vb.) kodda durur, ancak ana kampanya kartlarinda gorunmez.

Op alanlari `night`/`real`, `lockDrone`/`lockMap`, `botDrone`/`botHp`, `countdown`, `fire`, `pad` ve kargo icin `parcels`/`payload` tasir. Gorevler 3-2-1 geri sayimla baslar; `net.sendStart` GO aninda gider. Kargo tasirken `physics.withPayload()` profili kullanilir; carpinca paket baslangica duser. Hedef, pad, tur, pil ve dalga degerlendirmesi `src/goals.js` icindedir. Sonuc karti sure, PB farki, tur bolumleri ve hayalet tekrarini gosterir; sunucu kendi olctugu tutarli sureyi siralamaya yazar.

`free` hedefi olmayan, atessiz serbest calismadir. `hangar` ve `training` odalari ayni `free` opuna baglidir; ikincisi oyuncuya "Serbest Antrenman" olarak gorunur. `roomOperation()` oda derin baglantisini ilgili, acik etkinlige esler ve kampanya kilidini asmaz. **Gunun gorevi** (`src/daily.js`) UTC tarihinden turetilir; kendi drone/harita/rota kosullarini kilitler ve pist disinda hep aciktir.
**Takım savaşı** (`team` ve `team-*` odaları, op `TEAM`, kind `team`, `run` null): sunucu otoritesi `server/team.mjs` — taraf dağıtımı (dengeli, eşitlikte kırmızı), HP 6, `hit` iddiası menzil ≤190 m + 60 ms kadans + taraf + canlılık kontrolünden geçerse sayılır, düşen 4 sn sonra `respawn`, 2 pilotla 3 dk maç / 20 sayı / 8 sn ara (500 ms `tickTeams`). İstemci (`src/team.js` saf yardımcılar): rakip pilotlar yerel atış testinde hedef, `net.sendHit`; `state`'e `fire` bayrağı → rakiplerin izleri görsel (`visShots`, vuruş testine girmez); HUD skor satırı/saat, `#flight.has-result` maç kartı; taraflar `TEAM_SPAWN`'dan kalkar; isim etiketi takım rengi (`makeNametag(text, color)`).
**Otonom Operasyon** (`AUTONOMY_COAST_RESPONSE`, kind `autonomy`): tek operatörlü arcade İHA–İDA görevi. İHA kıyı devriyesi ve tespit yapar; uygun en yakın İDA olay noktasına gider; operatör herhangi bir aracı devralıp tekrar otonomiye verebilir. Sonuç olay defterine yazılır fakat yerel ilerleme, hayalet ve sıralamaya girmez. Gerçek ArduPilot SITL/MAVLink entegrasyonu bu akışa gömülmeyecek; ileride ayrı ve açık bir adaptör kapısı olacak.

**Operasyon Masası** ana ekrandan bağımsız başlar; otonom görev durum makinesini kullanmaz. Filo sabit olarak `iha-1`, `ida-1`, `ida-2`; modlar `MANUAL/HOLD/ROUTE/STOPPED`. Durum, rota, yerel senaryo ve görünüm sınırları sırasıyla `operations-console.js`, `route-editor.js`, `scenarios.js`, `operations-view.js`; fizik orkestrasyonu `operations-runtime.js`, Three.js entegrasyonu `main.js`. Senaryo anahtarı `efa-hangar-operations-v1` (v1, en çok 20 kayıt, kayıt başına 128 KB). Masaüstü tam editör; telefon yalnız temel yığılmış görünüm. PS: L1/R1 araç, □ kamera, ○ reset, Options yardım, L2+R2 700 ms kilitli acil duruş. İDA sol dikey ileri/geri, sağ yatay dümen kullanır.

## Mimari

| Dosya | Ne |
|---|---|
| `src/physics.js` | Arcade quad. Three.js yok. `play.drain` / `play.wind` / `play.real` (acro: motor lag, sag, mass, `thr/uy` yok). Angle dokunulmaz. Pil tüketimi govdenin kendi hover noktasina goreceli (`endurance` katalog alani, yuk-orantili tuketim egrisi) — sabit oran degil. |
| `src/autonomy.js` | Saf otonom görev durum makinesi: devriye, tespit, İDA seçimi/sevki, ortak doğrulama, duraklatma/devralma/iptal ve görev raporu. |
| `src/autopilot.js` | İHA waypoint ve İDA hedef takip komutları; ilerleme/sıkışma takibi. |
| `src/surface.js` | Saf İDA hareketi, dümen/hız/batarya ve su sınırı fiziği. |
| `src/autonomy-view.js` | Otonom operasyon panelinin saf görünüm modeli ve ince DOM render/temizleme katmanı. |
| `src/operations-runtime.js` | Operasyon Masası'nın İHA/İDA fizik orkestrasyonu; manuel/bekleme/rota/acil duruş komut seçimi. |
| `src/operations-console.js` | Seçim, kontrol sahipliği ve kilitli acil duruş durum modeli. |
| `src/route-editor.js` | Hava/su waypoint doğrulama, immutable rota düzenleme ve ilerletme. |
| `src/scenarios.js` | Sürümlü, sınırlı ve bozuk veriye dayanıklı yerel senaryo deposu. |
| `src/operations-view.js` | Masaüstü komuta alanının görünüm modeli ve artımlı DOM katmanı. |
| `src/input.js` | Klavye + gamepad + touch |
| `src/catalog.js` | 10 platform, her biri `endurance` (hover saniyesi) + simule edilmis gercek hiza dayali `paceInfo` bandi |
| `src/world.js` MAPS | Her haritanin serbest ucus esintisi `wind` (indoor null); `windFor(op, mapId)`: gorev kendi `op.wind`'ini getirir, serbest ucus harita esintisini alir. Brifing/tulum/HUD/ambience hepsi bunu okur |
| `src/missions.js` | `TRACKS` (okul/muharebe/yarış/görev) + `OPS` düz liste + `FREE`; `isOpOpen/trackGate/trackDone/nextInTrack/firstOpenOp` |
| `src/daily.js` | Günün görevi (saf): `dailyId/dailyOp/dailyLabel` — FNV-1a→mulberry32 seed, harita başına güvenli nokta havuzu (`DAILY_MAPS`), en yakın komşu turu; `sortBoards` (sıralama düzeni), `pruneDailyGhosts` |
| `src/goals.js` | Kapı, hover, pad, dalga. Global batarya-bitti kontrolu ayni tikte gelen kazanma/dalga-kurtarmadan SONRA calisir (`tickKind` fallback). Yarista tur bolumleri (`lapTimes/lastLap/bestLap`) |
| `src/countdown.js` | Baslangic geri sayimi (saf). `op.countdown` olan op'larda (artık tüm görevler) fizik + gorev saati GO'ya kadar tutulur; `net.sendStart` GO aninda gider (sunucu suresi bozulmaz) |
| `src/briefing.js` | Ucus oncesi brifing modeli (saf): harita, mod, ruzgar (nereden/siddet), onerilen drone, hedef, sure, batarya. Serbest ucusta "Ucus kosullari" karti. main.js `paintBriefing()` ile hazirlik ekraninda sag sutunun sonunda |
| `src/motor-voice.js` | Sinifa gore motor ses profili (saf, Node'da test edilir): whoop ince/tiz, 5" guclu/raspy, cinewhoop tok, heavy lift dusuk/mekanik. `voiceTargets` gaz/hiz/yer yakinligi/chase/batarya-sag'a gore hedef parametre uretir |
| `src/sfx.js` | Web Audio: `setVoice(spec)` ile secili govdenin motor grafigi (2 detune osilator + sub + prop-wash gurultu + blade-pass AM + bos pil wobble), `nearby(spec,thr,dist,doppler)` en yakin bot/rakip icin ikinci ses (0.5 s debounce, Doppler), `count()`/`lap()`, `audioBus()` diger katmanlar icin ortak master |
| `src/ambience.js` | Ortam sesi katmani (haritaya gore profil): ruzgar (harita esintisiyle solur), kiyida dalga (kiyidan uzaklikla soner), hangar ugultusu + floresan, uzak trafik, kus/marti cirpisi, hareket eden rulo kapinin motoru. `ambienceLevels()` saf ve test edilir; `start/tick/stop` main.js'ten |
| `src/ghost.js` | Ucus izi kaydi (20 Hz, [t,x,y,z,q]) + hayalet: `recordTrace/sampleTrace`, base64 Float32 ile localStorage (`efa-hangar-ghost-v1:<op>`). Kisisel rekor kosusu bir sonraki denemede yari saydam "HAYALET" drone olarak ucar; sonuc kartindaki "Tekrari izle" ayni izi chase kamerayla oynatir |
| `src/ambient.js` | Haritaya ozel canli cevre (ucuz, tek tick): pist ruzgar tulumu (ruzgara gore yon/dusus) + beacon + PAPI, hangar floresan titremesi + amber ikaz + cikis tabelasi, sanayi rulo kapilar (binanin duvari kesilip 3.2 m yukleme bolmesi acilir; collider 4 parcaya bolunur, kapi paneli kendi collider'iyla acilip kapanir) + baca dumani + cit disi trafik, kiyi kopuk cizgileri (instanced) + martilar, orman dusen yaprak + GPU cimen dalgasi. Lite'ta sayilar dusuk. `world.js` buildWorld/tickWorld cagirir; lobi arka plani (`billboard.js`) da tickWorld ile canli |
| `src/props.js` | Gerçek taranmış prop'lar (Poly Haven CC0, `public/models/<id>/<id>.glb`, 27 model toplam ~11.7 MB: `tools/fetch-models.mjs` 1k glTF indirir + md5 doğrular, `tools/optimize-models.mjs` gltf-transform ile meshopt + WebP `.glb`'ye çevirip ham dosyaları siler ve `manifest.json`'ı günceller; GLTFLoader `setMeshoptDecoder`). `PROPS[map]` el yerleşimi `[id, x, z, yaw, {h|scale|collide|yOffset}]` (`yOffset`: duvar lambası gibi yerden yükseklikte monte edilenler); `placeProps` build sonrası tembel (dinamik import, GLTFLoader), masaüstü (`opts.props`), zemine oturtur, ≥0.45×0.35 m olana AABB ekler; `worldToken` geç gelen yükü eski haritaya koymaz. Props modunda `scatterClutter` varil/kasa ve kıyı dodekahedron kayaları çizmez (yerlerini modeller alır) |
| `src/trees.js` | Gerçek düşük-poligon ağaçlar (Kenney Nature Kit, CC0, `public/models/kenney/`, 16 dosya ~200 KB, dokusuz/vertex-renk). world.js prosedürel ağacı HER ZAMAN önce çizer (anlık, ağ yok) ve yerleşimini `scene.userData.treePlacements`'a kaydeder (`kind`: yard/city→`oak`, kıyı→`palm`, orman uzun/kısa→`pineTall`/`pineRound`, gerçek yükseklik `h`); `placeTrees` build sonrası tembel (`opts.props`) her yerleşime aynı konum/dönüş/sallanmayla gerçek modeli koyup prosedürel `mesh`'i kaldırır — yavaş bağlantıda orman hiç boş görünmez, altta yükselir. Kenney'nin çam yaprak materyali (`leafsDark`) kırmızısız RGB'yle camgöbeği okunuyordu → `LEAF_FIX` tek seferlik yeniden renklendirme (dosya başına, tüm kopyalar paylaşır) |
| `src/progress.js` | localStorage kilit/best |
| `server/rooms.mjs` | WS oda, max 16 (LOBBIES: hangar/training/team/race/cine/lr/indoor her zaman listede). Giriş/çıkış/sonuç `server/store.mjs`'e loglanır. `t:"result"` istemciye guvenmiyor — sunucu `t:"start"` ile eslesen opId'yi ve kendi saatinden hesapladigi sureyi kaydeder. Takım odalarında `hello` taraf+maç taşır, `t:"hit"` → `server/team.mjs` |
| `server/team.mjs` | Takım maçı durumu (saf, saat enjekte): `addPlayer/applyHit/tick/snapshot`; olaylar `hit/down/respawn/match` |
| `src/team.js` | Takım modu istemci yardımcıları (saf): `scoreLine/matchStatus/enemyTargets/resultModel`, `TEAM_SPAWN` |
| `server/store.mjs` | Olay/skor JSON dosyası (`server/data/`, gitignore) + admin anahtarı. events 2000, scores 5000 ile sinirli |
| `server/api.mjs` | `/api/health`, `/api/leaderboard`, ghost API'si ve cookie oturumlu admin API'si; halka açık uç noktalar IP rate limitlidir |

Fizik istemcide. Sunucu oda + pose yayını, artık giriş/çıkış/görev sonucu da (`t:"result"`) kaydediyor.

Görünüş (bodycam): `src/post.js` fisheye + CA + grain + teal grade. Kamera `camLag` ile gövdeye yaylı, throttle titreşimi. HUD Axon/GoPro REC, GPS Şile.

**Render yolu (2026-09-11):** `src/gfx.js` seçer — varsayılan klasik WebGL (`post.js` EffectComposer); istenirse WebGPU (`src/gfx-webgpu.js`, `three/webgpu` WebGPURenderer + TSL ile yeniden yazılmış bodycam + bloom + FXAA + GTAO). Deneysel olduğu için kendiliğinden açılmaz: `?gpu=1` oturumluk, Ayarlar'daki "WebGPU (deneysel)" kalıcı (`efa-hangar-gpu`), `?gpu=0` kapatır; açılamazsa canvas tazelenip WebGL'e düşer. WebGPU modülü dinamik import (ayrı chunk ~160 KB gz), WebGL yolu ikinci three build'ini yüklemez. Node yolunda GLSL çalışmaz: `Sky` yerine `SkyMesh` (`opts.sky` fabrikası); su, bayrak ve instanced çimen hareketi küçük vertex tamponlarının tahsis yapmadan CPU'da güncellenmesiyle korunur. GTAO normal hedefi için point, line ve sprite geometrilerine açık normal özniteliği verilir. `bakeEnv(renderer, scene, Gen)` PMREM sınıfını yoldan alır. Gerçek Chrome/Metal doğrulamasında ana ekran ve kıyı uçuşu 60 FPS, oyun kaynaklı konsol hatası ve TSL normal uyarısı olmadan çalıştı.
