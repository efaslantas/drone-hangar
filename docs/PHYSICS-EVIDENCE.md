# Fizik kaynakları, doğrulama ve sınırlar

31 Ekim 2026. Mevcut tarayıcı uygulamasına ölçüm tabanlı **itki/akım referansı** eklenmiştir. Tam uçuş dinamiği veya gerçek donanım doğrulaması değildir.

## Kullanılabilecek açık kaynak sistemler

| Sistem | Birincil kaynak / lisans | Bu proje açısından |
|---|---|---|
| PX4 SITL + güncel Gazebo | [Resmî simülasyon rehberi](https://docs.px4.io/main/en/simulation/), [PX4 BSD-3-Clause](https://github.com/PX4/PX4-Autopilot/blob/main/LICENSE) | Tam uçuş yazılımı, sensör ve kontrol entegrasyonu için ayrı çalışma ortamı. Tarayıcıya doğrudan JavaScript paketi olarak eklenmez. Bu teslimde kurulmadı. |
| gym-pybullet-drones | [Depo](https://github.com/learnsyslab/gym-pybullet-drones), [MIT lisansı](https://github.com/learnsyslab/gym-pybullet-drones/blob/main/LICENSE) | Python/PyBullet araştırma simülatörü; örnek araç parametreleri başka drone boyutuna ölçümsüz taşınmaz. Bu teslimde kodu alınmadı. |
| AirSim | [Depo](https://github.com/microsoft/AirSim), [MIT lisansı](https://github.com/microsoft/AirSim/blob/main/LICENSE) | Unreal/Unity tabanlı ayrı mimari. Bu teslimde kurulmadı veya kaynak kodu alınmadı. |
| Betaflight | [Depo/lisans](https://github.com/betaflight/betaflight/blob/master/LICENSE), [Rate belgeleri](https://betaflight.com/docs/wiki/guides/current/Rate-Calculator) | Gerçek FPV firmware'i; GPL-3.0 lisanslı kod bu MIT uygulamasına kopyalanmadı. Mevcut rate tepkisi Betaflight firmware çalıştırıyor diye sunulmaz. |

Lisanslar ilgili kaynakların kendi dosyalarından kontrol edildi. Açık kaynak olması, bir örnek modelin fiziksel olarak bütün FPV araçlarına uygun olduğunu kanıtlamaz.

## Uygulanan ölçüm verisi

Birincil yayın: [Sergey / DroneHiTech, T-Motor F60 Pro IV Review and thrust test](https://dronehitech.com/t-motor-f60-pro-iv-review-and-thrust-test/), ilk yayın 23 Mayıs 2020; kontrol 31 Ekim 2026.

İki ayrı koşul: 1750KV/6S ve 2550KV/4S; HQ 5×4 üç pal pervane. Test, ESC ve besleme koşulları `src/propulsion-reference.js` içinde belirtilir. Kayıtlar tek motorun PWM, gf, volt ve amper gözlemleridir. Birim dönüşümünde standart yerçekimi 9.80665 m/s² kullanılır. Yalnız seçilmiş sayısal olgular alınmıştır; makale, fotoğraf veya kaynak kod kopyalanmadı. Yayının açık veri lisansı olduğu ileri sürülmez.

`node tools/verify-propulsion-source.mjs` birincil sayfadaki tabloları tekrar okuyup 17 kullanılan noktanın tamamını karşılaştırır. Ayrıca eğriye konulmayan 11 satır üzerinde interpolasyonu denetler. 31 Ekim kontrolü:

| Profil | Ayrılmış satır | En büyük itiş bağıl hatası | En büyük akım bağıl hatası |
|---|---:|---:|---:|
| 1750KV/6S | 5 | %1.61 | %0.56 |
| 2550KV/4S | 6 | %1.69 | %0.88 |

Bu oranlar aynı yayın içindeki ara değer yeniden üretim hatasıdır; bağımsız laboratuvar veya gerçek uçuş doğruluğu değildir. Sayfa dinamik olduğu için tüm HTML'in hash'i değişebilir; doğrulayıcı doğrudan sayısal satırlara bakar. Kaynak erişilemez/değişirse araç başarısız olur; otomatik sessiz veri güncellemesi yapmaz.

## Fizik ve hesap sözleşmesi

- Gaz komutu 1000–2000 µs referans aralığına eşlenir. Yayımlanmış aralık %30–100 gazdır. Düşük gazda orijinden ilk noktaya doğrusal uzatma kullanılır ve ölçüm olarak etiketlenmez.
- Her örnekte tek motor itiş ve akımı parçalı doğrusal interpolasyonla alınır. Dört motor toplam kuvveti kütleye bölünerek fizik adımına girer. Döndürülmüş gövde itiş yönü, yerçekimi ve mevcut hava direnci uygulanır.
- Hover, dört motor itişi = kütle × yerçekimi eşitliğinin ters çözümüdür. Kapasite, kullanılabilir oran ve aviyonik akımı kullanıcı varsayımıdır. Süre = kullanılabilir Ah / hover toplam A × 3600.
- Referans uçuşunda batarya doluluğu anlık toplam akımın zamana göre integraliyle azalır. Oyun görevinin pil tüketim çarpanı referans hesabına uygulanmaz.
- Tezgâh modunda besleme koşulları korunur. Rint modunda aşağıdaki gerilim yaklaşımı uygulanır. Farklı hücre/gerilim, pervane, motor veya 7 inç/Whoop için bu ölçüm geçerli sayılmaz. Yalnız 5 inç Freestyle/Racer referans modunda kullanılır.
- Genel parça çarpanları ayrı moddur; bu modun ölçüme dayanmadığı görünür. Eski seçimler silinmez. Referans modu genel rekor, ilerleme, ghost ve sıralama kayıtlarıyla karıştırılmaz.

## Hâlâ yaklaşık veya doğrulanmamış

Kütle varsayılanı gerçek kuruluma ait tartım değildir. Batarya markası, iç direnci, deşarj limiti, sıcaklık, kapasite yaşlanması ve gerilim çökmesi bu modelde ölçülmedi. Referans tezgâhının tepe akımını herhangi bir bataryanın sağlayacağı varsayılamaz. İleri uçuş pervane verimi, pervane etkileşimi, propwash, esneklik, gerçek atalet tensörü, ESC gecikmesi ve uçuş kontrolcüsünün tam PID/mixer dinamiği kalibre edilmedi. Referans + Gerçekçi Acro açısal tepkisi aşağıda açıklanan parametreli rijit gövde modelidir; parametreler donanımdan ölçülmedi. Diğer kontrol yolları ve hava direnci yaklaşık kalır. Gerçek uçuş süresi, azami hız veya tam Liftoff/Betaflight eşdeğerliği iddia edilmez.

Bir sonraki fiziksel doğrulama için aynı motor/pervane/ESC/batarya, tartılmış toplam kütle ve akım/gerilim/gaz/RPM içeren uçuş veya tezgâh kaydı gerekir. Yazılım testleri bu ölçümün yerine geçmez.

## 1 Kasım 2026: dört motorlu açısal model

Referans + Gerçekçi Acro yolunda rate hedefi artık doğrudan gövde açısal hızına yumuşatılmaz. Zincir: kübik stick/rate hedefi → model rate PID'i → sınırlı dört rotor tahsisi → her rotorun ayrı komut gecikmesi → kaynaklı itiş/akım → toplam kuvvet ve tork → rijit gövde denklemi. Angle ve generic yollar korunur.

Gövde x sağ, y yukarı, z arkadır. Rotorlar gövde X köşelerinde +y kuvvet üretir; torklar r×F ve karşı dönüş reaksiyonundan gelir. `Jω̇ = τ − ω×Jω` diyagonal ataletle RK4 kullanılarak entegre edilir; quaternion her alt adımda normalize edilir. Kontrol ve motor alt adımı en fazla 1/240 saniyedir. PID türev filtresi 25 Hz, integral sınırlı ve motor doygunluğunda dışarı doğru büyümesi durdurulur. Tahsis gerektiğinde collective'i kaydırır ve tork isteğini ölçekler. Bu mimari [PX4 kontrol diyagramları](https://docs.px4.io/main/en/flight_stack/controller_diagrams) ve [rate kontrol rehberi](https://docs.px4.io/main/en/config_mc/pid_tuning_guide_multicopter) ile karşılaştırıldı; rijit gövde denklemi [RotorPy çok rotor modelindeki](https://github.com/spencerfolk/rotorpy/blob/main/rotorpy/vehicles/multirotor.py) fizik sözleşmesiyle karşılaştırıldı. Kaynak kod kopyalanmadı; gerçek firmware çalıştırılmaz.

### Parametrelerin kanıt durumu

- Motor itiş/akım eğrisi önceki statik test verisidir; yeni tork/RPM ölçümü eklenmedi.
- Varsayılan dingil mesafesi 225 mm, motor zaman sabiti 60 ms, yaw tork/itki kolu 0.012 m ve PID 18/4/0.18 model varsayımlarıdır.
- Otomatik J hesabı kütlenin %25'ini rotor konumlarında, %75'ini 120×40×160 mm merkez kutuda kabul eder. Bu kütle dağılımı ölçülmedi. Manuel J de kullanıcı girdisidir; doğrulanmış ölçüm etiketi verilmez.
- Merkezi rate eğimi ve kübik eğri bir pilot/model ayarıdır; Betaflight Actual rates uygulaması değildir.
- Kargo eklendiğinde J aynı kütle oranıyla ölçeklenir; gerçek kargo konumu ve atalet dağılımı ölçülmedi.
- Rotorların hava içindeki karşılıklı etkisi, RPM tabanlı rotor jiroskopik momenti, sensör gürültüsü ve tam temas/iniş açısal dinamiği doğrulanmadı. Isı modeli eklenmedi; Rint gerilim modeli sonraki bölümde açıklanır.

### Sayısal doğrulama

`node tools/validate-flight-dynamics.mjs` modelin kendi tutarlılığını raporlar; donanım eşleşmesi değildir. Testler torksuz enerji korunumu, sabit tork/atalet birimleri, üç mixer ekseni, doygunluk, anti-windup, hover, ayrı rotor akımları ve batarya integrali, kontrol yönleri, zaman-adımı farkı, boş pil/disarm ve Angle/Acro geçişini kapsar. Tarayıcıda üç manuel J değerinin birlikte girilmesi ve yeniden yüklemede korunması kontrol edildi. Bağımsız incelemedeki ara değer yüzünden manuel editörün kilitlenmesi hatası, sayısal alanları Apply'a kadar taslak tutarak giderildi; regresyon testi eklendi.


## 1 Kasım 2026: Rint batarya modeli · 2.3

Bu bölüm ölçülmüş motor eğrisinin üzerine eklenen **varsayımsal batarya modelidir**. Paket ölçümü veya motorun farklı gerilimlerde doğrulanmış haritası değildir.

- Ortak paket: `V = OCV(SOC) − I·R`. Dört farklı rotor komutu ve aviyonik akımı için 36 adımlı ikiye bölme ile gerilim/akım birlikte çözülür. Rint toplam direnci = hücre sayısı × hücre direnci.
- Yaklaşık gerilim ölçeklemesi: motor itki/akımı `min(1,V/Vbench)^2`; test geriliminin üstüne güç artışı yapılmaz. RPM ≈ V ve kuvvet ≈ RPM² yaklaşımından esinlenir; pervane/motor haritası ve değişen verim ölçülmedi. Elektronik akımı ayrıca sabit varsayılır.
- OCV hücre eğrisi (SOC,V): (0,3.30), (.1,3.55), (.2,3.70), (.5,3.80), (.8,4.00), (1,4.20). Bu yalnız örnek LiPo şeklidir; üretici tablosu değildir. Direnç varsayılanı 3 mΩ/hücre, başlangıç SOC 1, kesme 3.0 V/hücre ve 0.2 s. RC kutuplaşma, sıcaklık, yaşlanma, gerçek ESC kesme davranışı ve deşarj limiti yoktur.
- Kullanılabilir Ah = nominal Ah × min(kullanılabilir oran, başlangıç SOC). HUD çubuğu bu bütçedir. SOC = başlangıç SOC − harcanan nominal kapasite payı. mAh, terminal Wh ve I²R kayıp Wh aynı alt-adım akımından gelir.
- Dört motorlu Acro’da ≤1/240 s alt-adım, diğer referans kontrol yolunda mevcut fizik adımı kullanılır. Kuvvet tahsisinden önce gerilim öngörülür; motor gecikmesinden sonra gerçek model gerilimi ve dört kuvvet yeniden çözülür. Rint güç kesilince sıfır motor kuvveti/akımı varsayılır, komut durumları sönümlenir. Tezgâh modu eski davranışını korur.
- Başlangıç hover gazı Rint ile kuvvet dengesinden çözülür ve yük değişince yeniden hesaplanır. Stick merkezi uçuş sırasında SOC ile kendiliğinden yükselmez. Süre yalnız başlangıç hover akımından kapasite tahminidir; tam deşarj/gerçek uçuş süresi değildir.
- Düşük gerilim 0.2 s sürerse kesme kilitlenir, kalan kapasite silinmez. ARM tekrar güç vermez. Padde yeni paket veya R yeni uçuş ile resetlenir. Yeni referans varsayılanı Rint; eski kayıtlar tezgâh modunda kalır. Sayısal alanlar Apply'a kadar taslaktır.

Birincil yöntem kaynakları: [MathWorks eşdeğer devre](https://www.mathworks.com/help/simscape-battery/ref/batteryequivalentcircuit.html), [NASA batarya teorisi eki](https://ntrs.nasa.gov/api/citations/20230003601/downloads/NASA%20TP-20220000355%20appxA.pdf). Kaynak kod alınmadı; kaynaklar yöntem içindir, örnek paket parametrelerini destekleyen ölçüm değildir.

`tests/battery-model.test.js` ve `tests/battery-flight.test.js`: Ohm ve enerji dengesi, sıfır direnç, üst gerilim sınırı, doluluk/bütçe ayrımı, mAh/Wh birimleri, gerilimli kuvvet tersi, fresh hover, payload, düşük SOC, kesme/reset ve kare alt-adım tutarlılığı. Sayısal tutarlılık, fiziksel eşleşme yerine geçmez.

## 2.8 SOURCE ONE v4 ve kuvvet tabanlı aerodinamik
Resmî TBS arşivi9ae65b1387f192fb90d07d483178169924b286b5 (README, v4 CAD, GPL3 LICENSE) kontrol edildi. Arşiv README'si226mm ölçü verir; simetrik X motor konumu ve merkez kutu J yaklaşımı birebir CAD geometrisi değildir. 2.8 fizik aşamasında CAD veya firmware kopyalanmadı; 2.11 görsel CAD geçişi aşağıdadır. Preset650g/1100mAh/6S F60IV1750KV HQ5x4x3; toplam kütle, paket ve aero katsayıları varsayım. Sabitleme mevcut referans anahtarına freestyle yuvası için yapılır, diğer profiller ve TX15 eşlemesi korunur.
Referanslarda eski kütleden bağımsız hız sönümü yerine gövde eksenlerinde bağımsız karesel direnç kuvveti, ters/düz quaternion dönüşümü ve F/m kullanılır. CdA[.012,.045,.012]m² ve yoğunluk1.225kg/m³ düzenlenebilir varsayım. NASA direnç denklemi yöntem kaynağıdır, bu katsayıların ölçümünü desteklemez: https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/ . Gerçekçi referans Acro'da artık çeviri, aerodinamik, motor, yönelim ve pil aynı en fazla1/240s alt adımındadır; HUD akımı son alt adımdır, kapasite bütün alt adımlar üzerinden entegre edilir. Referans yükte rate hedefi korunur, J/kütle büyür; CdA%20 artış varsayımı. Generic değişmez.


## 2.11 Pilotun uçurduğu gövdeler

SOURCE ONE v4 resmî TBS arşivinin sabit9ae65b1387f192fb90d07d483178169924b286b5 sürümünden beş DXF parçası kullanılır. 5inç kol4mm; alt3mm, orta3mm, üst2mm, kamera2mm. DXF millimetre birimi doğrulanır, eğriler0.035mm toleransla düzleştirilir; dış kontur/delikler metreye çevrilir. Ham dosyalar, SHA256/source manifesti, GPL-3.0 LICENSE, generator ve gereksinimler `public/airframes/source-one-v4/` altında sunulur. Türetilmiş geometri verisi GPL-3.0 kalır. Kesim geometrisi gerçektir; simetrik226mmX merkezlerine kol yerleştirme, standoff ve diğer donanım temsili montajdır. Rotor fizik konumları/atalet bu görsel CAD'den yeniden hesaplanmaz. Dingil mesafesi düzenlenirse genel görsel kullanılır ve CAD etiketi gösterilmez.

F60 Pro IV dış çap27.1mm/toplam31.1mm mevcut DroneHiTech makalesinin teknik özelliklerinden alınır (V2 modeliyle karıştırılmaz). İç sargı/çan/şaft ayrıntıları temsili. Diğer dokuz gövde aile ölçülerinden sanat modeli; tam üretici replikası değil. Tek aktif batarya kurulumdaki hücre/kapasiteyi izler; fiziksel paket ölçüleri varsayım. Hareket gerçek RPM değil model komutu animasyonu. Kamera tilt, pervane çapı, fizik boyutu, RC eşlemesi ve kaynak eğrileri korunur.


## 2.12 Donanım ve sunum
Karbon katman kenarı ve temsili AIO/FC/ESC/VTX görselleri ile nötr atölye ışığı/gölgesi eklendi. Yeni yüzey/elektronik ölçüler malzeme veya üretici PCB ölçümü değildir. Kaynaklı DXF kontur/delik/kalınlık aynıdır. Görsel elektronik kartlar birbirine kesişmez ve gövde genişliği/uzunluğuna uyar. Takip mesafesi fizik boyutundan bağımsız görsel açıklık ve ekran oranıyla seçilir; yatay yön normalize edilir ve dik açıda son geçerli yön korunur. Actual mesh vertices near-plane testleri10gövde×2oran×75/90/110° ile kesilmeyi doğrular. Bu kamera testi gerçek uçuş/log doğrulaması değildir. FPV yoluna ve fizik/çarpışma/RC parametrelerine dokunulmadı.


## 2.13 Model-box zemin desteği ve lens noktası
MakeDrone, tüm sahipli görsel parçaların root-local AABB'sini ve optik lens noktasını kaydeder. Rotor XZ zarfı tam süpürme alanını kapsar; etiket ve blur verisi dışlanır. Parent/world transform ve tilt yeniden hesaplamasında yerel birimler korunur. Veriler yalnız aktif spec/payload kopyasına eklenir; kullanıcının profiline/RC ayarına/trace'e yazılmaz.

Kara zemininde AABB destek noktası, inverse quaternion ile gövdeye çevrilen yüzey normalinden hesaplanır: minimum köşe dot ürünü terslenip1mm pay eklenir. Spawn/RCstart/flatground/DEM aynı desteği kullanır. Bu görsel geometriyle tutarlı korumalı kutu desteğidir; esnek ayak, sürtünme veya temas torku ölçümü değil. Duvar/tavan/çatı engine eski yaklaşık sphere, haricî yükler önceki temsili kurala tabidir. Metadata yoksa legacy yükseklik kullanılır. Airborne kuvvetler/mixer/PID aynı kalır.

Lens merkezi FPV konumunu belirler, FOV/tilt yönü değişmez. Yakın klip.003m taban ile arazi.1/normal.04m tavan arasında; zemin ve yakın engel AABB mesafesiyle ayarlanır. Uzakta eski depth aralığına döner; gerçek optik kalibrasyon iddiası yok. Atölye root yerine ayrı merkezli yaw pivotu döndürür.

Düşük lens QA, önceki Şile pad9cm/road6cm ve diğer pad4cm çizim liftini gösterdi. Boya/paved yüzeyler milimetrealtına ve polygonOffset'e geçti. Şile overlay üçgenleri terraingrid üçgenleriyle kesilip aynıheight interpolation üzerine yerleştirilir; OSM/DSM kaynak dosyası değişmez. Bağımsız1000üçgen signedarea/winding deneyi ve snapshot110088roadvertices testi geçti. Gerçek yol/eğim/iniş ölçümü değil.


## 2.14 Yakın zemin görünümü
Yeni shader, fotoğraf kaynağı veya fizik değişimi yok. Ground-surfaces genişyukarıPlane/Shape ve explicitŞileterrain/roads için worldXZmetreUV sağlar; geometrik yükseklik/normal/snapshotkolizyonu aynı kalır. CanonicalPlane ençok64×64seg/8madım ile yalnız albedo değişimi için bölünür; özelgrup/drawrange/interior/normals/bakedoffset veShapeholescloneile korunur. Dünya konumlu hafif vertexalbedo tekrar desenini azaltır.

Artisttile grass/concrete/forest/sand2m, asphalt/earth1.5m. Taramanın ölçülmüş fiziksel boyutu olarak sunulmaz. Desktopmedium/highzemin1024; diğermedium512;touch512;lowprocedural. Mevcut dosyalar/GPL/CC0/lisanslar aynı. Şilegrassörneğinde eski4m/512'dan2m/1024'a geçiş hedeftexel aralığını7.8125mm'den1.953125mm'ye indirir; bu4kat lineerörnekleme, yeni gerçek veri değil. Ground16/touch4 anizotropi cihaz sınırında; mipmap/linearfilterkorunur. Fallback/PBRdata/colorchannels aynımetreUVrepeat kullanır. Uçuş/RC/kamera/contactparams korunur.


## 2.15 Şile çatı silüetleri
558 ordinary buildings use authored gabled roofs inside unchanged footprint/maxheight;708otherbuildings+10structures retain old form. Eaves fall min(1.8m,width*.25,height*.2), ordinary convex near-rectangular4corners only. No measured roof shape/orientation or new source data. Full-height conservative collision prism remains; visual slope is not matched contact geometry. Flight/camera/RC/profile unchanged. Existing eight material batches/textures/resources reused.


## 2.16 Depth stability and castle site
Standard near.003/far6500 WebGL700m/35mm surface ordering fixture failed67/100; logdepth0/100. Both renderers use shared policy; customflag common/log chunks and installed GTAOlog-depth conversion retained. Renderer may cost GPU time on other hardware; no universal FPS guarantee.
Municipal primary source https://sile.bel.tr/tr/sile-rehberi/sile-tarihi-yapilari/ supports12m/fourlevels/limestone, photo reference only. Island native DSM and resampled map are0m; runtime4.5m authored plateau (not surveyed) within source island boundary feeds common terrainHeight/surfaceAt/renderedtop/cliffs. Castle base/prism move with it, height12m retained. Other terrain/buildings and raw source data unchanged. Openings/merlons approximate and full prism conservative; no real flight/contact calibration. Source rounded terrain vertices differ from coastline by up to7.9mm, so new island top triangulates exact source rings;0.1mm query edge allowance addresses Float32 upload only. Holed/unsupportedcastle sites retain old terrain/model.
