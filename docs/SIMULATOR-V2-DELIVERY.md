# Hangar 2.0 teslim ve doğrulama

Tarih: 31 Ekim 2026. Dal: `codex/simulator-v2`. Sürüm: `2.2.0`.

## Teslim edilen kapsam

- İDA, operasyon konsolu, takım savaşı, silah ve çatışma botları önceki temizlikle kaldırıldı. Eski bağlantılar güvenli uçuş/lobi seçeneklerine yönlenir; uçuş ilerlemesi korunur.
- Koyu grafit/yeşil simülatör kabuğu, doğrudan hızlı uçuş, drone/alan hazırlığı, isteğe bağlı hikâye ve bağımsız atölye.
- Son drone/harita tercihi; yerde ve DISARM başlayan serbest uçuş; akademiden bağımsız üç turluk yarış antrenmanı.
- Pist referans alanında asfalt, apron, pist boyası, hangar detayları, çim ve uzak çevre. Diğer beş harita korunur.
- Düşük/orta/yüksek grafik, render ölçeği, gölge ve dekoratif yoğunluk; yatay FOV, kamera eğimi, lens ve titreşim ayarları. Kalite çarpışma geometrisini değiştirmez.
- Sade HUD; gerçek duraklatma, devam/reset/hazırlığa dönüş/ana menü. Mobil araç menüsü de zamanı durdurur; kontroller üst üste binmez.
- Başladıktan sonra duraklatılan görevler kişisel antrenman sayılır ve genel sıralamaya gönderilmez.

## Otomatik doğrulama

`npm test`: **246 geçti, 0 başarısız, 0 atlandı**.

`npm run build`: başarılı. Vite bazı çıktı parçalarının 500 kB üzerinde olduğunu bildiriyor; bu uyarı giderilmedi.

`git diff --check`: başarılı.

Yeni regresyonlar: hatalı/erişilemeyen depolama, son seçim, açık yarış, yerde başlangıç, bütün pause katmanları, duraklatılmış koşunun sıralama dışı kalması, dünya zamanının durması, grafik sınırları/FOV/temiz lens, dekoratif yoğunluk, Pist koridoru ve klavye ile düğme etkinleştirme.

## Tarayıcı doğrulaması

Chrome, macOS 26.5.2; Mac mini M4, 24 GB. Yerel Vite önizlemesi kullanıldı.

- Masaüstünde ana ekran, hazırlık, atölye ve grafik/kamera ayarları açıldı. Kaydedilen 7 inç drone/Kıyı seçimi yeniden yüklemede ve hızlı uçuşta korundu.
- Hikâye zorunluluğu olmadan uçuş ve akademiden bağımsız yarış erişimi kontrol edildi.
- Yarış sayacı duraklatmada 6.4 saniyede kaldı; 2.5 saniyelik bekleme sonrası değişmedi, devam edince ilerledi. Reset sayacı ve süreyi sıfırladı.
- Mobil öykünmede 400×820 portre ve 820×400 yatay görünüm kontrol edildi. Alt gezinme, Diğer → Ayarlar, hızlı uçuş, DISARM/yerde başlangıç, mobil araç menüsü ve duraklatma ekranı çalıştı. Araç menüsü açılınca stickler gizlendi. Menü düğmesiyle araç listesinin çakışması giderildi ve görsel olarak yeniden kontrol edildi.
- WebGL ve deneysel WebGPU yolları açıldı; yüksek kalite, temiz lens ve Pist görünümü kontrol edildi. Isınma sonrasında HUD üzerinde 60 FPS gözlendi. Bu gözlem garanti veya p95 ölçümü değildir.
- Son tarayıcı konsolu hata kontrolü boş döndü.
- Bağımsız kod incelemesindeki mobil pause, sıralama zamanı, hareketli dünya zamanı, engellenmiş depolama, detay yoğunluğu ve tekrar lensi bulguları giderildi.

Ekran görüntüleri: `hangar-v2-home.png` ve `hangar-v2-mobile.png`, bu sohbetin görselleştirme klasöründe.

## Bu etapta doğrulanmayanlar

TX15 USB eşleme/kalibrasyonu, fiziksel gamepad veya telefon üzerinde dokunma testi yapılmadı. Uçuş fiziği yeniden tasarlanmadı. On beş dakikalık performans/kaynak sızıntısı ve p95 kare zamanı ölçümü yapılmadı. Bütün eski ghost bağlantıları tarayıcıda tek tek açılmadı. Fotogerçekçi ücretli varlık paketi veya tam Liftoff fizik eşdeğerliği bu teslimin kapsamı değildir. İlk yerel teslimde canlı dağıtım yapılmamıştı; aşağıdaki Azure yayın kaydı bu durumu günceller.

Yerel çalıştırma: depo kökünde `npm run dev`.

## Kaynak ve belge temizliği

İkinci temizlikte 8 tarihsel plan/teslim belgesi ve uygulama tarafından kullanılmayan `autopilot.js` / `route-editor.js` modülleri, bunlara ait iki test dosyasıyla kaldırıldı. Böylece test sayısı 228’den 220’ye indi; kalan 220 testin tamamı geçti. Eski ürün analizi ve depo talimatları güncel 2.0 içeriğiyle yeniden yazıldı; katkı, dağıtım ve güvenlik belgelerindeki kaldırılmış özellik adımları temizlendi.

Gizli REC/sahte GPS HTML katmanı, koordinat üretimi, kayıt zaman sayacı ve her karede çalışan güncellemesi kaldırıldı. Gerçek uçuş HUD’u ve isteğe bağlı lens efekti korundu. Tarayıcıda ana ekran → hızlı uçuş açıldı; HUD çalıştı ve hata konsolu boş döndü.

Yerel import ve Markdown bağlantı taramasında eksik hedef bulunmadı. Eski bağlantıları güvenli karşılayan küçük yönlendirme/sonuç reddetme kuralları ile bunların regresyon testleri kasıtlı olarak korunur. Kullanıcının tarayıcı ilerlemesine veya sunucu verisine dokunulmadı. Git geçmişi yeniden yazılmadı.

## Azure canlı yayın — 31 Ekim 2026

Kullanıcının yayın talebiyle `v2-9ac03aa14bca` sürümü Azure VM üzerindeki mevcut Hangar hizmetine çıkarıldı. Yerel, henüz commit edilmemiş değişiklikler dahil kaynak paketi kullanıldı; bu kimlik Git SHA değil paket özetiyle ilişkilendirilmiş yayın kimliğidir.

- Adres: https://efa-hangar.germanywestcentral.cloudapp.azure.com/
- İmaj: `drone-hangar:v2-9ac03aa14bca`; Node 22 üzerinde Docker üretim derlemesi başarılı.
- Sunucu görev modüllerini kullandığı için Docker çalışma imajına `src/` kopyası eklendi. Ayrı deneme konteyneri sağlık kontrolünden sonra canlı geçiş yapıldı.
- Mevcut veri mount'u ve yönetici ortam ayarları korundu. Önceki konteyner ve özel izinli yayın öncesi veri yedeği sunucuda saklandı.
- Önceden durmuş HTTPS konteynerinin bind dosyası dizine dönüşmüştü. Caddy'nin kayıtlı JSON yapılandırması doğrulanarak geri yüklendi; mevcut alan adları, sertifika/config volume'ları ve diğer yönlendirmeler korundu.
- Genel HTTPS sağlık yanıtı `v2-9ac03aa14bca`; HTML ve beş giriş varlığı HTTP 200. HTML önbelleği yeniden doğrulama gerektiriyor.
- Sıralama API'si, yetkisiz admin 401, mevcut kimlikle admin giriş/durum/çıkış ve iki istemciyle güvenli WebSocket oda katılımı doğrulandı. Kontrol amacıyla genel sıralamaya sonuç yazılmadı.
- Canlı Chrome'da ana ekran, hızlı uçuş HUD'u, duraklatma ve ana menüye dönüş doğrulandı; uygulama hata konsolu boştu.

Fiziksel TX15/telefon ve uzun süreli performans kontrolleri hâlâ yapılmadı.

## Atölye görsel düzeltmesi — 2.0.1

Kök neden: 3B önizleme yalnız platform sekmesinin çocuğuydu; atölye açılınca gizleniyordu. Parça seçimi de 3B modeli yeniden oluşturmuyordu.

Önizleme ilgili sekmeye taşınır; Atölye’de 12 çizimli parça kartı, seçili/takılı durumu, parça etki açıklaması ve aynı drone’un standart kurulumuna göre dört değer farkı gösterilir. Masaüstünde model ve karşılaştırma sabittir. Açılı/üstten/alttan bakış, sürükleyerek döndürme ve yakınlaştırma vardır. Pervane pal sayısı ile temsili batarya boyutu/gövde oranları seçime göre değişir. KV değişiminin dış motor görünümünü değiştirmediği açıklanır. FPV olmayan gövdede uygun açıklama gösterilir.

Yeni testler önce başarısız gözlendi, sonra 223/223 test geçti. Üretim derlemesi ve diff kontrolü başarılı. Chrome’da parça seçiminin etki/durum geri bildirimi ve 3B yenilemesi, 390×844 mobil görünüm kontrol edildi; yatay taşma bulunmadı. Model ve parça çizimleri temsili, süreler simülasyon tahminidir.

2.0.1 canlı yayın kimliği: `v2.0.1-22b36b25cc9b`. Azure Docker derlemesi ve ayrı deneme konteyneri başarılı; genel HTTPS sağlık yanıtı bu sürümü doğruladı. Canlı Chrome'da 12 parça kartı, görünür 3B önizleme, korunmuş parça seçimleri ve değer farkları görüldü; hata konsolu boştu. Önceki konteyner ve izinleri 0600 olan veri yedeği korundu.

## Kaynaklı itki referansı — 2.1.0

Yayın: `v2.1.0-6dbf306e8215`. 5 inç için iki tam motor/pervane/hücre eşleşmesi, kuvvet eğrisinden hover çözümü ve amper-zaman batarya bütçesi eklendi. Generic parçalar ve önceki kayıtlar korundu. Referans modu ilerleme/rekor/ghost/sıralama dışıdır. Kaynak, ayrı test satırlarıyla interpolasyon kontrolü ve tam uçuş doğrulamasının sınırları [PHYSICS-EVIDENCE.md](PHYSICS-EVIDENCE.md) içindedir. Kullanıcıya açık açıklama `/physics.html` sayfasında sunulur.

230 test ve üretim derlemesi geçti. Azure Docker imajı ayrı konteynerde denenip veri yedeğiyle yayınlandı; önceki imaj/konteyner saklandı. HTTPS sağlık yanıtı, kaynak sayfası, sıralama API'si, yetkisiz yönetim kontrolü ve canlı Chrome'da kaynaklı Atölye/REF uçuş HUD'u/duraklatma doğrulandı. Uygulama kaynaklı konsol hatası görülmedi. Bu değişiklik için fiziksel donanım, telefon ve uzun süreli performans ölçümü yapılmadı.

## Dört motorlu Acro — 1 Kasım 2026

2.2.0 yerel paket: Euler/RK4 gövde dinamiği, X rotor tahsisi, sınırlı model rate PID'i, ayrı motor gecikmesi ve dört motor akımından pil integrali. Açısal parametreler düzenlenebilir varsayımdır. Generic/Angle kontrol yolu korunur. Atölyede atalet/ayar taslağı birlikte uygulanır; ayrıntılı HUD motor değerlerini gösterir. Çarpışma sonrası motor göstergeleri sıfırlanır. 246 test ve üretim derlemesi geçti; bağımsız inceleme bulgusu giderildi. Yayın durumu aşağıda ayrıca kaydedilir.

2.2.0 canlı yayın: `v2.2.0-f7652f214445`. Azure yönetim kanalıyla 176 kaynak dosyası paket manifestine göre doğrulanıp imaj derlendi. Aday ve üretim sağlık kontrolleri, dış HTTPS, kaynak sayfası ve canlı Chrome REF 4M yolu başarılı. Önceki konteyner ve 0600 izinli veri yedeği korundu. SSH servisinin kendisi aktifti; dış SSH bağlantı yolu sorunu için ağ erişim kuralları değiştirilmedi. Fiziksel TX15, telefon ve uzun performans testi yapılmadı; model parametreleri hâlâ ölçülmemiş varsayımlardır.


## Rint batarya modeli — 2.3.0

Ortak yük altında gerilim/akım çözümü, gerilime bağlı yaklaşık motor kuvveti, mAh/Wh/I²R kaybı ve süreli düşük gerilim kilidi eklendi. Atölyede tezgâh veya Rint seçimi ve açık varsayım alanları; HUD'da gerilim, hücre gerilimi, SOC ve tüketim vardır. Önceden kaydedilen kurulumlar tezgâh modunda korunur. Ölçülen motor eğrileri değişmedi. Pil verileri üretici ölçümü değildir; yöntem ve sınırlar [PHYSICS-EVIDENCE.md](PHYSICS-EVIDENCE.md) içinde kayıtlıdır.

257 test, üretim derlemesi ve diff kontrolü geçti. Bağımsız incelemede kritik/önemli bulgu yoktu. Çarpışma sonrası yüksüz voltajın yenilenmesi için regresyon testi ve scalar mod açıklaması düzeltildi. Chrome'da eski kayıt, uygulama/kalıcılık, yüklü uçuş, sayaçlar, reset ve Angle açıklaması doğrulandı. Fiziksel TX15 veya gerçek pil/itki eşleştirmesi yapılmadı. Canlı yayın sonucu aşağıda ayrıca kayıtlanır.

2.3.0 canlı yayın: `v2.3.0-d0f30b931d6f`. Azure’da 177 kaynak dosyası doğrulandı; aday/üretim sağlığı ve dış HTTPS sürümü eşleşti. Uygulama ve beş giriş varlığı, kaynak açıklaması, salt okunur sıralama API’si ve yetkisiz admin 401 kontrolü başarılı. Canlı Chrome’da Rint Atölye ve REF 4M uçuşta voltaj/SOC/tüketim paneli görüldü; ayrıntılı HUD ile ekran görüntüsü kaydedildi. Önceki konteyner ve veri yedeği korundu. Fiziksel cihaz ve uzun performans testi yapılmadı.


## RC USB giriş profili — 2.4.0

Kontroller sekmesinde cihaz seçimi, dört benzersiz eksen/yön eşlemesi, iki aşamalı merkez/uç kalibrasyonu ve ham/işlenmiş kanal göstergeleri eklendi. RC gazı doğrudan %0–100; PS merkezi hover davranışı ayrı profilde korunur. RC için hem Angle irtifa hem yatış gaz telafisi devre dışıdır. RC tüm görevlerde yerde DISARM başlar; ARM düşük gaz ve hazır kalibrasyon gerektirir. Giriş kaybı DISARM, dönüş otomatik ARM etmez. Kumanda butonlarına otomatik PS işlevleri verilmez; Space/ekran ARM kullanılır.

270 test, üretim derlemesi ve diff kontrolü başarılı. Fresh incelemenin hikâye otomatik ARM, yatış telafisi, HUD-kapalı uyarı, kalibrasyon sınırı ve storage bildirimi bulguları giderildi. İşlev regresyonları önce başarısız, sonra başarılı gözlendi; HUD uyarısının kapalı görünümde görünmediği ve düzeltmeden sonra göründüğü Chrome'da doğrulandı. Cihazsız kalibrasyon mesajı, eşlemenin yeniden yüklemede korunması ve ARM engeli kontrol edildi. Fiziksel TX15/USB/tarayıcı uyumu doğrulanmadı.

Yöntem kaynakları EdgeTX resmi USB Joystick ve joystick mapping belgeleri; firmware veya üçüncü taraf kod alınmadı. Gamepad API aygıt kimliği seri numarası değildir. Yeni izin/WebHID erişimi eklenmedi. Canlı yayın sonucu aşağıda ayrıca kayıtlanır.

Ek tarayıcı kontrolü: Pilot hikâyesi → İlk güç başlangıcı ve R reset, RC cihazı yokken yerde DISARM kaldı. HUD kapalıyken giriş uyarısı görünürdü; yerel uygulama konsolu hatasızdı.

2.4.0 canlı yayın: `v2.4.0-534275d2b073`. 179 kaynak dosyası manifestle doğrulanıp Azure Docker imajı derlendi. Aday ve üretim sağlığı, dış HTTPS sürümü, beş giriş varlığı, kaynak/yardım sayfaları, sıralama okuma ve yetkisiz admin 401 başarılı. Canlı Chrome RC paneli/cihaz yok mesajı/ARM engeli doğrulandı; uygulama hata konsolu boştu. Ekran görüntüsü kaydedildi; deneme sonrası eski PS/klavye/dokunmatik profiline dönüldü. Önceki konteyner ve özel izinli veri yedeği korundu.


## Kaynaklı çim ve doku kalite profilleri — 2.5.0

Mevcut asfalt/beton taramaları korunarak eksik çim için Grass Ground üç kanal eklendi. JPEG dosyaları Poly Haven kaynak MD5 ve yerelSHA256 ile kayıtlandı; üçü de1024×1024 olarak açılıp doğrulandı. Materyal kalitesi cihaz türünden ayrılıp seçilen grafik profiline bağlandı: düşük prosedürel, orta512GPU, yüksek1024masaüstü/512touch. Çim indirmesi tüm taramalı profillerde1kJPEG'dir; orta profilde yalnızGPU görüntüsü küçültülür.

Materyal kopyaları sahneye ait, kaynak görüntü önbelleği ayrıdır. Hata sırasında mevcut görünüm korunur, düşük kaliteye dönüş orijinal malzemeyi geri getirir, eski kalite/harita yüklemesi yeni görünüme yazamaz. Fizik/çarpışma geometrisi değişmedi. 274 test ve üretim derlemesi geçti; Chrome'da yüksek/düşük farkı ve uçuş konumunun kalite değişiminde korunması görüldü. Nihai inceleme/yayın kanıtı aşağıda ayrıca kaydedilir.

Bağımsız incelemede kritik/önemli çalışma zamanı bulgusu yoktu; kaynak boyutunun yokluğu iddiası kaldırıldı.4m tekrar sanatsal seçimdi ve fiziksel boyut eşleşmesi iddia edilmez. Chrome'da hızlı yüksek/düşük/yüksek geçişinde uygulama kaynaklı hata/uyarı görülmedi; tarayıcı eklentisi uyarıları uygulamaya ait sayılmadı.

