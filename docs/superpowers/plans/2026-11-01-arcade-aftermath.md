# Arcade aftermath Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Give only Arcade a fictional conflict-aftermath industrial setting.
**Architecture:** arcade-site.js owns batched geometry, static colliders and smoke data/ticking. world.js selects a theme variant and owns disposal; main.js includes the variant in world reuse and labels the session.
**Tech Stack:** Existing Three.js, JS, Node test and Vite; no new dependencies.
**Spec:** docs/superpowers/specs/2026-11-01-arcade-aftermath-design.md

## Global Constraints
- Preserve TX15 calibration, source drone setup, Şile and normal Pist behavior.
- All moving game routes and 6m launch clearance stay open.
- Quality may change smoke amount, never solids/collision.
- No external assets, real conflict data, weapons/tracking logic or physics changes.

## Review Focus
- Same-map Arcade → free flight must rebuild theme; retries should not accumulate resources.
- Sample full target loops against every new collider with target radius + margin.
- Paused world time freezes smoke; night and quality changes must remain readable.
- Shared geometry/textures must dispose once through worldResources.
- Visual solid placement and collision bounds should agree.

### Task 1: Theme scene and meaningful contracts
Files src/arcade-site.js, tests/arcade-site.test.js.
Produces buildArcadeSite(scene,{quality}) play bounds/boxes and tickArcadeSite(scene,time) smoke animation.
- [x] Write RED tests for structures, route/spawn clearance, finite geometry and bounded mesh count, equal collision across quality, deterministic smoke/pause behavior.
- [x] Implement instanced ruins/barriers/rubble/ground and soft smoke; run GREEN.

### Task 2: World integration and release
Files src/world.js, src/main.js, src/arcade.js, docs/release metadata.
Consumes Task1 builder/ticker; world variant cache must distinguish aftermath and normal.
- [x] Write RED integration test for variant identity, clearing/disposal and no stale smoke after switching.
- [x] Wire separate build path, atmosphere, label, normal-map exclusion and simulation clock.
- [x] Run full npm test/build; desktop/mobile browser QA and return-to-normal test.
- [x] Fresh review, fix material findings, deploy Azure with backup and verify HTTPS/UI.
