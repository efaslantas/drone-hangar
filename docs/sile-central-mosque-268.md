# Şile Merkez Camii · 2.68

Şile merkezindeki Hüseyin Keçici Camii (OSM way342519904) artık genel konut bloğu yerine ana kubbe, alt kubbeler, küçük köşe kubbeleri ve tek şerefeli minare ile çizilir. Mevcut bina ayak izi ve ham coğrafi kaynak korunur. Konum göstergesi ve genel harita gerçek kaynak adını da tanır.

Biçim referansı [yapım firmasının proje sayfası ve dış cephe fotoğraflarıdır](https://www.camiiyapi.com/huseyin-kecici-sile-merkez-cami). [Darwinek’in 15 Kasım 2008 tarihli fotoğrafı](https://commons.wikimedia.org/wiki/File:H%C3%BCseyin_Ke%C3%A7ici_Mosque,_%C5%9Eile.jpg) tarihsel karşılaştırma kaynağıdır (CC BY-SA 3.0). Fotoğraf dosyaları uygulamaya kopyalanmadı. Taş, kemerli pencere ve kurşun kaplama desenleri uygulama için üretildi.

Ölçü kaydı bulunmadığından 11,2 m gövde, 22,6 m ana kubbe tepesi ve 32 m minare yüksekliği **fotoğrafa dayalı varsayımdır**. Minarenin ayak izi içindeki köşesi de ölçülmemiştir. Önceki 7,5 m yükseklik genel varsayımdı. Model mimari restitüsyon, iç mekân veya saha mühendisliği ölçümü değildir. Kaynak/varsayım kaydı `/maps/sile/central-mosque.json`, kullanıcı açıklaması `/sile.html` içindedir.

Görünen Float32 üçgenleri yüzey temasının da kaynağıdır. Genel çatı kaldırılır; yalnız bu yapının gövde yüksekliği ve kabuk temasları değişir. Kubbe üstüne yavaş iniş ve minareye hızlı geçiş testi vardır; komşu boş havaya büyük bir görünmez minare kutusu eklenmez. Model yalnız doğru Şile projeksiyonu, tamamlanmış dünya ve uyumlu kaynak ayak iziyle açılır. Diğer cami etiketleri otomatik dönüştürülmez.

2.67 gerçek tam-dünya karşılaştırmasında bu yapının tek gövde prizması ve 14 eski çatı üçgeni dışında bütün fizik kayıtları aynı kaldı. Yerlerine 11.132 görünür kabuk üçgeni geldi; diğer fizik kayıtlarının SHA256’sı `81b68a783ce0ddfe72da5af371d6f52353f441721a0905b95e79bd452854ce80`. Temel eteklerinin konum SHA256’sı `60ab3df4e3edbfe78a899f197503a00650655279d4f7f0ab16464b78247e4856` olarak korunur.

Bu ekleme bütün Şile’yi birebir yapmaz. 30 m DSM, temsili konut cepheleri, eksik kaynak ayrıntıları ve kullanıcı görsel/uçuş kabulü sınırları sürer. Önceki performans ölçümleri yeni sürümün ölçümü olarak sunulmaz. Yeni doğrulama ve dağıtım kanıtları `docs/sile-completion-acceptance.json` içindeki `followups.centralMosque268` bölümünde tutulur.

Yayın: `v2.68.0-21a89f2f1dfa`. 703 Node22/11altyapı/build ve fresh kod incelemesi geçti;502 paket/144 çalışan kaynak SHA,HTTPS/WSS doğrulandı. Yerel gerçek Chrome sahne görünümü incelendi. Yeni FPS ve canlı tarayıcı kontrolü CUA zaman aşımı nedeniyle tamamlanamadı; manuel uçuş/TX15 kabulü yapılmadı.
