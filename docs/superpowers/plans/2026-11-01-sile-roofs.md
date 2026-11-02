# Şile roof silhouettes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Replace eligible flat-box roofs with authored gables inside source footprint/height.
**Architecture:** pure sile-roofs.js owns shape qualification/roof triangles; sile-world.js reuses batches/materials, walls end at eaves and roof at original maxy.
**Tech Stack:** Existing JS/Three.js.
**Spec:** docs/superpowers/specs/2026-11-01-sile-roofs-design.md

## Global Constraints
- Preserve current branch/uncommitted work; no commit/push/merge/worktree migration.
- No source map, physics, collision prism, camera or RC/profile changes.
- No extra textures/materials/drawcalls/dependencies; roof choices explicitly authored.
- Eligibility and rise values from spec; no overhang or source total-height increase.

## Review Focus
- Rotated/reversed convex rings must yield upward roof and outward gable normals.
- Irregular/concave/hole/landmark/degenerate rings safely retain old shape.
- Top flat caps must be removed only for gabled roofs; no duplicate overlapping faces or windowed gables.
- Roof triangles cover entire source footprint without cracks/outside area; no new draw budget/resource owner.
- Existing source/collision/quality/async texture/RC contracts remain unchanged.

### Task1 — Pure roof model
- [x] Write tests for coverage/height/winding/UV, rotation/reversal/immutability and ineligible fallbacks; run RED.
- [x] Implement buildingRoof(item) returning null or {eaves,positions,uv,gables}; run GREEN.
### Task2 — World integration
- [x] Add failing snapshot integration: sloped roof batch, exact original top envelope, wall/gable join and unchanged prism/source/mesh budget.
- [x] Integrate existing batches, remove flat top cap only for gabled buildings, no new material. Tests/build/browser.
### Task3 — Review and publish
- [x] Fresh review; important findings one RED→GREEN pass, docs/limits updated.
- [x] Azure source/health/HTTPS/assets/profile/TX15 continuity, screenshots/notes/validation saved.
