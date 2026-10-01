# Oyuncu Rehberi

Drone Hangar, tarayicida drone kontrolu denemek, rotalari tamamlamak ve sinirli cok oyunculu odalarda ucus yapmak icindir. Gercek drone, ucus emniyeti egitimi veya ArduPilot SITL yerine gecmez.

## Ilk Ucus

1. Yeni pilotsaniz ana ekranda **Drone'u yeniden topla** secin. Baslangic kiti 5 inç freestyle çerçeve, 1900 KV motor, 4S 1500 mAh pack ve iki pal pervanedir.
2. Atölyeden sonra sırasıyla güvenli güç testi, kısa takip çekimi ve kayıp plan uçuşunu tamamlayın. Her uçuşun sonunda pade inip ARM'i kapatın.
3. Üçüncü uçuşla akademi, serbest uçuş, günlük görev, çok oyunculu, otonom görev ve Operasyon Masası açılır. Hikâye uçuşları sıralamaya veya ghost paylaşımına yazılmaz.
4. Mevcut kampanya ilerlemesi veya FPV build'i olan oyuncular açılışı otomatik tamamlanmış görür; hangardan hikâyeyi yeniden oynayabilir.
5. Gamepad kullaniyorsaniz Ayarlar'da profil ve kalibrasyonu yapin. **Kalkis** sonrasi geri sayimi bekleyin; uçuş padde disarmed başlar. Space veya gamepadda X ile ARM edin.

## Modlar

| Mod | Ne yaparsiniz | Skor/ilerleme |
|---|---|---|
| Drone Akademisi | Kontrol ve rota derslerini tamamlarsiniz | Yerel ilerleme, uygun adimlarda sure |
| Serbest ucus | Drone/harita ile serbest pratik yaparsiniz | Kampanya ilerlemesi yok |
| Gunun gorevi | O gunun ortak rotasini ucarsiniz | Gunluk siralama |
| Takim savasi | Kirmizi-Mavi odasinda mac yaparsiniz | Sunucu skoru, kampanya ilerlemesi yok |
| IHA + IDA | Otonom kiyi gorevini izler veya araci devralirsiniz | Siralama ve hayalet yok |
| Operasyon Masasi | Bir IHA ve iki IDA icin rota/manuel kontrol kurarsiniz | Senaryolar yalniz cihazinizda |

## Kontrol Mantigi

Mode 2'de sol stick gaz ve yaw, sag stick pitch ve roll'dur. Gaz ortasi hover noktasi degildir; drone ve ucus moduna gore itkiyi ayarlamaniz gerekir. Angle modunda stabilizasyon vardir; Acro daha dogrudan tepki verir. Gorev zorunlu kilmadiysa modu Ayarlar veya ucus kontrolunden degistirebilirsiniz.

Klavye kisayollari: Space ARM, T Angle/Acro, C FPV/chase kamera, R reset, H yardim, M ses ve iki kez Esc hangara donus. Cift Esc, tek yanlis tusa basmanin ucusu kapatmamasini saglar.

Gamepad tarayici Gamepad API'sini kullanir. Sayfaya odak verin ve bir tusa basin. Bagli bir kolun gorunmesi, eksen merkezinin veya cihaz profilinin dogru oldugu anlamina gelmez; ilk ucuştan once kalibrasyon yapin.

## Sonuc ve Tekrar

Basarili gorev sonunda sure, kisisel rekor farki ve varsa tur bolumleri gorunur. Yerel en iyi kosu hayalet olarak sonraki denemede gorunebilir; **Tekrari izle** ayni izi chase kamerayla oynatir. Tarayici verisini silmek ilerleme, kalibrasyon, yerel hayaletler ve Operasyon Masasi senaryolarini da silebilir.

## Birlikte Ucus

Oda adi ve gorunen ad URL'ye yazilir. Ayni oda diger pilotlarin konumunu gosterir; davet baglantisi secili harita, drone veya gorevi eslemez. Takim savasi `team` odasinda iki pilotla baslar. Oda kurallari ve veri kullanimi icin [Gizlilik ve Veri](PRIVACY.md) belgesine bakin.

## Sorun Giderme

- Kontrol tepki vermiyorsa sayfaya tiklayin, kolu yeniden baglayin ve Ayarlar'da kalibrasyonu kontrol edin.
- Goruntu sorunu varsa deneysel WebGPU'yu kapatip varsayilan WebGL'i deneyin.
- Ucus ekrani kontrol edilmiyorsa menu/sonuc kartini kapatin; mobilde yatay gorunum daha uygundur.
- Yerel ilerleme veya ayarlar kaybolduysa tarayicinin site verisi silinmis olabilir; sunucuda bunun yedegi tutulmaz.
