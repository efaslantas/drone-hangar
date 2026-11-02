# Coastal Streets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect coastal buildings to coherent source-road/sidewalk surfaces and publish the result.
**Architecture:** Pure street mask/layout and terrain partition; existing union helper gains optional spatial lookup. One paving material/geometry owner integrates before old ground surfaces; entrance corridors feed existing prop-clearance owners.
**Tech Stack:** Existing Three/Vite/Node22, no new packages or image assets.
**Spec:** docs/superpowers/specs/2026-11-02-sile-streets-design.md

## Global Constraints
Dirty codex/simulator-v2 retained; no commit/push/merge. Source map/OSM/DEM/centerlines/derived widths/building heights/shore/physicalterrain/prisms/forces/profile/input same. Authored sidewalk1.5m,link1.25m<=18m,coastalnear45m. New paving512px/metricUV/linear data maps. No raised curb/traffic/signs/dynamiclight. Entireworld<=45meshes. Oldsource fallback, same app-only AWS path/backups.

## Review Focus
Union roads at concave turns,variable widths,shared multi-way junctions and crossings: no duplicate area, no spikes/water spill.
Indexed partition exactly matches legacy masks including large/negative-coordinate/holes/reversed input; no missed masks.
Terrain surfaces and beach/harbour/apron ownership remain exclusive and height-exact; all source building interiors excluded.
Entrance links are bounded/land/neighbour clear, and ALL prop owners reserve the visible corridor before placement.
Material sharing/disposal, stale fixture fallback, real terrain refinement/mesh budget and live source/profile/tenant identity.

### Task1: Street/paving ownership
Files: create src/sile-streets.js,src/sile-street-view.js,tests/sile-streets.test.js,public/maps/sile/street-visuals.json; modify src/sile-shore.js,sile-world.js,sile-neighbourhood.js and existing prop corridor checks; source-scope/version/docs.
Interfaces: createSurfacePartition(masks,{spatial=false}) retains triangle=>{inside,outside}; streetLayout(data,profiles) returns {valid,asphalt,paving,coverage,groundCorridors,stats}; streetSurfaces(data,positions,layout) returns {ground,asphalt,paving}; streetRemainder(positions,layout) subtracts coverage for other overlays; pavingGeometry(positions)/streetPavingMaterial() own metric paving resources.
- [x] RED indexed union/junction/real terrain/ownership/entry clearance/fallback/material lifecycle tests.
- [x] Implement indexed union/layout/surface and existing prop corridor integration; focused/fullGREEN/build.
- [x] Actual GL/GPU/quality/mobile/rebuild and one independent review/fix pass.
- [x] App-only AWS release,source/runtime/HTTPS/WSS/profile checks,delivery/notes and QA cleanup.
