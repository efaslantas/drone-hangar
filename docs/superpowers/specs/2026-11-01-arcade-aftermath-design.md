# Arcade — çatışma sonrası kurgusal saha

Kullanıcı mevcut Arcade haritasının savaş ortamı gibi görünmesini istedi. Yalnız Arcade için çatışma sonrası sanayi sahası: kırık beton cepheler, açık döşemeler, enkaz, beton/sandbag barikatlar, yanmış araç kabukları, koyu lekeli zemin, uzakta yumuşak duman ve puslu ışık. Mevcut renkli oyun nesneleri okunabilir kalır. Oyun kuralları, rotalar, kumanda ve Şile/serbest Pist değişmez.

Yaklaşım: normal Pist'e kalıcı dekor eklemek yerine buildWorld opsiyonuyla ayrı aftermath varyantı. Aynı fizik sınırları/zemin; yalnız görünen yeni katı yapılarla eşleşen statik kutu çarpışmaları. Hedef rotalarının tam çevrimi ve kalkışın 6m çevresi açık kalır. Duman dekoratiftir, simülasyon zamanından güncellenir; düşük kalitede sayısı azalır, çarpışma değişmez. Tekrarda dünya kaynakları çoğalmaz; moddan çıkarken dünya cache anahtarı varyantı ayırır.

Uygulama kararları: kodla üretilmiş kurgusal mimari/dokular; gerçek yer, çatışma veya araç verisi kullanılmaz. Parlak gökyüzü/kuşlar/normal Pist dekoru bu varyanta eklenmez. Şile veri üretimi ve uçuş fiziği kapsam dışı. Görünüm değişikliği için yeni bağımlılık yok.

Kabul: arena belirgin şekilde hasarlı/puslu görünür; dört hareketli nesne ve yeni drone akışı korunur; tüm rotalar/başlangıç çarpışmasız; kalite fizik farkı yaratmaz; normal Pist/Şile'ye dönüş temiz; duman pause ile durur; kaynaklar dispose edilir. Node tests/build, tarayıcı görsel QA, taze inceleme ve Azure yayın/sağlık kontrolü.
