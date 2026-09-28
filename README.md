# Drone Hangar

Tarayicida calisan FPV/stabilize drone simulasyonu ve operasyon konsolu. Mode 2 klavye, gamepad ve dokunmatik kontrolleri; arcade fizik, gorevler, yerel ilerleme ve hafif cok oyunculu odalari bir araya getirir.

Bu proje ArduPilot SITL, MAVLink koprusu veya gercek drone kumandasi degildir. Fiziksel PS kolu ile ucus kontrolu denemek icin tasarlanmistir; gercek ucus egitimi ya da sertifikasyon yerine gecmez.

## Basla

**Gereksinim:** Node.js 22 ve npm.

```bash
npm ci
npm run dev
```

Vite'in yazdigi yerel URL'yi tarayicida acin. Gelistirme sunucusunu agda paylasmak icin Vite'in `--host` secenegi kullanilabilir.

```bash
npm test
npm run build
npm start
```

`npm start`, derlenmis `dist/` klasorunu ve WebSocket sunucusunu varsayilan olarak `8780` portunda calistirir. `PORT` ile degistirilebilir.

## Neler Var?

- **Drone Akademisi:** Ucus Okulu, Manuel Gaz, Acro Kontrol, Cevre Yonetimi, Ileri Parkur ve Gorev pistlerinde 36 adim.
- **Serbest ucus:** Drone ve haritayi secip ruzgarli/ruzgar siz ucus pratigi yapin.
- **Gunluk gorev:** Her UTC gunu ayni rota ve drone ile olusan zamanli rota.
- **Takim savasi:** Oda tabanli Kirmizi-Mavi mac; skor, can ve respawn sunucuda yonetilir.
- **IHA + IDA otonom gorevi:** Kiyi arama, deniz araci sevki ve operator devralmasi.
- **Operasyon Masasi:** Bir IHA ve iki IDA icin manuel, bekleme, rota ve acil durus kontrolleri.

Oyun, varsayilan olarak WebGL kullanir. Ayarlardaki WebGPU secenegi deneyseldir; desteklenmeyen tarayicida WebGL'e geri duser.

## Kontroller

Mode 2: sol stick yaw + gaz, sag stick roll + pitch.

| Girdi | Ucus |
|---|---|
| Klavye | W/S gaz, A/D yaw, oklar veya IJKL pitch/roll, Space ARM, T mod, C kamera, R reset |
| Gamepad | X ARM, Circle reset, Triangle mod, Square kamera, R1 ates; profil ve kalibrasyon Ayarlar'da |
| Mobil | Iki sanal stick, ARM, Ates ve menu |

Operasyon Masasi'nda L1/R1 arac secer, Square kamerayi degistirir, Circle calisma alanini sifirlar; L2+R2'yi 700 ms basili tutmak kilitli acil durus uygular. IDA'da sol dikey eksen ileri/geri, sag yatay eksen dumendir.

Gamepad davranisi tarayici ve cihaz baglantisina baglidir. Fiziksel cihazla kontrol ve kalibrasyon yapmadan ucus hissinin dogrulandigi varsayilmamalidir.

## Veri ve Cok Oyunculu

Kampanya ilerlemesi, kalibrasyon, hayalet kayitlari ve Operasyon Masasi senaryolari tarayicinin localStorage alaninda tutulur. Oda durumu, siralama sonuclari ve paylasilan tekrarlar sunucuya gider. Ayrintilar: [Gizlilik ve Veri](docs/PRIVACY.md).

## Belgeler

- [Uctan Uca Urun Analizi](docs/URUN-ANALIZI.md)
- [Oyuncu Rehberi](docs/OYUNCU-REHBERI.md)
- [Dagitim ve Dogrulama](docs/DAGITIM.md)
- [Gizlilik ve Veri](docs/PRIVACY.md)
- [Varlik Kredileri](CREDITS.md)
- [Katki](CONTRIBUTING.md)
- [Guvenlik Bildirimi](SECURITY.md)

## Lisans

Kod [MIT Lisansi](LICENSE) ile sunulur. Ucuncu taraf varlik lisanslari [CREDITS.md](CREDITS.md) icindedir.
