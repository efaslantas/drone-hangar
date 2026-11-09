# Şile yakın FPV gerçekçilik incelemesi — 8 Kasım 2026

Sonuç: 2.51 uçulabilir bir veri tabanlı simülasyon sahnesidir; yakın FPV için gerçek Şile'nin ayrıntılı sayısal ikizi olarak kabul edilemez. Önceki test geçişleri kaynak doğruluğunu veya fotoğraf benzerliğini ölçmez. Bu inceleme kaynak harita, üretim kodu, kayıtlı gerçek/simülasyon görselleri ve güncel resmî kaynak kontrolüne dayanır; bu oturumda yeni fiziksel drone uçuşu veya tüm sahilin yeni taraması yapılmadı.

Sayısal sonuç `node tools/audit-sile-realism.mjs` ile yeniden üretilebilir; [JSON](sile-realism-audit-2026-11-08.json).

| Alan | Somut bulgu | FPV etkisi / yapılacak iş |
|---|---|---|
| Arazi | 145×65 örnek; yatay aralık31,28×31,25m | Yakındaki uçurum oyukları ve küçük sırtlar kaynakta yok. Önce kale–fener–Ağlayankaya kıyı koridorunda ayrı ayrıntılı geometri; varsayım/ölçüm ayrımı. |
| Binalar | 1331 binanın1328'i7,5m; kaynak metadata measuredBuildingHeights=0 | Mahalle silüeti ve bina arası geçişler gerçekçi kabul edilemez. Önce kıyı ön sırası; tek tek bina yüksekliği/kat/çatı referansı ve belirsizlik kaydı. Rastgele yüksekliği gerçek veri diye kullanma. |
| Kayalık dış biçimi | Kaynak kıyı çizgisinden yükseklik yüzeyine üretilen duvarlar; doku çatlakları büyük çıkıntı geometrisi değildir | Uzakta kabul edilebilir, yakında fazla düz. Gerçek fotoğraftaki silüet, çıkıntı ve girintiyi modelle; çizilen yüzey ve temas aynı olmalı. |
| Feneraltı | Sabit kesitli simetrik16m kemer, düz eksen; arka kum temsili | Fotoğraftaki düzensiz doğal ağız yerine düzenli tünel izlenimi verir. Kesit/depth boyunca değişen doğal hacim; eski geçilebilirlik ve korunmuş üst arazi testleri zorunlu. |
| Su İçen Fil | Mevcut model kıyı duvarından açılmış simetrik5,6m geçit | Referans fotoğraftaki ayrı kaya başı/boyun ve dar doğal kemer dış silüeti modellenmiş sayılmaz. Öncelik dış kaya gövdesi ve düzensiz açıklık; yalnız delik açmak yeterli değil. |
| Deniz | Dalga normal/köpük görseldir; temas ortalama su düzleminde | Renk/şeffaflık/ıslaklık kıyı derinliğiyle yeterince ilişkilendirilmiş değil. Önce kıyı sığlık görünümü; dalga fiziği yapılmış gibi sunma. |
| Sokak ve liman | OSM tabanı;3kaynak yaya yolunun desteği belirsiz | Fotoğraf/ortofoto ile rıhtım–su–yol birleşimleri tek tek doğrulanmalı. Kanıtsız köprü ekleme. |
| Uçuş kabulü | Gövde küresi ve yüzey temas testleri var; donanım uçuş kabulü yok | Aynı referans drone ile alçak/yüksek hızlı yaklaşma, yan/tavan temasları, su ve reset/pause rotaları. Kamera görüntüsünün engeli ile fizik temasını birlikte kontrol et. |

## Kaynaklar ve kullanım sınırı

- [Şile Belediyesi doğal güzellikler](https://sile.bel.tr/tr/dogal-guzellikler/): Feneraltı/Zeki Müren mağarasının denizden erişimini ve içerideki kumsalı doğrular; iç plan, açıklık ölçüsü veya drone geçiş uygunluğu vermez.
- [Copernicus resmî DSM açıklaması](https://documentation.dataspace.copernicus.eu/Data/Others/CCM.html?q=COP-DEM_GLO-30): GLO-30 yüzey modelidir; bina/bitki etkileri içerir ve30m örnekler. Daha fazla üçgene bölmek yeni ölçüm sağlamaz.
- [İBB şehir haritası](https://sehirharitasiapi.ibb.gov.tr/): hava fotoğrafı/panoramik karşılaştırma için aday resmî kaynak. Şile'nin güncel kapsaması ve simülasyonda yeniden dağıtım izni bu incelemede doğrulanmış değildir; indirilebilir/açık lisanslı3Bveri bulunduğu iddia edilmez.
- Depodaki `cave-reference-su-icen-fil-2026-11-03.png` referansı ve2.51kayıtlı kamera görüntüleri karşılaştırıldı. Dış fotoğraflar oyun dokusu olarak kopyalanmadı.

## Uygulama sırası ve kabul ölçütü

1. Kale–Feneraltı–Su İçen Fil–Ağlayankaya koridoru: sabit referans kameralar ve fotoğraf eşlemeleri. Önce dış silüet, sonra malzeme. Mağara dış kaya gövdesi tamamlanmadan birebirlik iddiası yok.
2. Kıyı ön sıradaki binalar ve yollar: kaynak kimliğiyle yükseklik/çatı/zemin kayıtları; ölçülmemiş değer etiketlenir. Cepheyi rastgele çeşitlendirmek konumsal doğruluk yerine geçmez.
3. Sığ deniz–kum–kaya birleşimi ve çevre: kıyı kesişiminde boşluk/taşma, tekrarlayan doku ve yüzen nesne kontrolleri.
4. Aynı6uçuş koridorunda yakın/uzak ve iki yönde görüntü/çarpışma kabulü;WebGL/WebGPU ve kalite farkları geometri/fiziği değiştirmemeli. Gerçek TX15 kabulü cihazla ayrıca yapılır.

Bu rapor yeni geometri yayımlandığı anlamına gelmez; canlı2.51değişmedi. Amaç sonraki modelleme işini gerçek eksiklere bağlamak; yalnız test sayısı veya doku eklenmesini gerçek Şile doğrulaması saymamak.

## 9 Kasım devamı — 2.54

2.52mağara biçimi ve2.53çatı temaslarından sonra bina kaynağı kontrol edildi. Güncel135kıyıOSMkaydında yükseklik/kat/çatı etiketi yok. Overture2026-10-21.0kesitindeki2898kayıtta yükseklik0,katbilgisi1ve zaten mevcut kayıttır. Dolayısıyla ölçülü bina yüksekliği açığı kapanmadı.

Microsoft/OvertureMLroofprint verisinden8ek ayak izi sahneye katıldı;14adayın6sı eğimden ertelendi. Eklerin7,5m yüksekliği/düz çatısı varsayım;MLpuanı saha doğrulaması değildir. OSM/DSM korunur. [Araştırma ve teslim kanıtı](sile-building-supplement-validation.json).
