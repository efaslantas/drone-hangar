# Coastal Facade Finish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline, one final fresh review.

**Goal:** Improve coastal facade material detail and publish2.24.
**Architecture:** Pure facade raster owner supplies shared three-channel atlas to existing coastal wall material; existing wall/solid/UV/paint geometry is untouched.
**Tech Stack:** Existing Three0.179/Node22/Vite, no dependency/image downloads.
**Spec:** docs/superpowers/specs/2026-11-02-sile-facades-design.md

## Global Constraints
Same dirtycodex/simulator-v2/no commit/push/merge.135profiles/16tiles/1024px/old2pxUVinset/tile15blank preserved. sRGBcolor,linearheight/roughness,DataTexturev0bottom. Existing41worldmeshes/sourcegeometry/boxes/physics/profile unchanged. Texture/weathering authored; no measured facade claim. Existing app-onlyAWS rollouts.

## Review Focus
Atlas orientation matches old UV, tile15blank and inset avoids seams.
Glass/plaster roughness and height aligned, no implausible mirror/emissive panes.
All geometry/UV/boxes and sourcephysical data unchanged; lifecycle frees newDataTextures exactlyonce.
No new draw calls or per-frame generation; startup cost bounded.
Actual GL/GPU close/detail/quality inspection and production identity/source/tenant/profile checks.

### Task1: Facade atlas
Files create src/sile-facade-atlas.js,tests/sile-facades.test.js;modify src/sile-building-view.js,public/maps/sile/building-visuals.json,public/sile.html,package/lock;delivery/docs/notes.
Interfaces facadeTexel(tile,x,y) returns rgb,height,roughness,kind in top-down256pxbay; facadeAtlasData() returns {size,pixels:{color,height,roughness}} with RGBAUint8Array bottomup. Existing addCoastalBuildings signature unchanged.
- [x] RED meaningful channel/variety/atlasorientation/blankgable/material/disposal/geometrydigest tests.
- [x] Implement deterministic pure atlas and view material;focusedGREEN.
- [x] Fullsuite/build and actualGL/GPUquality before/after;onefreshreview,onejustifiedfixpass.
- [x] Same app-onlyAWS publication/source/runtime/HTTPS/WSS/profile and docs/notes;QAcleanup.
