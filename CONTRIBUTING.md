# Katki Rehberi

## Baslamadan Once

- Node.js 22 kullanin.
- `npm ci`, `npm test` ve `npm run build` calistirin.
- `server/data/`, `.env*`, sertifikalar ve yerel araclardan uretilen dosyalari commit etmeyin.
- Kod MIT Lisansi ile sunulur; ucuncu taraf varliklar icin [CREDITS.md](CREDITS.md) kosullarini da inceleyin.

## Degisiklik Kurallari

- Fizik, hedef, input, otonomi, rota ve takim mantigini saf modullerde tutun; `src/main.js` yalniz orkestrasyon yapmalidir.
- Yeni davranisi en yakin `tests/*.test.js` dosyasinda koruyun.
- Kullaniciya gorunen akisi degistiriyorsaniz `README.md`, `docs/OYUNCU-REHBERI.md` ve gerekirse `docs/URUN-ANALIZI.md` ile beraber guncelleyin.
- Yeni ucuncu taraf varlikta lisansi ve kaynagi [CREDITS.md](CREDITS.md) ile envantere ekleyin.
- Kullanici verisi, admin, API veya odalara dokunuyorsaniz [Gizlilik](docs/PRIVACY.md) ve [Guvenlik](SECURITY.md) etkisini inceleyin.

## Dogrulama

Bir degisiklik icin en azindan sunlari raporlayin:

```bash
npm test
npm run build
```

Gamepad, mobil, WebGPU veya canli dagitimi etkileyen degisikliklerde uygun fiziksel cihaz/tarayici denemesi de gerekir; Node testinin bunu kanitlamadigini acikca belirtin.
