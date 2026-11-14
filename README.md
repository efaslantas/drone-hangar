# Drone Hangar

Tarayicida calisan FPV/stabilize İHA simülasyonu. Mode 2 klavye, gamepad ve dokunmatik kontrolleri; genel ve kaynaklı referans fizik, gorevler, yerel ilerleme ve hafif cok oyunculu odalari bir araya getirir.

Bu proje ArduPilot SITL, MAVLink koprusu veya gercek drone kumandasi degildir. Klavye, gamepad ve RC USB joystick ile simülasyon kontrolünü destekler; gercek ucus egitimi ya da sertifikasyon yerine gecmez.

## Basla

**Gereksinim:** Node.js 22 ve npm.

```bash
npm ci
npm run dev
```

Vite'in yazdigi yerel URL'yi tarayicida acin. Gelistirme sunucusunu agda paylasmak icin Vite'in `--host` secenegi kullanilabilir.

```bash
npm test
npm run build
npm start
```

`npm start`, derlenmis `dist/` klasorunu ve WebSocket sunucusunu varsayilan olarak `8780` portunda calistirir. `PORT` ile degistirilebilir.

## Hangar 2.0

Koyu grafit ve yeşil vurgulu simülatör menüsü, büyük drone önizlemesi, drone/alan seçimi ve tek düğmeyle son kurulumdan uçuş. Yeni kullanıcı için hikâye veya atölye zorunluluğu yoktur. Serbest uçuş yerde, motorlar kapalı başlar; ARM ile uçuşa geçilir.

- **Serbest uçuş / serbest stil:** 10 drone ve 7 harita; drone ve harita tercihi yeniden açılışta korunur.
- **Yarış antrenmanı:** Akademiden bağımsız üç turluk Pist parkuru, sıralama dışı.
- **Drone Akademisi:** Altı pistte 36 ders/görev; kazanılmış ilerleme korunur.
- **Atölye:** 5 inç için kaynaklı F60 Pro IV / HQ 5×4×3 motor–pervane referansları, ayrıca genel parça modu. Çizimli parça kartları, döndürülebilir/yakınlaştırılabilir 3B kurulum ve standart kuruluma göre değer farkları. Mevcut FPV parçaları doğrudan kullanılabilir; pilot hikâyesi ayrı ve isteğe bağlıdır.
- **Yüzey kalitesi:** Düşük profilde hafif üretilmiş dokular; orta/yüksek profilde yerel taranmış renk/normal/pürüzlülük haritaları. Çim kaynağı Poly Haven Grass Ground (CC0). Zeminlerde masaüstü orta/yüksek1024px; diğer yüzeylerde orta512/yüksek1024px, dokunmatikte en çok512px GPU dokusu; çim JPEG indirmesi her iki profilde1k kalır. Kalite değişikliği uçuşu sıfırlamaz.
- **Pist sahnesi:** Asfalt pist, apron, çim, hangar kapı/çatı detayları ve uzak arazi. Diğer haritalar mevcut içerikleriyle korunur.
- **Görüntü:** Düşük/orta/yüksek kalite, render çözünürlüğü, gölge ve dekoratif çevre yoğunluğu; 80–140° yatay FOV, 0–60° kamera eğimi, lens ve titreşim seçimi. Temiz görüntüde lens efekti ve varsayılan titreşim yoktur.
- **Günlük rota ve birlikte uçuş:** Mevcut günlük görevler ve oda altyapısı korunur.

Varsayılan WebGL; isteğe bağlı WebGPU deneyseldir. Görsel kalite fizik, çarpışma veya ders hedeflerini değiştirmez. Menü, kontroller ve sonuç ekranında yerel simülasyon durur. Başladıktan sonra duraklatılan görevler yerel kişisel antrenman olarak kalır, genel sıralamaya yazılmaz.

## Ölçüm tabanlı itki referansı