2.5.0 canlı yayın: `v2.5.0-af166841bd02`. Azure’da182 kaynak dosyası ve yeni3 doku canonical kaynaktan SHA256 ile doğrulandı. Aday/üretim sağlığı ve dışHTTPS sürümü eşleşti. Beş giriş varlığı, herkese açık kredi/envanter, üç çim kanalının dışHTTPS SHA256 özeti, sıralama okuma ve yetkisiz admin401 başarılı. Canlı Chrome Pist yüksek kalite görünümü kaydedildi; uygulama hata konsolu boştu. Test sonrası orta kalite/25° kamera geri getirildi. Önceki konteyner ve0600 veri yedeği korundu. Bu etapta fiziksel TX15, gerçek telefon veya bağımsız GPU profil ölçümü yapılmadı; yüksek kalite kare hızına garanti verilmez.


## Şile merkez · 2.6.0

Kullanıcının2×2km önerisini kabulüyle gerçek OSM API snapshot'ı ve Copernicus GLO-30Public2021 kesiti kullanıldı.1.266 bina izi,340 yol parçası,10 deniz yapısı,6740 arazi üçgeni. Height etiketi0,levels1; bina yükseklikleri çoğunlukla7.5m örnek, fener19m resmi kaynak ve kale12m tahmin.30m DSM bitki/yapı içerir; yüzey görselleri fotogrametri değildir. ODbL kaynak altkümesi ve türetilmiş veriler, yerel GeoTIFF kesiti ve SHA256/provenans yayınlanır.

Düşey/yatay yerel koordinat, aynı üçgen araziyle iniş/AGL, kıyı/adalar, ayak izli prizma/çatı/su çarpışması, tembel yükleme/hata/son seçim/oturum saklama ve free-only ders yönlendirmesi eklendi. Başlangıç parkı bina izlerinden13.8m açıklıkla seçilmiş yapay simülasyon yardımıdır; gerçek uçuş sahası iddiası yok.

Bağımsız incelemedeki3P2 giderildi: aktivite değişimi bekleyen harita isteğini iptal eder; kıyı duvarı grid/diagonal kesişimlerinde bölünüp fizik yüksekliğiyle eşleşir; paylaşılan ghost sonucu uygulama başlangıcını bekler. Regresyonlar RED→GREEN,291 test geçti. Kaynaklı veri, negatif datum, concave/hole prizma, su/çatı/kıyı ve eski modlar kontrol edildi. TX15 referans sohbeti okundu; canlı adreste mevcut kalibrasyon/RC hazır ve E4/E2/E1/E3 eşlemesi UI'dan doğrulandı. Kalibrasyon değiştirilmedi. Yayın/canlı kontrol sonucu aşağıda ayrıca kaydedilir.

2.6.0 canlı yayın: `v2.6.0-52374191158c`.193 kaynak dosyası SHA256 manifestiyle SSH üzerinden doğrulandı. Node22 Docker imajı, aday ve üretim sağlık kontrolleri başarılı; önceki konteyner ve0600 veri yedeği korundu. DışHTTPS sürümü, beş giriş varlığı, Şile harita/provenans/OSM/DEM/önizleme dosyalarının5/5SHA256 karşılaştırması, kaynak sayfası, sıralama okuma ve admin401 başarılı. Canlı Chrome’da Şile seçimi, veri yükleme ve yerde DISARM/0AGL/atıf görüldü; şehir önizlemesi kaydedildi ve uçuş ekranı kullanıcı denemesi için açık bırakıldı. TX15 canlı adresteki kalibrasyonu korundu; yeni sekmede cihazın görünmesi kullanıcı stick/tuş hareketi gerektirebilir. Tam fiziksel uçuş doğrulaması kullanıcı testini bekliyor.

## Şile görsel ayrıntı · 2.7.0
Beş temsili pencere/sıva deseni, kiremit yüzeyi ve bina başına deterministik çatı tonu, kaya katmanları, dielektrik su bump dalgaları ve kıyı köpüğü. Doku ayrıntıları özgün canvas çizimidir; binaya özel fotoğraf, ölçülü pencere konumu veya eğimli çatı modeli değildir. Arazi paylaşılan vertex normalleriyle aydınlatılır, kaynak yükseklikleri ve bina prizması çarpışmaları değişmez. Kalkış işareti saydam halka/H; mevcut 3 m yarıçaplı yerleşim korunur. Deniz hareketi mutlak simülasyon zamanı kullanır. 15 harita mesh'i; dokular dünya kaynak yaşam döngüsünde temizlenir, boş bina altkümesinin kullanılmayan materyal dokuları ayrıca serbest bırakılır.
Bağımsız son inceleme ciddi bulgu yok: UV/kanal/yaşam döngüsü ve geometri bütçesi kontrol edildi. Ertelenen küçük bulgu: keskin kıyı köşelerinde köpük şeridinin 61/4914 vertex'i kara maskesine düşüyor; deniz seviyesindeki bu parçalar çoğunlukla arazi arkasında kalır. Tam kara poligonu kırpması bu etapta yok.

2.7.0 canlı yayın: `v2.7.0-aa97e48764fb`.297 test geçti,0 başarısız; üretim derlemesi ve diff boşluk kontrolü başarılı (mevcut >500kB paket uyarısı sürüyor).194 kaynak dosyası Azure SHA256 manifestiyle doğrulandı. Aday/üretim sağlık kontrolü, dışHTTPS sürümü ve5 giriş varlığı başarılı. Şile kaynak/veri dosyaları5/5, çim kanalları3/3HTTPS SHA256 eşleşti; sıralama okuma ve yetkisizadmin401 doğrulandı. Önceki konteyner ve0600 veri yedeği saklandı. Canlı Chrome şehir önizlemesi ve yerdeDISARM/0AGL/yeni halka görüldü; uygulama hata kaydı yok, tarayıcı eklentisinin ayrı hatası var. TX15 ayarlarına dokunulmadı; tam fiziksel uçuş kullanıcı denemesini bekliyor. Ekran: `sile-realism-2.7.png` (Codex görselleştirme klasörü).

## Şile kıyı maskesi · 2.7.1
2.7 incelemesindeki keskin köşe taşması giderildi: her köpük üçgeninden kaynak kara poligonlarının triangulation'ı çıkarılır; UV koordinatları kesişimlerde doğrusal enterpole edilir. Ayrı adalar ve kara poligonu içindeki su delikleri korunur. Float32 yuvarlaması için2mm konservatif düzlem toleransı yalnız efekt kırpmasında kullanılır. Harita snapshot'ı, terrain ve bina çarpışması, RC ayarları ve tek köpük draw call değişmez. Önceki gerçek veri regresyonu136 kara örneğiyle başarısız oldu; düzeltmeden sonra tüm vertex ve üçgen iç örnekleri su üzerinde.

2.7.1 yayın tamamlandı: `v2.7.1-f8702a2bd46d`;195 kaynak hash, aday/üretim ve dışHTTPS,5giriş varlığı,5Şile+3çim SHA256, sıralama/admin401 geçti. Canlı Chrome DISARM/0AGL, hata yok. Eski konteyner/veri yedeği korundu.

## SOURCE ONE v4 referans eğitimi · 2.8.0
Açık tasarım arşivli v4 gövde, ölçülmüş F60IV1750KV/HQ5×4×3/6S motor eğrisiyle kalıcı freestyle presetine bağlandı.226mm arşiv README ölçüsü, simetrik X yaklaşımı; CAD kopyalanmadı.650g/1100mAh/J/ESC/PID/CdA varsayımları açıkça görünür. Tek düğme referansı ve Gerçekçi Acro'yu kaydeder, diğer drone ayarları ve RC eşlemesi korunur. Genel profile dönüşte aktif kaynak etiketi temizlenir (RED→GREEN).
Referans hava direnci SI kuvvet/yoğunluk/CdA/gövde eksenleri/Fm ile hesaplanır; eski ivme sönümü ayrıca uygulanmaz. Rüzgâr göreli hız kullanılır, serbest düşüşte de temel rüzgâr korunur. Referans yükte rate hedefleri değişmez. Atalet, kütle ve varsayımsal%20CdA artışı tepkiyi değiştirir. Gerçekçi referans Acro fizik adımı en fazla1/240s; eski Rint kare alt-bölüm regresyonu tolerans değiştirilmeden düzeltildi.306 test ve üretim derlemesi geçti; bağımsız inceleme sonrası aktif etiket hatası giderildi. Tam uçuş/propwash/firmware eşdeğerliği iddia edilmez.

2.8.0 canlı yayın: `v2.8.0-553102ffbbc4`.197 kaynak dosyası SHA256, Node22 aday/üretim sağlığı, dışHTTPS sürümü,5giriş varlığı,5Şile+3çim SHA256, sıralama veadmin401 geçti.17 motor ölçüm noktası kaynaktan tekrar doğrulandı. Canlı Chrome'da SOURCE ONE düğmesiyle profil kaydedildi; yeniden yüklemede isim/SOURCE ONE,6S1750KV,650g,226mm ve real=true görüldü. Önce/sonra TX15 RC modu, roll3/pitch1/yaw0/throttle2 ve kayıtlı kalibrasyon aynı. Şile DISARM/0AGL/REF4M ACRO REAL açık bırakıldı. Uygulama konsol hatası yok; ayrı tarayıcı eklentisi hatası mevcut. Önceki konteyner ve0600 veri yedeği saklandı. Sayısal rapor docs/source-one-validation.json; tezgâh modunda sayısal tutarlılık, fiziksel uçuş doğrulaması değil.

## Genel UI denetimi · 2.8.1
Masaüstü anaekran/hazırlık/atölye/menü/yardım ve390×844/844×390 viewport iframe denetimi yapıldı. RC seçiliyken PS hover/R2 yardımının önde olması, duraklatmada yardım göstergelerinin donması, merkezde sürekli RC hata perdesi, UI düğmesinde Space'ın native aktivasyonunu yutup ARM istemesi, mobilbr gizlenince sözcüklerin birleşmesi ve portrede hız/mod HUD'unun üst üste gelmesi yeniden üretildi ve düzeltildi.
Yeni bağlantı kartı kalibrasyon kaydını canlı bağlantıdan ayırır. RC yardımıMode2/mutlak gazı açıklar, GAZ göstergesi canlıdır. ARM/DISARM/reset ve görev/tekrar düğme metni mevcut kapılarla eşlenir; RC/gaz/gerilim/countdown koşullarında pasiftir. Menüde kaynak drone/map/mod özeti var. Duraklatma yalnız UI'ı yeniler; fizik/zaman ilerlemez. Çarpışma metni artık her olaya SIGNAL LOSS demez. Sayısal düzenlemelerin Apply gerektirdiği genel hazırlık metninde de belirtilir.
TarayıcıdaSpace yardımkapat/menüdevam, yarış→Pist→serbest→Şile,650→660Apply/reload→650restore kontrol edildi. Fiziksel telefon, bağlı kumandanın elle hareketi veya bütün tarayıcı/sayfa kombinasyonları test edilmiş sayılmaz; viewport denetimi gerçek cihaz testi değildir.

311 test ve üretim derlemesi geçti; bağımsız kaynak incelemesi ciddi regresyon bulmadı. Küçük ertelenen konu:50px dokunmatik ARM dairesindeki uzun reset/tekrar etiketleri sıkışabilir. Akademi hazırlığı, ayarlardaki mevcut değerler, yeniden başlat→DISARM ve ana menüde SOURCE ONE/Şile korunması ayrıca kontrol edildi.

Son canlı yayın: `v2.8.1-8e2e48f2a594`.312 test geçti, build/diffkontrolü başarılı. Canlı kontrolde bulunan çift staticID, ui-markup.test.js RED→GREEN ile giderildi; canlı HTML IDbenzersizliği dışHTTPS'te ayrıca kontrol edildi.198 kaynakSHA, aday/üretimsağlığı,5girişvarlığı,5Şile+3çimhash,sıralama/admin401 başarılı. SonChrome doğrulamasında RCyardımvar,PSyardımveklavyeeksenyönlendirmesiyok,Spacekapatçalışıyor,merkezuyarısıyok,RCmissingARMpasif. SOURCEONE/Şile,RCkalibrasyonu ve3/1/0/2eşlemesi korundu. Uygulamahatasıyok; ayrı eklentihatası vardı. Önceki konteynerler ve0600veriyedekleri saklandı. Geçici responsiveharness silindi/pakete alınmadı. Canlı ekranui-live-2.8.1.png, viewportQAui-responsive-2.8.1.png.

## Dokunmatik eylem etiketleri · 2.8.2
Önceki UI incelemesindeki50px daireye sığmayan uzun eylem adları giderildi. Masaüstü tam metni, dokunmatik düğme en fazla6karakterli ARM/DISARM/RESET/PİL/HANGAR/TEKRAR/BİTİR/BEKLE gösterir. Tam eylem aria-label/title ile korunur; değişmeyen metin/erişilebilirad her karede tekrar yazılmaz. Boyut/konum/ARMkapıları aynı; monospace11px etiket sekiz durumun gerçekCSSfixture'ında görsel olarak kontrol edildi. Önce yeni kompakt alan testi başarısız, sonra başarılı oldu.313test ve buildkontrolü; gerçektelefon testi değildir. Geçici fixture yayın paketinden çıkarılır.

2.8.2 canlı: `v2.8.2-c5148ec613d0`.313test/build/diff başarılı.198 kaynak hash; Azureaday/üretim ve dışHTTPS sağlık,benzersizHTMLid/5girişvarlığı/5Şile+3çimhash/sıralama/admin401 geçti. Canlı Chrome SOURCEONE/Şile veTX15kalibrasyonkayıtlı kaldı; dokunmatik düğme ARM text/fullaria/title veRCyokpasifdurumu,DISARM görüldü; konsolhatasıyok. Sekiz kısaetiket durumunun50pxCSSgörsel kontrolü kaydedildi. Önceki uzun dokunmatik etiket konusu giderildi; gerçektelefontesti yapılmadı. Önceki konteyner/veri0600yedek korundu. GeçiciQAHTML silindi ve yayına alınmadı. Dal/önceki uncommitted çalışma korundu, commit/pushyok.

## 2.9.0 — Kurgusal Arcade arena (2026-11-01)

Ana menü Arcade: Pistte iki oyuncak araba, bir uçak ve bir drone aynı anda önceden yazılmış döngülerde hareket eder. Oyuncu sırayı seçer; temas edilen nesne tamamlanır ve renkli parçacık efekti çıkar. 1.4 saniye sonra yeni drone kalkışta, dolu pil ve DISARM ile oluşur. ARM düşük gaz kapısı değişmedi. Başarısız çarpışma/R tamamlanan nesneleri koruyarak drone yeniler; menüde Yeniden Başlat ve sonuçta Tekrar tüm oyunu sıfırlar. Dört nesne tamamlanınca sonuç. Menü/yardım geçiş sayacını ve nesneleri durdurur.

Yeni arcade.js saf durum/hareket/temas, arcade-view.js geometri/efekt/kaynak temizliği sahibidir. Kaynaklı drone ile de oyun nesneleri görünür; mevcut Şile tercihi ve kumanda kalibrasyonu yazılmaz. Yerel oyun akademi/rekor/assessment/ghost/paylaşım/sıralamaya gönderilmez. Eski kaldırılmış arena kimliği hâlâ güvenli serbest uçuşa yönlenir; yeni etkinlik arcade-contact'tır.

Doğrulama: 322 test, build başarılı. Bağımsız incelemede ilk temas yerine dizi sırasının seçilmesi bulundu; iki nesneli regresyon RED→GREEN ile düzeltildi. Gerçek uygulama tarayıcı UI'sinde R, duraklatma ve tam tekrar doğrulandı; geçici test kopyasında sentetik temaslarla 4/4 sonuç ve dört drone doğrulandı. 390×844 iframe mobil görünümünde panel çakışması giderildi ve dikdörtgen ölçümleriyle doğrulandı. Geçici dosyalar dağıtım öncesi silindi. Fiziksel TX15 uçuşu/telefon testi yapılmadı; oyun oyuncakları gerçek araç modelleri değildir.

Canlı sürüm: `v2.9.0-3791f57d6334`. 200 kaynak dosyası hash doğrulaması, aday/üretim/dış HTTPS sağlık, beş giriş varlığı ve benzersiz HTML kimlikleri, üç çim ve beş Şile kaynak hash kontrolü başarılı. Arcade paket/yardım ve test kontrolü bulunmaması doğrulandı. Canlı uygulama hata kaydı boş; tarayıcıda dört nesne/0–4/drone1/DISARM görüldü. Önceki konteyner ve veri yedeği korundu. Commit/push/merge yapılmadı.

## 2.9.1 — Arcade Enkaz sahası (2026-11-01)

Kullanıcı Arcade haritasının savaş ortamı gibi görünmesini istedi. Yalnız Arcade için kurgusal çatışma sonrası sanayi sahası eklendi: kırık beton kabuklar/açık döşemeler/donatı, barikatlar, kum torbası duvarları, enkaz, yanmış araç kabukları, lekeli zemin, puslu ışık ve dekoratif duman. Dört renkli oyun nesnesi/yeni drone kuralı değişmedi. Gerçek çatışma verisi, araç verisi veya yeni silah/yönlendirme mekaniği yok.

`arcade-site.js` sahne/çarpışma/dumanı sahiplenir. Normal Pist'ten ayrı world variant cache anahtarı, farklı atmosfer ve dışlanan normal Pist dekorları/async props; normal Pist/Şile korunur. Katı yapılar batched kutu geometri/AABB ile eşleşir; tüm hareket döngüleri 361 örnekte radius+0.3m marj ile ve 6m kalkış hacmi boşlukla doğrulandı. Çarpışma her kalitede aynıdır.

Duman tek InstancedMesh billboard grubu (28/48/72 etkin parçacık, sabit72 kapasite), mutlak simülasyon zamanı ve kamera konumuna yakın pilot konumuyla döner; menüde zaman durur. Kalite değişince belleği yeniden ayırmadan count güncellenir. World kaynak temizliği artık instanced mesh instance buffer'larını da dispose eder. Bağımsız incelemedeki iki P2 ve gece arka planı regresyon testleriyle düzeltildi. WebGPU'da görünmeyen native Points yerine quad billboard geçişi ve guide normal uyumu gerçek tarayıcı QA ile doğrulandı.

