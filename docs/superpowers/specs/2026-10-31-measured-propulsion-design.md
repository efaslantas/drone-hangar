# Ölçüm tabanlı FPV referans kurulumu

Kullanıcı kaynak araştırması, doğrulama ve uygulama istedi. Mevcut tarayıcı kabuğu korunur; farklı çalışma ortamı isteyen Gazebo/PX4 kurulumu bu değişiklikte yapılmaz.

5 inç freestyle/racer için iki isteğe bağlı, ayrı saklanan referans profil eklenir: DroneHiTech'in yayımladığı F60 Pro IV 1750KV/6S ve 2550KV/4S, HQ 5×4 üç pal, AIKON ESC statik tezgâh testleri. Sayısal ölçüm olgularından seçilmiş noktalar, kaynak tarihi, birimler ve aralık kaydedilir. Kaynağın makalesi/fotoğrafları/kodu kopyalanmaz; açık veri lisansı varmış gibi sunulmaz. Açık kaynak simülatörlerin lisansları ayrıca araştırma belgesinde ayrılır.

Her referans profil tam motor/pervane/hücre sayısı eşleşmesidir. Generic parça kartları bu modda etkisizleştirilir; sessizce farklı pervane/voltaja ölçüm etiketi verilmez. Mevcut generic seçimleri ve kayıtlar korunur. Uçuşa hazır toplam kütle (300–1500 g), kapasite (500–3000 mAh), kullanılabilir kapasite oranı (%50–100) ve aviyonik akım (0–3 A) ayrı kullanıcı varsayımlarıdır. Varsayılanlar ölçülmüş gibi etiketlenmez. Referans motor/pervane sahne modeli temsili kalır.

Saf ölçüm modülü parçalı doğrusal interpolasyonla tek motor itiş/akım/gerilim üretir. 0–30% aralığı ölçülmediğinden orijinden ilk ölçüme uzatma olarak işaretlenir. Gerilim değiştirilmez: tezgâh gerilimleri sabittir; hava hızı, batarya sag/ısı/yaş etkisi modellenmiş denmez. Tepe itiş dört motorun toplamı/kütle; hover ters eğriyle çözülür; süre kullanılabilir Ah / (4×motor hover akımı + aviyonik akım). Gerçek uçuşta aynı eğri fizik adımında itiş ve akımı besler, batarya integral akımdan azalır. Generic motor gecikmesi, açısal tepki ve sürüklenme yaklaşıktır.

UI kaynak linki, statik test koşulları, ölçülen/kullanıcı girdisi/model ayrımı, tepe akım ve hover gazını gösterir. Sonuçlar doğrulanmış tam uçuş veya tüm kataloğun gerçekçilik garantisi olarak sunulmaz. Referans profil koşuları genel sıralamaya gönderilmez; eski ghost karşılaştırması bu modda kullanılmaz.

Kabul: kaynak satırlarıyla sayısal karşılaştırma, interpolasyon uçları, bozuk depolama ve desteklenmeyen drone sınırı, Newton/kg birimleri, hover dengesi, akımdan kapasite integrali ve değişen kütle/süre davranışı testleri; tüm testler/derleme; tarayıcıda kaydet-yükle ve mod geçişi; mevcut Azure yayın yoluyla doğrulama.
