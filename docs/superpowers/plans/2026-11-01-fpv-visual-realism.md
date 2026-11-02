# FPV visual realism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Convincing fictional FPV aftermath art using sourced surfaces/sky/props and restrained game guides.
**Architecture:** Existing scanned-materials owns PBR quality. New arcade-assets owns async world-token guarded sky/GLB copies and quality/disposal. arcade-site owns merged metre-UV solids/street and fixed asset anchors. arcade-craft owns fictional object art, arcade-view owns optional guides. Main only wires quality/UI.
**Tech Stack:** Existing Three.js/GLTF/RGBE, JavaScript, Node test, Vite. No new dependencies.
**Spec:** docs/superpowers/specs/2026-11-01-fpv-visual-realism-design.md

## Global Constraints
- Preserve all prior work, source aircraft, TX15 calibration and camera preferences.
- CC0 sources verified; all runtime files local, bounded resolution and cleanup.
- No game physics, target paths, automatic tracking/ARM or rankings changes.
- Collision remains deterministic across graphics/load failures; all loops/spawn clear.

## Review Focus
- Async load/low/switch races must not attach to cleared scenes.
- HDR sky/environment must restore on low/night/normal-map return.
- Source-cache GLB geometries/materials/maps must remain distinct from scene-owned copies.
- Texture density must remain metre-scaled on elongated wall/ground segments.
- Hidden guides must not hide actual game objects; toggle and replay/retry preserve correct state.

### Task 1: Sources and asset/material lifecycle
Files tools/prepare-arcade-assets.py, public/arcade-assets/*, src/arcade-assets.js, src/scanned-materials.js, tests/arcade-assets.test.js.
Produces verified local damaged-plaster surface/sky, token-safe applyArcadeAssets(scene,{quality,loadSky,loadModel}) and owned copies.
- [x] Fetch official metadata/files, verify MD5/SHA256, generate bounded WebP and source manifest.
- [x] Write RED lifecycle/material tests, implement source/quality owner, run GREEN.

### Task 2: Street art and FPV presentation
Files src/arcade-site.js, src/arcade-craft.js, src/arcade-view.js, src/main.js, index.html and tests.
Consumes Task1 PBR tags and asset anchors; preserves collision envelopes and operation data.
- [x] RED tests for opted-in guides, art validity and scene/route contracts.
- [x] Implement metre UV merged geometry, street/asset anchors and detailed art, guide checkbox and revised atmosphere.
- [x] Full suite/build and browser visual QA; restore test settings, remove harness.

### Task 3: Review and release
- [x] Fresh final review, address material findings with regressions.
- [x] Publish via existing Azure candidate/backup process; verify HTTPS/assets/profile and save live screenshot.