Doğrulama: 7 yeni test; toplam329 test. WebGL gündüz/gece, kalite high→low→medium, aynı Pist kimliğinde Arcade→yarış dönüşü ve390×844 iframe mobil görünüm kontrol edildi. WebGPU isteğe bağlı oturumda duman/sahne çizildi. Ayarlar yerelde eski medium/gündüz değerlerine döndürüldü; üretim profiline veya TX15 kalibrasyonuna yazılmadı. Geçici test HTML'i kaldırıldı. Fiziksel telefon/TX15 uçuşu denenmedi.

Canlı: `v2.9.1-7092d773dda6`. 201 kaynak hash kontrolü, aday/üretim/dış HTTPS sağlık, giriş varlıkları/HTML kimlikleri, Şile ve çim kaynak hashleri, Enkaz sahası paket/yardım kontrolleri başarılı. Canlı tarayıcıda sahne/duman/oyun nesneleri/Enkaz etiketi/DISARM doğrulandı, uygulama hata kaydı boş. SOURCE ONE/Şile ve kayıtlı TX15 kalibrasyonu korunuyor. Önceki konteyner/veri yedeği duruyor; commit/push/merge yapılmadı.

## 2.10.0 — FPV görsel gerçekçilik geçişi (2026-11-01)

Kullanıcı model/malzeme/ışık iyileştirmesini onaylayıp tam FPV atmosferi istedi. Arcade Enkaz sahasında bir sokak bölümü ve tutarlı malzeme geçişi: hasarlı sıva/tuğla PBR duvarlar, metre ölçekli asfalt/kaldırım/çakıl yüzeyleri, fotoğraf kaynaklı kapalı hava gökyüzü ve çevre aydınlatması; yerel taranmış barikat/jeneratör/varil/kaya/lastik görselleri. GLB'ler sabit çarpışma zarflarına oturur, başarısız/geç yüklemede görünür yedek modeller kalır. Tüm kaynaklar yerelde sunulur.

Poly Haven Damaged Plaster ve Overcast Soil Pure Sky CC0 kaynakları resmî API metadata MD5 ve SHA256 ile doğrulandı.4orijinal3.43MB,6WebP varyant0.69MB;512/1024kalite; manifest `/arcade-assets/sources.json`. Renk sRGB, normal/roughness doğrusal. Uzun kolonlarda UV gerilmesini önlemek için fiziksel3m karo ölçeğinde geometri birleştirilir. Geometri/çarpışmalar kalite veya yükleme sonucuna göre değişmez.

Kurgusal araba/uçak/quad görselleri ayrıntılandırıldı ve renkler sadeleştirildi; gerçek ölçüm/tarama kopyası iddia edilmez. Halkalar/rotalar varsayılan kapalı, Arcade uçuş menüsünden açılır. FPV kamera tercihleri/net lens korunur. Uçuş fiziği, SOURCE ONE kurulumu, TX15 kalibrasyonu, hedef rotaları/temas/yeni drone ve kayıt kuralları değişmedi.

`arcade-assets.js` async token/generation, sahipli geometri/malzeme/texture kopyaları ve kalite temizliğini yönetir; kaynak önbelleği dispose edilmez. Düşük kalite HDR/GLB kopyalarını bırakıp yedeklere döner; geceye gündüz HDR taşınmaz; dünya temizliği environment/background durumunu sıfırlar. Ağır yükleyiciler yalnız gerektiğinde yüklenir.

Doğrulama:339test/build geçti, taze incelemede P1/P2 yok.10kaynak/varyant SHA256 doğrulandı. Tarayıcıda WebGL/gündüz/gece/kalite geçişi/işaret seçeneği/normalPist geri dönüşü ve390×844 iframe; WebGPU kaynak gökyüzü/PBR/duman görüntüsü ve temiz uygulama kaydı doğrulandı. İlk Vite dinamik prebundle önbellek uyarısı tam reload ile giderildi; üretim build testleri ayrı. Geçici test HTML'i silindi. Fiziksel telefon/kumanda uçuşu doğrulanmadı.

Canlı sürüm: `v2.10.0-d8a36d23a1c1`.214 kaynak dosyası doğrulandı; aday/üretim/dışHTTPS sağlık ve giriş varlıkları geçti. Yeni10görsel kaynak/varyant ve5yeniden kullanılanGLB hashleri,3çim/5Şile hashleri, işaret arayüzü/loader/kaynak sayfası doğrulandı. Canlı uygulama warn/error kaydı boş; orta kalite tercihi, SOURCEONE/Şile ve kayıtlıTX15kalibrasyonu korundu. FPV/DISARMhazır. Önceki konteyner/veri yedeği duruyor; commit/push/merge yok.


## 2.11.0 — Pilotun uçurduğu drone modelleri (2026-11-01)

Kullanıcının kendi drone görselleri geliştirildi; önceki Arcade nesneleriyle karıştırılmamalı. On katalog gövdesinde fizik çarpışma boyutundan ayrılan görsel ölçüler, havalandırmalı motor/sargı/şaft, metre ölçekli karbon ve tek aktif batarya/etiket/kayış/kablo/konnektör bulunur. Tiny Whoop/Cinewhoop koruma halkaları sığ tutulur; rotor düzlemi gövdeye kesişmez. DISARM pervaneleri durur; referans dört motor komutu ayrı animasyon/blur sürer (ölçülmüş RPM değil).

SOURCE ONE v4 karbon kesimleri resmî sabit TBS9ae65b1387f192fb90d07d483178169924b286b5 DXF arşivinden; delik/kontur ve4/3/3/2/2mm kalınlıklar korunur. Metre dönüşümü/0.035mm düzleştirme, ham yedi dosya SHA256 ve GPL-3.0/generator/gereksinimler kamuya açık `/airframes/source-one-v4/` altındadır. F60IV27.1×31.1mm dış ölçüsü mevcut DroneHiTech teknik özelliklerinden. Kol/standoff montajı, iç motor, kamera/paket ve diğer ailelerin parçaları temsili. Tam monte CAD veya gerçek uçuş eşleşmesi iddia edilmez. Dingil mesafesi değiştirildiğinde temsili gövde etiketi kullanılır.

`disposeDrone` preview/yeniden doğma/remote/ghost/billboard yollarında model geometrisi, materyali, etiket dokusunu temizler; paylaşılan karbon dokuları korunur. Bağımsız inceleme önemli sorun bulmadı; küçük sahiplik borcu: ghost ön-render materyal kopyaları, GPU sızıntısı gösterilmedi.

Doğrulama:345test/build/diffcheck geçti. Yeni testler gerçek triangüle delik alanı/kalınlık, motor çapı/rotor eşlemesi, aktif paket, tilt, temizlik ve sıfır gaz/ayrı komutları doğrular. Üretici kaynak özetleri ve bağımsız geçici dizinde generator byte eşitliği doğrulandı. Masaüstü SOURCEONEaçılı/üst/alt, Whoop/Cinewhoop/KameraQuad,390×844 iframe workshop ve WebGL/WebGPUtakip kamerası görüldü; WebGPUısınınca60fps. Uygulama warn/error kaydı boş (tarayıcı uzantı uyarıları hariç). Geçici HTML silindi. Uçuş fiziği/rotor merkezleri/çapları, kumanda/kalibrasyon ve kaynaklı kurulum değişmedi; gerçek telefon/TX15 uçuşu veya log eşleşmesi test edilmedi.

Canlı: `v2.11.0-c42d22efb783`.230kaynak hash/aday/üretim/dışHTTPS sağlık;7hamCAD+5türetilmiş/generator hash veGPLkaynağı, öncekiŞile/çim/FPVgörselvarlık kontrolleri geçti. Canlıatölyede SOURCEONE6S/650g/1100mAh/Şile,medium,25°tilt ve kayıtlıTX15kalibrasyonu korundu. Uygulama warn/error boş. Atölye yakınlaştırılmış görünüm açık; önceki konteyner/veri yedeği korundu. Commit/push/merge yok. Kanıt owned-airframes-live-2.11.png / owned-airframes-detail-2.11.png / owned-airframes-mobile-2.11.png / owned-airframes-webgpu-2.11.png; ayrıntı owned-airframes-validation.json.


## 2.12.0 — Drone donanımı ve doğal sunum (2026-11-01)

Kendi uçurulan modellerde karbon yüzeyi/katmanlı kesim kenarı ayrı materyal; AIO küçük gövdeler ve diğerlerinde FC/ESC kartları/destek/silikon/çip/pad/arkaVTX-kapasitör görselleri. Eski düz PCB/VTX ve yersiz fastenerler kaldırıldı; kablolar motor montajına ulaşır. Kaynak CAD kontur/delik/kalınlığı korunur; yeni donanım/malzeme ölçüleri temsili, ölçülmüş üretici PCB veya BRDF iddiası yok. Ghost per-model materyalleri yeniden kopyalamadan kullanır; önceki küçük ownership borcu giderildi. Materyal dizileri/disposal/sharedtexture kontrolleri geçti.

Atölye nötr mat platform ve yönlü gölge, dengeli ışık/çevre, merkezlenmiş model. Orijinal1.4zoomkorundu; yakınlaştırmada bilerek kırpılabilir. Küçük görselborç: bazı modellerin yaw pivotunda~%1.6radius merkez kayması; normalfitte kesilme yok. Takip kamerada boyut ve ekran oranı mesafeyi belirler; artık drone birkaçpiksel olarak kalmaz. Dik açıdaki forwardXZ çökmesi freshreviewP2 olarak yakalandı; normalizeyön/songeçerliyön fallback ve son mesh yakın düzlem projeksiyonu testleriRED→GREEN. ToothpickFC/VTX kesişmesi donanım gerçekçiliği nedeniyle önemli sayılıp geometri testindeRED→GREEN düzeltildi. Yerel pilotta etiket zaten yoktu; remoteetiketler korunur.

352test/21focused/build/diffcheck geçer. Actualmeshnearplane10gövde×2oran×75/90/110°; kart kesişmesizliği, sharedmaterials/opacity ve studio bounds testleri. Desktopangle/top/bottom,390×844iframeSOURCEONE/Whoop/Heavy, WebGLtakip→FPV ve WebGPUtakip kontrol edildi; GPUısınınca60fps ve appwarn/errorboş. GeçiciHTMLsilindi; yerelSOURCEONE/Şile tercihi geri alındı. FPVorigin/FOV/tilt, fizik/çarpışma/rotor/prop ölçüleri, RC/profil/kalibrasyon değişmedi. Fizikseltelefon/TX15 uçuşu/log eşleşmesi yapılmadı.

Canlı: `v2.12.0-cd04597c4870`.233sourceSHA/aday/üretim/HTTPS sağlık,5girişvarlığı/benzersizHTMLid,3grass+5Şile+10FPVgörsel+5GLB+7hamCAD+5türetilmişsourcehash geçer. Yeni elektronik/studio/chase paket işaretleri ve kamuya açık2.12kapsam notu doğrulandı. CanlıSOURCEONE6S/650g/1100mAh/Şile/medium/25°/kayıtlıTX15korundu,appwarn/errorboş. Atölye yakından açık; önceki konteyner/veriyedeği korundu. Commit/push/merge yok. Kanıt presentation-live/detail/mobile/chase/webgpu-2.12.png; ayrıntı airframe-presentation-validation.json.


## 2.13.0 — Model ile tutarlı zemin/lens ve sabit atölye ekseni (2026-11-01)

Kullanıcı devam istedi. Metre boyutlu görsel model ile size*.45/enaz6cm zemin temas farkı giderildi. makeDrone/root-local AABB ve lens anchor üretir; rotor tam süpürmeXZ, blur/etiket dışlama, parent/world/scale ve tilt güncelleme tutarlı. Aktif spec/payload geçici metadata kullanır; kayıtlı profil/trace/RC yazılmaz. Flatground/terrain ve spawn/RCstart aynı yüzey normaline göre box destek yüksekliği+1mm kullanır. Metadata olmayan eski yol fallback korur. Bu konservatif görsel kutu desteği; temas torku/sürtünme/esneme veya dış yük dinamiği değildir. Duvar/tavan/çatı sphere modeli yaklaşık kalır.

FPV konumu temsili modeldeki optik merkeze bağlandı, FOV/tilt yönü aynı. Yakın düzlem .003..normal.04/terrain.1m; yer/engel AABB mesafesiyle sınırlanır, uzakta eski aralığa döner. Kamera zemini veya yakın duvar/çatıyı kesmez. Atölye ayrı merkezli yaw Group döndürür; eski küçük pivot kayması giderildi, geometri/rotor yerel konumu değişmez ve disposal aynı model sahibinde.

Düşük lens QA, önceki Şile pad9cm/road6cm ve normalpad4cm z-fight liftini ortaya çıkardı. Boya/paved katmanlar yüzeye indirilip polygonOffset verildi. Şile yollar/pad tüm grid üçgenlerinde kırpılır, yüzeyle aynı interpolation; kaynakmap/DSM/OSM/bina-solid footprintler aynı. Bağımsız1000rastgeleüçgende signedarea/winding korunumu≤1.14e-13; Şile110088road/183916totalvertex,Nodebuild~138ms.

362test/fullbuild/diffcheck; freshreview önemli/minör bulgu yok. Gerçekmesh destek köşesi10+SOURCEONE/çeşitli açı/eğim, rotor fazı, kalıcı olmayanlocalbounds, legacy, negatifDEM/su/sertiniş/RCstart, havadaki kuvvetstate eşitliği ve yeni zeminden sayısal kalkış/tekrar iniş testleri geçti. BrowserWebGLŞile/Pist/Arcade,390×844workshop/FPV,WebGPUlowFPVboya/derinlik/warm60fps/temizappwarnerror görüldü. GeçiciHTMLsilindi,localSOURCEONE/Şilegeri alındı. Gerçektelefon/TX15 uçuşu, temas kalibrasyonu veya gerçekflightlog eşleşmesi yok. Kanıt contact-chase/mobile-workshop/mobile-fpv/webgpu-2.13.png; fizik/kaynak sınırları publicphysics ve PHYSICS-EVIDENCE içinde.

Canlı: `v2.13.0-9a84f9c79092`.234sourceSHA/aday/üretim/dışHTTPS sağlık;5girişvarlığı/benzersizid/3grass+5Şile+10visual+5GLB+7CAD+5derivedhash geçer. Public2.13zemin/lens veŞileboya notu, yenianchor/pivot/support paket işaretleri doğrulandı. CanlıSOURCEONE6S650g1100/Şile/medium25°/kayıtlıTX15korundu; FPV/DISARMhazır,60fps. Asset kaynaklı exception görülmedi; reload sonrası rootURL’de tek asyncbrowsermessage-channel-close olayı kaydedildi (uygulama messagingAPI kullanmıyor), görünür arıza yok. Eski konteyner/veriyedeği korundu. Commit/push/merge yok. Ayrıntı ground-contact-validation.json; kanıt contact-live-chase-2.13.png / contact-webgpu-2.13.png / mobile-fpv/workshop.


## 2.14.0 — Yakın zemin ayrıntısı (2026-11-01)

Şile/Pist/Arcade zeminlerinde worldXZ metre UV, ortak materyal/geometri korunumu ve sınırlı8m plane bölümlendirmesi. Çim/beton/orman/kum2m, asfalt/toprak1.5m tekrar aralığı görsel tasarım seçimidir; ölçülmüş tarama boyutu değildir. Mevcut CC0 dokuları kullanılır; masaüstü medium/high zemin1024px, dokunmatik512px, diğer medium512px ve low prosedürel kalır. Renderer sınırına göre ground16/4 anisotropy ve hafif deterministik dünya renk değişimi. Önceki desktopmedium4m/512px’e göre çimde hedef texel aralığı7.8125→1.953125mm;4kat doğrusal örnekleme yoğunluğu yeni gerçek veri/zemin geometrisi demek değildir. Fizik/temas/kamera/RC/profil/Şile kaynak verisi aynı.

Taze incelemedeki grouped/partialPlane, elle düzenlenmiş interior/normal ve AO kanalında paylaşılantexture korunumu sorunları üçRED→GREEN regresyonla bir geçişte giderildi; ertelenmiş minör bulgu yok.370test/13focused/build/diffcheck geçer. WebGLŞile/Pist/Arcade ve kalite low→high→medium,390×844iframe FPV,WebGPUFPVısınınca60fps doğrulandı; yerelappwarn/errorboş, uzantı kayıtları ayrı. Geçici HTML silindi. Fiziksel telefon/TX15 uçuşu ve gerçek log kalibrasyonu yapılmadı.

Canlı: `v2.14.0-cc8aebcaed9c`.235sourceSHA/aday/üretim/dışHTTPS sağlık,5entryasset/benzersizHTMLid/6groundsource/öncekiŞile-grass-visual-CADhash kontrolleri geçti. SOURCEONE6S650g1100mAh/Şile/medium/25°/kayıtlıTX15 korundu,FPV/DISARM60fps hazır. Reloadanında rootURL’ye atfedilen4asyncmessage-channel-close hatası ve uzantı uyarıları kaydedildi; uygulama runtime messagingAPI kullanmıyor, asset kaynaklı exception/görünür arıza yok; logdan kaynak kesin atanamaz. Önceki konteyner ve0600veriyedeği korundu; commit/push/merge yok. Ayrıntı close-ground-validation.json; kanıt closeground-live/sile/arcade/mobile/webgpu-2.14.png.


## 2.15.0 — Şile çatı silüetleri (2026-11-01)

558 uygun dört köşeli binada mevcut taban izi ve toplam yüksekliği aşmayan temsili beşik çatı; duvarlar saçak kotunda biter, alın duvarları penceresiz sıva örneğini ve eğimli yüzeyler mevcut kiremit dokusunu kullanır. Diğer708bina ve10kıyıyapısı mevcut biçimde. Eğim/mahya yönü/dağılım sanatsal seçimdir; yeni OSM çatı verisi veya saha ölçümü yok. Fizik/kamera/RC/profil/source snapshot ve tam yüksekliğe sahip konservatif çarpışma prizması aynı; eğimli çatı temas modeli değildir. Eski üst düz kapak eligible çatılarda kaldırıldı. Bütün geometri mevcut8malzeme batchine katılır.

