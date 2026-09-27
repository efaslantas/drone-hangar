# İHA–İDA Operasyon Masası Tasarımı

**Tarih:** 2026-09-27  
**Durum:** Kullanıcı tarafından konuşma içinde onaylanan tasarımın yazılı sürümü

## Amaç

Drone Hangar içinde, masaüstü ekranda ve tek bir PlayStation koluyla bir İHA ile iki İDA'nın yönetilebildiği kişisel bir simülasyon çalışma alanı oluşturmak. Operasyon Masası ilk sürümde serbest kullanım içindir: süre, skor, otomatik görev akışı veya zorunlu hedef yoktur. Operatör araçları sürer, rotalar çizer, bu rotaları uygular ve çalışma düzenini senaryo olarak kaydedip yeniden yükler.

Mevcut `AUTONOMY_COAST_RESPONSE` görevi korunur; Operasyon Masası ondan ayrı bir oyun modu olur. Görev durum makinesi, sıralama ve kampanya ilerlemesi yeni çalışma alanına taşınmaz.

## Kullanıcı ve kullanım koşulları

- Birincil kullanıcı ürün sahibidir; ilk sürüm kişisel ve yereldir.
- Birincil cihaz geniş masaüstü veya laptop ekranıdır.
- PlayStation/DualSense/DualShock kolu temel kumanda aracıdır.
- Telefon yalnız temel görüntüleme ve erişim için desteklenir; tam konsol düzeni ve hassas rota düzenleme telefon kabul ölçütü değildir.
- Gerçek MAVLink, ArduPilot SITL, bulut senkronizasyonu ve çok oyunculu ortak kumanda bu sürümün dışındadır.

## Kullanıcı deneyimi

Ana sayfaya **Operasyon Masası** adlı ayrı bir giriş eklenir. Bu giriş çalışma alanını doğrudan kıyı haritasında açar. Operatör klasik uçuş hazırlığı ekranından görev seçmek zorunda kalmaz.

Masaüstü düzeni dört bölgeden oluşur:

```text
┌ Araç filosu ─┬──────── Ana seçili araç kamerası ────────┬ Taktik harita ┐
│ İHA / İDA-1  │ FPV veya chase                            │ rota / hedef  │
│ İDA-2        │                                          │ araç izleri   │
├──────────────┴──────────────────────────────────────────┴──────────────┤
│ PS kontrol durumu · seçili araç · kamera · rota · kayıt · acil dur     │
└────────────────────────────────────────────────────────────────────────┘
```

### Araç filosu

Sol panelde üç araç kartı bulunur: `İHA-1`, `İDA-1`, `İDA-2`. Her kart şunları gösterir:

- araç türü ve kimliği;
- kontrol durumu: operatörde, rota takipte veya güvenli beklemede;
- hız, batarya ve bağlantı/sağlık;
- seçili araç vurgusu;
- küçük kamera önizlemesi veya düşük maliyetli canlı durum görüntüsü.

Kart tıklaması aracı seçer. PS kolundaki `L1` ve `R1` araçlar arasında geri/ileri geçer. Aynı anda yalnız bir araç doğrudan operatör komutu alır.

### Ana kamera

Orta panel seçili aracın ana görüntüsüdür. İHA için mevcut FPV/chase kamera sistemi kullanılır. İDA için teknenin arkasından takip ve güverte/FPV olmak üzere iki kamera kullanılır. `□` kamera görünümünü değiştirir.

Ana kamera değiştiğinde fizik veya rota durumu sıfırlanmaz. Kamera seçimi ile araç kontrol seçimi aynı tutulur; operatör hangi aracı gördüğünü ve sürdüğünü karıştırmaz.

### Taktik harita ve rota editörü

Sağ panel kıyı alanının üstten görünümüdür. Harita üzerinde kıyı çizgisi, gezilebilir su alanı, kara sınırı, üç aracın konumu/yönü, mevcut izleri ve waypoint rotaları gösterilir.

Akış:

1. Operatör bir araç seçer.
2. **Rota düzenle** modunu açar.
3. Haritaya tıklayarak sıralı waypoint'ler ekler.
4. Noktaları silebilir veya rotayı temizleyebilir.
5. **Rotayı uygula** komutuyla seçili araç rota takibine geçer.
6. Araç kartını seçmek veya PS kolundan doğrudan komut vermek rota takibini keser ve kontrolü operatöre geçirir.

