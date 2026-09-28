# Drone Hangar - Uctan Uca Urun Analizi

**Tarih:** 2026-09-28
**Incelenen kaynak:** `9b9ccf2`
**Kanıt seviyesi:** Kod, Node testleri ve uretim derlemesi incelendi. Gercek PS kolu, gercek mobil cihaz, uzun sureli performans ve gercek tarayici WebGPU denemesi bu belgenin kaniti degildir.

## 1. Yonetici Ozeti

Drone Hangar, tarayicida calisan ve uc farkli urun yuzeyini ayni uygulamada birlestiren bir Three.js/Vite uygulamasidir:

1. **Drone Akademisi:** Altı pistte 36 ders/gorev, yerel ilerleme, brifing, geri sayim, hedef takibi, sonuc karti ve hayalet tekrar.
2. **Sosyal ucus:** Serbest ucus odalari, ayni odadaki pilot pozlari, sunucu zamanli gorev skorlari, gunluk gorev ve takim savasi.
3. **IHA-IDA operasyonlari:** Otonom kiyi gorevi ile ayri bir Operasyon Masasi; bir IHA ve iki IDA icin rota, bekleme, acil durus ve yerel senaryo yonetimi.

Kodun cekirdegi iyi ayrilmis saf modullerden olusur; fizik, hedefler, otonomi, rota editoru, takim maci ve saklama katmanlari Node testleriyle anlamli sekilde korunur. Buna karsin kullanici deneyimi ve dokumantasyon, bu uc urun yuzeyini tek bir net amaca baglamaz. Ana ekrandaki arcade/oyun dili, kullanicinin PS koluyla kontrollu drone denemesi hedefiyle carpisabilir.

**Urun karari gerektiren ana konu:** Drone Hangar'in birincil vaadi "arcade FPV oyun" mu, "PS kolu ile ucus kontrolu ve gorev pratigi" mi, yoksa bunlarin net ayri modlari mi olacak? Kod temizligi ve belge yenilemesi bu karar verilmeden yapilirsa arayuz yine birbirine karisir.

## 2. Urun Siniri ve Duruşu

### Ne oldugu

- Tarayicida acilan, WebGL varsayilanli FPV/stabilize drone simulasyonu.
- Mode 2 klavye, gamepad ve dokunmatik kontrolu.
- Arcade fizik; gercekci Acro profili motor gecikmesi, batarya sag'i, kutle ve ruzgar etkisini ekler.
- Yerel ilerleme ve tekrar kaydi; hafif WebSocket cok oyunculu gorunurluk.
- Otonom IHA-IDA senaryolari ve PS kolu odakli operasyon masasi.

### Ne olmadigi

- ArduPilot SITL, MAVLink, gercek drone kumandasi veya ucus sertifikasyonu degil.
- Sunucu otoriteli drone fizigi ya da hileye dayanikli rekabet simulasyonu degil.
- Fiziksel DualSense/DualShock hissi, Bluetooth kopmasi veya WebGPU goruntu paritesi henüz kanitlanmis degil.

Bu sinir `README.md`, `CLAUDE.md` ve oyuncuya gorunen yardim metinlerinde ayni sekilde anlatilmalidir.

## 3. Sayfa ve Ekran Envanteri

| Yuzey | Giris | Amac | Ana kaynak |
|---|---|---|---|
| Ana ekran | `/` | Niyet secimi: okul, serbest, IHA-IDA, Operasyon Masasi, gunluk, arkadaslarla oynama | `index.html`, `src/main.js` |
| Ucus hazirligi | Ana ekrandan bir secim | Drone, mod, harita, oda, brifing ve ayar hazirligi | `index.html`, `src/main.js`, `src/briefing.js` |
| Canli ucus | `#flight` | Fizik, hedefler, HUD, kamera, ses, sonuc ve tekrar | `src/main.js`, `src/physics.js`, `src/goals.js` |
| Otonom panel | IHA-IDA gorevi icinde | Duraklat, devral, otonomiye ver, iptal | `src/autonomy.js`, `src/autonomy-view.js` |
| Operasyon Masasi | Ana ekrandan dogrudan | IHA + iki IDA ile manuel/hold/rota/acil durus ve senaryo | `src/operations-*.js`, `src/route-editor.js`, `src/scenarios.js` |
| Siralama | `/leaderboard.html` | Sunucudaki bitirme surelerini ve tur derecelerini gorur | `leaderboard.html`, `src/leaderboard.js` |
| Admin | `/admin.html` | Yetkili kullanici icin canli oda, olay ve IP/GeoIP raporu | `admin.html`, `src/admin.js`, `server/api.mjs` |