5 inç Freestyle/Racer için yayımlanmış iki statik tezgâh eğrisi kullanılır: F60 Pro IV 1750KV/6S ve 2550KV/4S, HQ 5×4 üç pal. İtiş ve akım fizik adımına bağlanır; hover gazı kuvvet dengesinden, tüketim amper-zaman integralinden hesaplanır. Kütle, kapasite ve kullanılabilir oran kullanıcı varsayımıdır. Kaynaklı referans, tam uçuş dinamiğinin doğrulandığı anlamına gelmez; açısal tepki ve hava direnci yaklaşık kalır. Diğer gövdeler/genel parça modu ölçüm doğrulamasına sahip değildir.

Referans modunda koşular antrenmandır; ders ilerlemesi, eski rekor/ghost ve genel sıralama kayıtlarıyla karıştırılmaz. Genel profile dönüş Atölye veya hazırlık uyarısından yapılır. Mevcut ilerleme ve parça seçimleri korunur.

Referans + Gerçekçi Acro, dört ayrı motor komutu ve tork/atalet denklemini kullanır. Atölyede J, motor zaman sabiti, yaw katsayısı ve model PID alanları vardır; bunlar ölçülmüş donanım ayarları değildir. Sayısal alanlar Değerleri uygula ile birlikte kaydedilir. Ayrıntılı HUD dört motor komutunu gösterir. Rint batarya seçeneği ortak yük altında gerilim düşüşü, SOC, mAh/Wh ve I²R kaybını hesaplar; pil parametreleri ve OCV eğrisi ölçülmemiş varsayımdır. Kesme kilidi yeni paket/reset gerektirir. Eski kayıtlar tezgâh modunda korunur.

Kaynak, açık kaynak alternatifleri, lisanslar ve hata sınırları: [Fizik kanıtı](docs/PHYSICS-EVIDENCE.md). Veriyi tekrar kontrol etmek için `node tools/verify-propulsion-source.mjs`.

## Kontroller

Mode 2: sol stick yaw + gaz, sag stick roll + pitch.

| Girdi | Ucus |
|---|---|
| Klavye | W/S gaz, A/D yaw, oklar veya IJKL pitch/roll, Space ARM, T mod, C kamera, R reset |
| Gamepad | X ARM, Circle reset, Triangle mod, Square kamera; profil ve kalibrasyon Ayarlar'da |
| Mobil | Iki sanal stick, ARM ve menu |


Gamepad davranisi tarayici ve cihaz baglantisina baglidir. Fiziksel cihazla kontrol ve kalibrasyon yapmadan ucus hissinin dogrulandigi varsayilmamalidir.

## RC USB kumanda profili

Aynı kumandayı tekrar seçmek, USB cihaz sırasının değişmesi veya aynı ekseni yeniden seçmek kayıtlı kalibrasyonu bozmaz. Farklı cihaz kimliği veya farklı eksen eşlemesi yeni kalibrasyon gerektirir. Kayıt aynı tarayıcı profili ve site adresi için geçerlidir; localhost ile canlı adres arasında otomatik taşınmaz.

Kontroller → Giriş profili → RC kumanda. EdgeTX USB Joystick ile tarayıcının gösterdiği cihazı seç; roll/pitch/yaw/gaz için dört farklı eksen eşle. Diğer stick'ler merkezde ve gaz en altta iken başlangıcı al, ardından dört saniye içinde tüm uçları gezdir. Canlı ham eksenler ve komut göstergelerinde yönleri kontrol et; tersliği ayrı değiştirebilirsin. Eşleme/cihaz değişirse kalibrasyon yenilenir.

