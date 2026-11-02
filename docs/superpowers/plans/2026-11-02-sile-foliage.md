# Şile foliage finish implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline; one independent final reviewer.

**Goal:** Improve existing tree/planter silhouettes and publish2.30.
**Architecture:** New foliage finish owner creates deterministic RGBA leaf sprig texture and32quad crown geometry inside each old geometry bounding box. Reuse existing instances, matrices/colors and colliders. Run after all placement/pads/trim; shared world-owned material/texture and geometry replacement.
**Tech Stack:** Existing JavaScript/Three179/Vite/Node22; no dependency.
**Spec:** docs/superpowers/specs/2026-11-02-sile-foliage-design.md

## Global constraints
No source geography/profile/physics/placement/mesh-count/collider changes. <=32cards/64triangles per crown (+2soil triangles for existing planters). Same dirty branch/no commit/push/merge. Authored foliage, conservative original foliage boxes. Same app-only AWS publish scope.

## Review focus
- Replacing geometry before planning must never change placements: finish only at end.
- New visible vertices fit old transformed boxes, including sloped planters.
- Alpha texture keeps empty border/interior leaf holes, survives GL/GPU and mip filtering.
- Source geometry/material sharing must not dispose a surviving reference.
- Cleanup/rebuild/material quality must not leak or hide solid foliage.

## Task1
- [x] Snapshot baseline and add failing tests: deterministic alpha texture/geometry, bounded vertices, exact preserved transforms/colliders/nonfoliage/source, idempotency and disposal.
- [x] Implement finish and integrate late; verify tests and independent review.
- [x] Visual GL before/after tree/planter/quality/narrow frame and GPU; record scope.

## Task2
- [x] Version2.30 and public authored limits; full Node22/infra/Vite/ARM64.
- [x] App-only publish, source/HTTPS/WSS/tenants/live UI/profile evidence; docs/memory/QA cleanup.
