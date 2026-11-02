# Rigid Body Implementation Plan

> **For agentic workers:** superpowers:executing-plans inline; one fresh-context final review.

**Goal:** Referans gerçekçi Acro yolunu dört motorlu tork/atalet denklemi üzerinden çalıştırmak.
**Architecture:** Saf `rigid-body.js`: konfigürasyon, Euler/RK4, mixer, rate kontrolü. `physics.js`: ölçülen rotor eğrileri ve fizik entegrasyonu. `propulsion-reference.js` ve Atölye: saklanan varsayımlar ve açıklama.
**Tech Stack:** mevcut JavaScript/Three.js/Vite/Node; ek bağımlılık yok.
**Spec:** docs/superpowers/specs/2026-11-01-rigid-body-design.md

## Global Constraints
Ölçülmüş yeni J/yaw/ESC parametresi iddia edilmez. Generic/Angle davranışları ve eski kayıtlar korunur. Önceki yerel değişiklikler sıfırlanmaz. Referans koşuları sıralama dışı kalır.

## Review Focus
Gövde/rotor işaretleri, doygunluk ve integral, eski ayarların yüklenmesi, açı/acro ve disarm geçişleri, eksik/bozuk atalet girdileri, farklı frame adımları.

- [x] Saf dinamik: korunum/tork/mixer/konfigürasyon testleri RED→GREEN.
- [x] Dört rotor, kontrolcü ve akım entegrasyonu: davranış testleri RED→GREEN; tam suite.
- [x] Atölye varsayım alanları, motor durumu ve kaynak belgesi; tarayıcı.
- [x] Bağımsız inceleme, gerekli regresyonlar, tam test/build/diff; yedekli Azure yayını ve canlı doğrulama.

## Decisions
Kullanıcının devam/doğrudan uygulama talebiyle mevcut tarayıcı mimarisi korunur. Bu adımda ayrı Gazebo/PX4 çalışma ortamı kurulmaz. Kopyalanmış firmware veya araştırma kodu yok; denklem ve kontrol mimarisi kaynaklarla karşılaştırılır.

## Doğrulama ve inceleme kaydı

246/246 test; üretim derlemesi ve diff kontrolü başarılı. Sayısal hover, tork/atalet, korunum, mixer, doygunluk, integral, geçiş, farklı zaman adımları ve ayrı rotor akım testleri geçti. Bağımsız incelemenin tek P2 bulgusu manuel J'nin ara değerlerde editörü kilitlemesiydi: tarayıcıda üretildi; `reference-form.test.js` RED→GREEN ve [.01,.01,.01] girip yenileme ile giderildi. İncelemenin iki kapsam boşluğu için integral-dondurma ve eşit olmayan rotorların tüketim testleri eklendi. Çarpışma sonrası donmuş motor telemetrisi RED→GREEN düzeltildi; mevcut spool testi, uçuş tavanına çarpmadan gerçek spool'u ölçmesi için yüksek test tavanına alındı.

Chrome klavyede ARM/W/sağ kontrolüyle `REF 4M · ACRO · REAL` ve farklı dört motor değeri görüldü; uygulama hata konsolu boştu. Fiziksel TX15 ve telefon testi yapılmadı. Model atalet/ESC/yaw/PID varsayımları gerçek donanım ölçümü değildir.

Azure yayını: `v2.2.0-f7652f214445`. SSH bağlantı yolu banner aşamasında zaman aşımına düştüğü için mevcut Azure Run Command yönetim kanalı kullanıldı. Değişen kaynaklar aktarıldı; değişmeyen varlıklar önceki kaynaktan alındı ve 176 dosyanın tamamı yerel paketin SHA-256 manifestiyle karşılaştırıldı. Docker build, ayrı aday sağlık kontrolü ve yedekli canlı geçiş başarılı. Genel HTTPS sağlık yanıtı, kaynak sayfası, sıralama ve yetkisiz admin kontrolü başarılı. Canlı Chrome `REF 4M · ACRO · REAL` yolunu gösterdi; mevcut ayarlar korunarak Atölye açık bırakıldı.