RC gazı doğrudan 0–100'dür; merkez hover değildir. PS profili ve R2 uygulanmaz, Angle irtifa yardımı gazın üzerine yazmaz. ARM için gaz ≤%5 ve geçerli cihaz/kalibrasyon gerekir. Bağlantı kaybı DISARM yapar; geri bağlanınca otomatik ARM olmaz. ARM Space veya ekran düğmesiyle yapılır; RC butonlarına otomatik işlev atanmaz. RC seçiliyken klavye/dokunmatik uçuş eksenlerine sessiz geçiş olmaz; menü tuşları kullanılabilir. PS/klavye/dokunmatiğe dönüş aynı profil seçicisindedir.

Ayarlar `efa-hangar-rc-input-v1` anahtarında saklanır; eski kayıtlar PS profilinde kalır. Cihaz ID'si seri numarası değildir; aynı adlı cihazları tekil olarak ayırt ettiği varsayılmaz. [EdgeTX USB Joystick](https://manual.edgetx.org/color-radios/model-settings/model-setup/usb-joystick) ve [joystick eşleme bilgisi](https://manual.edgetx.org/edgetx-how-to/joystick-mapping-information-for-game-developers) yöntem kaynaklarıdır. Bu tarayıcı yolu RF alıcı bağlantısı değildir. Fiziksel TX15/USB/tarayıcı uyumu henüz doğrulanmadı.

## Veri ve Cok Oyunculu

Kampanya ilerlemesi, kalibrasyon, drone/harita seçimi, görüntü ayarları ve hayalet kayitlari tarayicinin localStorage alaninda tutulur. Oda durumu, siralama sonuclari ve paylasilan tekrarlar sunucuya gider. Oyun IP adresi veya yaklasik konum kaydetmez. Ayrintilar: [Gizlilik ve Veri](docs/PRIVACY.md).

## Belgeler

- [Uctan Uca Urun Analizi](docs/URUN-ANALIZI.md)
- [Oyuncu Rehberi](docs/OYUNCU-REHBERI.md)
- [2.0 Teslim ve Doğrulama](docs/SIMULATOR-V2-DELIVERY.md)
- [Dagitim ve Dogrulama](docs/DAGITIM.md)
- [Gizlilik ve Veri](docs/PRIVACY.md)
- [Varlik Kredileri](CREDITS.md)
- [Katki](CONTRIBUTING.md)
- [Guvenlik Bildirimi](SECURITY.md)

## Lisans

Kod [MIT Lisansi](LICENSE) ile sunulur. Ucuncu taraf varlik lisanslari [CREDITS.md](CREDITS.md) icindedir.


## Şile merkez · 2.6

Şile merkez–liman–fener ve Ağlayankaya kıyısında yaklaşık4,5×2km serbest uçuş.1.331 bina izi,468 yol parçası,10 iskele/mendirek ve10.879 kaynak arazi üçgeni OSM/Copernicus snapshot'ından üretilir. Bina yüksekliklerinin çoğu7.5m varsayımı; Şile Feneri19m KEGM kaydı, kale12m varsayımıdır. Gerçek konum, temsili kütle/cephe/çatı; fotogrametri değildir.30m DSM çıplak arazi değildir. HUD AGL, kalkış parkı simülasyon işaretidir. İlk etapta dersler kendi haritalarında kalır.

Veri yalnız harita seçilince yerelden yüklenir. Kaynaklar ve indirilebilir ODbL/Copernicus veri paketi `/sile.html`, `public/maps/sile/provenance.json` içindedir. `tools/prepare-sile-map.py` offline hazırlayıcıdır; bağımlılıklar `tools/requirements-sile.txt` içinde. Arayüzdeki kalite seçimi konum/fizik sıfırlamaz. İnişler üçgen araziye, bina çarpışmaları aynı ayak izli yaklaşık prizmalara dayanır; gerçek uçuş uygunluğu doğrulanmış değildir.

Şile görsel ayrıntı 2.7: kaynak konumlarını ve çarpışmayı koruyan temsili pencere/sıva ve kiremit dokuları, kıyı kayası, su dalga ışığı ve köpük, kaynak yüksekliklerini değiştirmeyen yumuşak arazi normalleri. Ayrıntılar yerel çizimlerdir; binaya özel cephe taraması veya daha yüksek çözünürlüklü DEM değildir.