374test/13focused/build/diffcheck geçer. Taze incelemede önemli hata yok. Bağımsız558çatı×cyclic/reversed ring footprint/upward roof/outward gable testleri; maximum projected area error6.74e-11m²,Float32eavewallgap3.8micrometre. buildSile15meshes/15materials/26textures değişmedi; source/prisms aynı. Küçük ertelenen test kapsamı: dönmüş/ters alın duvarlarının outwardnormal assertionı kalıcı testte yok; bağımsız tüm snapshotvaryantları geçti.708flat+10structures sayım ifadesi netleştirildi. WebGLyakın/karşıcephe/kalitegeçişleri,390×844renderframe,WebGPUnear/overview60fpswarm görüldü. GeçiciQAHTMLsilindi. Fizikseltelefon/TX15uçuşu/log eşleştirmesi yok.

Canlı:`v2.15.0-5a64814510d8`.236sourceSHA/aday/üretim/dışHTTPS sağlık,5entryassets/uniqueids/öncekiŞile-grass-visual-CADhashve yeniroofbundle/publicscopekontrolleri geçti. SOURCEONE6S650g1100mAh/Şile/medium25°/savedTX15korundu,FPV/DISARM60fpshazır. Canlı reload/FPV kontrolünde error kaydı boş; yalnız Chrome uzantısı kaynaklı uyarılar vardı. Önceki2.14message-channel-close kaydı bu reloadta tekrarlanmadı. Öncekikonteyner/0600veriyedeği korundu;commit/push/mergeyok. Kanıt sile-roofs-detail/overview/mobile/webgpu/live-2.15.png; ayrıntı sile-roofs-validation.json.


## 2.16.0 — Şile titreme düzeltmesi ve kale (2026-11-01; yerel hazır, Azure bekliyor)

Kullanıcı kale çevresinde titreşim bildirdi. Kamera near0.003/far6500m ile700m uzaktaki35mm aralıklı yüzeylerin100kamera örneğinde eski WebGL67yanlış yüzey, yeni gerçek renderer WebGL/WebGPU0yanlış yüzey. Her iki rendererlogdepth ortak;flagcommon/logchunks ve installedGTAOlogconversion uyumlu. Kamera/flightforce/RC/profile değişmedi. Düzenli çizgili kaya malzemesi ve düşük-bit PRNG izleri azaltıldı; ada üstü mevcutCC0gravelPBR kullanır.

KaynaknativeDEM ve65gridsıfıryükseklikli kale adasında OSMkıyı izi içindeki4.5m runtime kabartma açıkça temsili, ölçüm değil. Aynıplatform topo/cliff/terrainHeight/surfaceAt/çarpışmada; kale base/prism buna taşınır. Diğerarazi/binaheight/sourceOSM/DSM byteaynı. Yeni top exactringtriangulation; eski kaynakrounding7.9mm farktan kaçınılır;F32queryborder0.1mm. Kale12m/dört kat/kireçtaşı belediye kaydıyla doğrulandı; source-footprint taşduvar/girintili açıklık/mazgal temsili. Fotoğraf kopyalanmadı. Açıklıklar geçit değil, prismkonservatif. Holed/uygunolmayan siteler genericfallback.

382fulltest/24focused/build/diffcheck geçti. Taze review shadercommon ve holedsiteinnercliff sorunları ikiRED→GREEN regresyonla tekgeçişte giderildi;9reviewfocusedGREEN; gerçek WebGLflag öncehata/sonratemizgörüntü. Önceki2.15transformedgable testeksiği eklendi. Ertelenmiş minöryok. Browseractualcomposer Şile/Pist/Arcade/night/quality,390×844renderframe,WebGPU/GTAO60fpswarm ve0/100fixture;finalapperrorboş,extensionwarningsayrı. Fizikseltelefon/TX15uçuşu/realflightlogkalibrasyonuyok. QAHTMLsilindi.

Aday:`v2.16.0-7f5130339846`;239sourceSHA. Yerel productionbuildHTTP8780health/5entryasset/uniqueids/admin401/leaderboardveeskiŞile-grass-visual-CADhash/yeni landmarkscopekontrollerigeçti. Tamuygulama5173SOURCEONE6S650g1100/Şile/medium0°/FPVDISARMhazır; localRCkalibrasyonsuz, üretimkalibrasyonunadokunulmadı. **Azureyayınlanmadı:**SCPclosed,20.52.232.128SSHtimeout,eskihostnameDNSnotfound;genelDNSthreejs.orgçalışıyor. Stage/rolloutçalıştırılmadı; canlıprofilekontrolüyapılmadı. YeniAzureadresisoruileistendi. Paket/manifest/rolloutscripts `/Users/efa/projects/drone-hangar/.superpowers/sdd/2026-11-01-sile-stability/release` içindehazır;commit/push/mergeyok. Kanıt sile-castle-before/after,sile-stability-flag/webgpu/mobile/local-2.16.png;ayrıntı sile-stability-validation.json.


## 2.16.0 — AWS yayını (2026-11-02)

Kullanıcı simülatör2.16’yı mevcut Zenth AWS sunucusuna taşımayı seçti. Canlı: https://hangar.18-153-158-209.sslip.io/ — `v2.16.0-7f5130339846`. ARM64 image yerelde derlenip özel aktarım ile SSM üzerinden kuruldu. Ayrı256MiB/.5CPU/nonroot/saltokunur konteyner, ayrı veri/env/network; ek VM/SG/IAM değişikliği yok. Mevcut7Zenth/Gelişim konteyner kimlikleri ve eski nginx içeriği korundu. Zenth dışweb/API200; Gelişim dışbağlantıreddi önceden vardı, TLS doğrulanmış origin200; DNS’e dokunulmadı.

HTTPS sağlık/sürüm,5girişvarlığı/benzersizid/admin401/leaderboard,239kaynak manifesti ve önceki görsel/Şile/CAD hash kontrolleri, ikiistemciliWSS join/state/leave geçti.6infra regresyonu geçer;382uygulamatesti/build önceki aynı2.16adayından. Nginx append/rollback ve aynı sürüm retry sorunları freshreview sonrası RED→GREEN düzeltildi. Son runtime0restart/~17.85MiB, host1062MiBavailable.

Yeni adreste SOURCEONE6S650g1100/Şile/medium25°/RC reload ile doğrulandı, FPV/DISARMhazır. **TX15 kalibrasyonu origin bazlı; yeni adreste bir kez yapılmalı.** Azure eski skor/yönetici verisi erişilemediği için taşınmadı; yeni ayrı veri alanı, eski veriler silinmedi. Gerçek TX15uçuşu/logkalibrasyonu yapılmadı. TLSyenileme mevcutcert-renewloop kapsamında; gelecekte nginx tamyenidenkurulumunda include/network korunmalı. İşletim: `docs/AWS-HOSTING.md`; kayıt: `docs/aws-hosting-validation.json`; kanıt `aws-hangar-live-2.16.png`. Commit/push/merge yok.


## 2.17.0 — Kale adası, taş ve kıyı (2026-11-02)

Kullanıcı özellikle kale/çevresinin gerçekçiliğine devam istedi. Belediyenin kaynak fotoğrafı yalnız referans olarak incelendi; yeni resim kopyalanmadı. Önceki düz4.5mplatform, mevcut OSMkıyı izi içinde43×59/enfazla2.988maralıklı temsili grid yüzeyiyle değiştirildi. Kale tabanı denizden4.5m/12mtower/footprint aynı. Çevre0.776..5.266m,6408üçgen; kaya eğimi, yeşil örtü ve ıslak kıyı renkleri authored. terrainSample/surfaceAt, çizilen top ve kıyı dudakları aynıgrid/diagonalinterpolation kullanır; hamOSM/DEM/diğerbinalar/flightforce/RC/profile değişmedi. Taşlar4mUVrepeat ile düzensizsıra/boyut/ton; prosedürelrock/vegetationcolor ile yeniasset/dependency yok. Tamölçülmüş tarama iddiasıyok; kaleaçıklıkları konservatifprizma içinde dekoratif.

386test/11infra/build/diffcheck geçer. Freshreview geometrideCritical/Importantbulmadı; eksiklipinteriortesti coarsegridsplitte0.39mgapüretenRED→GREEN ilekapatıldı. Updatercandidatecleanup/snapshotconcurrencyImportantbirgeçişteRED→GREEN giderildi, uniqueattemptbackupminor kapatıldı. Reviewer6408centroid/sourceareaerror4.5e-10/queryheight~1e-13bağımsızdoğruladı. ActualWebGLnear/overview/coast/low-high-medium,390×844renderframe,WebGPUwarm60fps görüldü; extensionkaynaklıerrorayrı,finalappclean. Fizikseltelefon/TX15flight/logkalibrasyonuyok. GeçiciQAHTMLürünköktekopyasısilindi.

Canlı `v2.17.0-a8bd5e74aa80`: ARM64image/source240manifest/privateS3SSMhashve90runningimagesourcehash,HTTPShealth/5entryasset/uniqueids/admin401/leaderboard/öncekivisual-Sile-CADhash/newpublicscope pass.2clientWSSjoin/state/leavepass. Eskiappcontainer+writerdurduktansonratutarlı0600veriyedeğikorundu;7tenantIDs/images/running/nginxbytes aynı,Zenthpublicweb/API200,GelişimTLSorigin200. Son0restart28.09MiB/256MiB. CanlıreloadSOURCEONE6S650g1100/Şile/medium25°/RCkorundu,FPVDISARMhazır,apphatalogboş;TX15neworigincalibrationhâlâkullanıcıadımı. Commit/push/mergeyok. Ayrıntı docs/castle-coast-validation.json ve docs/AWS-HOSTING.md. Kanıt castle-coast-near/side/mobile/webgpu/live-2.17.png.


## 2.18.0 — Haritanın sahil hattı ve deniz (2026-11-02)

Kullanıcı kale/kayalık/deniz ve mevcut haritanın sahil hattının tamamını geliştirmeyi istedi. Mevcut OSMsnapshot3natural=beach poligonu yerelprojeksiyonla türetildi; harita içindeki kara parçalarında kumsal çizilir.1bare_rockmaskesinin tamamı kaynak kıyıya göre suda kalıyor: ada icat edilmedi, maske çizilmedi. Kanonik türetilmiş ODbLveri src/data/sile-coast.json ve byte-eşit public/maps/sile/coast-surfaces.json; generator tools/prepare-sile-coast.mjs. Hammap/OSM/DEM aynı. Çakışan eskiçim kumsal altından çıkarılır; raycastRED→GREEN üçgen derinlikleke sorununu korur. Kaynakçıplak kaya yerine mevcutkıyıyüzeyleri <=4m yatay/2m dikey parçalara ve <=8cm içefracture/ıslakkuru tonlara ayrılır; top/bottomlip ve fizikselkonservatifkıyı aynı.

Deniz, warp uygulanmış periyodik normal/roughness dokusu ve kendi opakalbedo alanıyla yenilendi. Düzenlisinüsçaprazı actualbrowserda reddedilip kaldırıldı. Kıyıda8..14m sanatsal renkişlemi tekdenizmalzemesinde512px mesafealanıdır; görünendalgalar normalmap, su geometrisi/fizikseviyesi düzdür. Köpük1.2..3.4m değişkengenişlik, hücreselalpha ve kapalıhalka için tamtekraredenuv, kısakıyıedge exactjoin, bütünkaradan conservativeclip. Geometrikkabarmalıdalga/batimetri/yenisahaölçümüyok;mevcut2x2kmmapiçindir.

397full/11unchangedinfra/build/diffcheck geçer. Freshreview2importantwashbackface/shortjoin,1minorUVseam buldu;3RED→GREEN tekfixpass. Yakınsuactualpreview sonradan saydamwashüçgenörtüşmesini gösterdi; ekRED→GREEN ilewashmesh/material tamamen kaldırılıpopakdenizalbedoalanınageçildi,GL/GPUsonuçtekrar görüldü. Busonmateryalbağımsızikinciincelemeyegirmedi; sayısal/worldUV/GL/GPUauthoracceptancegeçti. WebGLkale/kıyı/batıkumsal/doğu/nearwater,low-high-medium,390×844renderframe veWebGPUwarm60fps;3worldrebuildGL29geometrystable,initialshader/buildhiccupsvar;finalapp-errorboş. Fizikseltelefon/TX15flight/logeşleştirmesiyok.

Canlı `v2.18.0-b27b8592b4ad`:245source/ARM64archive/imagehash/93runningimagesourcehash/HTTPShealth/5entryassets/uniqueids/admin401/leaderboard/öncekiŞile-visual-CADhash/newpubliccoastsourcehash pass.2clientWSSjoin/state/leavepass. Eskiappcontainer+stoppedwriterconsistent0600databackupkorundu;7tenantIDs/images/running/nginxbytes aynı,Zenthpublicweb/API200,GelişimTLSorigin200.0restart17.75MiB/256MiB. LiveSOURCEONE6S650g1100/Şile/medium25°/RCkorundu,FPVDISARM/appclean;TX15kalibrasyonuyerindekullanıcıadımı. QAHTMLürünköktensilindi. Commit/push/mergeyok. Ayrıntı docs/entire-coast-validation.json; kanıt entire-coast-hero/overview/rocks/beach/east/mobile/webgpu/live-2.18.png.


## 2.19.0 — Genel Şile görünümü ve sahil bağlamı (2026-11-02)

AA'nın9Temmuz2022 tarihli Şile fotoğrafı yalnız görsel referans olarak incelendi, uygulamaya kopyalanmadı. KaynakOSM'den24yeşil alan,4çim alanı,9kaplama,12ağaç noktası,3plaj ve1liman türetildi. Aynı projeksiyondaki deterministik planlayıcı1582ağaç/çalı,72şemsiye ve ikili şezlong,28küçük tekne,56baba yerleştirir. Eşya boyları/yoğunluğu/yazlık düzen temsili; mevcut2×2kmkapsam ve hammap/DEM aynı. Uzun batı plajı bu kapsamın dışında devam eder; ölçülmüş birebir ilçe/tarama iddiası yok.

Yeni sert parçaların5690kutusu çizilen gerçek geometri dönüşümünden türetilir. Kaynak prizma sırası aynı; kaynak iskele izleri tek birleşik deckbatch kullanır. Ağaç/plaj/kara/su/yol/bina/spawn ve tekne ayak izi sınırları test edilir. Kaynak yeşil alan/çim/kaplamaları yazlık zemin renklerine yansır; yükseklik ve uçuş kuvveti aynı. Toplam30mesh. Ağaçları yalnız ilkmaskelere tüketen sıralama hatası, gerçek batıormanı ve>100mplaj dağılımı RED→GREEN testiyle düzeltildi.

404uygulama/11infra/build ve250yerel manifesthash geçti. Bağımsız inceleme bulgusuz; su/liman ayak izi,25kaynak sahipliği/temizliği ve seçeneklerde sabit çarpışma kutuları doğrulandı. Son dağılım düzeltmesi yazar kabulü ve404testle doğrulandı; ikinci bağımsız inceleme yok. WebGLfotoğraf açısı/liman/batıplajı/quality/rebuild/390×844renderframe ve deneyselWebGPU görüldü; çokluQAsekmelerinde47–60fps, baselinekapalı60fps. Bu fizikseltelefon veya genel60fpsgarantisi değil.

Canlı `v2.19.0-f442fab3123f`: ARM64,250manifest/96çalışan kaynak hash,HTTPS/publickaynak/öncekiassetkontrolleri ve ikiistemciWSS geçti. Önceki konteyner/tutarlı veri yedeği korundu,7mevcutservis/nginx aynı.0restart19.12MiB/256MiB;Zenthweb/API200,GelişimTLSorigin200. SOURCEONE6S650g1100mAh/Şile/medium25°korundu. Mevcut canlı giriş seçimi gamepad olarak gözlendi ve değiştirilmedi; önceki2.18makbuzuRCgösteriyordu. FPVDISARM, canlı errorlogboş. TX15kalibrasyonu/fizikseluçuş kullanıcı adımı. QAHTMLürünkökünden alındı;commit/push/mergeyok. Ayrıntı `docs/sile-town-validation.json`.


## 2.20.0 — Liman yüzeyi ve mendirek taşları (2026-11-02)

Genel Şile görünümüne devam kapsamında limanın düz toprak görünümü geliştirildi. Mevcut kıyı izinden seçilen batı mendireği ve liman yakınındaki kıyıdan içeri doğru temsili 10 m bant, yaklaşık 27.800,86 m² beton görünümlü kaplama kullanır. Alan seçimi ve malzeme dağılımı yazara aittir; ölçülmüş beton kapsamı, rıhtım genişliği veya yapı projesi değildir. Yeni maske birleşimi mevcut zemin üçgenlerini bölerek toprağın yerine kaplama çizer; aynı noktada iki yüzey oluşturmaz. Yeni kaplama fizik zeminiyle örneklenir; kaynak map/OSM/DEM, kıyı çizgisi ve özgün prizma sırası korunur.

748 düzensiz dolgu taşı, mevcut karada yol/bina/kalkış alanı ve önceki nesnelerden uzakta yerleştirildi. Yığın görünümü için taşların birbirine geçmesine izin verilir. Her taşın gerçek geometrisi ve dünya dönüşümünden konservatif kutusu üretilir; grafik kalitesinde gizlenmez. Dünya toplamı 32 mesh ve 6438 engel kutusu; yeni iki çizim grubu. Uçuş kuvveti, kamera ve kumanda ayarları değişmez; yeni görünür taşlar çarpışan engeldir. Fotoğraf/tarama veya yeni deniz dinamiği eklenmedi.

410 uygulama ve 11 infra testi, Vite ve ARM64 build geçti. Bağımsız inceleme Critical/Important bulmadı; 500 rastgele maske bölümü alan/ek öznitelikleri korudu. 748 taşın 49'ar ayak izi örneği su/plajdan uzak; mevcut nesne/prizma/kalkış kutularıyla çakışma yok. İncelemedeki tek Minor, eski kara kırpıcısının iç üçgen kenarlarında da 2 mm daraltma yaparak 19,33 m² kara kaplamasını eksiltmesiydi. Bu yeni yüzeyin alan sözleşmesi açısından gerekli düzeltme sayıldı: gerçek harita alan regresyonu RED→GREEN, sıfır marjlı kara birleşimi ve Float32'de çizgiye çöken yüzeylerin çıkarılması. Kalan 0,17 m², kaynak santimetre yuvarlamasının asıl kara dışında kalan parçasıdır. İkinci bağımsız inceleme yapılmadı. Son testlerde suya taşan kaplama/taş kutusu yok; maksimum kaplama yükseklik farkı 3,84 µm.