İHA waypoint'leri güvenli varsayılan irtifa taşır; İDA waypoint'leri yalnız gezilebilir suya kabul edilir. Kara üzerindeki İDA noktası veya harita dışındaki nokta reddedilir ve panelde kısa, açık bir neden gösterilir.

### Alt kontrol şeridi

Alt şerit şu bilgileri sürekli görünür tutar:

- bağlı kolun adı ve bağlantı durumu;
- seçili araç;
- geçerli kontrol eşlemesi;
- kamera modu;
- rota durumu;
- senaryo kaydet/yükle;
- acil durdurma.

## PS kol eşlemesi

Ortak kontroller:

| Girdi | İşlev |
|---|---|
| `L1` / `R1` | Önceki / sonraki aracı seç |
| `□` | Seçili aracın kamera görünümünü değiştir |
| `Options` | Operasyon yardımını aç/kapat |
| `○` | Seçili aracı güvenli başlangıç konumuna sıfırla |
| `L2 + R2` basılı | Acil durdurmayı onayla |

İHA seçiliyken mevcut Mode 2 davranışı korunur:

- sol stick: gaz + yaw;
- sağ stick: pitch + roll;
- `✕`: ARM/DISARM;
- `△`: Angle/Acro (güvenlik kuralları izin verdiğinde).

İDA seçiliyken:

- sol stick dikey: ileri/geri güç;
- sağ stick yatay: dümen;
- `✕`: motor güvenliği aç/kapat;
- `△`: hız profili (hassas/seyir).

Seçili olmayan araç doğrudan kumanda almaz. Manuel bırakıldığında güvenli bekleme durumuna geçer: İDA hızı sıfıra yaklaşır; İHA Angle modunda konum/irtifa tutar. İHA için konum tutma mevcut arcade fizik üzerinde deterministik bir bekleme kumandasıdır, gerçek uçuş kontrolcüsü iddiası taşımaz.

## Simülasyon alanı

Kıyı haritasındaki kara görünümü korunur, deniz operasyon alanı kıyıdan yaklaşık 80 metre açığa genişletilir. İDA'lar kıyıdan 25–30 metre açıkta, sahile paralel devriye düzeninde başlar. Su fiziği ve rota doğrulaması aynı gezilebilir su sözleşmesini kullanır; görsel deniz yüzeyi ile fizik sınırı çelişmez.

Başlangıç filosu:

- `İHA-1`: kıyı üssünde veya güvenli kalkış irtifasında;
- `İDA-1`: batı açık deniz başlangıcı;
- `İDA-2`: doğu açık deniz başlangıcı.

## Senaryo kaydetme ve yükleme

İlk sürümde senaryolar tarayıcı `localStorage` alanında saklanır. Kayıt şunları içerir:

- kullanıcı tarafından verilen senaryo adı;
- harita kimliği ve desteklenen çevre ayarları;
- araç başlangıç konumları ve yönleri;
- her aracın waypoint rotası;
- seçili kamera tercihleri.

Canlı batarya, hız, anlık hata ve geçici kontrol durumu kaydedilmez. Yükleme yeni bir serbest oturum kurar; çalışan oturumun ortasına fizik durumu enjekte edilmez.

Kayıt biçimi sürümlü olur. Bozuk veya bilinmeyen sürümlü kayıt kullanıcıya açıklanır ve çalışma alanını bozmaz. Silme işlemi açık kullanıcı eylemi ister.

## Yazılım sınırları

Yeni işlevler mevcut büyük `main.js` dosyasına tek parça halinde eklenmez. Aşağıdaki sınırlar kullanılır:

- `src/operations-console.js`: araç seçimi, kontrol sahipliği, güvenli bekleme, acil durdurma ve konsol durum modeli;
- `src/route-editor.js`: waypoint ekleme/silme, sınır doğrulama ve rota durum modeli;
- `src/scenarios.js`: sürümlü yerel kayıt, yükleme ve doğrulama;
- `src/operations-view.js`: konsol görünüm modeli ve DOM güncellemeleri;
- `src/main.js`: Three.js sahnesi, fizik döngüsü ve bu modüllerin ince entegrasyonu;
- `src/input.js`: ortak PS kol olaylarına araç geçişi ve acil dur kombinasyonunu ekleyen, geriye uyumlu giriş sözleşmesi.

