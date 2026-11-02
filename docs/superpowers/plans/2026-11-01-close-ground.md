# Close ground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Make low-altitude ground texel scale coherent and clearer without custom shaders/new assets.
**Architecture:** ground-surfaces.js owns world-metre UVs/artist tile plan/bounded subdivision/macro colors. world.js prepares before fallback material finish/resource collection; sile meshes explicitly opt in. scanned-materials.js chooses per-record ground texture budget and respects normalized UVs.
**Tech Stack:** Existing JS/Three.js and local source assets.
**Spec:** docs/superpowers/specs/2026-11-01-close-ground-design.md

## Global Constraints
- No physics/contact/camera/RC/profile/source snapshot changes.
- Existing assets/licenses, authored tile scales clearly distinguished from measured surface scale.
- No GLSL/TSL modifications or new runtime dependencies.
- Ground1K desktop medium/high;512touch; low procedural. Shared cached sources survive scene cleanup.
- Current branch/uncommitted work retained, no commit/push; existing Azure authorization applies.

## Review Focus
- Matrix/scale/rotation UV conversion and material reuse must preserve metric mapping.
- Low fallback/async quality changes must agree on channels/UV and resource lifetime.
- Bufferterrain normals/positions and Shapeholes remain unchanged; subdivisions bounded.
- Wall/plaster/prop/markings must not accidentally receive ground UV rewriting.
- Mobile/GPU use built-in materials, existing visual settings preserved.

### Task1 — Ground UV and macro color
- [x] RED: metre UV continuity on transformed planes/markedBuffer; unchanged walls/positions/holes, bounded/idempotent colors and mesh replacement ownership.
- [x] Implement ground-surfaces owner; mark Şileland/road and prepare in world before finish/resources. GREEN tests.
### Task2 — Texture policy
- [x] RED: desktop ground1024 vswall512/touch512 and legacy repeat; stale quality/cleanup ownership.
- [x] Integrate per-record budget, repeat and filtering. Fulltests/build + browser quality/maps/mobile/GPU.
### Task3 — Review and release
- [x] One fresh reviewer; important fixes RED→GREEN, source/scale notes updated.
- [x] Azure health/assets/source hashes/profile/RC verified, proof/notes saved.
