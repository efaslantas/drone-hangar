# Drone Hangar

Tarayıcıda FPV / stabilize drone oyunu. `drone-simulator` (ArduPilot SITL ARGE aracı) ile **aynı ürün değil** — karistirma.

## Neden ayrı repo

SITL native process + MAVLink + 20-40 s EKF settle. Telefonda "gir uç çık" ve FPV kamera üretmez. Bu proje arcade fizik + WebGL; herkes URL açıp oynar.

İleride gerçekçi mod istenirse SITL köprüsü **ayrı kapı** olur, varsayılan yol olmaz.

## Canlı (2026-09-05)

Public: `https://efa-hangar.germanywestcentral.cloudapp.azure.com/?room=hangar&name=pilot`
Sıralama: `/leaderboard.html` (görev bitince süre; 1. = en hızlı).
Admin: `/admin.html?key=...` — canlı giriş/çıkış + kazanç/kayıp akışı, IP + GeoIP konum (offline, `geoip-lite`; Caddy arkasında `X-Forwarded-For` okunuyor) + IP raporu (olay defterinin tamamı üzerinden: farklı IP/pilot sayısı, ülke dağılımı, IP başına bağlantı/görev/galibiyet ve ilk-son görülme). Anahtar sunucu konsolunda (`[admin] anahtar: ...`) veya `server/data/admin.key`; `ADMIN_KEY` env ile sabitlenebilir.
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

4 bağımsız pist (`TRACKS` in `src/missions.js`): Uçuş Okulu (6 ders) · Muharebe (5) · Yarış (4) · Görev (4). Pist içi kilit bir öncekinin kaydıyla açılır; diğer üç pist okulun `school` (Kapılar) dersiyle açılır (`track.requires`). Kazanılmış op asla yeniden kilitlenmez (`isOpOpen`) — eski oyuncuların `done` kayıtları geçerli, eski id'ler (`school/patrol/waves/race/recon/final`) değişmedi. `OPS` düz liste (sıralama/leaderboard). Op alanları: `night`/`real` (harita gecesi / gerçekçi fizik sabitlenir), `botDrone`/`botHp` (boss), school adımı `pad` (pil değişimi için pade dokun). Kargo (`kind: "cargo"`, `parcels[{name, from, toName, to}]`, `payload`): `goals.atPoint` ile alçak+yavaş alış/bırakış, taşırken fizik `physics.withPayload(spec, payload)` profiliyle koşar (itki ↓, endurance ↓, tepki ↓), çarpınca koli alış noktasına döner (`run.dropped`), hepsi teslim + pade iniş = kazanç. Her görev 3-2-1 geri sayımla başlar (`countdown` varsayılanı 3; botlar da GO'yu bekler). Kilit `src/progress.js` (`efa-hangar-ops-v1`; `best` + yarış için `bestLap`). Kapı/hedef/pad `src/goals.js`. Görev bitince yerel sonuç kartı (`#result-card`: süre, kişisel rekor farkı, tur bölümleri, "Tekrarı izle"); yarışta HUD'da tur/son/en iyi satırı. Tur bölümleri sunucuya da gider (`laps`), sunucu kendi ölçtüğü süreyle tutarlıysa `bestLap` olarak sıralamaya yazar. Botlar sınıf karışık (dalga: racer/freestyle/toothpick; serbest: + cinewhoop/seven; op `botDrone` hepsini tek gövdeye sabitler). HUD sağ kutuda FPS sayacı. **Günün görevi** (`src/daily.js`): `daily-YYYY-MM-DD` (UTC gün) id'sinden seed'li school-kind rota — harita, kilitli gövde, 7-9 kapı (+ bazen hover), rüzgâr/gece; `opById` sentezler, pist dışı ve hep açık; sıralama sayfası bugünü en üste, eski günlerden en fazla 3'ünü sona koyar (`sortBoards`); eski günlerin hayaletleri açılışta silinir (`pruneDailyGhosts`).
Ayrıca iki kilitsiz oda: **Serbest** (hangar) ve **Bot Antrenmanı** (training) — ikisi de aynı `free` operasyonu kullanır (bot deathmatch, hedef yok), sadece lobi/oda listesinde ayrı görünürler (`src/rooms.js`, `ROOM_OP`).
**Takım savaşı** (`team` ve `team-*` odaları, op `TEAM`, kind `team`, `run` null): sunucu otoritesi `server/team.mjs` — taraf dağıtımı (dengeli, eşitlikte kırmızı), HP 6, `hit` iddiası menzil ≤190 m + 60 ms kadans + taraf + canlılık kontrolünden geçerse sayılır, düşen 4 sn sonra `respawn`, 2 pilotla 3 dk maç / 20 sayı / 8 sn ara (500 ms `tickTeams`). İstemci (`src/team.js` saf yardımcılar): rakip pilotlar yerel atış testinde hedef, `net.sendHit`; `state`'e `fire` bayrağı → rakiplerin izleri görsel (`visShots`, vuruş testine girmez); HUD skor satırı/saat, `#flight.has-result` maç kartı; taraflar `TEAM_SPAWN`'dan kalkar; isim etiketi takım rengi (`makeNametag(text, color)`).

## Mimari

| Dosya | Ne |
|---|---|
| `src/physics.js` | Arcade quad. Three.js yok. `play.drain` / `play.wind` / `play.real` (acro: motor lag, sag, mass, `thr/uy` yok). Angle dokunulmaz. Pil tüketimi govdenin kendi hover noktasina goreceli (`endurance` katalog alani, yuk-orantili tuketim egrisi) — sabit oran degil. |
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
| `server/api.mjs` | `/api/leaderboard` (açık), `/api/admin/state` (anahtarlı) |
| `server/geo.mjs` | İstemci IP'si (X-Forwarded-For öncelikli) + `geoip-lite` ile ülke/şehir |

Fizik istemcide. Sunucu oda + pose yayını, artık giriş/çıkış/görev sonucu da (`t:"result"`) kaydediyor.

Görünüş (bodycam): `src/post.js` fisheye + CA + grain + teal grade. Kamera `camLag` ile gövdeye yaylı, throttle titreşimi. HUD Axon/GoPro REC, GPS Şile.

**Render yolu (2026-09-11):** `src/gfx.js` seçer — varsayılan klasik WebGL (`post.js` EffectComposer); istenirse WebGPU (`src/gfx-webgpu.js`, `three/webgpu` WebGPURenderer + TSL ile yeniden yazılmış bodycam + bloom + FXAA + GTAO). Deneysel olduğu için kendiliğinden açılmaz: `?gpu=1` oturumluk, Ayarlar'daki "WebGPU (deneysel)" kalıcı (`efa-hangar-gpu`), `?gpu=0` kapatır; açılamazsa canvas tazelenip WebGL'e düşer. WebGPU modülü dinamik import (ayrı chunk ~160 KB gz), WebGL yolu ikinci three build'ini yüklemez. Node yolunda GLSL çalışmaz: `Sky` yerine `SkyMesh` (`opts.sky` fabrikası); su, bayrak ve instanced çimen hareketi küçük vertex tamponlarının tahsis yapmadan CPU'da güncellenmesiyle korunur. GTAO normal hedefi için point, line ve sprite geometrilerine açık normal özniteliği verilir. `bakeEnv(renderer, scene, Gen)` PMREM sınıfını yoldan alır. Gerçek Chrome/Metal doğrulamasında ana ekran ve kıyı uçuşu 60 FPS, oyun kaynaklı konsol hatası ve TSL normal uyarısı olmadan çalıştı.
