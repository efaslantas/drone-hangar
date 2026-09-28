# İHA–İDA Otonom Operasyon — Tasarım

> Historical design record. The described first version has shipped; consult `docs/URUN-ANALIZI.md` and the source code for the current behavior.

## Amaç

Drone Hangar'ın mevcut tarayıcı tabanlı arcade simülasyonuna, tek operatörün
hemen kullanabileceği ortak İHA–İDA görev akışı eklemek. İlk görevde bir İHA
kıyı bölgesini otonom tarar, olayı tespit eder, sistem en yakın uygun İDA'yı
sevk eder ve iki araç görevi birlikte tamamlar.

İlk sürümün başarı ölçütü şudur: kullanıcı mevcut Azure adresini açıp
"Otonom Operasyon" görevini seçtiğinde hiçbir ek yazılım kurmadan görevi
başlatabilmeli, iki aracın hareketini ve görev aşamalarını izleyebilmeli,
operasyonu duraklatabilmeli veya aktif aracı manuel devralabilmeli ve sonunda
görev raporunu görebilmelidir.

## Kapsam kararı

İlk sürüm bütünüyle Drone Hangar içinde çalışır. Mevcut arcade fizik, Three.js
sahnesi, görev seçimi ve sonuç akışı genişletilir. `drone-simulator`, SITL,
MAVLink ve Webots bu sürümün çalışma zamanı bağımlılığı değildir. Böylece
mevcut tek-container Azure dağıtımı korunur ve özellik mobil tarayıcıda da
çalışır.

Bu karar iki ürünü birleştirmez. İleride gerçekçi uçuş gerektiğinde görev
sözleşmesini uygulayan ayrı bir SITL adaptörü eklenebilir; kullanıcı arayüzü
ve görev durum makinesi değişmeden kalır.

## İlk senaryo

İlk operasyonun kimliği `autonomy-coast-response`, görünen adı "Kıyı
Gözetleme ve Müdahale" olur. Operasyon mevcut kıyı haritasını kullanır ve
başlangıçta şu varlıkları üretir:

- Otonom devriye yapan bir İHA.
- Kıyı/liman başlangıç noktalarında bekleyen en az iki İDA.
- Önceden belirlenmiş güvenli adaylar arasından koşu başında seçilen bir olay
  noktası.
- İHA devriye rotası ve İDA erişim koridorları.

Görev aşamaları sırasıyla `READY`, `AIR_SEARCH`, `DETECTED`, `SEA_DISPATCH`,
`JOINT_VERIFY`, `COMPLETE` olur. Kullanıcı iptali `ABORTED`, zaman aşımı,
uygun araç bulunamaması veya erişilemeyen hedef `FAILED` ile sonuçlanır.

## Mimari

### Operasyon tanımı

`src/missions.js` mevcut görev kataloğuna `kind: "autonomy"` olan yeni görevi
ekler. Tanım yalnız sabit veriyi taşır: harita, araç rolleri, devriye noktaları,
olay adayları, süre sınırları ve görünen metinler. Çalışma zamanı durumu görev
tanımına yazılmaz.

### Durum makinesi

Yeni `src/autonomy.js` saf ve test edilebilir operasyon çekirdeği olur.
Başlangıç durumu üretme, aşama geçişi, en yakın uygun İDA'yı seçme, zaman
aşımı ve görev özeti bu modülde tutulur. Çekirdek Three.js, DOM, ağ veya
duvar saatine doğrudan bağımlı olmaz; zaman ve araç telemetrisi çağıran kod
tarafından verilir.

Her geçiş tek yönlü ve gerekçelidir. Aynı telemetri tekrar işlendiğinde ikinci
kez sevk veya ikinci kez tamamlama üretmez. Duraklatılmış görevde simülasyon
saati ve araçlar ilerlemez. Manuel devralma görev durumunu silmez; devralınan
araç operatör girdisini kullanırken diğer araç otonom kalır.

### Araç modeli ve hareket

Yeni `src/surface.js` İDA'nın iki boyutlu su üstü durumunu ve hareketini
tanımlar: konum, baş, doğrusal hız, dönüş hızı, azami hız ve batarya. İlk sürüm
dalga fiziği veya ayrıntılı hidrodinamik çözmez; hızlanma, sürükleme ve dönüş
sınırı ile okunabilir ve kararlı arcade davranışı sağlar.

Yeni `src/autopilot.js`, hem İHA hem İDA için hedef nokta takip komutları
üretir. İHA mevcut uçuş fiziğini kullanır; İDA `surface.js` üzerinden ilerler.
Rota takipçisi yalnız hedef, araç durumu ve zaman adımını alır. Böylece daha
sonra başka fizik motoru veya SITL adaptörü aynı görev çekirdeğine bağlanabilir.

`src/models.js` içine mevcut model üretim yaklaşımına uygun hafif bir İDA
görseli eklenir. `src/world.js` kıyı haritasına yüzülebilir alan ve İDA
başlangıç noktaları sunar. İDA kara sınırını aşamaz; erişilemeyen rota görevi
başarısız yapar ve operatöre açık neden gösterilir.

### Oyun entegrasyonu

`src/main.js` yalnız orkestrasyon ve görsel bağlama yapar:

