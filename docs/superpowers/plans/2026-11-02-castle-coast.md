# Castle coast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Improve Şile castle/island appearance with shared collision/render relief and natural materials.
**Architecture:** A small bounded authored heightfield belongs to runtime platform. Existing terrain interpolation and draping render the identical surface; same source shoreline and castle foundation. Procedural materials require no asset downloads.
**Tech Stack:** Existing Three.js0.179/Vite/JS/Node22.
**Spec:** docs/superpowers/specs/2026-11-02-castle-coast-design.md

## Global Constraints
Same dirty branch, no commits/push/merge. Preserve source map/DEM, castle2.9m base/12m height, other terrain/buildings, RC/profile/flight forces. No unsupported survey claims. No new dependencies/assets. Island grid at most3m, solid colliders independent of visual quality.

## Review Focus
Grid-edge lips must match top triangles; test all cliff vertices against top query.
Barycentric normal/height must match raycast inside/outside/concave coast; test sampled visible triangles.
Castle foundation flat and source unchanged; test corners and envelope.
Mesh ownership/material resources and drawcalls bounded; integration checks.
WebGL/WebGPU, low/high and mobile actual rendering; browser checks.

### Task 1: Shared island relief and natural surface
Files: create src/sile-island.js, tests/sile-island.test.js; modify src/geo-terrain.js,src/sile-landmarks.js,src/sile-world.js,src/sile-materials.js and existing landmarks tests.
Interfaces: createCastleIsland(rings,castle,datum) returns {bounds,cols,rows,heights} regular grid; islandSurface(grid,rings) returns BufferGeometry-compatible {positions,uv,colors}. Platform.surface is grid without nested platforms. terrainSample/surfaceAt consume it; cliff splitting uses that same grid. Source rings immutable.
- [x] Write meaningful raycast/query agreement, variable relief, castle foundation, winding, coast lip/source/fallback/resource tests; run RED.
- [x] Implement bounded grid, shared terrain sampler and exact draped surface/cliffs. Apply irregular masonry, vegetation/wet tint; run focused and full tests GREEN.
- [x] Inspect actual WebGL/WebGPU near/overview/low-high and mobile. Fix evidenced issues, run build, obtain fresh review; record limits/proof.
- [x] Prepare app-only AWS update with old container/data/env rollback; publish and verify current source manifest/HTTPS/WSS and profile persistence. Update validation/runbook/session notes. No commit/push/merge.
