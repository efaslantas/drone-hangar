# Şile Harbour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the bare harbour/arm appearance with terrain-matched hardscape and collidable inset rock armour.
**Architecture:** Union partition in existing shore helper; new harbour planner/view consumes source coast and context masks. Existing world lifecycle owns render resources and actual obstacle bounds.
**Tech Stack:** Existing Three/Vite/Node22, no dependencies/assets.
**Spec:** docs/superpowers/specs/2026-11-02-sile-harbour-design.md

## Global Constraints
Same dirty codex/simulator-v2, no commit/push/merge. Current source map/DEM/physics/input/profile unchanged. Authored10m band and western arm scope declared. Max800 rocks,45 world meshes; all hard solids collide at every quality. No reference-photo redistribution or measured reconstruction claim. Existing app-only deployment and retained backup procedure.

## Review Focus
Overlapping masks/holes/reversed winding conserve area with no doubled pavement; terrain/grid diagonal heights remain exact.
Authored arm selection is tied to source vertices, stale map skips; patches remain on source land and outside beach.
Rock transforms cannot extend into water/roads/buildings/props/spawn; actual visible bounds fit collider.
Quality/rebuild use same colliders and lifecycle disposes independently owned resources.
Deployment source identity, prior tenant isolation and browser profile preserved, public limits accurate.

### Task1: Harbour partition, surface and rock armour
Files: modify src/sile-shore.js,src/sile-world.js; create src/sile-harbour.js,tests/sile-harbour.test.js,public/maps/sile/harbour-visuals.json; scope/version docs.
Interfaces: createSurfacePartition(masks) returns triangle=>{inside,outside}, interpolating [x,z,...attrs]; harbourSurfaces(data,positions) returns {ground,paved,valid}; addSileHarbour(scene,data,play) materializes inset rocks with actual geometry AABB appended to play.boxes.
- [x] RED partition/real land terrain/collider/clearance/fallback tests.
- [x] Implement union partition and harbour surface/view; focused/full GREEN/build.
- [x] Actual photo-angle/near harbour GL/GPU/quality/mobile/rebuild and one independent review/fix pass.
- [x] App-only AWS publication, source/runtime/HTTPS/WSS checks, delivery notes and clean QA root. Keep dirty branch.