2.8 SOURCE ONE v4 tabanlı 5inç/6S referansını atölyeden sabitleyebilirsin. Açık tasarım kaynağı ve ölçümlü motor eğrisi, varsayımsal gövde/paket/aerodinamik ayarlarından ayrı gösterilir. Referans uçuşta kuvvet tabanlı gövde direnci ve 240Hz fizik alt adımı; yük rate komutlarını yapay olarak azaltmaz. Detaylar /physics.html.

2.8.1 UI denetimi: RC yardımında Mode2/mutlakgaz, canlı giriş göstergeleri ve bağlantı durumu; mevcut ARM kapılarını yansıtan düğmeler, nativeSpace erişimi, portrede ayrılan HUD satırları. Davranış sunumu src/flight-ui.js, fizik ve RC kalibrasyonu ayrı sahiplerinde kalır.

Şile2.16: yakın/uzak yüzey karışması için logaritmik derinlik; kale adasında render/zeminle ortak temsili4.5m kabartma ve kaynaklı12m kule silüeti. Ham harita verisi ve uçuş/RC profili aynı; kapsam `/sile.html` ve `maps/sile/landmark-visuals.json`.


Şile 2.50–2.51: Feneraltı mağarasına denizden girip aynı ağızdan geri çıkılabilir; Su İçen Fil geçidinin iki ağzı açıktır. Kum, su, tavan ve kaya yüzleri mevcut uçuş fiziğiyle temas eder. İç boyutlar fotoğraflara dayalı temsili modeldir. 2.51, WebGPU uzak ağaç beyazlığını gökyüzü çizim sırasını düzelterek kapatır. Teslim kanıtı [son doğrulama kaydı](docs/sile-final-delivery-validation.json).

Şile 2.52: Feneraltı asimetrik ve içeride daralan kesite; Su İçen Fil dış kaya hacmine ve asimetrik açıklığa sahip. Görünen kaya ve çarpışma yüzleri birlikte oluşturulur. Bunlar ölçülmemiş temsili modellerdir. [Doğrulama](docs/sile-natural-caves-validation.json).

Şile 2.53: 589 temsili eğimli binanın çatısı ve alın yüzleri görünen yüzeyde temas verir. Saçak üzerinde mahya yüksekliğine kadar uzanan görünmez kutu kaldırıldı; çatıya iniş sonrası yana hareket ve hızlı çatı/duvar geçişleri düzeltildi. Yeni bina yüksekliği ölçümü eklenmedi. [Doğrulama](docs/sile-roof-contact-validation.json).

Şile 2.54: Microsoft/Overture açık bina izlerinden8ek yapı;14adayın6sı eğimli zeminde ertelendi. Konum/iz ML kaynağına dayanır;7,5m yükseklik,cephe ve düz çatı varsayımdır. Kaynak OSM/DSM ve eski dünya korunur. [Kaynak ve doğrulama](docs/sile-building-supplement-validation.json).

Şile 2.55: Batı limandaki tek ek yapı, aynı bina iziyle alçak pavyon olarak yorumlandı. Tek katlı cephe ve kırma çatının görünen yüzleri fiziksel temasa da katılır. 3,15 m saçak ve 4,35 m tepe yükseklikleri fotoğraf destekli varsayımdır. [Doğrulama ve sınırlar](docs/sile-pavilion-validation.json).


## 2.56 — Şile altı bölgeli toplu teslim

S1Ayazma–S6Ağlayankaya mevcut4.5×2km alanı tek envanter/kabul kaydına bağlandı.135OSM+14Overture aday tek tek kaynak/zemin uygunluğu açısından kaydedildi; fotoğraf eşleştirmesi olmayan bina yüksekliği varsayım kalır.104dekoratif kapı sonzemin kotuna bağlandı,24bina için yalnız gerekli açıklık yüksekliği türetildi. Kaynak OSM/DSM değiştirilmedi. Fener, düşük hizmet evi ve çizgili kuleyle değiştirildi;19m kaynak bildirimi, yatay ölçüler varsayımdır. Genel CC0RockFace03 malzemesi yerel kaya ölçümü değildir. Kaya UV/gölge konumu düzeltildi.

