# Oyuncu Rehberi

Drone Hangar, tarayicida drone kontrolu denemek, rotalari tamamlamak ve sinirli cok oyunculu odalarda ucus yapmak icindir. Gercek drone, ucus emniyeti egitimi veya ArduPilot SITL yerine gecmez.

## İlk uçuş

1. Ana menüde **Hızlı uçuş** son drone ve alan seçiminle başlar. Yeni kullanıcı için varsayılan 5 inç Freestyle ve Pisttir.
2. Kurulumu değiştirmek için **Serbest uçuş** seç; drone ve alanı belirleyip **Uçuşa başla** düğmesine bas.
3. **Serbest stil**, **Yarış**, **Akademi** ve **Atölye** ayrı girişlerdir. Yarış antrenmanı akademi tamamlamadan açılır ve genel sıralamaya girmez.
4. Hikâye isteğe bağlıdır. Atölyedeki mevcut parçaları hikâyeden bağımsız kullanabilirsin. Kaydedilmiş akademi ilerlemesi korunur.
5. Telefonda alt menünün **Diğer** düğmesi günlük rota, birlikte uçuş, hikâye ve ayarlara ulaşır.

## Arcade arena

Ana menüde **Arcade** → **Uçuşa başla**. Kurgusal **Enkaz sahası**; hasarlı beton yapılar, barikatlar, araç kabukları, pus ve dekoratif duman içerir. Orta/yüksek kalite taranmış yüzeyler, sahne nesneleri ve fotoğraf gökyüzü kullanır. Düşük kalite hafif görünüme döner. Oyun halkaları ve rota çizgileri varsayılan kapalıdır; uçuş menüsünden isteğe bağlı açılır. Normal Pist/Şile değişmez. İki renkli oyuncak araba, bir uçak ve bir drone hareket eder. İstediğin sırayla temas et; tamamlanan nesne kaybolur, kısa efekt sonrası yeni drone kalkış noktasında yerde ve DISARM başlar. Gazı indirip yeniden ARM yap. R aktif turda yalnız drone yeniler ve tamamlanan nesneleri korur; menüde Yeniden Başlat bütün turu sıfırlar. Dört nesne tamamlanınca sonuç gelir. Kurgusal oyun yereldir; akademi, rekor, hayalet ve genel sıralamaya yazılmaz. Şile tercihin ve kumanda kalibrasyonun korunur.

## Görüntü ve performans

**Görüntü & ayarlar** bölümünde kaliteyi, render çözünürlüğünü, gölgeleri ve çevre yoğunluğunu seç. Düşük kalite dekoratif nesneleri azaltır; uçuş fiziği, çarpışmalar ve hedefler aynı kalır. Temiz görüntü varsayılandır. Yatay görüş açısı 80–140°, kamera eğimi 0–60° aralığındadır. Lens efekti ve titreşim ayrı tercihlerdir. Ayarlar aynı tarayıcıda saklanır.

## Duraklatma ve tekrar

**Esc / Menü** yerel uçuşu durdurur. Telefonda **☰** açıldığında da fizik ve görev saati durur. **Devam Et**, **Yeniden Başlat**, **Drone / alan değiştir** ve **Ana menüye dön** seçenekleri bulunur. **R** aynı kurulumu hızlı sıfırlar. Menüdeki kamera/görüntü ayarları uçuşa dönünce uygulanmış olur.

Başladıktan sonra duraklatılan görev, bitiş ekranında **kişisel antrenman · sıralama dışı** görünür. Diğer pilotların uçuşu kendi cihazlarında devam eder.

## Kontrol Mantigi

Mode 2'de sol stick gaz ve yaw, sag stick pitch ve roll'dur. RC profilinde gaz ortası %50'dir; PS/dokunmatik profilinde merkez hover gazına eşlenir. Angle modunda stabilizasyon vardir; Acro daha dogrudan tepki verir. Gorev zorunlu kilmadiysa modu Ayarlar veya ucus kontrolunden degistirebilirsiniz.

Klavye kisayollari: Space ARM, T Angle/Acro, C FPV/chase kamera, R reset, H yardim, M ses ve iki kez Esc hangara donus. Cift Esc, tek yanlis tusa basmanin ucusu kapatmamasini saglar.

Gamepad tarayici Gamepad API'sini kullanir. Sayfaya odak verin ve bir tusa basin. Bagli bir kolun gorunmesi, eksen merkezinin veya cihaz profilinin dogru oldugu anlamina gelmez; ilk ucuştan once kalibrasyon yapin.

## Sonuc ve Tekrar

Basarili gorev sonunda sure, kisisel rekor farki ve varsa tur bolumleri gorunur. Yerel en iyi kosu hayalet olarak sonraki denemede gorunebilir; **Tekrari izle** ayni izi chase kamerayla oynatir. Tarayici verisini silmek ilerleme, kalibrasyonve yerel hayaletleri da silebilir.

## Birlikte Ucus

Oda adi ve gorunen ad URL'ye yazilir. Ayni oda diger pilotlarin konumunu gosterir; davet baglantisi secili harita, drone veya gorevi eslemez. Oda kurallari ve veri kullanimi icin [Gizlilik ve Veri](PRIVACY.md) belgesine bakin.

## Sorun Giderme

- Kontrol tepki vermiyorsa sayfaya tiklayin, kolu yeniden baglayin ve Ayarlar'da kalibrasyonu kontrol edin.
- Goruntu sorunu varsa deneysel WebGPU'yu kapatip varsayilan WebGL'i deneyin.
- Ucus ekrani kontrol edilmiyorsa menu/sonuc kartini kapatin; mobilde yatay gorunum daha uygundur.
- Yerel ilerleme veya ayarlar kaybolduysa tarayicinin site verisi silinmis olabilir; sunucuda bunun yedegi tutulmaz.


## RC kumanda · USB Joystick

Kontroller sekmesinde ayrı RC profili vardır. Cihaz ve dört farklı ekseni seç; merkez/gaz minimum başlangıcını alıp dört saniye tüm uçları gezdir. Yönleri canlı çubuklardan kontrol et. RC gazı %0–100, orta konum %50'dir; hover merkezleme ve PS/R2 çarpanları yoktur. ARM, Space/ekran düğmesiyle ve gaz %5 altındayken yapılır. Eksik kalibrasyon/bağlantı kaybında DISARM; geri dönüş otomatik ARM etmez. Eski kullanıcı profili değişmez. Fiziksel TX15 testi yapılmadı. EdgeTX tarafında USB Joystick modu kullanılır; kanal sırası eşleme gerektirir. RF veya gerçek drone bağlantısı yapılmaz.


## Yüzey kalitesi · 2.5

Grafik kalitesi düşükken hafif üretilmiş zemin dokuları; orta/yüksekken taranmış yüzeyler kullanılır. Orta512px GPU, yüksek masaüstünde1024px/dokunmatikte512px; çim dosyasının indirme boyutu1k olarak kalır. Uçuş menüsünden kaliteyi değiştirmek drone konumunu sıfırlamaz. Yükleme olmazsa mevcut görünüm korunur. Bu seçim fizik ve çarpışmayı etkilemez.
