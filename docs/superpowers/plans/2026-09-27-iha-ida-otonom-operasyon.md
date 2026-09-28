# İHA–İDA Otonom Operasyon Implementation Plan

> Historical implementation plan. Do not treat its task list as pending work; consult `docs/URUN-ANALIZI.md` and the source code for the current state.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drone Hangar'a tek operatörün tarayıcıdan hemen kullanabileceği, İHA'nın keşif yaptığı ve seçilen İDA'nın olaya otonom müdahale ettiği ilk ortak görev akışını eklemek.

**Architecture:** Görev kuralları ve araç seçimi DOM/Three.js'den bağımsız saf bir durum makinesinde tutulur. İHA mevcut uçuş fiziğini, İDA ayrı ve küçük bir su üstü fizik modülünü kullanır; ortak rota takipçisi ikisine de hedef komutu üretir. `main.js` bu modülleri mevcut oyun döngüsüne bağlayan adaptör, mevcut kıyı dünyası ve sonuç ekranı ise görsel kabuk olur.

**Tech Stack:** JavaScript ES modules, Node `node:test`, Three.js, Vite, mevcut WebSocket/Node sunucusu.

**Spec:** `docs/superpowers/specs/2026-09-27-iha-ida-otonom-operasyon-design.md`

## Global Constraints

- İlk sürüm tek operatörlü ve bütünüyle Drone Hangar içinde çalışır; SITL, Webots ve MAVLink çalışma zamanı bağımlılığı eklenmez.
- Mevcut Azure dağıtımı tek container olarak kalır ve masaüstü ile mobil tarayıcıyı destekler.
- Operasyon kimliği `autonomy-coast-response`, görünen adı `Kıyı Gözetleme ve Müdahale` olur.
- Görev aşamaları `READY → AIR_SEARCH → DETECTED → SEA_DISPATCH → JOINT_VERIFY → COMPLETE`; terminal hata durumları `ABORTED` ve `FAILED` olur.
- Otonomi mantığı `main.js` içine gömülmez; saf modüller duvar saati, DOM, ağ ve Three.js bağımlılığı taşımaz.
- Mevcut uçuş okulu, muharebe, yarış, görev, günlük görev ve takım modu geriye uyumlu kalır.
- İlk sürüm liderlik tablosuna otonom operasyon skoru yazmaz.
- Yeni ürün bağımlılığı eklenmez.

## Review Focus

- Aynı tespit birden fazla tikte gelirse yalnız bir İDA sevki üretilmeli; Task 1 idempotency testi bunu sabitler.
- Eşit uzaklıktaki İDA'larda seçim tekrarlar arasında değişmemeli; Task 1 kimlik-sıralı eşitlik testi bunu sabitler.
- Sekme geri geldiğinde büyük `dt` İDA'yı hedefin ötesine veya karaya fırlatmamalı; Task 2 `dt` clamp testi bunu sabitler.
- Manuel devralma ile duraklatma karıştırılmamalı: devralmada görev saati ilerler, duraklatmada ilerlemez; Task 1 kontrol testi bunu sabitler.
- Görevden çıkıp normal uçuşa dönüldüğünde İDA meshleri, rota çizgileri ve panel kalmamalı; Task 4 temizleme regresyon testi bunu sabitler.

---

### Task 1: Saf operasyon durum makinesi

**Files:**
- Create: `src/autonomy.js`
- Create: `tests/autonomy.test.js`

**Interfaces:**
- Consumes: `{ id, x, z, battery, available }[]` İDA telemetrisi ve `{ now, air, sea }` tik girdisi.
- Produces: `createAutonomyRun(op, now)`, `selectNearestSeaVehicle(vehicles, target)`, `tickAutonomy(run, input)`, `pauseAutonomy(run, paused)`, `takeControl(run, vehicleId)`, `returnToAutonomy(run, vehicleId)`, `abortAutonomy(run, reason)`, `autonomyReport(run)`.
- `tickAutonomy` mevcut `run` nesnesini günceller ve `{ events: string[] }` döndürür; `dispatch:<id>` olayı yalnız bir kez üretilebilir.

