# Referans pil modeli

Kullanıcı devam edilmesini istedi. Referans motorların sabit tezgâh modu korunur. Ek Rint modu, açık devre gerilimi ve seri iç dirençten yük altı gerilimi çözer: Vt=Voc−I·R. Hücre OCV/SOC eğrisi, iç direnç ve kesme eşiği kullanıcı/model varsayımıdır; gerçek pack ölçümü olarak etiketlenmez. Sıcaklık/yaşlanma/RC polarizasyonu modeli yoktur. I²R enerji kaybı Wh olarak hesaplanabilir, sıcaklık diye sunulmaz.

Mevcut kayıtlarda pil ayarı yoksa bench modu korunur. Yeni varsayılan 5 inç örnek kurulumlar Rint kullanır. UI iki modu ayırır. Rint: örnek 3 mΩ/hücre, başlangıç SOC %100, düşük gerilim eşiği 3.0 V/hücre ve 200 ms gecikme; bunlar model parametreleridir. SOC eğrisi örnek LiPo 4.20 V sınıfındadır ve doğrulanmış marka eğrisi değildir. Kullanılabilir Ah=min(kullanılabilir oran,başlangıç SOC)×kapasite. `state.battery` kullanılabilir bütçenin kalanıdır; packSOC ayrıca gerçek başlangıç varsayımına göre hesaplanır.

Tek gerilimde ölçülmüş itki eğrisi doğrudan başka gerilimde ölçülmüş gibi kullanılmaz. Rint modunda, RPM'nin gerilimle yaklaşık orantılı olduğu varsayımıyla itki ve akım V² oranıyla düşürülür. Ölçümün üstüne güç artışı verilmez (oran en çok 1). Dört motorun farklı komutlarında I(V) kullanılarak ortak Vt bisection ile çözülür; negatif/NaN gerilim veya akım üretmez. Kuvvet tahsisi mevcut gerilimdeki rotor sınırlarını ve ters kuvvet eğrisini kullanır. Gerilim ve akım her fizik alt adımında beraber çözülür; mAh ve Wh aynı örneklerle integre edilir.

Upright fresh-pack hover komutu motor/pil modelinin kuvvet dengesinden hesaplanır ve spec üzerinde önbelleklenir. Kalan pil azaldıkça Acro gazı otomatik dengelenmez; pilot güç kaybını hisseder. Kargo mass değişimi taze-hover önbelleğini yeniler. Bench metrikleri sabit tezgâh olarak ayrı kalır; pil modunda ek hesaplanan taze-pack hover sonucu gösterilir.

Düşük hücre gerilimi 200 ms sürerse model kesmesi kilitlenir, motor gücü kapanır ve HUD açıkça bildirir. SOC sıfırlanmış gibi gösterilmez. Re-arm tek başına kilidi kaldırmaz; yeni pack/reset kaldırır. CanSwapBattery otomatik pack değişimi bütün pil alt durumlarını sıfırlar. Disarm fiziksel sıcaklık/recovery doğrulaması iddiası taşımaz; açık devre gerilimi geri gelir ve akım sıfır olur.

Kabul: R=0, yük artışı, dört farklı motor, Ohm/Joule güç dengesi, mAh/Wh birimleri, voltaj ölçekleme ve ölçüm üstüne çıkmama, SOC/bütçe ayrımı, hover, zayıf pack cutoff/re-arm/yeni pack, bench regresyonları, form taslağı ve kalıcılık; tam suite/build, bağımsız inceleme, Chrome ve mevcut Azure yönetim kanalıyla yedekli canlı yayın.
