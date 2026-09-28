# Dagitim ve Dogrulama

Bu runbook, uygulamayi derleyip Node veya Docker ile calistirmak icindir. Belirli bir bulut saglayici, alan adi, proxy anahtari veya canli erisim bilgisi icermez.

## Yayin Oncesi

```bash
npm ci
npm test
npm run build
```

- `git status` ile yalniz hedef degisiklikleri kontrol edin.
- `.env`, anahtar, sertifika ve `server/data/` icin yeni takip edilen dosya olmadigini dogrulayin.
- Gercek gamepad kullaniliyorsa ARM/reset/mod/kamera, kalibrasyon ve Operasyon Masasi acil durusunu fiziksel cihazda deneyin.
- WebGL ile ana ekran, akademi, serbest ucus, gunluk, takim odasi, otonomi ve Operasyon Masasi yuzeylerini kontrol edin.
- Deneysel WebGPU etkinse desteklenen tarayicida acildigini, desteklenmeyende WebGL'e dustugunu kontrol edin.
- Mobilde yatay ucus HUD'u, menu, sonuc karti ve dokunmatik hedefleri kontrol edin.

## Node Ile Calistirma

```bash
npm run build
PORT=8780 npm start
```

Uygulama `dist/` dosyalarini sunar ve `/ws` WebSocket uc noktasini acir. Reverse proxy kullaniliyorsa HTTP upgrade basliklarini `/ws` icin iletmeli, HTTPS sonlandirmasi yapmali ve gercek istemci IP bilgisini yalniz guvenilir proxyden aktarmalidir.

## Docker Ile Calistirma

```bash
docker build -t drone-hangar:local .
docker run --rm -p 8780:8780 \
  -v drone-hangar-data:/app/server/data \
  drone-hangar:local
```

`/app/server/data` kalicidir: skorlar, olaylar, admin kimligi ve paylasilan hayaletler burada tutulur. Ephemeral container veya volume'suz dagitim veri ve kimlik olusturulmasina yol acar. Admin kimligini korumali volume'a onceden koyun veya `ADMIN_KEY` ortami ile verin; asla build ya da sunucu logundan almayin. Yayin oncesi yedek alin, erisim izinlerini sinirlayin ve geri yukleme yolunu deneyin.

## Smoke Kontrolu

1. `/` HTTP 200 ve guncel HTML ile acilir.
2. Hash'li `/assets/` dosyalari yuklenir; browser console'da uygulama hatasi yoktur.
3. Bir odaya giris, ikinci istemcide pose gorunurlugu ve ayrilis kontrol edilir.
4. Bir zamanli gorev tamamlanir; siralama API'sinde sonuc gorunur.
5. Takim odasinda iki istemci ile mac, skor, dusme ve respawn kontrol edilir.
6. Admin erisimi yetkisiz istekte 401, yetkili istekte beklenen veriyi verir.
7. Ghost paylasimi boyut limiti, yukleme ve geri oynatma kontrol edilir.

## Geri Alma

1. Onceki calisan image/artifact'i ve ona uygun `dist/` iceriğini hazir tutun.
2. Sorunlu surumu durdurup onceki surumu ayni kalici `server/data/` volume'u ile baslatin.
3. Veri semasi degismisse geri alma oncesi yedekten donus planini uygulayin; rastgele veri silmeyin.
4. HTTP, WebSocket, siralama ve admin smoke kontrollerini tekrarlayin.
