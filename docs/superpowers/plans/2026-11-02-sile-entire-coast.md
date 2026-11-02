# Şile entire coast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give the entire existing Şile shoreline sourced sand/rock differentiation, natural-looking sea and broken foam/cliffs.
**Architecture:** Source-backed patches drape original terrain. One coastal module builds bounded clipped strips/fracture quads; one water module supplies renderer-neutral PBR maps and absolute-time phase. Runtime source/collision boundary stays stable.
**Tech Stack:** Existing Three.js0.179/Vite7/Node22/JS; no new dependency/image.
**Spec:** docs/superpowers/specs/2026-11-02-sile-entire-coast-design.md

## Global Constraints
Same dirtybranch, no commit/push/merge. Originalmap/OSM/DEM, castle12m/base2.9, drone/RC/physics preserved. Flatmeansea/no measured bathymetry; decorative cliffrecess<=.08m. Sourcepatchoffset.0005m; useexistingPBRsand. Newbeach/rockmetadata ODbL+rawsourcehash. max25meshes Sile. Cropedgesexcludedfromfoam.

## Review Focus
Conservative land/water clip underconcave/reversed/holedpolygons and Float32; samplevertices/interiors.
Continuity atgrid/OSMedges, variablewidthnozipper; join/metricUV tests.
Clifflipsharedsurface, <=.08mrecess/noflythrough; actualmidpoint tests.
Water texelwrap/unitnormal/boundedalphafades andsameclockpause; numericfieldtests.
GPU/GL/lifecycle andexistingprofile; actualbrowser/sourcehash checks.

### Task 1: Entire coast surfaces and water
Files: create src/data/sile-coast.json, tools/prepare-sile-coast.mjs,src/sile-coast.js,src/sile-water.js,tests/sile-coast.test.js,tests/sile-water.test.js; modify src/sile-world.js,src/sile-materials.js,src/sile-shore.js and affectedexistingtests/publicscope/version.
Interfaces: source data{features:[{id,kind,rings}],sourceSha256,projection}; buildCoast(terrain) returns cliff/foam/wash geometry data; sourceCoastPatches(data,terrain) returns2geometrybatches. waterMaterial/foamMaterial/washMaterial plus tickSileWater keep renderer-neutral Standard/Basic compatibility. Sharedtexturesregistered by existingworldresources.
- [x] Write RED source/clip/shore/texture/clock/lip tests. Implement data generator and conservative land clipping.
- [x] Implement boundedcliff/continuousfoam/nearshoretint and multiscale sea maps; existingtestupdates preservebehavior. FulltestGREEN/build.
- [x] ActualWebGL/GPUbeach/rock/castle/overview, quality/mobile/lifecycle; freshscopedreview, onefixpass anyimportant, finaltest/build/proofs.
- [x] App-onlyAWS publication using reviewedexistingupdater; manifest/HTTPS/WSS/source/profile checks, delivery/notes. No commit/push/merge.