- [ ] **Step 1: Durum geçişleri ve tek-sevk davranışı için başarısız testleri yaz**

  `tests/autonomy.test.js` içinde `READY` başlangıcı, `AIR_SEARCH`, tespit yarıçapında `DETECTED`, en yakın İDA için tek `dispatch:<id>`, hedefte `JOINT_VERIFY` ve iki araç doğrulama alanındayken `COMPLETE` beklentilerini sabitle. Aynı tespit girdisini üç kez tikleyip yalnız bir dispatch olayı çıktığını doğrula.

- [ ] **Step 2: Araç seçimi ve terminal durumlar için başarısız testleri yaz**

  Bataryası yetersiz ve `available:false` araçları ele; eşit mesafede alfabetik küçük `id`yi seç; araç yoksa `FAILED` ve açık Türkçe neden; `abortAutonomy` sonrası `ABORTED`; terminal durumdan yeni geçiş olmadığını doğrula.

- [ ] **Step 3: Kontrol ve zaman davranışı için başarısız testleri yaz**

  `pauseAutonomy(run, true)` sırasında `elapsed` ilerlemediğini; manuel devralmada aşama korunurken `elapsed` ilerlediğini; `returnToAutonomy` ile yalnız istenen aracın otonoma döndüğünü; aşama zaman aşımının `FAILED` ürettiğini doğrula.

- [ ] **Step 4: Testleri çalıştır ve doğru nedenle başarısız olduklarını doğrula**

  Run: `npm test -- --test-name-pattern='autonomy|sea vehicle|manual control'`

  Expected: FAIL; `src/autonomy.js` bulunamıyor veya beklenen export'lar yok.

- [ ] **Step 5: `src/autonomy.js` içindeki minimal saf çekirdeği uygula**

  Durum nesnesi `phase`, `startedAt`, `elapsed`, `paused`, `controlledByVehicle`, `selectedSeaId`, `detectedAt`, `dispatchedAt`, `completedAt`, `reason`, `eventsSeen` alanlarını taşır. Mesafeler X/Z düzleminde hesaplanır; seçim filtresi minimum batarya değerini görev tanımından okur; eşitlik `id.localeCompare` ile çözülür.

- [ ] **Step 6: Hedefli ve tam test takımını çalıştır**

  Run: `node --test tests/autonomy.test.js && npm test`

  Expected: yeni testler ve mevcut testlerin tamamı PASS.

- [ ] **Step 7: Commit**

  ```bash
  git add src/autonomy.js tests/autonomy.test.js
  git commit -m "feat: add autonomous operation state machine"
  ```

### Task 2: İDA fiziği ve ortak rota takipçisi

**Files:**
- Create: `src/surface.js`
- Create: `src/autopilot.js`
- Create: `tests/surface.test.js`
- Create: `tests/autopilot.test.js`

**Interfaces:**
- Consumes: hedef `{ x, y?, z }`, İHA/İDA durumları ve saniye cinsinden `dt`.
- Produces: `createSurfaceState(id, x, z, heading)`, `stepSurface(state, command, spec, dt, water)`, `airCommand(state, target, spec)`, `surfaceCommand(state, target, spec)`, `routeProgress(state, target, previousDistance, dt)`.
- `stepSurface` komutu `{ throttle, steer }`, `water` ise `{ contains(x,z): boolean }` sözleşmesiyle alır; durum `x`, `z`, `heading`, `speed`, `turnRate`, `battery`, `blockedFor` taşır.

- [ ] **Step 1: İDA fizik sınırları için başarısız testleri yaz**

  Düz gazda ileri hareket, azami hız sınırı, dönüş hızı sınırı, gaz kesilince sürüklemeyle yavaşlama, bataryanın azalması ve sıfırda hareketin durmasını doğrula.

- [ ] **Step 2: Su sınırı ve büyük zaman adımı için başarısız testleri yaz**

  `contains` hedef konumu reddettiğinde son güvenli konumun korunduğunu ve `blockedFor` arttığını; `dt=5` verilse bile entegrasyonun en fazla `0.1` saniyelik alt adımlarla yapılıp hedefin ötesine sıçramadığını doğrula.

- [ ] **Step 3: Otopilot yakınsaması ve sıkışma için başarısız testleri yaz**

  `surfaceCommand` ile 60 Hz simülasyonda 120 metre uzaktaki hedefe tolerans içinde yakınsamayı; `airCommand` çıktısının mevcut `physics.step` girdisiyle İHA'yı rota noktasına yaklaştırmasını; ilerleme olmayan `routeProgress` sonucunun belirlenen sürede `stuck:true` olmasını doğrula.

