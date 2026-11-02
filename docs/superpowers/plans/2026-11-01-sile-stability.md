# Şile stability and castle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** Fix observed depth sorting instability and replace castle-on-water placeholder with coherent bounded landmark.
**Architecture:** render-options.js shared renderer precision; sile-landmarks.js owns site runtime platform and castle mesh. geo-terrain.js honors bounded platforms; sile-world.js uses platform for matching island top/cliff/physical heights and castle prism.
**Tech Stack:** existing JS/Three.js/PBR.
**Spec:** docs/superpowers/specs/2026-11-01-sile-stability-design.md

## Global Constraints
- In-place current codex/simulator-v2/uncommitted work; no commit/push/merge.
- Preserve source snapshot data/licenses, flight forces/camera/RC/profile. Only explicit castle environment relief/collider changes.
-4.5m island relief/details authored;12m tower supported by municipality; no survey claim.
- No photo download/new runtime dependencies; owned resources captured by existing world cleanup.

## Review Focus
- Both renderers/fallback/customflag/composer/GTAO/sky must agree on depth encoding.
- Plateau border/hole/outside queries, positions and normals/collisions agree; source snapshot immutable.
- Correct source island selection, no mainland platform; missing/unsupported site fallback.
- Castle outward normals/windows/parapet, bounds stay inside source footprint and12m height; full prism deliberately conservative.
- Resource cleanup and world switches retain renderer precision without stale terrain metadata.

### Task1 — Depth precision
- [x] Regression renderer precision contract and numerical narrow-gap depth separation RED→GREEN; integrate shared options and flag shader.
- [x] Browser actual renderer/composer precision fixture and maps/GPU checked.
### Task2 — Castle site
- [x] Runtime plateau tests and castle geometry bounds/holes/winding/source/collider tests RED→GREEN.
- [x] Integrate site terrain, rocktop and landmark geometry; full tests/build/browser proof.
### Task3 — Review and publish
- [x] Fresh review/important fixes, source/scope docs.
- [ ] Azure health/source/assets/live profile/TX15 checks, notes/proof/validation saved.
