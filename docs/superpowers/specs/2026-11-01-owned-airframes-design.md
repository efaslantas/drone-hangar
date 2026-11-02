# Pilotun uçurduğu drone görselleri

Kullanıcı kendi uçurduğu droneların geliştirilmesini istedi. Bu aşama on katalog gövdesinin görsel donanımını ve SOURCE ONE v4 referans gövdesini geliştirir. Gerçek CAD kesim şekilleri/kalınlıkları ile temsili montajı ayırır; gerçek uçuş/Betaflight eşdeğerliği iddia edilmez. Fizik, collision envelope, kumanda ve kaynaklı motor eğrileri değiştirilmez.

Yaklaşım: mevcut modelleri yalnız daha fazla küçük parça ile kalabalıklaştırmak yerine, SOURCE ONE üretici DXF parçaları ve görsel ölçü sahibi kullanılır. Diğer gövdeler sınıf temsili kalır. Alternatif tüm katalog için rastgele internet GLB'leri ölçek/kimlik/lisans doğrulamasını zayıflatacağı için seçilmedi.

SOURCE ONE: sabit9ae65b... üretici arşivinden5inç4mm kol,3mm alt/orta,2mm üst/kamera plakaları; delikler ve slotlar korunur. Ham kaynaklar/GPL3/üretim betiği/manifest yerelde yayımlanır. Kol montajı simülasyonun226mm simetrikX motor merkezlerine uydurulan temsili montajdır; tam CAD montajı değil. F60IV görsel çap27.1mm ve toplam31.1mm, mevcut bench makalesi spesifikasyonu; iç detaylar temsili.

Tüm gövdeler: makul motor boyutları, görünür stator/vida/kablolar, fizik boyutundan ayrılmış görsel parçalar, pil seçimine uygun görünen aktif paket/etiket/bağlantı ve malzeme ayrımı. Mevcut dört rotor, ters dönüş yönleri, pervane çapı, kamera tilt ve atölye seçimleri korunur. Tek aktif pil; gizli ikinci pil/model etiketi çakışmaz. Kaynak dokümanında verilen ölçüler ile sanat varsayımları açıkça etiketlenir.

GPU kaynakları: model başına etiket dokuları/disposable materyal ve geometriler disposeDrone ile temizlenir; ortak karbon dokuları korunur. Preview/retry/remote/ghost yolları aynı sahibi kullanır. Avatar/camera tercihi veya kalibrasyon kaydı yazılmaz.

Kabul: on gövde sonlu geometri,4motor/4rotor ve uyumlu çap/tilt; SOURCEONECADdelikleri/kalınlıkları ve provenans; pil seçimi aktif paketi değiştirir; tekrar seçim GPU dokusu bırakmaz; mevcut testler/build; workshop/chase/browser/WebGPU görselQA; bağımsız inceleme ve Azure doğrulaması. Gerçek telefon/kumanda uçuşu veya gerçek log doğrulaması yapılmış sayılmaz.