WebGL genel/yakın liman, düşük/orta/yüksek kalite, 390×844 çizim çerçevesi ve deneysel WebGPU karşılaştırıldı. Isınmış görünümde 60 fps gözlendi; yeniden oluşturma/shader başlangıcında 5–26 fps geçici düşüşler var. Üç yeniden oluşturmada 33 geometri sabit kaldı; yerel son error kayıtları boş. Fiziksel telefon/TX15 uçuşu veya uçuş logu kalibrasyonu değildir.

Canlı `v2.20.0-0bbae6d8f741`: 252 manifest ve 97 çalışan kaynak hash, HTTPS giriş/kaynak varlıkları, unique UI IDs, admin401, leaderboard salt okuma ve iki istemcili WSS doğrulandı. Önceki konteyner ve tutarlı veri yedeği korundu; diğer 7 servis/nginx aynı. Zenth web/API200 ve Gelişim TLS origin200; 0 restart,19.22 MiB/256 MiB. SOURCE ONE 6S/650g/1100mAh/Şile/medium/25° ve mevcut gamepad seçimi korundu. FPV DISARM, canlı error log boş. TX15 yeni origin kalibrasyonu kullanıcı adımı. Geçici QA kökten alındı; aynı dirty dal korundu, commit/push/merge yok. Ayrıntı `docs/sile-harbour-validation.json`.


## 2.21.0 — Sahil binaları ve yakın çevre (2026-11-02)

Kullanıcı özellikle sahil binaları/çevresini bitirip canlıda denemek istedi. Kaynak kıyı çizgisinin gerçek kenarlarına merkezden en fazla 100 m uzaklıktaki 135 uygun yapının duvarları yeni ortak cephe grubuyla değiştirildi. Harita kırpma kenarı kıyı sayılmaz; landmark, delikli ve geçersiz poligonlar eski duvar yolunda kalır. Mevcut ham map/OSM/DEM, bina taban izi/yüksekliği, çatı silüeti ve özgün çarpışma prizma sırası korunur. OSM yapı tipleri 1266 satırlık yeniden üretilebilir ODbL lookup'tan gelir; kaynak ve public JSON byte-eşittir.

1024 px/16 hücreli prosedürel atlas; farklı pencere, panjur, giriş ve kepenk şablonları, hafif sıva izleri ve deterministik sakin cephe tonları sağlar. Her konutta kaynak yola en yakın kenarın tek gözünde temsili giriş bulunur. Ticari zemin kat şablonları yalnız kaynak commercial/retail yapılarının bu kenarına uygulanır; işyeri adı veya güncel işletme envanteri icat edilmez. Atlas yeni cephe fotoğrafı değildir. 160 uygun denize bakan balkonun görünen sert parçaları gerçek dönüşümlerinden konservatif AABB üretir. Komşu bina, önceki nesne, su ve önce kabul edilen balkonlarla çakışanlar reddedilir. Özgün bina prizması kapalıdır; pencere/kapılar uçulabilir delik değildir.

Bina diplerindeki temsili 1,4 m bantlar mevcut toprak yüzeyinden ayrılarak yaklaşık 9190,04 m² kaplama üretir. Kaplama fiziksel arazi üçgenlerini izler; yeni kaldırım yüksekliği eklenmez. Kum alanlarının topraktan çıkarılması önce gerçekleşir; kaynak kara birleşimi suya taşmayı önler. Maksimum Float32 yükseklik farkı 19,56 µm; kaplama su üçgeni0. Dünya toplamı 36 mesh ve 8515 kutu. Uçuş kuvvetleri, kamera ve kumanda ayarları aynı; yeni balkonlar görünür çarpışma engelleridir. Cephe/balkon/kaplama boyutları ve yerleşimi tasarımdır; ölçülmüş tekil cephe veya fotogrametri iddiası yok.

418 uygulama ve 11 infra testi, Vite/ARM64 build/diff check geçti. Bağımsız incelemedeki iki Important, tek düzeltme geçişinde RED→GREEN ile giderildi:1 m aralıktaki karşılıklı balkonların birbirine geçmesi ve kollinear/kendini kesen bina halkalarının yeni duvar sahipliğine alınması. Yeni koruma geçerli içbükey poligonları destekler. Gerçek veri önce de balkonlar arasında çakışmıyordu; sınır fikstürleri sözleşme hatasını ortaya çıkardı. İkinci bağımsız inceleme yapılmadı. Tekil cephe kaynaklarının mevcut dünya temizliğinde bir kez dispose edilmesi doğrulandı.

WebGL yakın/geniş sahil, düşük/orta/yüksek kalite, 390×844 çizim çerçevesi ve3yeniden oluşturma; deneysel WebGPU yakın görünüm karşılaştırıldı. Warm60fps, ilk shader/rebuild5fps ve resize41fps geçici düşüşler görüldü; fiziksel telefon/genel60fps garantisi değildir. Yerel extension-style async message-channel-close ve açıkça Chrome passkeys eklentisinden bir hata vardı; shader/asset exception veya görünür uygulama arızası görülmedi. Son WebGPU ve canlı error kayıtları boş. Önce görüntüsü gerçek2.20source ve aynı kamera presetinden; tarayıcı viewport'u değişebilir.

Canlı `v2.21.0-395ad3ff12e2`:257manifest/100çalışan kaynak hash,HTTPS giriş/kaynak varlıkları,unique IDs,admin401,leaderboard salt okuma ve iki istemcili WSS doğrulandı. Diğer7servis/nginx aynı; önceki app/tutarlı veri yedeği korundu. Zenth web/API200,GelişimTLSorigin200.0restart18.44MiB/256MiB. SOURCE ONE 6S/650g/1100mAh/Şile/medium25° ve mevcut gamepad seçimi aynı;FPVDISARM ve canlı errorlogboş. Fiziksel TX15 uçuşu/log kalibrasyonu yapılmadı; yeni origin RC kalibrasyonu kullanıcı adımı. QA kökten alındı; dirty codex/simulator-v2 korundu,commit/push/merge yok. Ayrıntı `docs/sile-buildings-validation.json`.


## 2.22.0 — Sahil yerleşiminin çevresi (2026-11-02)

Kullanıcı sahil binaları sonrasında devam istedi. Bina yakınlarındaki tekdüze kuru toprak görünümü, kaynak bina izlerinden en fazla 35 m içinde temsili yaz yeşiliyle çeşitlendirildi. Bu bitki örtüsü/uydu ölçümü değildir. Kaynak park/orman/çim/plaj/liman/kaplama ve yol koridorları kendi görünümünde kalır; tüm kaynak bina içleri dışlanır. Mevcut grass_ground fotoğrafı değiştirilmedi; renk yalnız mevcut mikro dokunun üzerine vertex katmanı olarak uygulanır, bir kez çalışır ve fizik/collider durumunu değiştirmez.

Renk geçişini düzgün göstermek için mevcut çizim toprağındaki kesik kısmi kenarlar atomik ortak kenarlara eşleştirildi. 10 µm görsel welding, mevcut1mmgroundmerge toleransının altındadır; yalnız çöken sıfır alanlı sayısal kesik üçgenler çıkarılır. Sonra kaynak bina yakınında>8medge ölçütüyle en fazla3yerel bölme geçişi yapılır. Kaynak hamveri, fiziksel heightfield, bina/çatı/kıyı/prizma ve uçuş kuvveti değişmez. Gerçek çizim toprağı112232üçgen,250000tavanın altında; yerelNodebuild~1.38s. Sayısal düzlem/alan ve gerçek ön işlenmiş haritada yeni T-junction0 testi geçer.

Kaynak yol merkezleri ve mevcut türetilmiş genişlikler (OSM varsa onu, yoksa eski varsayımları) üzerinde56yol kenarı direği; temsili konut girişlerinin yanında38bitkilik eklendi. Konum/aralık/boyut/envanter yazara aittir, ölçülmüş güncel liste değildir. Yol koridoru, su, kaynak prizma, önceki ve yeni kabul edilen nesne/spawn açıklığı her gerçek parça kutusuyla denetlenir. Bitkilikler yerel arazi normaline oturur. Görünür katı parçalar kendi geometri/dünya dönüşümünden AABB üretir; düşük kalite bunları gizlemez. Küçük emissive lamba lensi görseldir, yeni dinamik ışık kaynağı yok. Toplam40mesh/8871kutu. Küçük bitkiler son görsel kabulde düz küreden düzensiz mottled320üçgenli authored yapıya geçirildi; shader/kolizyon/fulltest ve GL/GPU tekrar doğrulandı.

425uygulama/11infra,Vite/ARM64/diffcheck geçti. İncelemedeki Important, kısmi komşu kenarlarda yeni renk farkı oluşturan T-junction; Minor,50seçilmemiş bina içinin renk almasıydı. Tekfixpass RED→GREEN: gerçekharitada2943hangingedgehit→0 ve342473969bina içi.783→0. Önce kanonik atomik kenarlar, sayısal kesik noktaları için10µmtolerans ve sıfır alan filtresi, ardından yerel refinement; tüm bina içleri spatialindex ile dışlanır. İkinci bağımsız inceleme yapılmadı. Görsel bitki değişimi sonrası da425test geçti. Kaynaklar dünya temizliğinde tek dispose ve metadata null doğrulandı.

WebGL yakın giriş/geniş sahil/low-high-medium/390×844çizim çerçevesi/3rebuild; deneyselWebGPU aynı yakın açı ile kontrol edildi. Warm60fps,resize50fps,başlangıç/rebuild2fps geçici düşüş gözlendi; evrensel cihaz garantisi değildir. Yerelde açıkça Chrome passkeys uzantısı hata kaydı vardı; app shader/asset exception görülmedi. Son WebGPU/canlı error log boş. İlk canlı sekme static başlangıçta bekledi; QA sekmeleri kapatılıp1reload sonrasında kayıtlı profil ve uçuş açıldı, neden kesinleştirilmedi. Fiziksel telefon/TX15 uçuşu/log eşleştirmesi yapılmadı.

Canlı `v2.22.0-f237ea6e62b5`:260manifest/102çalışan kaynak hash,HTTPS giriş/kaynak varlıkları,uniqueIDs,admin401,leaderboard salt okuma ve iki istemciliWSS doğrulandı. Diğer7servis/nginx aynı; önceki app/tutarlı veri yedeği korundu. Zenthweb/API200,GelişimTLSorigin200;0restart18.62MiB/256MiB. SOURCEONE6S650g1100mAh/Şile/medium25°/mevcutgamepad seçimi aynı;FPVDISARMhazır. QAürünkökünden alındı,dirtycodex/simulator-v2korundu;commit/push/mergeyok. Ayrıntı `docs/sile-neighbourhood-validation.json`.


## 2.23.0 — Sahil yolları ve bina girişleri (2026-11-02)

Kaynak 340 yol (296 taşıt,44 yaya) artık ayrı şeritlerin üst üste çizilmesi yerine birleşik yüzey olarak bölümlenir. Kavşaklar sınırlı düğüm gövdeleriyle birleşir; asfalt geçişlerde önceliklidir. Sahil binaları yakınındaki uygun yollara temsili1,5m yaya bandı,104uygun kapı önüne1,25m genişliğinde ve<=18m bağlantı eklendi. Yaya yolları ve bina dibi kaplamaları aynı512px metre tabanlı taş desenini paylaşır. Girişler mevcut ağaç/taş/direk/bitkilik yerleşiminde boş bırakılır. İki bitkilik bu açıklık için elendi:56direk/36bitkilik kaldı.

Yollar kıyı/liman/bina dibi/yeşil zemin ayrımından önce bölümlenir; kaynak plaj/kaya katmanları aynı yol alanından çıkarılır. Kaynak kara ve tüm kaynak bina izleri gözetilir; kaplama alanları tek sahipli, araziyi sıfır kaldırmayla izler.41mesh/8867kutu/108883zemin üçgeni. Yol/yaya/bina dibi kaplamasında su üçgeni0; en büyük Float32yükseklik farkı26,19µm. Yol çizgileri, mevcut OSM veya varsayılan genişlikler, map/OSM/DEM, fiziksel arazi/prizma sırası, uçuş kuvvetleri ve giriş profili aynı. Kaldırım/giriş/desen tasarımdır; yeni saha ölçümü, bordür yüksekliği, fiziksel basamak veya trafik yok.

Yoğun kesimlerde önceki kenar bölme yöntemi726yeni kısmi-kenar eşleşme hatası gösterdi. Sayısal kaynak kesim kenarlarını aynen koruyan üçgen-içi merkez bölmesiyle değiştirildi; ince parçalar bölünmez, yeni kenar noktası üretilmez. Gerçek yeni yol girdisinde regresyon0yeni asılı nokta.14odaklı,432tam uygulama ve11infra testi;Vite/ARM64/diffcheck geçti. Bağımsız inceleme bulgu bildirmedi;104giriş dikdörtgeninde kesin poligon kırpma ile bina/su taşması0.

WebGLyakın/genel/kalite/390×844çizim alanı ve3yenileme, WebGPUyakın görünüm doğrulandı. Isınmış GL56–60/GPU60fps; kalite değişimi49, yeniden kurulum1–3fps geçici. Senkron kurulum sırasında otomasyon tıklamasının3s yanıt süresi doldu; her seferinde güncel erişilebilirlik ağacı sahnenin çizildiğini, kaynak sayısının44geometride kaldığını gösterdi. Uygulama hata kaydı boş; fiziksel telefon/TX15 uçuşu yok.

Canlı `v2.23.0-8f66e2a5a84a`:263manifest/104çalışan kaynak hash,HTTPSgiriş/kaynak varlıkları/uniqueIDs/admin401/leaderboard salt okuma/iki istemciliWSS geçti. Diğer7servis ve nginxaynı,önceki konteyner/tutarlı veri yedeği korundu. Zenthweb/API200,GelişimTLSorigin200;0restart18,86MiB/256MiB. SOURCEONE6S650g1100mAh/Şile/medium25°/mevcutgamepadseçimi aynı;FPVDISARMhazır. QAürünkökünden alındı;dirtycodex/simulator-v2korundu,commit/push/mergeyok. Ayrıntı `docs/sile-streets-validation.json`.


## 2.24.0 — Sahil cephe malzemeleri (2026-11-02)

135 mevcut sahil binasının ortak1024px/16şablon cephe atlası yenilendi. Camdaki temsili yansıma ve perde desenleri, farklı panjurlar, çerçeve ve denizlik gölgeleri, hafif sıva tanesi/yağmur/sıçrama izleri eklendi. Cam, sıva ve çerçeve ayrı pürüzlülük/yükseklik kanalları kullanır. Opaque ve emissive olmayan malzeme: gerçek iç mekân, cam açıklığı, fotoğraf veya güncel cephe envanteri değildir. Kaynak bina/harita/arazi/yol verisi ve fizik/input değişmez.

Atlas bir defada üç RGBA8kanalı üretir; gözlenen127,7ms, bağımsız incelemede133ms. DataTexture alt satırı v0, renk sRGB ve veri kanalları linear; mipmap/linear filtreleme, mevcut2pxUV inset ve15numaralı boş alınlık şablonu korunur. Mevcut ortak malzeme ve kaynak temizliği kullanılır; ek geometri/drawbatch yok.2.23cephe pozisyon/UV/renk ve tüm dünya çarpışma verisi SHA256 özetleri aynen eşleşir;41mesh korunur.

İlk RED3yeni doku testi başarısız, geometri sabitliği başarılıydı. Son4odaklı/436tam uygulama/11infra testi,Vite veARM64build geçti. Bağımsız inceleme bulgusuz, kendi4/4odaklı kontrolü geçti. WebGLyakın/sahil/kalite/dar390×844çizim alanı ve önce/sonra, WebGPUyakın kontrol edildi. IsınmışGL57–60/GPU60fps;başlangıç11 ve kalite geçişi49fpsgeçici. Uygulama hata kaydı boş;fiziksel telefon/TX15uçuşu yapılmadı.

Canlı `v2.24.0-9660654a4365`:264manifest/105çalışan kaynak hash,HTTPS/kaynak dosyaları/uniqueIDs/admin401/leaderboard salt okuma/iki istemciliWSS geçti. Önceki konteyner/tutarlı veri yedeği korundu;7diğer servis ve nginx değişmedi. Zenthweb/API200,GelişimTLSorigin200;0restart18,98MiB/256MiB. SOURCEONE6S650g1100mAh/Şile/medium25°/gamepad profili aynı,FPVDISARMhazır. İlk statik genel HTML normal bootstrap ile kayıtlı profile geçti;reload gerekmedi. QAürünkökünden kaldırıldı. Dirtybranch ve commit/push/merge yapmama tercihi korundu. Ayrıntı `docs/sile-facades-validation.json`.


## 2.25.0 — Kale çevresi ve kaya yüzeyleri (2026-11-02)

Kaynak kıyı yüzleri yatayda<=2m, düşey sütunlarda<=1m aralıkla ayrıntılandırıldı. Önceki<=8cm içe dönük dekoratif kırık sınırı korunur; kaynağın kıyı izi, lip/grid/diagonal noktaları ve fiziksel zemin değişmez. Yüzler iki halka yönünde de dışa bakar; ortak indeksli normallerle ışık geçişi iyileşir. Islak/kuru alan aynı üçgen yüzeyinin tek sahipli bölümleridir; ortalama su üstü0,5–0,8m temsili kontur, örtüşen şeffaf tabaka yok. Kıyı ve ada üstü1024px periyodik temsili kaya renk/normal/pürüzlülük haritalarını paylaşır. İlk fazla düzenli desen görsel kontrolde bırakıldı; son desen düzensiz hücresel kırık ve gürültü tabakalanmasıdır. Jeolojik ölçüm/fotoğraf değildir.

Yapay harita kesim sınırlarının deniz kayalığı gibi kapatıldığı bulundu. Bu yüzler kaldırılırken köpüğün yay mesafesi korunur. Hedefli regresyonRED44640konum→0. Önceki canlı108258kayalık üçgeni, son51802üçgen/30872indeksli köşe oldu; gerçek kıyı daha sık bölünürken toplam yük yaklaşık%52azaldı.41mesh/8867çarpışma kutusu aynı. Hammap/OSM/DEM, kale temeli, tüm fiziksel arazi/kutu/prizma ve ada/köpükgeometrisiSHA256 önceki2.24ile aynıdır. Dış veri kapsamı gerçek kıyı icat edilerek kapatılmaz. Büyük ölçekli düz kıyı biçimlerini doğru değiştirmek için daha ayrıntılı kaynak gerekir; bu sürüm30mDSM'yi değiştirmez.