CPU sahne hazırlığı arka plan worker'da aynı geometriyle yapılır; önizleme/uçuş hazırlığı paylaşır, iptal/tekrar açma desteklenir. Tam worker roundtrip bütün mesh bufferları/temas üçgenlerini korur. Bu performans oturumunda hazırlık10.97s; hazırlıkta ölçülen kısa ana iş parçacığı blokları50ms hedefini aşar (ham kayıt raporda). İlk ayrı WebGL görünümü12.3s ölçüldü. Hız garantisi verilmez.

626/626Node22ARM64,son9geometri/worker/gölge,11altyapı/11coğrafya testi ve bağımsız inceleme geçti.12/12iki yönlü3/25mps süpürülen temas rotası geçer; bu kapalı çevrim uçuş/RC kalibrasyonu değildir. NativeWebGL/WebGPU6bölge görüntüleri kontrol edildi. AppleM4/Chrome, WebGL1280×720medium,900.00s görünür sabitbölge kaydı: ortalama60.0–60.0FPS,1%düşük en az53.7FPS. Bu tam uygulamada manuel uçuş ölçümü değildir.

31mDSM, ölçülmemiş bina/mağara ayrıntıları ve kaya dibi balıkçı izlerinin veri açığı sürer. FizikselTX15 ve kullanıcının görsel/uçuş kabulü yapılmadı. [Tek kabul raporu](docs/sile-completion-acceptance.json), [ham performans](docs/sile-completion-performance.json), [rota izi](docs/sile-completion-routes.json).


## 2.57 — Şile hazırlığında işlem sınırları

Sahne çözümleme21.5ms,metadata4ms ve fizik verisi kopyalama26.2ms aynı tarayıcı işinde birikerek73ms blok oluşturuyordu. Mevcut kare/iptal sınırları ilk allocationöncesine,sahneilefizikverisiarasına ve son temas indeksiöncesine eklendi. Son native kayıtta yalnız sahne hazırlığı aralığında50msüzeri iş görülmedi;ilkGPU/composer241ms ve başlangıçmodülü67ms ayrı kalır. Soğuk hazırlık~34s olarak ölçüldü, yükleme hızgarantisi verilmez. İptal/tekraraçma ve aynı görünür/fizikselbufferlar doğrulandı;harita verisi/fizik/kumanda ayarları korunur. Tek kabul kaydı `docs/sile-completion-acceptance.json` içindeki `followups.loading257`;TX15/kullanıcı kabulü yapılmadı.


Şile 2.58 kıyı yerleşimi: 129 ek kaynak izinden 119 uygun yapı, 350 m kuşağında 680 temsili OSM cephesi. ESA WorldCover 2021 v200 (CC BY 4.0) özgün piksel kesiti bitki örtüsüne yön verir; OSM alanları önceliklidir. 1.600 ağaç bütçesi kıyıya öncelik verir; 420 temsili yaz şemsiyesi ve OSM otopark yüzeyleri eklenir. Park çizgileri varsayımsaldır. Ölçülmüş dijital ikiz veya fiziksel TX15 kabulü değildir. Kaynaklar ve lisanslar `/sile.html` sayfasındadır. Kullanıcının 2.57 görsel reddi tarihsel kabul raporunda korunur.

Şile 2.59 yüzey devamı: OSM’de kayıtlı beş spor alanı, futbol/basketbol/tenis için temsili çizgiler ve mevcut rıhtımın kara tarafında 30 m varsayımsal döşeme bandı. Saha ve döşeme mevcut yaklaşık araziyi izler; su doldurulmaz, ölçülmüş kot veya tribün eklenmez. Kaynak/varsayımlar `/maps/sile/sports-quay-visuals.json` içindedir.

