# Measured Propulsion Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Preserve existing local changes.

**Goal:** 5 inç referans kurulumlarda kaynağı belli statik motor ölçümlerini fizik ve Atölye hesaplarına bağlamak.
**Architecture:** Saf propulsion-reference.js veri/eğri/hesap; physics.js tüketir; main.js ayrı saklanan tercih ve UI'ı bağlar. Generic atölye ayrı kalır.
**Tech Stack:** JavaScript, mevcut Three.js/Vite/Node.
**Spec:** docs/superpowers/specs/2026-10-31-measured-propulsion-design.md

## Global Constraints
İlerleme ve generic parçalar silinmez. Referans sadece 5 inç freestyle/racer. Verinin kapsamadığı gerilim, pervane veya drone'a ölçüm etiketi verilmez. Makale/kod/fotoğraf kopyalanmaz. Varsayımlar görünürdür. Referans koşuları sıralama dışıdır.

## Review Focus
Bozuk/depolanamayan tercihler, ölçülmeyen düşük gaz, geçersiz/kütle dışı kurulum, kapasite sıfırlanması, generic moda geri dönüş ve ghost/sıralama tutarlılığı.

### 1. Kaynak ve saf model
- [x] Araştırma/lisans/veri provenance belgesi ve referans kayıtları.
- [x] Eğri, birim, hover, süre ve sınır testlerini RED→GREEN uygula.

### 2. Fizik entegrasyonu
- [x] Gerçek fizik adımında ölçülen itiş/akım, hover gazı ve kapasite integralini RED→GREEN doğrula.
- [x] Generic davranışı koru; payload ve sıralama/ghost uyumluluğunu kontrol et.

### 3. Atölye ve teslim
- [x] Referans profil, kütle/kapasite/kullanılabilir oran/aviyonik girdileri ve kalıcı tercihler.
- [x] Kaynak/koşullar/belirsizlik etiketleri, tam eşleşme ve generic moda dönüş.
- [x] Tam test, derleme, diff kontrolü ve tarayıcı kontrolü.
- [x] Azure yeni imaj, yedekli geçiş, canlı doğrulama ve teslim kaydı.

## Kanıt

230/230 test; üretim derlemesi ve diff kontrolü başarılı. Birincil kaynakla 17 nokta eşleşti; 11 ayrılmış satırda en büyük itiş/akım farkı %1.69/%0.88. Chrome masaüstünde profil/kütle/kapasite, generic dönüşü, kalıcılık ve REF uçuş HUD’u denendi. Azure `v2.1.0-6dbf306e8215` HTTPS ve uygulama kontrolü başarılı. Fiziksel donanım ve bu değişikliğin telefon testi yapılmadı; tam dinamik model kalibrasyonu iddia edilmez.