16odaklı ve442tam uygulama testi geçti. Tam paket gerçekNode22.23.4linux/ARM64Docker ortamında, salt okunur proje bağlama ile çalıştırıldı; ilk koşuda üretim imajından miras kalanRELEASE_SHA eski sürüm olduğu için yalnız dev-sağlık beklentisi başarısızdı. Test ortamıNODE_ENV=test/RELEASE_SHA=devile ayrılınca442/442geçti; uygulama kodunda bu nedenle değişiklik yapılmadı.11infra,Vite,ARM64build ve diffcheck geçti. Mevcut ada kenarı testi artık altışarlı konum varsaymak yerine gerçek üçgen indekslerini/kenarlarını izler; aynı katı yükseklik ve grid kontrolleri korunur.

Bağımsız inceleme bulgusuz;10/10rock/island testi ve1000ek kırpma olayı geçti, en büyük3Dalan farkı1,14e-13. Tüm indeksli öznitelik/normaller sonlu.1m düşey aralık sütun boyunca geçerlidir; özgün eğimli lip'i izleyen üçgenlerin toplam yükseklik farkı1,986m olabilir. Bu açıklama kaynak eğimini düzleştirmeden kamu metnine/verisine işlendi.

WebGLyakın ada/yüksek kıyı/genel/kalite/390×844çizim alanı ve önceki sürüm karşılaştırması,WebGPUyakın geçti;ısınmış60fps/kalite52geçici, uygulama hata kaydı boş. HMR'de eskiQAsekmesi frame-querysüre aşımı verdi; kendi sekmesi kapatılıp aynı tarayıcıda yenisiyle kontrol tamamlandı. Önce/sonra her iki görüntüde mevcut yatay aydınlatma bandı gözlendi; nedeni bu kapsamda belirlenmedi veya düzeltilmedi. Fiziksel telefon/TX15uçuşu yok.

Canlı `v2.25.0-d1dc4cb9b99d`:265manifest/106çalışan kaynak hash,HTTPS/kaynak dosyaları/uniqueIDs/admin401/leaderboard salt okuma/iki istemciliWSS geçti. Diğer7servis ve nginx aynı;önceki konteyner/tutarlı veri yedeği korundu. Zenthweb/API200,GelişimTLSorigin200;0restart19,5MiB/256MiB. SOURCEONE6S650g1100mAh/Şile/medium25°/gamepad aynı,FPVDISARMhazır. QAürünkökünden kaldırıldı;dirtybranch/no commit/push/merge tercihi korundu. Ayrıntı `docs/sile-rocks-validation.json`.


## 2.26.0 — Bina dipleri ve sahil oturma alanları (2026-11-02)

10 uygun sahil binasının3cm–2m arası açık temel boşlukları, kaynak zemin üçgenleri ve bina izini izleyen46üçgenle kapatıldı. Aynı kaynak izinde10etiketli konservatif temel prizması eklenir. Kaynak duvar tabanı/yüksekliği/çatı/hamarazi değişmez; eğimin yüksek tarafındaki gömülü cepheler bu sınırlı düzenlemeyle düzeltilmiş değildir. Su/karaiçi boşluk kesen veya desteklenmeyen ayak izleri bütünüyle reddedilir. Tasarım temsili, saha temel ölçümü değil.

Sahil yakınındaki kaynak yol çevresine32bank mevcut çevre batch/clearance sahibiyle eklendi.192yeni gerçek dönüşümden türetilen kutu,9059toplam kutu/1286prizma/42mesh. Ayaklar1cm gömülür;0,5mm'den fazla havada veya2cm'den fazla gömülü köşe reddedilir. Yol/kıyı/bina/giriş bağlantısı/önceki nesne açıklığı korunur. Eski8867kutu/1276prizma özetinin tam başlangıç dizisi değişmez; eklerin tamamı yalnız coastal-bench/coastal-foundation etiketli. Bank envanteri temsili.

448/448Node22linuxARM64Docker testi,6odaklı,11infra,Vite/ARM64/diffcheck geçti. İlk6eski prizma sayımı yeni etiketli temeller için daraltıldı; sabit önceki hashler değiştirilmedi. İncelemede ayakların1,93cm havada kalabilmesi REDtest→gömme/katı destek kontrolüyle giderildi; başlangıç sırası sözleşmesi ek regresyonla sabitlendi. Spec yeniden inceleme6/6, bağımsız kalite inceleme23/23geçti, artık bulgu yok.

GLtemel önce/sonra ve banklar/kalite/390×844çizim alanı,GPUbanklar doğrulandı,error[]. IsınmışGL60,geçiş50–51,GPU50(paraleltest/build sırasında); fiziksel telefon/TX15uçuşu yok. Canlı v2.26.0-ccad8ed1f2c5:266manifest/107çalışan kaynak hash/HTTPSassets/source/uniqueIDs/admin401/WSSgeçti.7diğer servis ve nginx aynı;önceki konteyner/tutarlı veri yedeği korundu.0restart19,9MiB/256MiB. SOURCEONE650g1100/6S/Şile/medium25/gamepad aynı,FPVDISARMhazır. QAürünkökünden alındı;no commit/push/merge. Ayrıntı docs/sile-grounding-validation.json.


## 2.27.0 — Yokuş cephesi için yerel zemin kotları (2026-11-02)

Dört uygun kıyı binası (550130831/832,550116788,550130807) çevresinde mevcut duvar taban kotunda temsili1,4m çevre paylı düz alan oluşturuldu. Bina/çatı/duvar tabanı ve kaynak OSM/DEM/yükseklik dizileri değişmez; runtime zemini yalnız bu dört alanda değişir. En büyük kesim3,0476m/dolgu0,7457m; yol, kıyı(+0,15m emniyet), kara içi su boşluğu, komşu bina, kale, kaynak kaplama, doğuş alanı ve mevcut nesne sınırları gözetilir. Altı ilk adaydan ikisi mevcut nesnelere temas ettiği için elendi. Diğer131profil aynen korunur; bunların tamamının hatalı olduğu veya düzeltildiği iddia edilmez.

Yedi mevcut zemin sahibi gerçek indeksleri ve tüm öznitelikleriyle bölümlenir; dışarıdaki320680özgün üçgen birebir korunur. Yeni yüzeylerde bağımsız örneklenen düz yükseklikler1e-5m, yukarı normal>.999999 ve sentetik sınırlar1e-7ile doğrulandı. Kaynakta zaten bulunan Float32ince parçalar eski sürümle aynen karşılaştırıldı; dışarıdaki test2cm eski kaynak kuantizasyonunu taşır, yeni düz alan toleransı değildir. Kaynak dizileri/bina geometrisi/eski9059kutu/1286prizma ve nesne dönüşümleri aynı.43mesh/40gerçek istinat segmenti/60duvar üçgeni. Kale önce gelir; buildingPads ortak yükseklik/normal sorgusuna katılır. Duvarlar iki yönlü ve süpürülmüş küre/gerçek üçgen temasıyla fiziksel olarak temsil edilir, hayali büyükAABB/prizma eklenmez.

Girişlerdeki görünür16–23cm kot farkı açıkça temsili geçiştir; basamaksız/erişilebilir giriş iddiası yok. Bu alanlar yeni kent ölçümü veya mühendislik kazı projesi değildir. Uygun olmayan gömülü cepheler için daha ayrıntılı kaynak/ayrı tasarım gerekir.

Root incelemesi ilk indeksli zemin iterasyon hatasını gerçek dünya REDregresyonuyla yakaladı; gerçek indeks okuması düzeltildi. İlk tam459testte yalnız eski paylaşımlı/indeksli zemin sözleşmesi başarısızdı; konumları değiştirmeyen tamFloat32öznitelik indekslemesiyle giderildi. Bağımsız spec+kalite incelemesi hızlı küre temasının duvar üstü/uçlarını kaçırmasını Important bildirdi. Tek fixwave: gerçek üçgen mesafesinin48altın oran araması ve40en erken yarıçap kesişim bölmesi; yüz/üst/yanuç/köşe/eğimli dudak/iki yön/yakın kaçırma/duvar sırasından bağımsız ilk temas RED→GREEN. Yeniden inceleme analitik örnekte3e-14hata ile geçti, artık Important yok.

FinalNode22linuxARM64salt okunur Docker462/462test,22odaklı(14yeni+8görseldetay),11infra,Vite/ARM64/diffpass. GLönce/sonra/ikinci parsel/kalite/390×844çizim alanı veGPUilkparsel doğrulandı;ısınmışGL60/kalite53/GPU52,error[]. Kaynak düzenlemesi sırasındaki eskiHMRQAframe-timeoutkendi sekmesi kapatılıp aynı tarayıcıda yenisiyle aşıldı. Mevcut yatay aydınlatma bandı ve genel30mDSM sınırı sürer;fiziksel telefon/TX15uçuşu yok.

Canlı `v2.27.0-7e2da499e70a`:268manifest/108çalışan kaynak hash/HTTPSassets/source/uniqueIDs/admin401/iki istemciliWSS geçti.7diğer servis ve nginx aynı;eski konteyner/tutarlı yedek korundu. Zenthweb/API200,GelişimTLSorigin200;0restart25,32MiB/256MiB. SOURCEONE650g1100/6S/Şile/medium25/gamepad aynı,FPVDISARMhazır. QAürünkökünden kaldırıldı;no commit/push/merge. Ayrıntı docs/sile-pads-validation.json.


## 2026-11-02 — 2.28 kamera filtresi çözünürlük yönetimi

Kamera filtresi artık WebGL’de EffectComposer hedef boyutundan, WebGPU’da çizim tamponundan gerçek piksel çözünürlüğünü alır; oluşturma, ekran boyutu ve kalite/DPR geçişleri kapsanır. Önceki bağımsız kontrol sahnesindeki 1×1 filtre boyutu nedeniyle oluşan yatay renk bandı ayrıştırıldı. Canlı ana uygulama zaten mantıksal ekran boyutunu iletiyordu; burada doğrulanmış bir canlı ışık hatası giderildiği iddia edilmez. Bu sürüm yeni harita ayrıntısı, geometri, ışık kaynağı veya fizik eklemez.

İki RED regresyon sonrası üç odaklı test, tam Node22 ARM64 465/465, 11 infra, Vite/ARM64 ve bağımsız inceleme geçti. Kale/binalar/dar çizim alanı WebGL ve binalar/dar alan WebGPU hata olmadan kontrol edildi. Yerel disk doluluğu ilk test ve paketlemeyi kesti; S3 kopyası doğrulanan 11 eski yerel paket arşivi temizlenerek 1,545 GB açıldı, OrbStack yeniden açıldı ve tam test baştan geçti. Kaynak/kanıt/manifest/canlı geri dönüş korundu.

Canlı `v2.28.0-f3cbb587f514`: HTTPS, kaynak hashleri108/108, iki istemcili WSS ve FPV DISARM/error[] doğrulandı. SOURCEONE f60-1750-6s/650g/1100mAh/medium/25°/gamepad korunur. Yedi diğer servis ve nginx değişmedi; 0 restart/24,38MiB. QA kökten arşive alındı; commit/push/merge yok. Fiziksel telefon ve TX15 uçuşu denenmedi. Rapor `docs/sile-lighting-validation.json`.


## 2026-11-02 — 2.29 sahil cephelerinde fiziksel derinlik

Uygun 134 kıyı binasına dağıtılan384pencere takımına denizlik/üst/yan çerçeveler,160saçak şeridi eklendi. Paylaşılan atlas açıklık oranları2piksel UV kenar payıyla dünyaya taşınır; kapı/ticari giriş/boş döşemelere pencere takımı eklenmez. Çerçeve/taş renkleri özgün cephe boyasını izler. Yalnız iki yeni toplu çizim,1696yeni katı parça ve bunların gerçek dönüşümünden konservatif etiketli kutular;duvar önünde en fazla16cm çıkıntı. Kara/su deliği tam kırpma,son arazi yüzeyi ve eski kutu/diğer prizma çakışması takım düzeyinde reddedilir. Kaynak duvar/çatı/bina ölçüleri ve ham veri değişmez.

Bağımsız karşılaştırmada önceki9059kutu,1286prizma,4yerel teras ve tüm eski geometri öznitelikleri birebir aynı. Orta/düşük/yüksek kalite katı ayrıntı ve çarpışmayı korur; kaynak temsili mimaridir, gerçek güncel pencere envanteri değildir. Her pencereye detay eklenmedi; mevcut30mDSM kaynaklı kalan gömülü cepheler sürer.

5ilkRED→8yeniGREEN,36bağımsız odaklı test ve bulgusuz inceleme; finalNode22ARM64concurrency4tam473/473,11infra,Vite/ARM64 geçti. İlk tam koşudaki test fixture getImageData eksikliği ve eski kaya hash testinin yeni etiketli katıları kapsam dışında bırakmaması düzeltildi; özgün hash değiştirilmedi. GLaynıaçıönce/sonra/yakın/sahil/kalite/390×844çizim alanı;GPUyakın/dar alan uygulama hatasız. GLlogdaki iki passkey eklenti hatası uygulamaya ait değil. Fiziksel telefon/TX15 uçuşu yok.

Canlı `v2.29.0-298729911b76`:270manifest/109çalışan kaynak hash/HTTPSassets/source/uniqueIDs/admin401/WSS/FPVDISARM geçti. SOURCEONEf60-1750-6s650g1100mAh/medium25/gamepad aynı.7diğer servis/nginx değişmedi;geri dönüş ve tutarlı yedek korundu;0restart26,07MiB/256MiB. QAürünkökünden arşive taşındı;commit/push/merge yok. Rapor `docs/sile-architectural-validation.json`.


## 2026-11-02 — 2.30 sahil bitkilerinin görünümü

Mevcut3164ağaç tacı ve36giriş bitkiliği,32yaprak düzlemi/64üçgen ve128RGBA temsili yaprak dalı dokusuyla gösterilir. Tek parça opak yuvarlak görünüm yerine kesilmiş yaprak kenarları/boşluklar ve katmanlı silüet gelir. Her düzeyde sayısal mip ortalaması.35alfa eşiğini korur;son1×1ortalama.4408.36saksının mevcut katı üst yüzeyine iki üçgenli toprak görünümü eklendi; aynı instanced mesh içindeki ek malzeme grubu kullanılır. Yeni mesh/nesne/çarpışma kaydı eklenmez.

Bütün görünür bitki ve toprak noktaları önceki yerel sınırlar ve gerçek dönüştürülmüş konservatif kutular içindedir. Tüm10755kutu/1286prizma/4teras, kaynak veriler, instance dönüşümleri/renkleri ve bitki dışındaki bütün geometri birebir aynı; bağımsız karşılaştırma bunu doğruladı. Yaprak aralarındaki görsel boşluklar uçulabilir açıklık değildir; eski bitki çarpışma kutuları korunur. Botanik türü/fotoğraf/güncel bitki envanteri iddiası yok. Kaynak30mDSM ve temsili yerleşim sınırları sürer.

4ilkRED→GREEN ve toprak için ayrıRED→GREEN;6yeni odaklı,22bağımsızNode22odaklı, final479/479Node22ARM64concurrency4,11infra,Vite/ARM64 geçti. Ortak kaynakların bir kez bırakılması/idempotency/postbuildworldResources kapsamı incelendi. Eski mahalle lifecycle testi malzeme dizilerini destekleyecek biçimde daraltıldı. GLaynıaçıönce/sonra ağaç/bitkilik,kalite,darframe,uzakgenel;GPUağaç/bitkilik/darframe kontrol edildi. Heriki yolda60fps görüldü;donanım garantisi değildir. GLmesajkanalı gürültüsü karşılaştırma sekmesi kapandıktan sonra görüldü, render/shader hatası yok;GPUvecanlıerror[]. Fiziksel telefon/TX15 denenmedi.

Canlı `v2.30.0-d5fc927a38fd`:272manifest/110çalışan kaynak hash/HTTPSassets/source/uniqueIDs/admin401/WSS/FPVDISARM geçti. Ana odada üst üste duran eski test istemcileri nedeniyle temiz ekran kaydı ayrı hangar-check-230 odasında alındı; eski kullanıcı sekmeleri kapatılmadı. SOURCEONEf60-1750-6s650g1100mAh/medium25/gamepad korunur.7diğer servis/nginx aynı;geri dönüş/tutarlı yedek korundu;0restart24,5MiB/256MiB. QAürünkökünden arşive alındı;commit/push/merge yok. `docs/sile-foliage-validation.json`.


## 2026-11-02 — 2.31 İLKE · Şile manuel inceleme

Şile'ye kilitli, sıralama/akademi dışı ilk İLKE simülasyon katmanı: kale, sahil cephesi ve liman bölgesini manuel ziyaret etme; duraklatma, bekleyen bölge seçme, durdurma/sıfırlama, dönüş ve yerde DISARM ile bitirme. Her bölge için temsili bakış noktasının12m çevresinde ≤3m/s, FPV ±15° ve gerçek sahne geometrisinde açık görüşle3sn kesintisiz bekleme gerekir. Geçici0° kamera yalnız bu modda; kaydedilmiş eğim/drone/alan tercihi korunur.80mAGL/20dk ve diğer eşikler yazılmış demo kurallarıdır, saha/kanuni yeterlilik değildir.

5Hz yerel telemetri, gerçek giriş türünün lift/r2 veya RC throttle değerleri, olaylar ve en fazla3adet320×180simüleJPEG; kompakt UTF8JSON2.5MB sınırında indirilir. Yaklaşık WGS84 kaynak izdüşümüdür; ölçülmeyen voltaj null, batarya model değeri. Son terminal rapor yalnız tarayıcıda saklanır; kota hatası görünür ve bellekte indirme sürer. İnceleme kayıt/poz/sonuçları sunucuya yüklenmez; diğer pilotlar bu modda görünmez. Tekrar kayıtlı pozları oynatır, fizik yeniden çözümü değildir; bitince tam uçuş durumu ve duraklatılmış menü geri gelir. Harita, zemin, çarpışma ve fizik sahipleri2.30 ile kaynak hash karşılaştırmasında aynı.

