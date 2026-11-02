# Battery Model Implementation Plan

> **For agentic workers:** superpowers:executing-plans inline; one fresh-context final review.

**Goal:** Referans uçuşa açıkça varsayım olarak etiketlenmiş Rint pil, gerilim/itki düşüşü ve kapasite/enerji takibi eklemek.
**Architecture:** Saf battery-model.js devre/enerji; propulsion-reference.js gerilimli eğri ve fresh-hover; physics.js rotor alt adımı; main.js/Atölye/HUD kalıcı tercihler ve pack reset.
**Tech Stack:** Mevcut JavaScript/Three.js/Vite/Node; yeni bağımlılık yok.
**Spec:** docs/superpowers/specs/2026-11-01-battery-model-design.md

## Global Constraints
Eski profil kayıtları bench kalır. Tezgâh noktaları değiştirilmez. Rint/OCV/gerilim ölçekleme ölçülmüş pack verisi değildir. Mevcut yerel değişiklikler ve ilerleme korunur. Referans koşuları sıralama dışı kalır.

## Review Focus
Eski kayıtlar, SOC ile kullanılabilir bütçe farkı, gerilim-akım çözücüsü, kuvvet tersinin sınırları, cutoff kilidi ve pack değişimi, UI taslağı, dört rotor/timestep tutarlılığı.

- [x] Devre/OCV/enerji/normalizasyon testleri RED→GREEN.
- [x] Gerilimli eğri ve pil/fizik alt adımı, hover, cutoff/reset testleri RED→GREEN.
- [x] Atölye/HUD ve açık varsayım/kaynak bilgisi; tarayıcı.
- [x] Bağımsız inceleme ve regresyonlar; tam test/build/diff; yedekli Azure ve canlı kontrol.
