# Owned airframes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Upgrade the pilot's ten flyable visual models, including sourced SOURCE ONE parts.
**Architecture:** Generated CAD JSON + source-one-frame.js own cut-part geometry. airframe-appearance.js owns visual dimensions/evidence; models.js/drone-details.js consume it. disposeDrone owns per-model resources and is used by all model lifecycle paths.
**Tech Stack:** Existing JS/Three.js; offline ezdxf/shapely generator, no new runtime dependency.
**Spec:** docs/superpowers/specs/2026-11-01-owned-airframes-design.md

## Global Constraints
- Preserve flight physics, rotor wheelbase/prop diameter, camera tilt, RC/calibration/session profile.
- Manufacturer geometry data GPL3 with raw DXF/license/generator/source attribution accessible.
- Other visual dimensions/mounting remain declared approximations.
- One active pack, bounded draw count, shared textures never disposed per craft.

## Review Focus
- Source marker only with valid airframe; edited wheelbase must not falsely claim exact assembly.
- CAD units/holes/winding/extrusion and mirrored arms must remain finite/visible.
- Active pack responds to stored battery settings, label on the correct visible surface.
- Repeated preview/retry/ghost/drop must dispose owned labels once and retain shared carbon.
- Existing generic and reference camera/rotor selection contracts remain intact.

### Task1: CAD and appearance source
- [x] Generate pinned DXF rings/holes/metres and source manifest, publish license + generator.
- [x] RED appearance/CAD tests; implement profile and frame builder; GREEN.
### Task2: Owned model upgrade
- [x] RED tests for active pack/motor dimensions/cleanup and current contracts.
- [x] Integrate CAD frame + detailed motors/materials/pack updates, shared disposal paths and brief evidence label.
- [x] Full tests/build and desktop/mobile/WebGPU workshop/chase visual checks.
### Task3: Review/release
- [x] Fresh review and fix material findings.
- [x] Publish Azure candidate, verify HTTPS/visual source assets/profile, save screenshot and notes.