21saf+10görünüm yeni test; tam Node22linuxARM64/concurrency4:510/510,11infra,Vite veARM64 görüntü geçti. Bağımsız görev incelemesindeki ham lift/r2 kaydı ve son incelemedeki UTF8 indirme boyutu/duraklatılmış uzaktan pilot katılımı düzeltildi; scoped yeniden incelemeler geçti, açık Important yok. Minor: elle değiştirilmiş localStorage'daki bazı anlamsal olarak imkânsız eski raporlar indirme için kabul edilebilir; içe aktarım/tekrar/canlı uçuş etkisi yok.

Gerçek kaynak sahnede üç görüş ışını açık. Açıkça SENTETİK etiketli modül kontrolünde bakış noktalarına konum atandı: GL/GPU3/3,9.10simülasyon saniyesi/46örnek/3JPEG; kapalı görüş GL209.9simülasyon saniyesinde0/3/0görüntü. GPU390×844çizim alanında tekrarlandı, error[];60fps gözlemi garanti değil. Bu tam rotanın fiziksel uçuşla tamamlandığı anlamına gelmez. Gerçek arayüzde yerde ARM→6.29sn/32örnek/0gözlem→durdur→20110baytJSON→tekrar→aynı duraklatılmış menü doğrulandı; yerel RC tercihi geri alındı. Fiziksel TX15/telefon veya tam manuel rota uçuşu denenmedi.

Canlı `v2.31.0-b2bdbccd35e4`:276manifest/112çalışan kaynak hash/HTTPSassets/kaynaklar/uniqueIDs/admin401/iki istemciliWSS geçti. Yeni mod FPVDISARM0/3 veerror[]; SOURCEONEf60-1750-6s650g1100mAh/medium25/gamepad aynı.7diğer servis/nginx değişmedi; eski konteyner/tutarlı yedek korundu;0restart22.9MiB/256MiB. Gerçek İLKE aracı/SITL/MAVLink/sensör doğruluğu veya kusur tespiti teslimi değildir. Şile önizleme kurulumundaki ana iş parçacığı beklemesi sürer. QAürünkökünden arşive alındı; commit/push/merge yok. Rapor `docs/sile-inspection-validation.json`.


## 2026-11-02 — 2.32 Şile incelemesinde yönlendirme ve harita özeti

Manuel inceleme HUD’u yatay mesafe, bakış noktasına kot farkı (AGL değil), üç boyutlu bölge mesafesi, hız/demo eşiği ve kesintisiz gözlem çubuğunu gösterir. Dönüş gerçek başlangıç konumunu kullanır; terminal kayıtta hedef gizlenir. Menüde mevcut kaynaklardan kuzey yukarı 2D özet:4kara poligonu/340yol, üç numaralı bakış noktası, H başlangıç ve sarı mevcut konum. Kaynak/harita geometrisi, fizik, gözlem kuralları ve kayıt çekirdeği2.31ile byte-identical. İşaretler güvenli uçuş koridoru veya otopilot değildir.

8RED→GREEN yeni test/39birleşik odaklı, final518/518Node22linuxARM64concurrency4 (139636.7ms),11infra,Vite/ARM64 geçti. İlk2CPU koşusu da518/518 (339570.9ms); reviewfixsonrası tamkoşu tekrarlandı. Bağımsız incelemede2Important/noMinor:portraitkaynaketiketiHUD’uörtüyordu;actualboundsResizeObserver+resize/disposeile390×844 aralık-70.78125px→8px ve844×390aralık8px doğrulandı. Tekrar→MENÜ haritası kayıtlı pozu canlı konum gibi adlandırıyordu; görünür not/SVGaria/title ve kayıt sonu bölge durumu etiketi RED→GREEN. Tek native fixpass sonrası tümtestleryeşil.

GerçekUIyerde19.8snARMkaydı/0gözlem→stop→replay→MENÜ→devam→tekrarıbitir, aynı duraklatılmış kayıt/normalmapnote geri geldi. Yerel RC650g1100medium0 ve viewport geri alındı. GL/desktop/portrait/landscape ve canlıerror[]; bu DOM/SVGdiliminde GPUtekrarçalıştırılmadı. FizikselTX15/telefon/tammanuelflightyok. EskiHMRsekmesininCDPbeklemesi veChromeuzantısının1→4yenidenkaydı sonrası aynıtarayıcıdatemizsekmeilekontroltamamlandı; kullanıcısekmelerikapatılmadı. Önizlemenin anaişparçacığıbeklemesisürer.

Canlı `v2.32.0-f52f89ea77ff`:277manifest/113çalışankaynak hash/HTTPS/source/uniqueIDs/admin401/WSS/yeniHUDDISARM+menüharitası geçti. SOURCEONEf60-1750-6s650g1100medium25/gamepad korunur.7diğerservis/nginxaynı;eskiapp/tutarlıbackupkorundu;0restart25.05MiB/256MiB. Commit/push/merge yok. `docs/sile-inspection-navigation-validation.json`.


## 2026-11-02 — 2.33 Şile önizlemesinin gereksiz tekrar kurulmasını kaldırma

Şile zaten seçiliyken inceleme hazırlığına giriş, billboard önizlemesini koşulsuz clearWorld/buildWorld ile yeniden kuruyordu. Aynı başarılı önizleme artık harita/azaltılmış seçenek/kamera/dünya tokeni ve worldMatches eşleştiğinde korunur. İlk kurulum, gerçekten başka haritaya geçiş, dış clearWorld ve başarısız kurulumdan sonra tekrar deneme korunur. Dünya oluşturma, ışık/gölge/kamera ayarlarının mevcut gövdesi aynı sahipte updateBillboardMap olarak ayrıldı; araçlar finally içinde yeniden bağlanır, yalnız tam başarıdan sonra WeakMap kaydı tutulur. Harita, geometri, fizik, inceleme kuralları ve profil değişmez.

Gerçek kaynak Şile ile aynı seçim4013.175ms ve değişen worldToken RED; korunmuş token/kaynak/çocuk/araç/projeksiyon ve0disposal ile0.022ms GREEN.3yeni test geçti; bağımsız inceleme3/3/0.020ms, Critical/Important yok. DeferredMinor: test kaynak bırakılmasını>0 olarak doğruluyor, kaynak başına tam bir defa olay saymıyor; mevcut clearWorld Set sahibi değişmedi, runtime hatası bulunmadı. Bu ek kapsam testi ertelendi.

Final521/521Node22linuxARM64concurrency4 (151730.1ms),11infra,Vite/ARM64 geçti. Önceki canlı2.32etkileşim çağrısı6457ms/3snCDPdeadline; yeni yerel292/284ms, yeni canlı297/273ms. Bunlar bu iş istasyonundaki otomasyon çağrı süreleri, ilk yükleme veya bütün cihazlar için garanti değil. GerçekŞile→Depoönizlemesi veDepo→Şilekurulumu/geri tercih; sonra hızlı tekrar giriş,FPVDISARM0/3/error[] doğrulandı. YerelRC650g1100medium0 korunur; canlıSOURCEONEf60-1750-6s650g1100medium25/gamepad aynı. İlk Şile başlangıcı ve gerçek harita değişimi hâlâ senkron ve yavaş olabilir; yalnız gereksiz aynı harita kurulumu kaldırıldı. FizikselTX15/telefon/tamrota/GPU uçuşu bu dilimde denenmedi.

Yerel175MiB alanla ilk Docker imageexport ENOSPC verdi; canlı2.32 o sırada değişmedi. LocalSHA/receipt/S3size/remoteStageSuccess doğrulanan2.29/2.30/2.31üretim arşivlerinin yalnız yerel kopyaları424095691bayt ve manifestin tüm dosyalarıyla birebir doğrulanan aynı3eski buildkopyası198093747bayt temizlendi;30bayt başarısız yeni export kaldırıldı. Asıl kaynak/beforekanıtları/manifest/receipt/current2.32paketi ve remote rollback korundu. Tekrar export ve yayın geçti.

Canlı `v2.33.0-49b01ebfc1b8`:277manifest/113çalışan kaynak hash/HTTPS/source/uniqueIDs/admin401/WSS/FPVDISARM geçti.7diğer servis/nginx aynı; eski konteyner/tutarlı yedek korundu;0restart22.98MiB/256MiB. No commit/push/merge. `docs/sile-preview-reuse-validation.json`.


## 2026-11-02 — 2.34 ana ekranda gizli uçuş sahnesini kurmayı erteleme

Ana ekranın görünür billboard önizlemesi yanında gizli ana uçuş dünyası da başta tam kurulup ortamı pişiriliyordu. Ana dünya artık ilk Uçuşa başla isteğine kadar oluşturulmaz. Aynı mevcut dünya sahibi güncel harita/gece/kalite/lite/GPU/sky/props seçenekleriyle kurar; hazır bayrağı yalnız başarılı build+bake sonrası açılır. Tekrar uçuşu uygun dünyayı korur. Kamera, geometri, fizik, kaynak ve inceleme kuralları değişmez.

İlk uçuşta görünür hazırlık katmanı ve etkileşimsiz hazırlık ekranı; doubleRAF ile çizime fırsat verdikten sonra mevcut senkron kurulum yapılır. İkinci başlatma beklerken reddedilir; hata/çizim hatasında kilit çözülür, yarım dünya temizlenir ve yeniden deneme mümkündür. Audio unlock kullanıcı hareketinde kalır. Uçuş rejoin/start dünya başarısından sonra; mevcut ana ekran oda bağlantısı değişmez. İlk uçuş maliyeti taşındı, yok edilmedi; önizleme ve dünya kurma hâlâ ana iş parçacığındadır.

3RED→4GREENgate (eski startupgate1dahil), final524/524Node22linuxARM64concurrency4 (141406.4ms),11infra,Vite/ARM64 geçti. Freshreview0Critical/Important,1Minor: hata sonrası klavye odağı başlatan düğmeye dönmüyor;Tab ile geri erişilebilir, bu ek odak düzeltmesi ertelendi. Nullplay tüketicileri, kalite/gece/seçim, başarısız kısmi hazır durumu, temizlik ve ağ callbacks incelendi.

GLanaekran/ilk dünya öncesi kalite low→medium/gerçek görünürloadingcapture/ilk ve tekrarDISARMhazır/error[];GPUquery1gerçekWebGPUilk+tekrar/60fpsgözlemi/error[];AkademiHavadaKal/Kapalıhangarilkbaşlat/duraklat/hazırlığadön,error[] geçti. Ders tamamlama veya fizikselTX15/telefon/tamrota uçuşu iddiası yok. YerelRC650g1100medium0veŞiletercihi korunur. Örnek cachedChrome reload→homeDOM gözlemi önce canlı2.33:10965ms, yerel2.34:6519ms, canlı2.34:9127ms; kontrollü benchmark/cihaz garantisi değil. Yerel tekrar uçuş249ms, canlı246ms. Yerel ilk-start görüntüsü loading’i gösterir; canlı first-start görüntüsü yakalandığında hazır uçuşa geçmişti, loadingkanıtı diye sunulmaz.

Paket için273532050bayt doğrulanmış üretilmiş kopya temizlendi:2.32localarchive+build ve2.33build. LocalSHA/manifesttamdosyaeşleşmesi/S3size/stageSuccess doğrulandı; asıl kaynak/beforekanıt/receipt/manifest/current2.33archive/remoterollback korundu.

Canlı `v2.34.0-86cadc92fbdd`:277manifest/113çalışan kaynak hash/HTTPS/source/uniqueIDs/admin401/WSS/ilk+tekrarFPVDISARM/error[] geçti. SOURCEONEf60-1750-6s650g1100medium25/gamepad korunur.7diğer servis/nginx aynı, oldapp/tutarlıbackup korunur;0restart24.01MiB/256MiB. Main üzerinden devam edildi, yeni çalışma dalı açılmadı; teslim commit'i Git geçmişinde tutulur. `docs/lazy-flight-start-validation.json`.


## 2026-11-02 — 2.35 hazırlık hatasında klavye odağını geri verme

2.34 incelemesindeki küçük odak sorunu giderildi. Etkin öğe hangar inert olmadan önce tutulur; hazırlık bittiğinde hangar açıldıktan sonra uçuş başlamamışsa bağlı/görünür/etkin önceki öğeye preventScroll ile odak geri verilir. Önceki düğme artık görünmüyorsa mevcut ekrandaki Uçuşa başla veya Hızlı uçuş yedeği kullanılır. Başarılı uçuşta gizli hangara odak taşınmaz; tutulan referans temizlenir. Dünya kurma, fizik, harita, profil ve startgate aynı.

Gerçek arayüzün üretilmiş kopyasında açıkça SENTETİK etiketli tek seferlik kurulum hatası, ayrı49351loopbackorigin/veri alanında çalıştırıldı. ÖnceBODY/boşactiveId/retryFocusPass=false RED; düzeltmeden sonra go-dock/true GREEN ve yalnız :focus Enter ile tekrar deneyinceDISARMhazır uçuş açıldı. Uçuş görünür olduktan sonraki sentetik hatada temizlik ana ekrana döndürdü; eski düğme gizliyken odak home-quick/true, yalnızEntertekrarıserbestuçuşDISARMilebitti. Başarılı durumdaactiveIdboş/normalbody,loadinghidden. Bunlar gerçek üretim hatası veya donanım uçuşu değildir. Test sunucusu durduruldu; üretim kaynağında QAthrow yok, QA dosyaları release’e girmedi.

Yeni otomatik test eklenmedi; küçükDOMdüzeltmesi actualUIRED→GREEN/sınırdurumu/klavyeretri ile doğrulandı. Mevcut524/524Node22linuxARM64concurrency4(123369.7ms),11infra,Vite/ARM64 ve owned-diffcheck geçti. Bu dilim yazarın kapsamlı diff/selfreview kontrolünden geçti; yeni bağımsız inceleme yapılmadı.

Paket alanı için SHA/manifest/S3size/stageSuccess doğrulanmış eski2.33yerelarchive ve2.34üretilmişbuildkopyası207459732bayt temizlendi. Asıl kaynak/beforekanıt/receipt/current2.34archive/remotebackupkorunur.

Canlı `v2.35.0-c37c3a8426e3`:277manifest/113runninghash/HTTPS/source/uniqueIDs/admin401/WSS/normalEnterstartFPVDISARM/loadinghidden/error[] geçti. SOURCEONEf60-1750-6s650g1100medium25/gamepad korunur.7diğer servis/nginx aynı; eski app/tutarlıbackup korunur;0restart24.48MiB/256MiB. Main üzerinden çalışıldı, yeni dal açılmadı. `docs/start-focus-validation.json`.

## 2026-11-02 — 2.36 Şile yol sorgusu performansı

CPU profili, bina çevresindeki zemin rengi için her uygun noktada bütün 7.557 yol parçasının tarandığını gösterdi. Aynı modüle 48 m hücreli, kaynak sırasını koruyan indeks eklendi. Parça başına 1.024 hücre ve toplam 65.536 referans sınırı vardır; geniş veya güvenli olmayan aralıklar sıralı global yedekte kalır. Son AABB/mesafe/smooth hesabı aynıdır. Global veri önbelleği, yeni bağımlılık, geometri azaltma veya fizik değişimi yoktur.

Önceki iki tam kurulum 4326/3757 ms, sonraki 3938/3429 ms: yaklaşık %9 yerel Node kurulum kazancı. Canvas shim ve CPU profiler kullanılmıştır; bunlar cihaz yükleme/FPS ölçümü değildir. 83.025 Float64 zemin örneği ile tam dünya geometri/malzeme skalerleri ve çarpışma özetleri birebir aynı. Örneklenen alanda yol aday sayısı ortalama 9.12, p95 29, en çok 62. Baseline 46 mesh, 10.755 box ve 1.286 prism korunur.

Yeni beş testin eksik API ile RED, uygulama sonrası GREEN olduğu görüldü. Bağımsız inceleme Critical/Important bulmadı; aggregate grid limitini aşmayan test fixture hakkındaki Minor düzeltildi (200 parça, uzak sorguda fallback ve birleşmiş sıra/tekrarsızlık). 529/529 Node22 ARM64, 11 infra, Vite ve ARM64 paket geçti. Yerelde GL ve gerçek WebGPU DISARM/0/3/error[] doğrulandı. Canlı ilk sekme uygulama başlamadan bekledi; ağ izlemesinde dosyalar HTTP200 idi, yeniden yükleme sonrası profil ve uçuş açıldı. Bu bir yükleme süresi ölçümü değildir.

Canlı `v2.36.0-0296056ce7e4`: 277 manifest/113 çalışan kaynak hash, HTTPS varlık/kaynak, admin401 ve iki istemcili WSS geçti. İnceleme DISARM/0/3/error[]; SOURCE ONE f60-1750-6s/650g/1100mAh/medium/25°/gamepad korunur. Diğer yedi servis ve nginx aynı, rollback container ve tutarlı veri yedeği korunur; 0 restart,24.41MiB. Haritanın yaklaşık arazi/temsili mimari sınırları sürer; fiziksel TX15 veya gerçek İLKE doğrulaması yapılmadı. `docs/sile-build-profile-validation.json`.

## 2026-11-02 — 2.37 bina tabanı sınır hesabı

Özel bounds yardımcısının dört map/spread geçişi tek Math.min/max geçişine indirildi; kırpma sırası, veri, geometri ve fizik aynı. 3240 kaynak/ters/signedzero/NaN/infinity/boş girdi karşılaştırması ve 19 ilgili mevcut test geçti. 83025 Float64 zemin değeri, geometri/malzeme ve çarpışma özetleri birebir. Yerel CPU profilli iki kurulum4611/3963→4348/3712ms (~%6); bounds inclusive381→28ms. Eşzamanlı testle kirlenen ilk after ölçümü atılıp tek başına tekrarlandı; scratch kanıtı tutulur. Bu FPS/cihaz süresi garantisi değildir. Küçük özel aritmetik değişim yazar diff/selfreview ile incelendi, yeni bağımsız inceleme veya uygulamayı yansıtan yeni test yok. 529/529 Node22 ARM64,11infra,Vite/ARM64 geçti.

Canlı v2.37.0-89734fb23807:277manifest113runninghashHTTPS/source/admin401/WSSpass;0restart24.73MiB. Diğer7servis/nginxaynı,oldapp/tutarlıbackupkorundu. Gerçek dünya yerelGL ve ayrı sentetik sabit liman kamerasında çizildi; yeni canlı tamrota/fizikselkumanda testi yapılmadı. Kullanıcı gemili limanın kıyıdan kopuk görüntüsünü öncelikledi: kaynakta3iskeleucu5–40m açıkta; sonraki görev kara doldurmadan kaynak/fotoğrafla bağlantıyı doğrulayıp düzeltmek. `pad-bounds-validation.json`.

