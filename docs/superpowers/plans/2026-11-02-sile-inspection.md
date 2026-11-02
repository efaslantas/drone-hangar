# İLKE Şile inspection implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development; independent pure and integration owners, task review then final review.

**Goal:** Ship Şile-only civilian manual inspection, local evidence/telemetry and replay, as first İLKE simulation layer.
**Architecture:** Pure scenario/session/report owner plus UI/sensor adapter. A pinned free operation remains outside academy/scores. Existing renderer/physics/profile untouched;0degree temporary camera mount and pause menu own observation lifecycle.
**Tech Stack:** Existing JS/Three/Vite/Node22; no dependencies.
**Spec:** docs/superpowers/specs/2026-11-02-sile-inspection-design.md (includes exact interface contract)

## Global constraints
Same dirty codex/simulator-v2/no commit/push/merge. No physical İLKE model or SITL claim. No map/physics changes. Local record, no inspection start/result/pose uploads. Fixed authored demo rules exposed, not real qualification thresholds. Same authorized app-only AWS publish/rollback.

## Review focus
- Camera/look/visibility/continuous dwell: no capture while occluded/fast/paused/chase.
- Data gaps/nonfinite/bounds/caps: no fabricated evidence, explicit failure/truncation.
- Loader cancellation, retry, menu and leaving flight must not advance/discard silently.
- Replay exact restore+paused menu; no input surprise or live-record mutation.
- New free operation remains isolated from progress/scores/other modes/profile.

## Task1 — pure owner
- [x] Tests RED; implement scenario/state/report/storage/trace API fromspec; GREEN and self-review.
- [x] Fresh spec+quality task review and resolve findings.

## Task2 — integration owner
- [x] Tests RED for route/load/pause/local-only/briefing/staticUI behavior.
- [x] Add operation/preparation entry, HUD/menu/markers/LOS/capture, reset/stop/export/replay and temporary camera override; preserve other modes.
- [x] Fresh spec+quality task review; resolve findings.

## Task3 — final verification and release
- [x] Actual source ray/marker and clear synthetic completion harness; realUI stop/report and playback check; GL/GPU/narrow frame.
- [x] Independent whole-phase review, scoped corrections, fullNode22/infra/Vite/ARM64.
- [x] Version2.31/publicscope, manifest, app-onlypublish, HTTPS/source/WSS/tenants/profile/liveevidence; docs/memory/QAcleanup.


Evidence: docs/sile-inspection-validation.json; synthetic completion is explicitly not a physical route flight; source preview main-thread stall and download-only tampered-report semantic validation recorded as limits. All authorized work published; no commit/push/merge.