Uygulama klasik cok sayfali bir oyun degildir: ana ekran, hazirlik ve ucus ayni `index.html` icinde durum degistirir. Siralama ve admin ayri HTML kabuklaridir.

## 4. Oyuncu Akislari

### 4.1 Ana ekran -> hazirlik -> ucus

Ana ekrandaki secimler `prepareFlight()` veya Operasyon Masasi icin `startOperations()` cagirir.

| Secim | Baslangic davranisi | Sonuc |
|---|---|---|
| Ilk kez ucuyorum | Ilk acik okul adimini secer | Hazirlik ekranina gider |
| Serbest ucus | `free` secilir | Drone/harita serbest secilebilir |
| Gunun gorevi | Tarihten turetilmis `daily-YYYY-MM-DD` | Kilitli drone ve rota |
| Arkadaslarla oyna | `free` + oda secimi gorunur | Davet URL'si uretir |
| IHA + IDA gorevi | `autonomy-coast-response` | Kiyi, kamera dronu, iki IDA |
| Operasyon Masasi | Hazirligi atlar | Kiyi, kamera dronu, IHA + iki IDA konsolu |

Hazirlikta drone vitrini, drone secici, gorev kartlari, harita, oda/davet (yalniz arkadas akisi), brifing ve kalkis bulunur. Ayarlar sekmesinde ad, gece, gercekci Acro, ses, WebGPU, PS profili/kalibrasyonu ve kamera/ates tercihleri vardir.

### 4.2 Akademi akisi

Akademi adimi su yasam dongusunu kullanir:

`brifing -> 3-2-1 geri sayim -> padde disarmed baslangic -> ARM -> hedefler -> padde inis + DISARM -> degerlendirme -> tekrar / sonraki adim`

Hedef turleri `src/goals.js` tarafindan degerlendirilir: yonlu kapi gecisi, hover, irtifa, heading, hiz, pad, pil degisimi, dalga, tur ve kargo. Akademi sonucunda yerel degerlendirme olusur; 70/100 alti akademi denemesi basarisiz sayilir. Kazanma yerel ilerlemeye yazilir; uygun kosuda hayalet kaydi ve sunucuya sure sonucu gider.

### 4.3 Serbest, oda ve arkadas akisi

`free`, hedef/timer/ilerleme zorunlulugu olmayan serbest calismadir. Harita ruzgari burada etkin olur. Oda listesi su an `hangar`, `training`, `team`, `race`, `cine`, `lr`, `indoor` odalarini sunar. Davet URL'si yalniz oda ve gorunen adi tasir; secili gorev, drone, harita veya ayarlari tasimaz.

### 4.4 Takim savasi

Takim odasi iki pilotla mac baslatir. Sunucu taraf dagilimi, can, skor, dusme, respawn ve mac saatinin sahibidir. Istemci vurus iddiasi yollar; sunucu menzil, atis ritmi, taraf ve canlilik kosullarini dogrular. Takim modu diger serbest/campaign akislardan ayridir; sonuc normal sonuc kartinda gosterilir.

### 4.5 Otonom IHA-IDA gorevi

Otonomi gorevi `READY -> AIR_SEARCH -> DETECTED -> SEA_DISPATCH -> JOINT_VERIFY -> terminal` durum makinesiyle calisir. IHA kiyi boyunca arar, yeterli bataryali en uygun IDA sevk edilir. Operator IHA veya IDA'yi devralabilir, tekrar otonomiye verebilir, duraklatabilir veya iptal edebilir. Bu sonuc olay defterine yazilir ama ilerleme, hayalet veya siralamaya girmez.

### 4.6 Operasyon Masasi

Operasyon Masasi otonom gorevden ayri bir calisma alanidir. Sabit filo `iha-1`, `ida-1`, `ida-2` araclarindan olusur. Secili arac manuel olur; digerleri guvenli beklemeye alinir. Rota, taktik haritadan cizilir; senaryolar yalniz tarayici localStorage'inda saklanir. L2+R2'nin 700 ms tutulmasi kilitli acil durus uygular. Bu yuzey bir oyun maci veya siralama akisi degildir.

