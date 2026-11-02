# Coastal Rocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline with one finalfreshreview.

**Goal:** Improve castle/coastal rock surfaces and publish2.25.
**Architecture:** Existing buildCoast owns bounded face refinement and exclusive wet/dry partition; new pure periodic raster feeds shared rock materials in existing world mesh owners.
**Tech Stack:** Existing Three0.179/Node22/Vite, no dependencies/downloads.
**Spec:** docs/superpowers/specs/2026-11-02-sile-rocks-design.md

## Global Constraints
Same dirtycodex/simulator-v2/no commit/push/merge. Source shoreline/map/OSM/DEM/physical heightfields/4.5mcastlefoundation/allprops/profile/input unchanged.8cminward face relief existingapproximation. Originalfoamgeometryexact.1024pxperiodicPBR/sRGBcolor/linearothers. Onecliffmesh2materialgroups,<=45meshes. New wetting/bedding authored, no measured terrain claim. Same app-onlyAWS path/backups.

## Review Focus
Wet/dry clipping preserves 3Darea/winding/attributes and makes no coplanar duplicate sheet.
Exact terrain-split lip/grid diagonals/bottom/source corners survive new refinements with both ring windings.
Originalfoamoutput unchanged and offshore; conservative face approximation never exceeds8cm.
Shared normal/UV continuity across wetgroups; data periodicity/encoding and unique resource disposal correct.
ActualGL/GPUclosecastle/wide/quality and productionidentity/source/profile/tenant evidence.

### Task1: Rock faces and wetting finish
Files modify src/sile-coast.js,src/sile-world.js; create src/sile-rock-view.js,tests/sile-rocks.test.js; publicscope/version/docs.
Interfaces buildCoast retains {cliffs,foam}, adds {dryCliffs,wetCliffs}; splitRockFaces(cliffs,datum) returns {dryCliffs,wetCliffs} same {positions,uv,colors}. rockTexel(u,v) periodic field,coastalRockMaterials() shareddata; rockGeometry(dryCliffs,wetCliffs) indexed/smoothed2groups geometry. Existing buildSile/collision/API signatures same.
- [x] RED partition/winding/lip/periodicity/material/lifecycle/exactbaseline tests.
- [x] Implement bounded refinement/partition and shared material integration; focusedGREEN.
- [x] Fullsuite/build; actualGL/GPUbeforeafterquality;oneindependentreview/onejustifiedfixpass.
- [x] Same app-onlyAWSrelease/HTTPS/WSS/source/runtime/profile/tenant/backups/docs/notes/QAcleanup.
