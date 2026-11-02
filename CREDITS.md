# Varlik Kredileri

Drone Hangar'daki ucuncu taraf 3B varliklarin kaynak ve lisans bilgisi, dagitilan dosyalarla birlikte tutulur.

## Poly Haven

`public/models/manifest.json` icindeki cevre prop'lari [Poly Haven](https://polyhaven.com) kaynaklidir ve manifestte **CC0** olarak kaydedilmistir. Bu dosya, her varligin kaynak URL'sini, indirilen cozunurlugunu ve donusum bilgisini listeler.

## Kenney

`public/models/kenney/` altindaki dusuk poligon agac modelleri [Kenney Nature Kit](https://kenney.nl/assets/nature-kit) kaynaklidir. Proje bunlari doku kullanmadan, vertex renkli GLB olarak dagitir.

## Uygulama Kodu

Uygulama kodu [MIT Lisansi](LICENSE) ile sunulur. Kodun yeniden kullanim haklari ile ucuncu taraf varlik lisanslarini birbirine karistirmayin.

Yeni varlik eklerken kaynak URL'si, lisans, indirilen dosya ve optimize edilmis cikti `public/models/manifest.json` veya buna esdeger bir envanterde belgelenmelidir.

## Sayısal itki referansları

Seçilmiş motor tezgâh ölçüm olguları: [Sergey / DroneHiTech, F60 Pro IV testi](https://dronehitech.com/t-motor-f60-pro-iv-review-and-thrust-test/). Koşullar, birimler ve doğrulama sınırları [PHYSICS-EVIDENCE.md](docs/PHYSICS-EVIDENCE.md) içinde. Makale/fotoğraf/kod kopyalanmaz; yayına açık veri lisansı atfedilmez. Araştırılan diğer açık kaynak simülatörlerin kodu bu sürüme dahil edilmedi.


## Taranmış zemin malzemeleri

`public/materials/sources.json`, kullanılan renk/normal/pürüzlülük JPEG kaynaklarını ve kaynak özetlerini kaydeder. Önceden var olan asfalt/beton/toprak/kum/orman WebP varyantları `public/materials/web-v1/README.md` içinde açıklanır. 2.5 ile eklenen [Grass Ground](https://polyhaven.com/a/grass_ground), Charlotte Baglioni / Poly Haven kaynaklıdır; [CC0](https://polyhaven.com/license). Üç1k orijinal JPEG yerel sunulur; MD5 kaynak manifestiyle, SHA256 yerel dosyayla doğrulandı. Orta profilde tarayıcı512px GPU görüntüsü üretir; indirilen JPEG1024px kalır. Normal harita OpenGL yönündedir. 4 m tekrar sanatsal ölçektir; kaynak boyutuyla birebir eşleşme iddia edilmez. Bu görsel yüzeyler fiziksel sürtünme/çarpışma doğrulaması değildir.


## Şile coğrafi veri paketi

© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL1.0. Coğrafi kaynak altkümesi ve türetilmiş veritabanı bileşeni `public/maps/sile/source-osm.json` ve `map.json` olarak sunulur; uygulama kodunun MIT lisansı veri lisansı değildir. Copernicus GLO-30 Public2021 DSM kaynak kesiti `source-dem.tif`; tam kaynak/türetim bildirimi, lisans bağlantıları, SHA256, varsayımlar ve resmi19m fener yüksekliği kaynağı `public/sile.html` / `provenance.json` içindedir. Google/İBB uydu görüntüsü veya üçüncü taraf fotoğraf/model alınmadı. Cephe/çatılar ve çoğu bina yüksekliği temsili üretildi.


## SOURCE ONE v4 kesim geometrisi

TBS / SOURCE ONE: [sabit arşiv](https://github.com/tbs-trappy/source_one/tree/9ae65b1387f192fb90d07d483178169924b286b5). `public/airframes/source-one-v4/` ham DXF/README/LICENSE, SHA256 manifesti, GPL-3.0 türetilmiş geometri ve dönüşüm betiğini içerir. Bu veri MIT varlığı olarak yeniden lisanslanmaz. 2026-11-01 dönüşümü EFA Hangar: 0.035mm düzleştirme ve metreye çevirme; kol montajı simetrik X fizik noktalarına yaklaşık uyarlanır. Kaynaklı kesim geometrisi tam monte edilmiş drone veya fizik doğrulaması değildir. F60 Pro IV 27.1×31.1mm dış boyutu DroneHiTech teknik özelliklerinden; iç donanım/diğer aileler/paket boyutları temsili.


## Yakın zemin sunumu · 2.14
Mevcut CC0 renk/normal/pürüzlülük dosyaları kullanılır; yeniasset eklenmedi. Masaüstüorta/yüksekzemin1K, dokunmatik512cap. World-metreUV ve1.5–2mtiling, hafifvertexalbedo sanatsal düzenlemedir; ölçülmüş tarama alanı veya yeni coğrafi veri değildir.


## Şile çatı sunumu · 2.15
Eğimli çatı biçimleri ve kiremit UV yerleşimi uygulama için üretilen temsili geometridir. Bina ayak izi/yükseklik snapshotı ve ODbL/Copernicus koşulları aynı; yeni fotoğraf/CAD/tarama kaynağı eklenmedi.


## Kale görsel referansı · 2.16
[Şile Belediyesi](https://sile.bel.tr/tr/sile-rehberi/sile-tarihi-yapilari/):12m/dört kat/kireç taşı bilgisi ve fotoğraf yalnız referans; görsel dosya dağıtılmaz. OSM ayak izi/ada kıyısı mevcut ODbL snapshot. Ada4.5m kabartması ve taş/açıklık/mazgallar özgün temsili model, ölçüm değil. Mevcut CC0 gravel_floor malzemesi yeniden kullanılır; yeni fotoğraf/doku indirilmedi.
