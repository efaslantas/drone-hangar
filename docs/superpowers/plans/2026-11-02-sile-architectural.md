# Şile facade depth implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline with one fresh final review.

**Goal:** Add visible physical depth to eligible coastal windows/eaves and publish2.29.
**Architecture:** Share atlas opening metadata; one new attached-detail owner generates transforms, validates against final world, batches two materials and appends tagged colliders after old pads. Existing wall/source data unchanged.
**Tech Stack:** Existing Three179/JavaScript/Vite/Node22, no dependencies.
**Spec:** docs/superpowers/specs/2026-11-02-sile-architectural-design.md

## Global constraints
Same workspace/branch; no commit/push/merge. At most2 meshes/384windows/160strips. <=0.16m projection. Tagged conservative boxes from actual transforms, old geometry/prisms/source arrays preserved. Same app-only AWS publish authorization and rollback. No claim of measured architecture.

## Review focus
- Reversed/oblique facade cells must align atlas and boxes.
- First render and all quality modes retain solid geometry/colliders.
- Near-shore or buried details rejected as a whole; own wall attachment allowed only own prism.
- Dense buildings must not consume all cap before other profiles get a chance.
- Cleanup and rebuild cannot leak metadata/material/geometry.

## Task1 — facade depth
- [x] Snapshot affected baseline and write failing behavioral tests for shared opening metadata and physical details.
- [x] Implement atlas metadata reuse and new attached detail module; integrate after pads with lifecycle metadata cleanup.
- [x] Verify new and affected invariants, exact old geometry/source/box prefix, projection and obstacle rejection; adjust old-scope counts only by new authored tag.
- [x] Inspect before/after GL, GPU and viewport frames; independent final review then any scoped fixes with RED/GREEN.

## Task2 — release
- [x] Version/public scope docs, full Node22 concurrency4/11infra/Vite/ARM64; verify source manifest and deploy app-only.
- [x] HTTPS/source/WSS/tenant isolation/live UI/profile/DISARM screenshot; docs/memory/temporary QA cleanup and final report.