## 5. Icerik Envanteri

### 5.1 Haritalar ve platformlar

- **6 harita:** Depo sahasi, Pist, Kiyi, Sanayi kenti, Kapali hangar, Orman.
- **10 hava platformu:** Katalog `src/catalog.js` icindedir; her biri boyut, sinif, hover endurance ve hiz bandi tasir.
- **Yuzey araclari:** Otonomi/Operasyon Masasi icin IHA + iki IDA modeli.
- **Varliklar:** Prosedurel ilk gorunumun ardindan GLB props ve agaclar tembel yuklenir. Masaustu ile mobil lite modu farkli gorsel yogunluk kullanir.

### 5.2 Gorunur ana kampanya

`TRACKS`, her biri alti adimdan olusan **6 pist** ve toplam **36 operasyon** icerir:

| Pist | Acilma | Amac |
|---|---|---|
| Ucus Okulu | Baslangicta acik | Hover, kapi, ruzgar, dar gecit, Acro, gece |
| Manuel gaz | `school-night` sonrasi | Gaz, irtifa, heading, kare rota, kontrollu inis |
| Acro kontrol | `manual-check` sonrasi | Rate, pitch, roll, yaw ve hiz |
| Cevre yonetimi | `acro-check` sonrasi | Ruzgar, turbulans, dar alan, gece |
| Ileri parkur | `env-check` sonrasi | Dort temel + iki ileri yaris |
| Gorev | `manual-check` sonrasi | Kesif, arama-kurtarma, menzil, kargo, hassas inis, denetim |

Her pistte siradaki basamak onceki basamak kazanilinca acilir. Once kazanilmis bir basamak yeni surumde tekrar kilitlenmez.

### 5.3 Ozel ve eski icerik

- **Gunluk gorev:** UTC tarihinden deterministik turetilir; kilitli drone, harita, 7-9 kapi, olasi hover, ruzgar/gece ve ayri siralama kullanir.
- **Legacy combat:** Devriye, dalga, arena ve boss tanimlari kodda korunur ancak normal ana akisin `TRACKS`/gorev kartlarinda gorunmez.
- **Takim savasi:** Oda tabanli, sunucu otoriteli ayri mac modu.
- **Serbest Antrenman:** `training` odasi, `FREE` ile ayni botsuz ve atessiz serbest calismadir. Oda adi ve aciklamasi bu davranisla hizalidir.

## 6. Kontrol ve Cihaz Gercekligi

### Mode 2 esleme

- Sol stick: yaw + gaz.
- Sag stick: roll + pitch.
- Klavye: W/S, A/D, oklar/IJKL, Space, T, C, R, H, M ve cift Esc.
- Gamepad: X ARM, Circle reset, Triangle mod, Square kamera, R1 ates, R2 uygun profilde punch, L1/R1 arac secimi, Options yardim.
- Mobil: iki sanal stick, ates, ARM ve menu.

PS kolu icin uc tepki profili ve Gamepad API kalibrasyonu vardir. Kalibrasyon eksen merkezi ile min/max hareketi kaydeder. Otomatik testler eksen normalizasyonu, deadzone, profil ve emergency stop matematiklerini kapsar; fiziksel kol hissi, USB/Bluetooth davranisi ve kullaniciya uygun rate/kalibrasyon henüz insan deneyi gerektirir.

**Urun etkisi:** PS kolu ile drone deneme hedefleniyorsa ana ekranda "hangi drone ile test ediyorum?", "kol bagli mi?", "hangi profil/kalibrasyon etkin?" sorulari oyun kartlarindan daha gorunur olmalidir.

## 7. Teknik Mimari ve Veri Akisi

### 7.1 Istemci

`src/main.js` kompozisyon kokudur: ekran gecisleri, render dongusu, fizigi baslatma, HUD, ses, network ve sonuc akisini birlestirir. Alan mantigi cogunlukla saf modullerdedir:

