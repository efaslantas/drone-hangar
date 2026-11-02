# Hangar 2.0 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Implement sequentially in this session; one final independent review.

**Goal:** Kullanıcının onayladığı dört parçalı FPV simülatör paketini tamamlamak.
**Architecture:** Mevcut uçuş çekirdeği korunur. Saf oturum/görüntü tercihleri modülleri ekran ve renderer arasında sözleşme oluşturur. Eski pazarlama kabuğu kaldırılır; harita süslemeleri world kaynak temizliğine katılır.
**Tech Stack:** JavaScript, Three.js r179, Vite, Node tests.
**Spec:** docs/superpowers/specs/2026-10-31-simulator-v2-design.md

## Global Constraints
İDA/çatışma geri gelmez. Mevcut ilerleme silinmez. TX15 geliştirmesi ve canlı dağıtım bu etabın dışında. Kalite fizik ve hedef geometrisini değiştirmez. Mevcut yerel değişiklikler korunur.

## Review Focus
Yeni kullanıcı, bozuk localStorage, eski ders/ghost bağlantısı, mobil dokunma katmanı, menüde zamanın durması, kalite değişiminde kaynak temizliği, kamera yeniden boyutlandırma ve WebGPU paritesi.

### Task 1: Doğrudan erişim, yeni menü ve hazırlık
**Files:** index.html, src/style.css, src/theme.css, src/main.js, src/session-preferences.js, src/missions.js, tests/session-preferences.test.js.
**Interfaces:** readSession(storage) → {drone,map}; bağımsız freestyle/race-practice etkinlikleri.
- [x] Son seçim ve bozuk/erişilemeyen depolama testlerini yaz; RED gözle.
- [x] Hikâye kapısını kaldır, tercihleri kaydet, sıralama dışı yarış antrenmanı bağla.
- [x] Yeni menü/hazırlık/atölye akışını ve responsive stilleri uygula; pazarlama ekranını sil.
- [x] İlgili testleri çalıştır.

### Task 2: Pist sahnesi
**Files:** src/airfield-detail.js, src/world.js, src/billboard.js, tests/airfield-detail.test.js.
**Interfaces:** addAirfieldDetail(scene,play) mevcut uçuş koridorunu ve kaynak kaydını korur.
- [x] Gündüz/gece ve düşük/yüksek kalite sahne sınırı/koridor testini RED→GREEN uygula.
- [x] Asfalt, çim, hangar/apron/çevre detaylarını ekle; ana menüde aynı sahneyi göster.
- [x] World/collider testlerini çalıştır.

### Task 3: Görüntü ve kamera ayarları
**Files:** src/visual-settings.js, src/main.js, src/post.js, src/gfx-webgpu.js, index.html, tests/visual-settings.test.js.
**Interfaces:** normalizeVisualSettings, visualProfile, verticalFov, lensIntensity; GUI hem ayarlar hem uçuş menüsünde aynı tercihleri kullanır.
- [x] Bozuk ayar, FOV, gerçek temiz görüntü ve profil testlerini RED→GREEN uygula.
- [x] Grafik profilleri/ölçek/gölge/detay, FOV/tilt/lens/titreşim ayarlarını renderer'a bağla.
- [x] Yeniden boyutlandırma ve kalıcı ayarları doğrula.

### Task 4: HUD, duraklatma ve uçtan uca teslim
**Files:** src/main.js, src/session-preferences.js, tests/session-preferences.test.js, README.md, docs/OYUNCU-REHBERI.md.
**Interfaces:** menü açıkken simülasyon ve görev/kayıt saati ilerlemez; resume/retry/prepare/home bağımsızdır.
- [x] Pause davranışını testle sabitle, HUD ve hızlı reset akışını tamamla.
- [x] npm test, npm run build, git diff --check çalıştır.
- [x] Chrome masaüstü/mobil, yeni kullanıcı, son seçim, settings/pause/reset ve Pist sahnesi kontrolü; ekran görüntüsü ve ölçüm kaydı.
- [x] Bağımsız inceleme bulgularını gider; tamamlanmayan fiziksel cihaz/canlı kontrollerini açıkça yaz.

## Teslim kanıtı

Davranış testleri temizlik sonrası 220/220; üretim derlemesi ve diff kontrolü başarılı. Masaüstü, 400×820 portre ve 820×400 yatay Chrome kontrolleri, WebGL/WebGPU denemesi ve bağımsız inceleme tamamlandı. Son mobil araç çakışması da giderildi. Ayrıntı ve fiziksel cihaz/uzun performans testi sınırları: `docs/SIMULATOR-V2-DELIVERY.md`.
