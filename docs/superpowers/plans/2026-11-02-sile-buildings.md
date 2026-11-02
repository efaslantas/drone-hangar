# Şile Coastal Buildings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve coastal facades and their terrain connection without changing surveyed source geometry.
**Architecture:** Source-type lookup + pure coastal wall planner feeds shared atlas wall batch; bounded balcony view derives actual colliders; existing surface union partition creates apron replacement.
**Tech Stack:** Existing Three/Vite/Node22; no dependencies or downloaded images.
**Spec:** docs/superpowers/specs/2026-11-02-sile-buildings-design.md

## Global Constraints
Keep dirty codex/simulator-v2; no commit/push/merge. Source map/DEM/OSM/footprints/heights/forces/profile/input unchanged. Coastal distance<=100m ignores crop edges; atlas1024px,balcony<=160,worldmeshes<=45. Authored facade/apron/balcony not a measured replica. All solid detail collides at all quality. Existing app-only AWS path and backups.

## Review Focus
Reversed/concave/oblique source walls retain outward normals and complete non-overlapping wall area; holes/stale fixtures fallback.
Atlas UVs stay inside cell tiles including mip bleed margins; residential ground floors are not assigned commercial signage.
Balcony actual transformed bounds do not intersect neighbour prisms/prior props/water or exceed source height; source prism untouched.
Aprons replace soil once, use actual terrain triangles and source-land union; mapped beach/roads remain coherent.
Independent resource ownership, quality-stable collisions, bounded batches and live source identity/profile/tenant isolation.

### Task1: Coastal wall and apron ownership
Files: create src/sile-buildings.js,src/sile-building-view.js,src/data/sile-building-types.json,tools/prepare-sile-building-types.mjs,tests/sile-buildings.test.js,public/maps/sile/building-visuals.json; modify src/sile-world.js,src/world.js,public scope/version.
Interfaces: coastalBuildings(data) returns Map<sourceId,profile>; buildingFacade(item,profile,eaves) returns positions/uv/colors and bay metadata; buildingAprons(data,positions,profiles) returns ground/paved; addCoastalBuildings(scene,data,play,profiles) owns shared wall and solid detail view.
- [x] RED source-selection/wall-area/normals/UV/apron/solid-bounds/fallback tests.
- [x] Implement source generator, planner, atlas and view; focused/full GREEN/build.
- [x] Close/aerial GL/GPU/quality/mobile/rebuild acceptance, one independent review/fix pass.
- [x] App-only AWS release,source/runtime/HTTPS/WSS/profile proof,delivery/notes and QA cleanup.