| Alan | Ana moduller |
|---|---|
| Quad fizik ve carpismalar | `physics.js`, `collide.js`, `simulation-clock.js` |
| Girdi | `input.js`, `controls.js`, `loadout-selection.js` |
| Gorev ve ilerleme | `missions.js`, `curriculum.js`, `goals.js`, `progress.js`, `assessment.js`, `countdown.js` |
| Dunya ve render | `world.js`, `models.js`, `ambient.js`, `props.js`, `trees.js`, `gfx.js`, `post.js` |
| Ses | `sfx.js`, `motor-voice.js`, `ambience.js` |
| Tekrar/gunluk | `ghost.js`, `daily.js` |
| Otonomi/operasyon | `autonomy.js`, `autopilot.js`, `surface.js`, `operations-*.js`, `route-editor.js`, `scenarios.js` |
| Cok oyunculu | `net.js`, `team.js` |

Varsayilan render WebGL'dir. Deneysel WebGPU, dinamik import edilir; basarisiz olursa WebGL'e geri doner. Hangar arka plan vitrini ayri bir Three.js renderer kullanir.

### 7.2 Sunucu

Node HTTP + `ws` sunucusu su sorumluluklari tasir:

| Sorumluluk | Kaynak | Not |
|---|---|---|
| Statik dosya ve WebSocket upgrade | `server/index.mjs` | HTML revalidate, hashli asset uzun cache |
| Oda, pose, sonuc | `server/rooms.mjs` | Oda kapasitesi 16; sonuc suresi sunucu saatinden |
| Takim maci | `server/team.mjs` | Vurus/saglik/skor/respawn sunucu otoriteli |
| Skor, olay, paylasilan tekrar | `server/store.mjs` | JSON veri; sinirli gecmis |
| API | `server/api.mjs` | Siralama, admin, ghost paylasimi |
| IP/GeoIP | `server/geo.mjs` | X-Forwarded-For oncelikli |

Fizik istemci otoritelidir. Sunucu, normal serbest/campaign pozlarini anti-cheat fizigiyle dogrulamaz. Ranked sonuc icin istemcinin gonderdigi sure yerine eslesen start/result zamanini kullanir; bu daha dar bir guven siniridir.

### 7.3 Kalicilik

| Veri | Yer | Kapsam |
|---|---|---|
| Kampanya ilerleme/best/bestLap | `localStorage`, `efa-hangar-ops-v1` | Tarayici/cihaz yerel |
| Hayalet | `localStorage`, `efa-hangar-ghost-v1:*` | Yerel; secili tekrarlar |
| Kumanda kalibrasyonu | `localStorage` | Tarayici/cihaz yerel |
| Operasyon senaryolari | `localStorage`, `efa-hangar-operations-v1` | En cok 20 yerel kayit |
| Skor, olay, ghost paylasimi | Sunucu `server/data/` | Bind mount ile kalici olmali |

Bu tablo oyuncu gizlilik metni icin temel olmalidir: gorunen ad, oda, drone, IP/GeoIP, olay ve kamuya acik paylasilan tekrar verisinin ne oldugu aciklanmalidir.

## 8. Dogrulama Durumu

### Kanitli otomasyon

- `npm test`: **273/273** Node testi gecti.
- `npm run build`: Vite production derlemesi gecti.
- Kapsam: fizik, input, kampanya/goal, gunluk, oda/sonuc, takim, otonomi, Operasyon Masasi, rota, senaryo, asset, ortam ve ses davranislari.

### Henuz kanitlanmamis veya eksik

- Gercek DualSense/DualShock USB ve Bluetooth denemesi.
- Mobil tarayici dokunmatik akisi ve responsive ekran denetimi.
- Gercek WebGL/WebGPU goruntu paritesi, browser console ve performans.
- 15 dakikalik bellek/performance profili.
- Container baslatma, veri mount, restart kaliciligi, proxy/TLS ve rollback provasi.
- Gercek tarayici E2E/erisebilirlik testi.

Bu ayrim, "test gecti" ifadesinin fiziksel kumanda veya canli ortam kaniti gibi kullanilmamasini saglar.

## 9. Kod ve Urun Toparlama Icın Bulgu Listesi

### P0 - Davranis ve guven

