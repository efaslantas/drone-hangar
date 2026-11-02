# Surface Quality Implementation Plan

> **For agentic workers:** superpowers:executing-plans inline; one fresh-context final review.

**Goal:** Çim taramasını mevcut PBR sistemine eklemek ve doku kalitesini gerçek grafik profiline bağlamak.
**Architecture:** scanned-materials.js kalite/async/material lifecycle; world.js kalite başlangıcı; main.js mevcut sahnede güncelleme; yerel grass JPEG kaynakları ve manifesti.
**Tech Stack:** Mevcut Three.js / JS / Canvas / Node test; yeni bağımlılık yok.
**Spec:** docs/superpowers/specs/2026-11-01-surface-quality-design.md

## Global Constraints
Önceki değişiklikler korunur. Çarpışma/fizik/geometri değişmez. Eski asfalt/beton varlıkları tekrar eklenmez. Yalnız CC0 görseller; kaynak kod alınmaz. Commit/push yok.

## Review Focus
Kalite ve touch kesişimi, hızlı high/low/high, başarısız/yarım yükleme, harita temizlenirken geç async sonuç, paylaşılan malzemeler/UVler, dispose ve GPU sahipliği, Node structural fallback, gerçek görüntü ve kaynak iddiaları.

- [x] Kalite ve lifecycle testleri RED→GREEN.
- [x] Kaynak çim JPEG / checksum / yerel manifest; tarayıcı görüntü ve kalite geçişi.
- [x] İnceleme ve regresyonlar; full test/build/diff; yedekli Azure ve canlı görüntü.