1. Otonom görev seçildiğinde görev çekirdeğini ve araçları kurar.
2. Her simülasyon adımında otonom komutları hesaplar ve iki fizik modelini
   ilerletir.
3. Durum makinesine güncel telemetriyi verir.
4. Sahnedeki araçları, rotaları, hedef işaretini ve arayüzü günceller.
5. Tamamlanma veya hata halinde mevcut sonuç akışını çağırır.

Otonomi mantığı `main.js` içine gömülmez. Bu dosyada yalnız mevcut oyun
döngüsüne bağlanan ince bir adaptör bulunur.

## Operatör deneyimi

Mevcut görev kartlarına ayrı bir "Otonom Operasyon" kartı eklenir. Hazırlık
ekranı görev amacını, atanacak İHA/İDA sayısını ve otomatik çalışma bilgisini
gösterir.

Uçuş ekranında küçük bir operasyon paneli bulunur:

- Güncel görev aşaması ve geçen süre.
- İHA ve İDA durumları: rol, hız, batarya, otonom/manuel.
- Harita üzerinde planlanan rota, gidilen iz ve olay noktası.
- `Duraklat/Devam`, `İHA'yı Devral`, `İDA'yı Devral`, `Otonomiye Ver` ve
  `Görevi İptal Et` kontrolleri.

Kamera aktif aracı takip eder; araç kartına dokunmak veya devralmak aktif
kamerayı değiştirir. Mobilde panel mevcut oyun menüsünün içinde açılır ve
uçuş stick'leri yalnız manuel devralma sırasında görünür.

Sonuç kartı toplam sürenin yanında tespit süresi, İDA sevk süresi, müdahale
süresi, seçilen araç ve sonuç nedenini gösterir. İlk sürüm bu operasyonu
genel liderlik tablosuna yazmaz; sonuç yerel rapor ve mevcut sunucu olay
kaydına gider.

## Veri ve ağ sınırı

İlk sürüm tek operatörlüdür ve görev otoritesi istemcidedir. Sunucu yalnız
mevcut `start`/`result` olaylarını kaydeder. Otonom araçlar ayrı WebSocket
pilotları gibi yayınlanmaz ve başka kullanıcılar göreve katılmaz.

Sonuç mesajına geriye uyumlu, isteğe bağlı bir `report` nesnesi eklenebilir.
Sunucu bu alanı boyut ve izin verilen anahtarlarla sınırlar; mevcut skor
hesaplama davranışını değiştirmez. Eski istemciler ve mevcut görevler aynı
şekilde çalışmaya devam eder.

## Hata davranışı

- Uygun İDA yoksa `FAILED: uygun İDA bulunamadı` gösterilir.
- Bir araç rota ilerlemesi üretmezse süreli sıkışma algısı devreye girer;
  görev sonsuza kadar beklemez.
- Batarya görevi tamamlamaya yetmeyecek seviyeye düşerse araç güvenli dönüşe
  geçer; başka uygun İDA varsa yalnız bir kez yeniden atama yapılır.
- Manuel devralmada görev zaman aşımı devam eder; duraklatmada durur.
- Sekme görünmez olduğunda mevcut simülasyon saati davranışı korunur ve büyük
  `dt` sıçramaları araçları hedefin ötesine fırlatmaz.
- İptal, araçları güvenli bekleme/dönüş durumuna alır ve temiz bir sonuç
  üretir.

## Test ve kabul ölçütleri

Saf birim testleri şunları kapsar:

- Durum makinesinin izin verilen tüm geçişleri ve yasak geçişleri.
- En yakın uygun İDA seçimi; batarya, kullanılabilirlik ve mesafe eşitliği.
- Aynı tespitin tekrar işlenmesinde tek sevk üretilmesi.
- Duraklatma, manuel devralma, otonomiye iade, iptal ve zaman aşımı.
- İDA hareketinin hız/dönüş sınırları, kara sınırı ve büyük `dt` güvenliği.
- Rota takibinin hedefe yakınsaması ve ulaşılamayan hedefi raporlaması.
- Görev raporu alanları ve eski sonuç mesajlarıyla geriye uyum.

Tarayıcı kabul akışı masaüstü ve mobil görünümde şu zinciri doğrular:

`başlat → otomatik İHA devriyesi → tespit → İDA sevki → manuel devral →
otonomiye iade → ortak doğrulama → sonuç kartı`.

Mevcut testlerin tamamı geçmeli, mevcut uçuş okulu/muharebe/yarış/görev ve
çok oyunculu takım modu davranış değiştirmemelidir. Üretim derlemesi başarılı
olmalı; konsolda hata olmamalı ve mevcut Azure container sağlık uç noktası
dağıtım sonrası yanıt vermelidir.

## İlk sürüm dışında

- SITL/Webots/MAVLink bağlantısı.
- Çok operatörlü ortak görev kontrolü.
- Gerçek dünya komuta-kontrolü veya gerçek araç sürme.
- Ayrıntılı deniz/dalga hidrodinamiği.
- Dinamik görev üretmek için LLM veya harici algı servisi.
- Kalıcı görev editörü ve kullanıcı tarafından serbest rota çizimi.

Bu maddeler ilk çalışan sürüm doğrulandıktan sonra ayrı tasarım çalışmalarıdır.