- [ ] **Step 4: Testleri çalıştır ve doğru nedenle başarısız olduklarını doğrula**

  Run: `node --test tests/surface.test.js tests/autopilot.test.js`

  Expected: FAIL; yeni modüller veya export'lar yok.

- [ ] **Step 5: Minimal İDA fiziğini uygula**

  `stepSurface` hızlanma, doğrusal sürükleme, sınırlı dönüş ve batarya tüketimi uygular. Kara ihlalinde konumu geri alır ve hızı sıfırlar. `dt` içerde en çok `0.1` saniyelik alt adımlara bölünür.

- [ ] **Step 6: İki rota takip komutunu uygula**

  `surfaceCommand` başlık hatasından sınırlı steer ve mesafeden throttle üretir. `airCommand` mevcut `yawErrTo` ve yükseklik hatasını kullanarak `{ lift, r2:0, yaw, pitch, roll:0, angleMode:true }` döndürür; varış yakınında yatay komutları söndürür.

- [ ] **Step 7: Hedefli ve tam test takımını çalıştır**

  Run: `node --test tests/surface.test.js tests/autopilot.test.js && npm test`

  Expected: tüm testler PASS.

- [ ] **Step 8: Commit**

  ```bash
  git add src/surface.js src/autopilot.js tests/surface.test.js tests/autopilot.test.js
  git commit -m "feat: add USV physics and autonomous route following"
  ```

### Task 3: Görev kataloğu, kıyı operasyon verisi ve İDA görseli

**Files:**
- Modify: `src/missions.js:353-573`
- Modify: `src/models.js:178-505`
- Modify: `src/world.js:224-244,916-970,1119-1145`
- Modify: `tests/catalog.test.js`
- Modify: `tests/visual.test.js`
- Create: `tests/autonomy-mission.test.js`

**Interfaces:**
- Consumes: Task 1'in operasyon tanımında beklediği `airRoute`, `incidentCandidates`, `seaVehicles`, `detectRadius`, `verifyRadius`, `minSeaBattery`, `phaseTimeouts` alanları.
- Produces: `AUTONOMY_COAST_RESPONSE`, `makeSurfaceVehicle(spec)`, kıyı dünyasının `play.water.contains(x,z)` ve `play.seaSpawns` verileri.

- [ ] **Step 1: Görev veri sözleşmesi için başarısız test yaz**

  `opById("autonomy-coast-response")` sonucunun `kind:"autonomy"`, `map:"coast"`, en az üç İHA rota noktası, en az iki olay adayı, iki benzersiz İDA ve bütün süre/radius alanlarını taşıdığını doğrula. Görevin kilitsiz ve liderlik pistlerinden bağımsız olduğunu sabitle.

- [ ] **Step 2: Kıyı su alanı ve spawn noktaları için başarısız test yaz**

  `buildWorld` test yaklaşımını izleyerek iki spawn'ın `water.contains` içinde, kara örneklerinin dışında olduğunu; olay adaylarının hem devriye erişiminde hem su erişiminde kaldığını doğrula.

- [ ] **Step 3: İDA model sözleşmesi için başarısız test yaz**

  `makeSurfaceVehicle` sonucunun bir Three.js group olduğunu, `userData.vehicleType === "surface"`, kamera hedef noktası ve yönlendirme için `userData.rudder` taşıdığını doğrula. `tests/visual.test.js` statik regresyonuna yeni model export'unu ekle.

- [ ] **Step 4: Testleri çalıştır ve doğru nedenle başarısız olduklarını doğrula**

  Run: `node --test tests/autonomy-mission.test.js tests/catalog.test.js tests/visual.test.js`

  Expected: FAIL; görev, su alanı veya model export'u yok.

- [ ] **Step 5: Görevi ve katalog girişini uygula**

  Görevi bağımsız, kilitsiz bir operasyon kartı olarak `missions.js`te export et; mevcut `OPS` sırasını ve ilerleme kilitlerini değiştirme. Olay adayları ve rotalar kıyı haritasının güvenli koordinatlarını kullansın.

