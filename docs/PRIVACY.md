# Gizlilik ve Veri

Bu belge mevcut uygulama davranisini aciklar; hukuki tavsiye veya eksiksiz bir yargi-alani gizlilik bildirimi degildir. Uygulama canli ve kamuya acik sunulacaksa yayin sahibi, iletisim kanali, veri sorumlusu ve gecerli yasal metinleri eklemelidir.

## Tarayicinizda Tutulan Veriler

Asagidaki veriler localStorage'da, yalniz kullandiginiz tarayici profilinde tutulur:

- Kampanya ilerlemesi, en iyi sure ve tur dereceleri.
- Yerel ucus hayaletleri.
- Gamepad kalibrasyonu ve goruntu/ses tercihleri.
- Operasyon Masasi rotalari ve senaryolari.

Tarayici site verisini silmek bu verileri silebilir. Bu yerel veriler sunucu hesabiyla senkronize edilmez.

## Sunucuya Giden Veriler

Bir odaya katildiginizda gorunen pilot adi, oda, secili drone ve konum/ucus olaylari WebSocket ile islenir. Gorev sonucu gonderildiginde sunucu, baslangic ve bitis zamanini kullanarak siralama kaydi olusturur. Paylasilan hayalet baglantilari, yuklenen ucus izini ve iliskili meta veriyi sunucuda saklar.

Sunucu baglanti, ayrilma ve sonuc olaylarini sinirli bir olay kaydinda tutar. Istemci IP adresi ile Caddy veya benzeri reverse proxy'nin ilettigi IP bilgisi, ziyaretci raporu icin ulke/sehir tahminine donusturulebilir. Yonetici ekraninda cevrimici kullanicilar, olaylar ve toplu ziyaretci raporu goruntulenebilir.

## Gorunurluk ve Saklama

- Siralama sonuclari kamuya acik olabilir.
- Oda katilimcilari ayni odadaki pilot adini ve canli drone konumunu gorebilir.
- Paylasilan hayalet baglantisini bilen kisiler ilgili izi alabilir.
- Olay gunlugu en cok 2.000 kayit, siralama en cok 5.000 sonuc ve paylasilan hayaletler en cok 300 kayit tutar; kapasite doldugunda en eski kayit sirayla silinir. Bu sayisal sinirlar zaman-temelli bir saklama suresi taahhudu degildir.

## Guvenlik ve Secim

Gorunen adinizda kisisel bilgi kullanmayin. URL'yi paylasirken oda ve gorunen adinizin baglantiya yazilabilecegini dikkate alin. Hassas bir guvenlik bulgusu icin [SECURITY.md](../SECURITY.md) yolunu izleyin.

Uygulama hizmete sunulmadan once yayin sahibi, veri sorumlusu adi, erisim/silme talepleri icin gercek iletisim noktasi ve uygulanabilir hukuk kapsamindaki saklama politikasini tamamlamalidir.