1. **Cozuldu: hazirliktaki drone/harita secimi kalkista tekrar eziliyordu.** `startFlight()` artik hazirlikla ayni `resolveOperationLoadout()` kuralini kullanir; yalniz acik kilitler secimi degistirir.
2. **Cozuldu: Bot Antrenmani metni davranisla uyusmuyordu.** `training` odasi, mevcut botsuz/atessiz davranisa uygun olarak "Serbest Antrenman" adini tasir.
3. **Cozuldu: oda derin baglantisi etkinligi secmiyordu.** `roomOperation()` oda URL'sini ilgili acik etkinlige esler; kilitli bir etkinlikte kullanicinin mevcut acik secimini korur.
4. **Admin kimligi query parametresinden gecer.** Anahtar URL, browser gecmisi ve log yuzeyine yazilabilir. Public repo/canli sonrasi admin oturumu daha guvenli bir mekanizmaya tasinmalidir.
5. **Cozuldu: serbest calismada ates politikasi iki farkli yerde uyusmuyordu.** HUD ve ates girdisi artik `op.fire === true` kuraliyla birlikte kontrol edilir; serbest calisma silahsizdir.

### P1 - Urun deneyimi

1. Ana ekranin "oyun" dili ile PS kolu test/egitim hedefi ayristirilmalidir. Ilk ekran, test ucusu ile oyun/yarisi ayni agirlikta sunmamalidir.
2. "Serbest calisma", "Takim Savasi", "Gunluk Gorev", "Otonom Operasyon" ve "Operasyon Masasi" ayri niyetlerdir; her biri icin acik baslangic, kontrol, sonuc ve veri etkisi yazilmalidir.
3. Otonom panel mobilde menu arkasinda kalir; ilk kullanim yonlendirmesi gerektirir.
4. Operasyon Masasi masaustu/gamepad odaklidir. Klavye/dokunmatik kullanicisi rota cizebilse de manuel arac kontrolu beklenen seviyede degildir; UI bunu baslangicta aciklamalidir.
5. Davet URL'si oda disinda paylasilan deneyimi anlatmaz. Gercek birlikte gorev tasarlanacaksa op/map/loadout eslemesi ayri bir sozlesme ister.

### P1 - Dokumantasyon

1. README ve CLAUDE envanteri, oyuncu rehberi, gizlilik/veri notu, credits, katki/guvenlik ve sanitized dagitim runbook'u bu analiz sonrasi eklendi veya guncellendi.
2. Kamuya acik destek/iletisim kanali, yasal veri sorumlusu ve kesin veri saklama/silme politikasi hala proje sahibi karari gerektirir. Kod MIT Lisansi ile sunulur; varlik kosullari ayri tutulur.
3. IHA-IDA planlari ve Academy delivery kaydi tarihsel durumla isaretlenmelidir; guncel davranisin kaynagi bu belge, README ve koddur.

### P2 - Kalite ve isletim

1. Gercek browser E2E, mobile, GPU/performance ve container kalicilik testleri yoktur.
2. Public API/ghost paylasimi icin rate limit, gozlemlenebilirlik, yedekleme ve abuse sinirlari belgelenmemistir.
3. Asset sayisi/attribution anlatimi belirsizdir; Poly Haven ve Kenney kaynaklari bir Credits/Attribution belgesinde toplanmalidir.
4. Public sayfalarda aciklama, canonical/OG metadata, Help/Privacy/Credits baglantilari ve admin noindex politikasi yoktur.

## 10. Onerilen Toparlama Sirasi

1. **Urun karari:** Birincil girisi "PS kolu ile test ucusu" olarak netlestir; oyun/yarisi ikincil bir alan olarak mi tutacagini karar ver.
2. **P0 kalan kod/guvenlik:** Admin kimligini URL yerine daha guvenli bir oturum mekanizmasina tasimayi planla.
3. **Oyuncu akisi:** Ana ekran, hazirlik, HUD ve sonuc dilini secilen urun konumuna gore sadeleştir.
4. **Dokumantasyonun kalan kararları:** Destek kanali, yasal veri sorumlusu ve kesin veri saklama/silme politikasi.
5. **Kanit paketi:** Gercek PS kolu, mobil, WebGL/WebGPU, uzun kosu ve staging/canli smoke kontrol listesi.
6. **Yayin:** Kod + belge + kanit ayni release kaydinda; acik sinirlar saklanmadan canliya alinmali.

## 11. Sonuc

Drone Hangar teknik olarak zengin, ancak urun dili tek bir deneyim etrafinda toplanmamis bir platformdur. Bir sonraki turda once "test/egitim" ile "arcade oyun" yuzeyinin hiyerarsisi belirlenmeli; sonra gercek davranis, metin ve belgeler ayni urun sozlesmesine cekilmelidir. Bu belge, o calismanin baslangic envanteridir.