- [ ] **Step 6: Kıyı su sözleşmesini ve hafif İDA modelini uygula**

  `buildCoast` tarafından oluşturulan `play` nesnesine saf `water.contains` ve iki `seaSpawns` ekle. `makeSurfaceVehicle` mevcut materyal/geometri desenlerini kullansın; yeni GLB veya ağ varlığı ekleme.

- [ ] **Step 7: Hedefli ve tam test takımını çalıştır**

  Run: `node --test tests/autonomy-mission.test.js tests/catalog.test.js tests/visual.test.js && npm test`

  Expected: tüm testler PASS.

- [ ] **Step 8: Commit**

  ```bash
  git add src/missions.js src/models.js src/world.js tests/autonomy-mission.test.js tests/catalog.test.js tests/visual.test.js
  git commit -m "feat: add coastal UAV-USV operation assets"
  ```

### Task 4: Oyun döngüsü ve operatör paneli entegrasyonu

**Files:**
- Create: `src/autonomy-view.js`
- Create: `tests/autonomy-view.test.js`
- Modify: `src/main.js:1-40,409-452,940-1025,1090-1219,1439-1507,1690-2090`
- Modify: `src/net.js:70-79`
- Modify: `server/rooms.mjs:241-270`
- Modify: `index.html`
- Modify: `src/style.css:880-950`
- Modify: `tests/rooms.test.js`
- Modify: `tests/visual.test.js`

**Interfaces:**
- Consumes: Task 1 durum makinesi/raporu, Task 2 hareket komutları, Task 3 görev/veri/model export'ları.
- Produces: `autonomyViewModel(run, vehicles)`, `renderAutonomyPanel(root, model)`, `clearAutonomyPanel(root)`, `sendResult(..., { ranked:false })` ve `main.js` içindeki operasyon yaşam döngüsü adaptörü.

- [ ] **Step 1: Panel görünüm modeli için başarısız testleri yaz**

  Her görev aşamasının Türkçe etiketi, İHA/İDA rol-hız-batarya-otonom durumu, buton görünürlüğü ve terminal hata nedeninin `autonomyViewModel` çıktısında doğru olduğunu doğrula.

- [ ] **Step 2: Panel olayları ve temizleme için başarısız DOM-sözleşme testi yaz**

  `index.html` içinde `#autonomy-panel`, durum/araç/eylem bölgeleri; duraklat, devral, otonomiye ver ve iptal için `data-action` değerleri olduğunu doğrula. Render sonrası normal göreve geçişte `clearAutonomyPanel` paneli gizlemeli ve içerik/aktif sınıfları temizlemeli.

- [ ] **Step 3: Testleri çalıştır ve doğru nedenle başarısız olduklarını doğrula**

  Run: `node --test tests/autonomy-view.test.js tests/visual.test.js`

  Expected: FAIL; görünüm modülü ve DOM kancaları yok.

- [ ] **Step 4: Saf görünüm modelini ve ince DOM render'ını uygula**

  `autonomy-view.js` iş kuralı üretmez; sadece Task 1 durumunu kullanıcı metnine dönüştürür. Dinleyiciler `main.js`te tek kez bağlanır; her frame yeniden bağlanmaz.

- [ ] **Step 5: Otonom operasyon yaşam döngüsünü `main.js`e bağla**

  Görev başlangıcında bir İHA ve iki İDA kur; otonom tikte rotaları sür; Task 1'e telemetri ver; devralınan araçta `poll()` girdisini ilgili fiziğe yönlendir; diğer araçları otonom bırak. Duraklatmada simülasyon saatini ve tüm araçları dondur. İptal/çıkış/yeni görevde tüm İDA meshlerini, rota çizgilerini, olay işaretini ve paneli temizle.

- [ ] **Step 6: Rota, olay ve araç görsellerini ekle**

  Three.js `Line`/`LineBasicMaterial` ile planlanan rota ve gidilen izi; emissive basit işaretle olay noktasını göster. Mobil hafif modda iz örnek sayısını sınırla ve yeni gölge üretme.

- [ ] **Step 7: Sonuç kartını otonomi raporuyla genişlet**

  `showResult` otonom görevde `autonomyReport` alanlarını — toplam, tespit, sevk, müdahale süreleri, seçilen İDA ve sonuç nedeni — gösterir. Bu görevde `saveWin` atlanır. `src/net.js` içindeki `sendResult` son argüman olarak `{ ranked = true }` alır; otonom görev `ranked:false` gönderir. `server/rooms.mjs` sonucu olay defterine yine yazar fakat `ranked:false` olduğunda `recordScore` çağırmaz. `tests/rooms.test.js` hem bu davranışı hem eski çağrının varsayılan olarak sıralamalı kalmasını doğrular.

