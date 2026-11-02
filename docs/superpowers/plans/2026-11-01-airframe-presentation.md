# Airframe presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Improve owned drone materials/electronics and natural workshop/chase presentation.
**Architecture:** models.js owns carbon materials and opacity. drone-electronics.js owns bounded visual electronics; drone-studio.js owns neutral preview lighting/floor/shadow fit. airframe-view.js pure chase dimensions; main only integrates owners.
**Tech Stack:** Existing Three.js r179 / JavaScript, no runtime dependencies.
**Spec:** docs/superpowers/specs/2026-11-01-airframe-presentation-design.md

## Global Constraints
- Preserve CAD geometry/depth, physics, collider/rotor/prop dimensions, FPV transform/FOV/tilt, RC/calibration and stored choices.
- New material/electronics are declared artistic approximations; no measured finish/flight equivalence claim.
- Shared textures retained; every per-model material/geometry disposed once.
- Existing branch/uncommitted work retained; no commits/push. Prior Azure publication authorization persists.

## Review Focus
- Micro/camera/edited wheelbase stay finite with clear rotor planes and electronics inside body.
- Arrays of CAD materials and ghost opacity/disposal must not affect shared carbon or another craft.
- Preview centering/shadow extent must work in top/bottom/portrait without hiding craft or changing spec.
- Chase math handles portrait and small/large aircraft; FPV branch unchanged.
- Studio changes are presentation only; no preference overwrite or introduced heavy assets.

### Task1 — Materials and electronics
- [x] RED tests: CAD sides use separate nonmetal laminate material; single/two PCB stacks and four supported mounts fit body; opacity preserves material identity and other craft.
- [x] Implement src/drone-electronics.js + models/drone-details/source-one-frame integration; remove old flat PCB/VTX/duplicate fasteners; keep package/rotors/tilt.
- [x] GREEN focused visual/appearance tests; expected all pass.
### Task2 — Studio and chase
- [x] RED tests: studio shadow camera encloses fitted model/deck; pure chase framing spans ten models and aspect9/16..21/9 at28% limiting-axis extent, positive bounded distances.
- [x] Implement src/drone-studio.js and src/airframe-view.js; integrate preview centre/fit and followCam chase-only; local tag already absent, remote tags preserved. Retain previewzoom1.4 and safetyfactor1.15 after browser check.
- [x] GREEN focused tests, full npm test/build and browser workshop/chase/WebGPU/mobile; expected pass, physical RC flight excluded.
### Task3 — Review and release
- [x] One fresh final read-only reviewer; fix important findings with regressions; update evidence/notes.
- [x] Azure release candidate/production/HTTPS/source hashes and saved profile/RC status verified; screenshot and final.