## 2026-11-02 — 2.38 liman iskelelerinin kıyı bağlantısı

Kullanıcı gemili limanın deniz ortasında kopuk görünmesini ve kıyı gerçekçiliğini öncelikledi. Gerçek kaynak dünya sabit kamerada incelendi: üç iskele terminali kaynak kıyıdan yaklaşık5–40m açıkta kalıyordu. Kaynak OSM merkez çizgileri, mevcut iskeleler ve tekneler korunarak mevcut kıyıya üç eğimli erişim bağlantısı yapıldı. Genişlik2.4m; toplam bağlantı uzunlukları8.29/25.15/43.24m. Korkuluklar ve iç liman kaynak kenarlarında rıhtım yüzeyi eklendi. Referans: Vikimedyahesap, Şile Limanı Ağustos2024 (CC0), https://commons.wikimedia.org/wiki/File:%C5%9Eile_Liman%C4%B1_A%C4%9Fustos_2024.jpg ; görsel tarayıcıda incelendi, pakete kopyalanmadı. Boyutlar temsili; arazi doldurma, yeni kıyı ölçümü veya mühendislik kabulü değil.

Yeni2mesh/1206actualFloat32contacttriangle, bunun6tabliyeüstü iniş yüzeyi/234rıhtımüçgeni. Deniz altı/gizli kutu-kama yerine çizilen tabliye, korkuluk ve rıhtım üçgenleri mevcut swept sphere temas akışında çalışır; alttan uçuş açık kalır. Yukarı tabliye teması grounded/worldTouchdown üretir; alt yüzey teması iniş sayılmaz. Temas sınırları kurulumda önhesaplanır, her adımda tekrar dizi üretilmez. Kaynak terrain/kıyı/iskele/tekne yerleşimi aynı. Önceki46mesh/10755box/1286prism hashleri yeni iki nesne ve authored kayıtlar ayrılarak birebir korunur; yeni toplam48mesh.83025Float64zeminörneğideaynı.

İlk eksik modül/temas testleri RED→GREEN. Bağımsız incelemede içe bakan rıhtım yüzleri ve üç bağlantı arkasındaki kıyıyı dışlayan seçim Important bulundu; suya bakan winding ve mevcut nearHarbour sınırıyla düzeltildi. Dikey UV alanı ve tabliye iniş kaydı Minor da ayrı RED→GREEN ile kapandı. Son26odaklı test ve536/536Node22linuxARM64concurrency4(139876.1ms),11infra,Vite/ARM64 geçti. İlk tam koşuda2tarihsel çizim sayısı kontrolü yeni2batchi dışlıyordu; iki nesnenin varlığı doğrulanıp bütçe+2olarak güncellendi; önceki geometri/fizik hashleri değiştirilmedi. GerçekGL/WebGPU genel/yakın/sudanrıhtım sabit kamera/error[]; görüntüler açıkça sentetik kamera, gerçek uçuş değil. QA dosyaları ignored/local, yayın paketine girmedi ve sunucu kapatıldı.

Canlı v2.38.0-44f8624aaa0d:279manifest114runninghashHTTPS/source/newmetadata/admin401/WSS/inspectionDISARM0/3/error[];SOURCEONEf60-1750-6s650g1100medium25/gamepadkorunur.0restart24.2MiB/256MiB;7diğer servis/nginxaynı;oldapp/tutarlıbackupkorunur. FizikselTX15 veya gerçekİLKE/yeni tammanuelrota kabulü yok. `docs/sile-mooring-validation.json`.

## 2026-11-02 — 2.39 kullanıcının istediği doğrudan iskele birleşimi

Kullanıcı2.38’deki ayrı geçitleri istemedi; iskeleyi doğrudan bağlamayı istedi. Dar2.4m geçitler, korkuluklar ve kutu üretme yardımcısı kaldırıldı. Her iskelenin kaynak terminal kesitinden eksen çıkarılır ve o eksenin ilk kara geçişine uzatılır. Yaklaşık3.98m mevcut model genişliği (yuvarlama için iki yanda1cm pay), aynı gövde tabanı ve kıyıya oturan uçlar korunur. Eklenen uzunluklar8.88/26.21/44.22m. İnce, altı açık köprü yerine mevcut iskelenin tam derinlikli gövdesi doğrudan devam eder. Kanonik kaynak verileri/tekne yerleri ve2.38temas motoru aynı; rıhtım yüzeyi korunur.

Yeni doğrudan birleşim regresyonu eski2.38’de2916vs108vertex ve yanlış genişlikle RED; kaynak kesitine dik eksen, yaklaşık kaynak genişliği ve tam36kapalı uzantı üçgeniyle GREEN. Toplam yeni mooring/quay teması1206→270üçgene indi (234rıhtım+36uzantı;6üst iniş). 12odaklı ve536/536Node22ARM64concurrency4(181560.3ms),11infra,Vite/ARM64/diffcheck geçti. Eski dünya golden/83025Float64zemin verileri aynı. Dar geometrik müşteri düzeltmesi yazar scopedselfreview ile incelendi; yeni bağımsız inceleme veya2.39WebGPU tekrar koşusu yok, renderer/fizik motoru aynı. GerçekGL yakın sabit kamera/error[]; görsel sentetik kamera, fiziksel uçuş değil. QA49353kapatıldı ve pakete girmedi.

Canlı v2.39.0-e8fe147865f3:279manifest114runninghash,odaklıHTTPS(version/uniqueIDs/newpage+metadataSHA/entryassets),WSS veinspectionDISARM0/3/error[] geçti. SOURCEONEf60-1750-6s650g1100medium25/gamepad korunur.0restart26.3MiB/256MiB;7diğer servis/nginxaynı,oldapp/tutarlıbackupkorunur. Değişmeyen public varlıklar tekrar indirilmedi; değişen sayfa ve metadata HTTPS hashleri kontrol edildi. `docs/direct-piers-validation.json`.


## 2026-11-02 — 2.40 Şile kıyı ve sokak kaynak denetimi

Yaklaşık2×2km kaynak alanı bağımsız GIS ile karşılaştırıldı. Eksik primary_link1025872605, içbükey adacık kıyısı256360436 ve karaya kırpıldığı için görünmeyen yaya köprüsü1531132593 düzeltildi.339kaynak yol/341parça,7kıyı çizgisi/5kara alanı;114adlı parçada isimler korunur. Kıyı0.0067m/yol0.0071m farkı yalnız OSM dönüşüm yuvarlamasıdır, saha doğruluğu değildir. Eski340yol geometrisi,1266bina,10yapı,özgünOSM/DEM ve65×65yükseklik aynı; eski4kara poligonu geometrik olarak aynıdır. Doğrudan3iskele birleşimi korunur. Köprü kaynak merkez çizgisinde, uç kotları arasında temsili yükseklikle çizilir; çizilenFloat32üçgenler temas yüzeyidir.

Bütün yol genişlikleri sınıf tahmini; kaynakta0width etiketi var.30mDSM adacığı0m gösteriyor; yüksekliği uydurulmadı.1485112031/1485112032servis yollarının su/kıyı ilişkisi kaynakta belirsiz; doğrulanmış dolgu/köprü gibi sunulmadan amber işaretlendi. Bayrak Caddesi alt geçiş kot ayrımı da çözülmüş sayılmaz. Kontrol haritası /sile.html#geography-audit üzerinden339kaynak yoluna tıklanır. TümŞile/birebirölçüm/gerçekTX15 veyaİLKEuçuş kabulü değildir.

3GIS/541Node22/11infra,Vite/ARM64 geçti. Bağımsız inceleme temiz;93köprü temas probu geçti. GL/WebGPU kaynak sahne/error[] sabit kamera kanıtı tutulur. Canlıda yeniJS eskiönbellek haritasını yükleyebiliyordu: gerçek tarayıcıda340yol/4kara görüldü; loader cache:no-cache ve RED→GREEN testinden sonra önbelleği silmeden341yol/5kara,error[],DISARM0/3 doğrulandı.

Canlı v2.40.0-6b3a5ede6c5a:281manifest/114runninghash,8değişenpublicSHA/HTTPS/uniqueIDs/entryassets/WSS geçti.0restart24.65MiB/256MiB;7diğer servis/nginx aynı,Zenthweb/API200,GelişimTLSorigin200;eskiapp/tutarlıbackupkorundu. [Doğrulama](sile-geography-validation.json).


## 2026-11-02 — 2.41 liman beton yüzeyleri

Mevcut rıhtım, mendirek kaplaması ve iskele bağlantılarında kodla üretilen plaka derzleri, mineral gözenekleri ve düzensiz aşınma kullanılır. Rıhtım duvarının koyu/ıslak kuşağı ortalama deniz seviyesine göreUV eşlenir; dikeyclamp tekrarlanan su bandını önler. Albedo sRGB, bump/roughness doğrusal; mipmap/anisotropy açık, dünya başına sahiplik ve temizleme var. Referans: Zach1055,7Haziran2025Şilemendireği, WikimediaCommonsCCBYSA4.0; fotoğraf yalnız tarayıcıda incelendi, varlıklara kopyalanmadı. Modelplaka2m ölçüsü görselvarsayım; yeni kıyı/yol ölçümü değil.

2.40ve2.41dünyalarında position/normal/index/transform/instancecolour ve tüm çarpışma hashleri birebir. YalnızUV/malzeme ve generic harbour-pavingcolourattribute değişir; basegolden bu görünüm farkına güncellendi.3piksel regresyonuRED→GREEN,544/544Node22ARM64concurrency4(128109.319868ms),11infra,Vite/ARM64pass. Mevcut gerçektemas testi denizseviyeliUV ve10kaynakdisposeolayı için genişletildi. GL/WebGPU yakınkaynakdünya sabitkamerası/error[]; görüntü gerçekuçuş değil. Küçükmalzemediffi yazar scopedreview; yeni bağımsızreview yok.

Canlı v2.41.0-26faf677f80f;282manifest115runninghash/odaklıHTTPS/changedpageSHA/WSSpass. Gerçektarayıcı341yol/5kara,DISARM0/3/error[];SOURCEONEf60-1750-6s650g1100medium25/gamepadkorunur.0restart25.75MiB/256MiB;7diğerservis/nginxaynı;oldapp/tutarlıbackupkorunur.2servisyolu1485112031/32belirsizliği ve30mDSMyükseklik/genişliktahminisınırlarısürer;gerçekTX15/İLKEuçuşkabulüyok. [Doğrulama](sile-concrete-validation.json).


## 2026-11-02 — 2.42 uzun kıyı ve kayalık geçişi

Batı sahili, uzun mendirek, liman geneli ve doğu kayalıkları sabit kaynak-dünya kameralarıyla incelendi. Yaklaşık 605.7 m kaynak dış mendirek kenarında 383 parça (281 kaya, 102 beton blok) deniz tarafına yerleştirildi. Boyut/açı/mesafe değişir, parçalar kısmen suya gömülür. 6.844 gerçek Float32 çizim üçgeni mevcut temas motoruna katılır; bir mesh ve iki malzeme grubu kullanılır. Kaynak kıyı/DSM/yol/bina/iskele ve eski fizik kayıtları değişmez; yeni zırh ve köpük RGBA alanı ayrıldığında önceki dünyanın geometri ve çarpışma hashleri aynıdır. Doğal kaya malzemesindeki çatlaklar belirginleştirildi. Açık kıyıda köpük değişken, kaynak liman içinde aynı örneğin %20 şiddetindedir. Boyutlar fotoğrafla desteklenen modelleme yorumudur; ölçülmüş kıyı mühendisliği değildir.

İlk seyrek taş dizisi ve düzenli sinüs tabakaları görsel kontrolde elendi; daha dolu omuz ve düzensiz doku tekrar kontrol edildi. Bağımsız son inceleme temiz: 47.908 Float32 örneğinde kara/liman/iskeleyi ihlal yok, yola en az 10.841 m pay. 20 gerçek temas iniş probu ve kaynak temizleme geçti. İlk tam koşuda iki eski mesh bütçesi güncellendi; son Node22 ARM64 koşusu 548/548 (131770.580964 ms), 11 infra, Vite ve ARM64 paket başarılı. Gerçek GL/GPU hata[]; kameralar sentetik, fiziksel uçuş veya FPS testi değil. İlk paket first-build altında korunur ve canlıya gönderilmedi.

Canlı `v2.42.0-f0d7d412b45f`: 283 manifest/116 çalışan kaynak hash, odaklı HTTPS/kaynak sayfası SHA/WSS başarılı. Tarayıcıda 341 yol/5 kara, DISARM0/3/hata[]; SOURCE ONE f60-1750-6s/650g/1100mAh/medium/25°/gamepad korunur. 0 yeniden başlatma,24.28MiB/256MiB; diğer7servis/nginx aynı, eski uygulama ve tutarlı veri yedeği korunur. Batıdaki 2×2km kesim sınırı hâlâ görünür; gerçek devamı için kaynak kapsamı genişlemeli. İki servis yolu belirsizliği,30mDSM ve tahmini genişlik/yükseklik sınırları sürer. [Doğrulama](sile-shore-armour-validation.json).


## 2026-11-02 — 2.43 batı sahilinin kaynakla genişlemesi

Kanonik Şile haritası batıya yaklaşık1km genişledi: yaklaşık3×2km,97×65grid,1316bina,383yol parçası/381kaynakID,8kıyı çizgisi,10denizyapısı.1Kasım merkez OSM kaydı korunup yalnız2Kasım batı kaydındaki yeni(type,id) öğeleri eklendi;birleştirme kuralı ve hamSHA/tarih/URLmakbuzu source-inputs.json'dadır. Aynı CopernicusGLO30kullanılır. Eski4225gridörneği/projeksiyon/spawnaynı;65536fizikselörnekte yükseklik farkı en çok1.6e-13m,normalleraynı. Bu sayısal tutarlılık ölçüm hassasiyeti değildir.1266eski bina/339yolID/10denizyapısı korunur;eski alan kara farkı.215m²sınır yuvarlamasıdır. Eski batı kesimi artık içeridedir, eğri kıyı ve tepe gerçek kaynakla devam eder. Kaynak alan yine sonludur.

50bina/42yol parçası eklenir. Kesilen mendirek ucu tamamlanır;mevcut modelleme kuralıyla722.755m dış kaynak kenarında468parça(344kaya124blok),8368gerçek temas üçgeni olur. Yeni sahil yerleşiminde şezlong ayaklarının nativeüçgen kırığında havada kalması mevcut testleRED oldu;±3m yerleşim alanında>.012m düzlemsellik farkı olan adaylar reddedildi. Arazi düzleştirilmedi.7contexttestiGREEN ve ek inceleme temiz. Kaynak kutu sırası testleri eski8867sabitinden sahiplik sınırına geçirildi; yeni dünya objeleri için geçerli goldens kaydedildi. Kale ve135cephe detayının orijinal geometri hashleri korunur.

550/550Node22ARM64concurrency4(144898.78532ms),3GIS/2mergeCLI/11infra,Vite/ARM64 başarılı. Varsayılan üretici eski2×2km haritayı byteaynı üretir; yayımlanan temizOSM gerçekleri de yeni haritayı byteaynı üretir. Bağımsız kaynak incelemesinde Critical/Important yok;2×2km yazan güncel görsel makbuzları Minor olarak düzeltildi. GL/GPU eski kesim/yeni batı/liman sabit kameraları ve yeni alanınx=-750noktasına eski sınırı aşan simüle hover probu geçti. Bunlar fiziksel uçuş veyaFPSkabulü değildir.

Canlıv2.43.0-8d4c747f78ad:284manifest116runninghash/19değişenpublicSHA/HTTPS/uniqueIDs/entryassets/WSS geçti. Yeni canlı sekmede383yol/5kara,DISARM0/3,RuntimeException[]/consoleerror[];SOURCEONEf60-1750-6s650g1100medium25/gamepadkorunur. Eski tekrar kullanılan sekmede3message-channeluyarısı görüldü;kaynağı kesin atanamadı,yeni kök oturumda tekrarlanmadı;hamkanıt saklandı.0restart25.08MiB/256MiB;diğer7servis/nginx aynı,eskiapp/tutarlıbackupkorundu.30mDSM/tahminigenişlikyükseklik/iki servis yolu belirsizliği ve yeni dış kesim sınırı sürer. [Doğrulama](sile-west-expansion-validation.json).

Geometriyi çevrimdışı yeniden üretmek için yayımlanan source-osm.json, aynı hashli Copernicus kaynakTIFF ve `git show 477324d:public/maps/sile/map.json` içindeki eski coregrid kullanılır. prepare-sile-map.py seçenekleri: `--bbox 29.58866 41.16540 29.62445 41.18341 --cols 97 --rows 65 --preserve-grid CORE.json`. Ardından mevcut prepare-sile-context/coast/building-types araçları ve audit-sile-geography çalıştırılır. Orijinal ham kaynak makbuzunu yeniden üretmek için merge-sile-osm.py ve iki ham girdi gerekir; temiz kaynakla geometri aynıdır, ham provenanceSHAfarklıdır.

## 2.44 — Şile kum görünümü

Mevcut plaj yüzeyleri ince tane, düzensiz küçük dalgacık ve filtreli PBR malzemeyle güncellendi.4m tekrar ve milimetre kabarıklık temsili görseldir; kaynak arazi/çarpışmalar değişmedi. v2.44.0-9a2633331605 canlı;553/553test,11infra,WebGL/WebGPU ve dosyaSHA kontrolleri geçti. [Doğrulama](sile-sand-validation.json).

## 2.45 — Su-kum birleşimi

Geniş batı plajındaki dik DSM kum kenarı, araziye bağlanan temsili bir yaklaşımla düzeltildi. Dar kuru-kum/su çizgisi boşlukları en fazla2m iç ıslak kum şeridiyle tamamlanır; görünen kum ve temas aynıFloat32üçgenleri kullanır. Nominal18m/%8 başlangıç,3cm su üstü uç ve2m alçaltma sınırı ölçülmüş mikroarazi değildir. Kaynak harita/su çizgisi/yol/bina verileri aynı. v2.45.0-fbd27ca93aaa canlı;560/560test,11infra,GL/GPU ve bağımsızinceleme geçti. [Doğrulama](sile-waterline-validation.json).