Mevcut `surface.js`, `autopilot.js`, `models.js` ve kıyı `world.js` davranışları yeniden kullanılır. Otomatik görev durum makinesi Operasyon Masası'nın bağımlılığı olmaz.

## Durum akışı

Her araç şu kontrol durumlarından birindedir:

- `MANUAL`: PS kolundan canlı komut alır;
- `HOLD`: güvenli bekler;
- `ROUTE`: kaydedilmiş waypoint rotasını takip eder;
- `STOPPED`: acil durdurma nedeniyle hareket komutu kabul etmez.

Araç seçmek seçilen aracı `MANUAL`, önceki manuel aracı `HOLD` yapar. **Rotayı uygula** seçili aracı `ROUTE` yapar. Stick girdisi belirgin eşiği aşarsa rota iptal edilip `MANUAL` durumuna geçilir. Acil durdurma tüm araçları `STOPPED` yapar. Operatör açık bir **Sistemi yeniden etkinleştir** komutu vermeden araçlar tekrar hareket etmez.

## Hata ve güvenlik davranışı

- Kol bağlantısı kesilirse seçili araç `HOLD` durumuna geçer.
- İDA rotası su dışına çıkamaz; geçersiz waypoint eklenmez.
- İHA rotası dünya sınırı ve güvenli irtifa aralığı dışında kalamaz.
- Rota takibinde ilerleme yoksa araç `HOLD` durumuna geçer ve sıkışma nedeni gösterilir.
- Bir aracın bataryası biterse yalnız o araç durur; diğer araçlar çalışmaya devam eder.
- Acil durdurma görsel olarak kalıcı ve belirgin olur; yanlışlıkla tek tuşla kaldırılamaz.
- Senaryo yükleme hatası mevcut oturumu değiştirmez.

## Test ve kabul ölçütleri

### Saf birim testleri

- araç seçimi yalnız bir `MANUAL` sahibi üretir;
- L1/R1 geçişi üç araç arasında deterministik döner;
- manuel stick girdisi rota takibini keser;
- kol kopması `HOLD` üretir;
- acil durdurma tüm araçları kilitler ve açık yeniden etkinleştirme ister;
- İDA waypoint'i su dışında reddedilir;
- İHA waypoint'i sınır/irtifa dışında reddedilir;
- senaryo kayıtları sürümle yüklenir, bozuk kayıt oturumu değiştirmez.

### Entegrasyon testleri

- PS kol girdisi seçili araç tipine göre doğru komuta çevrilir;
- seçili olmayan araç doğrudan kumanda almaz;
- İHA ve İDA rotaları mevcut autopilot/fizik katmanlarında ilerler;
- araç/kamera seçimi panel, ana kamera ve haritada aynı kimliği gösterir;
- Operasyon Masası sonuç, sıralama veya kampanya ilerlemesi yazmaz.

### Tarayıcı kabulü

- geniş masaüstü görünümde filo, ana kamera, taktik harita ve alt şerit aynı anda kullanılabilir;
- gerçek veya tarayıcı tarafından görülen PS koluyla İHA ve İDA arasında geçiş yapılabilir;
- İDA başlangıçta kumda görünmez, açık su üzerinde ve kıyıdan belirgin uzaktadır;
- rota çizme, uygulama, manuel devralma, senaryo kaydetme ve yeniden yükleme tek oturumda çalışır;
- uygulama kaynaklı konsol hatası yoktur;
- mevcut serbest uçuş, eğitim, günlük görev ve otonom kıyı görevi bozulmaz.

## Teslim sınırı

Bu tasarım ilk kullanılabilir tam konsolu kapsar. Aşağıdakiler sonraki sürümlere bırakılır:

- gerçek araç/MAVLink/SITL adaptörü;
- bulut senaryo deposu ve kullanıcı hesabı;
- birden fazla operatörün aynı filoyu paylaşması;
- görev puanlama ve raporlama;
- video kaydı veya dışa aktarma;
- telefon için tam rota editörü;
- üçten fazla eşzamanlı araç.
