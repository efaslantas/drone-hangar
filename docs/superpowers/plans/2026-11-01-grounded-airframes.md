# Grounded airframes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Remove the false air gap over terrain and workshop yaw drift using shared model anchors.
**Architecture:** airframe-contact.js pure box support/fallback/ground-height. models.js records root-local contact bounds + lens anchor. physics/collide/main consume runtime metadata. drone-studio yaw wrapper centres craft without moving its geometry. airframe-view handles near-plane bound.
**Tech Stack:** Existing Three.js/JS; no dependencies.
**Spec:** docs/superpowers/specs/2026-11-01-grounded-airframes-design.md

## Global Constraints
- Preserve source CAD files/shape, rotor XZ/prop dimensions, forces/mixer/PID/RC/FOV/tilt and saved settings.
- Contact is conservative model AABB support +1mm, not validated contact dynamics. Obstacles retain old sphere.
- Missing model metadata uses legacy contact height. Bounds never saved to preferences/network traces.
- Existing branch and uncommitted work retained; no commits/push. Prior autonomy/Azure authority applies.

## Review Focus
- Root world/scale/parent transform and camera tilt must not corrupt local bounds or anchor.
- Source marker, edited wheelbase, tiny pack/large underside/gimbal and all attitudes stay finite; no rotor phase floor flutter.
- Terrain normal projection and slope spawn height share support; sea/cliff handling and RC DISARM preserved.
- FPV near projection restores old ceiling at altitude, keeps lens clear near plane and never alters FOV/tilt.
- Preview pivot disposal/material/selection cycles do not mutate spec or local rotor geometry.

### Task1 — Shared model anchors/contact
- [x] RED tests for real mesh support, root-local metadata and tilt updates/fallback.
- [x] Implement metadata + pure support; integrate flat/terrain spawn/RC contact and payload; GREEN tests.
### Task2 — Lens and studio pivot
- [x] RED tests for stable yaw pivot and bounded camera near plane.
- [x] Integrate lens anchor/near in FPV, preview yaw wrapper; GREEN full tests/build and browser QA.
### Task3 — Review/release
- [x] Fresh review, fix material findings RED→GREEN; public limits and source notes.
- [x] Azure health/assets/profile verification, screenshots and notes.