Şile 2.60: 100–350 m kıyı kuşağındaki 107 varsayımsal bina yüksekliği, ayak izinin iç DSM zirveleri ve çatı düşümüyle yeniden yorumlandı. Gömülen çatıları önlemek için yaklaşık 3 m saçak açıklığı aranır; 20 m model sınırı uygulanır. Kaynak iz/taban/DSM ve kat bilgili yapılar korunur; yeni değerler ölçülmüş gerçek bina yükseklikleri değildir. Model ve kaynak kimlikleri `/maps/sile/building-clearance-visuals.json` içindedir.

Şile 2.61: Arka sıra girişleri tam kapı genişliğindeki araziye göre eşlenir; dik veya örtülü giriş kapısı çizilmez. Mevcut konservatif temel etekleri ve 1,4m temsili çevre döşemesi 350m görsel bölgeye genişletildi. Kaynak taban/ayak izi/arazi/çatı boyutları korunur; ölçülmüş kapı, basamak veya döşeme envanteri değildir. Kaynak ve model kaydı `public/maps/sile/district-grounding-visuals.json`.

Şile 2.62: Yol kenarı döşemesi yakınlığı 350m yapı kuşağına genişletildi; 213 desteklenen arka giriş mevcut kaynak yollara temsili yaya bağlarıyla birleşir. Bağların tam genişliği, su/yapı/korunan yüzey ve arazi eğimi açısından denetlenir. Kaynak yol çizgisi/genişliği, arazi ve bina boyutları korunur. Ölçülmüş kaldırım/erişim envanteri değildir. Köken ve sınırlar `public/maps/sile/district-street-visuals.json`.

Şile 2.63: Parke yönleri mevcut yol/bağ ve cephe kenarlarıyla eşlenir; bina diplerinde temsili ton geçişleri vardır. Mevcut yaya yüzeyinden ayrılan 26cm taş görünümlü yol kenarı bandı aynı kotta kalır. Kaynak/fizik/bağlantı geometrisi değişmez. Genel CC0 beton taraması ve malzeme kapsamı ölçülmüş Şile bordürü değildir. Köken/sınırlar `public/maps/sile/street-finish-visuals.json`.

Şile 2.64: Mevcut ön donatılar korunarak arka kıyı sokaklarına 24 temsili aydınlatma, 24 giriş saksısı ve 6 bank eklendi. Kaynak yol/kapı yönleri, fiziksel destek ve tam engel/korunan yüzey kontrolleri kullanılır; yeni katılar eşleşen fizik kutuları taşır. Yerleşim gerçek belediye envanteri değildir. `public/maps/sile/district-furniture-visuals.json` kaynak ve model sınırlarını kaydeder.

Şile 2.65 asfalt kenarı ve parke ayrıntısı: mevcut yol yüzeyinde temsili 55 cm aşınma/toz geçişi, yol yönünde metrik tarama ve derz/tane ayrıntısı. Yol genişliği, zemin ve tüm fizik kayıtları korunur; gerçek yol aşınma envanteri değildir.

Şile 2.66 temel eteği görünümü: mevcut temel yüzeyinde 2 m genel beton taraması ve son zemin kotuna bağlı temsili dip tonu. Görünen pozisyonlar ve tüm fizik kayıtları korunur; gerçek temel malzemesi veya nem envanteri değildir.

Şile 2.67: kaynaklı mahalle/sokak konumu, kuzey-sabit mini harita ve duraklatma menüsünde adlandırılmış genel harita. 4 OSM mahalle sınırı, 114 farklı yol adı; harita dışı/adsız/yakındaki yol ayrımı. Kapsam ve gerçekçilik değerlendirmesi: `docs/sile-navigation-267.md`.
