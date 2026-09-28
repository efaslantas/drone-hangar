# Drone Academy delivery record

Date: 2026-09-12

> Historical delivery snapshot. It records the evidence available on its date; it is not the current feature inventory or test count. See `docs/URUN-ANALIZI.md` and `README.md` for the current product state.

## Delivered

- **P0 — regression baseline:** pitch direction, false landing, volume-only gate and diagonal stick overflow are covered by behavior tests.
- **P1 — training rules:** Angle and Acro use the same forward-pitch convention; gates require a directional plane crossing; landing and battery swap require ground contact and DISARM; academy mode is locked and validated; lessons start on the pad.
- **P2 — simulation foundation:** player physics runs at fixed 120 Hz with capped catch-up; wind is an air velocity in the drag calculation; realistic Acro retains motor lag, idle, battery sag and fixed-step gusts.
- **P3 — controller setup:** three PS response profiles remain available; a four-second Gamepad API calibration records centre and physical axis travel in local storage. Automated normalization tests pass.
- **P4 — complete lesson loop:** briefing, countdown, ground start, objective tracking, landing, 100-point local assessment, 70-point threshold, persistence, retry and replay are connected.
- **P5 — curriculum:** five modules contain 30 playable lessons. Objective types include takeoff, continuous hover, altitude hold, heading hold, speed bands, directional gates, landing and battery swap. Six field missions cover recon, night SAR, range, cargo, precision landing and infrastructure inspection.
- **P6 — academy UI:** the primary flow is unarmed, unarmed-free-flight is bots-free and weapons-free, combat missions remain available only through legacy/direct entry, and result cards show route/control/stability/landing metrics.

## Automated evidence

- `npm test`: passed, 197/197.
- `npm run build`: passed with Vite production output.
- `git diff --check`: passed.
- Browser smoke: local academy lists 30 lessons + 6 missions; first lesson reached the HUD at 60 fps, on the pad, `DISARM`, `ANGLE · DERS`, throttle 0%.

## Requires physical or production evidence

- **Physical DualSense/DualShock:** calibration workflow and stick feel require a human device trial. Automated tests verify the math only.
- **WebGPU visual parity:** production build succeeds; final comparison requires a WebGPU-capable browser/GPU.
- **Long-run performance:** no 15-minute memory profile or p95 GPU frame capture has been recorded in this session.
- **Training thresholds:** the 70/85/95 scoring bands are product thresholds, not aviation certification standards; pilot trials should tune them.

This record separates automated proof from device-dependent checks. It must be updated when physical controller and WebGPU trials are completed.