- [ ] **Step 8: Hedefli, tam ve build doğrulamasını çalıştır**

  Run: `node --test tests/autonomy-view.test.js tests/visual.test.js && npm test && npm run build`

  Expected: testlerin tamamı PASS; Vite build exit 0.

- [ ] **Step 9: Commit**

  ```bash
  git add src/autonomy-view.js tests/autonomy-view.test.js src/main.js src/net.js server/rooms.mjs index.html src/style.css tests/rooms.test.js tests/visual.test.js
  git commit -m "feat: integrate autonomous UAV-USV operation UI"
  ```

### Task 5: Uçtan uca kabul, dokümantasyon ve sürüm hazırlığı

**Files:**
- Create: `tests/autonomy-acceptance.test.js`
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `.claude/sessions.md`

**Interfaces:**
- Consumes: tamamlanmış `autonomy-coast-response` kullanıcı akışı.
- Produces: otomatik kabul testi, çalıştırma/kontrol dokümanı ve doğrulama kaydı.

- [ ] **Step 1: Saf uçtan uca görev simülasyonu testini yaz**

  Gerçek Task 1/2/3 export'larıyla 60 Hz sanal koşu yap: İHA devriyesi olayı bulsun, seçilen İDA hedefe gitsin, `JOINT_VERIFY` ve `COMPLETE` oluşsun. Aynı test ortasında İDA'yı manuel moda alıp görev saatinin ilerlediğini, sonra otonomiye verip tamamlandığını doğrulasın.

- [ ] **Step 2: Kabul testini çalıştır**

  Run: `node --test tests/autonomy-acceptance.test.js`

  Expected: PASS ve terminal aşama `COMPLETE`.

- [ ] **Step 3: README ve proje notunu güncelle**

  `README.md`e Otonom Operasyon kullanımını, kontrollerini ve ilk sürümün arcade/tek-operatör sınırını ekle. `CLAUDE.md` mimari tablosuna yeni modülleri ve SITL'in ayrı kapı olduğunu yaz; mevcut "aynı ürün değil" kararını koru.

- [ ] **Step 4: Tam otomatik doğrulamayı çalıştır**

  Run: `npm test && npm run build`

  Expected: tüm testler PASS; build exit 0; yeni dependency yok.

- [ ] **Step 5: Yerel tarayıcı kabulünü yap**

  `npm run dev -- --host 127.0.0.1` ile açıp masaüstü ve mobil viewport'ta şu zinciri doğrula: görev kartı → başlat → İHA devriye → tespit → İDA sevki → İDA'yı devral → otonomiye ver → ortak doğrulama → ayrıntılı sonuç. Konsol hatası, HUD çakışması ve görevden çıkınca kalan mesh/panel olmamalı.

- [ ] **Step 6: Oturum kaydına ölçülen sonucu ekle**

  `.claude/sessions.md` içine test sayısı, build sonucu, tarayıcı kabul sonucu ve bilinen sınırları kaydet. Azure deploy'u bu planın otomatik parçası değildir; kullanıcı deploy istediğinde mevcut operasyon prosedürü ayrı uygulanır.

- [ ] **Step 7: Commit**

  ```bash
  git add tests/autonomy-acceptance.test.js README.md CLAUDE.md .claude/sessions.md
  git commit -m "docs: verify autonomous UAV-USV operation"
  ```

## Final Verification

- [ ] `git status --short` yalnız beklenen değişiklikleri gösteriyor.
- [ ] `npm test` tam takım PASS.
- [ ] `npm run build` PASS.
- [ ] Masaüstü ve mobil kabul zinciri tamamlandı; konsol temiz.
- [ ] Mevcut `free`, okul, muharebe, yarış, görev, günlük ve takım akışlarından en az birer smoke kontrolü yapıldı.
- [ ] Branch diff'i spec ile karşılaştırıldı; kapsam dışı SITL, çok oyunculu görev editörü veya yeni bağımlılık eklenmedi.
