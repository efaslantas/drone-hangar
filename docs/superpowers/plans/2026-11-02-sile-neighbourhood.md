# Coastal Neighbourhood Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make coastal building surroundings less bare while preserving source terrain and flight behavior.
**Architecture:** Pure ground refinement/field sampler plus deterministic street-context planner; one view owns actual instanced solid transforms/colliders, existing world lifecycle owns cleanup.
**Tech Stack:** Existing Three/Vite/Node22; no dependencies or downloaded assets.
**Spec:** docs/superpowers/specs/2026-11-02-sile-neighbourhood-design.md

## Global Constraints
Same dirty codex/simulator-v2; no commit/push/merge. Original data/heights/shore/buildings/forces/profile/RC unchanged. Existing cuts normalized globally with10µm render weld; local refinement<=3passes,8medge,within46m,<=250000landtriangles. Authored tint<=35m; source landuse/roads retain priority. Max56lamps/64planters/45worldmeshes, all hard parts collide at every quality. Existing app-only AWS deployment and retained backups; public authored limits.

## Review Focus
Shared refined edges agree, area/original plane/boundary and Float32 stability; empty/stale fixture fallback and mesh budget.
Tint cannot override source green/lawn/beach/paved/harbour or road corridor; deterministic/idempotent, no physics mutation.
Actual transformed hardpart bounds fit colliders, root footprint stays on land and does not overlap roads/prisms/props/spawn.
Sloped planter support and lamp head overhang use full geometry bounds, not only origin; option/resource lifecycle stable.
Actual GL/GPU/quality/mobile/rebuild and running manifest/HTTPS/WSS/profile/tenant identity are required for delivery.

### Task1: Coastal surroundings ownership
Files: create src/sile-neighbourhood.js,src/sile-neighbourhood-view.js,tests/sile-neighbourhood.test.js,public/maps/sile/neighbourhood-visuals.json; modify src/sile-world.js,src/world.js,public scope/version.
Interfaces: refineNeighbourhoodGround(positions,profiles) returns plane-preserving triangles; neighbourhoodField(data,profiles) returns (x,z)=>weight; planNeighbourhood(data,play,profiles) returns lamp/planter candidates; addNeighbourhood(scene,data,play,profiles) validates/materializes actual transforms/boxes; finishNeighbourhood(scene) performs once-only colour pass.
- [x] RED refinement/field/placement/actualsolid/terrain/fallback/lifecycle checks.
- [x] Implement pure planner and bounded view integration; focused/fullGREEN/build.
- [x] Actual close/wideGL/GPU/quality/mobile/rebuild, one independent review/fix pass.
- [x] App-onlyAWS release,source/runtime/HTTPS/WSS/profile checks,delivery/notes and QA cleanup.
