# Şile inspection navigation implementation plan

> **For agentic workers:** Use superpowers:executing-plans; inline implementation and one fresh final reviewer.

**Goal:** Make manual Şile viewpoint approach and return understandable in FPV and paused map overview.
**Architecture:** One navigation presentation owner consumes existing session, simulated state and source map. Main lifecycle creates/disposes panel and updates it; scenario/evidence/physics remain unchanged.
**Tech Stack:** Existing JS/DOM/SVG/Node22, no dependency.
**Spec:** docs/superpowers/specs/2026-11-02-sile-inspection-navigation-design.md

## Global constraints
Existing demo criteria and source map/physics unchanged; no autopilot, network upload, real ILKE/SITL/hardware claim. Same dirty branch/no commit/push/merge, app-only publication. Map contains viewpoint markers, no safe route claim.

## Review focus
- Vertical separation must not read as arrival when horizontal distance iszero.
- Returning must use real spawn distance; terminal sessions must hide guidance.
- Source map north/south/rings/holes must align with localx/z and terrain bounds.
- Invalid/outside position must be unavailable, never silently clamped or zero.
- Replay must label recorded poses, never misrepresent live progress or perturb recording/profile.

## Task1 — navigation presentation
Files: new src/sile-inspection-navigation.js/tests/sile-inspection-navigation.test.js; main/index/style/publicguide.
Interfaces: inspectionNavigation(session,state) -> navigation|null; inspectionMapModel(data) -> bounded source SVG model|null; createInspectionNavigation({hud,map,route},session,data) -> {paint(state,{replaying=false}),dispose()}.
- [x] RED tests: viewpoint horizontal0/vertical20, return distance, terminalnull, invalid state; north-up terrain corners/landhole/road coordinates and invalid source.
- [x] Implement pure model, DOM/SVG panel and lifecycle; preserve full core session and recording.
- [x] Focused tests and actual local UI pause/map/FPV/replay/responsive; final Node22suite/build/infra.
- [x] Fresh scoped whole-change review, correct Important with RED→GREEN.
- [x] Version2.32/ARM64/package/source hashes/app-onlypublish/liveUI/HTTPS/WSS/isolation; docs/memory/evidence.

Evidence: docs/sile-inspection-navigation-validation.json. Two reviewImportant reproduced and fixed in one nativepass, noMinor. Published2.32; no commit/push/merge.
