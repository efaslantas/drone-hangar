# Şile coastal foam motion

> **For agentic workers:** Execute inline using superpowers:executing-plans; one fresh scoped review.

Goal: replace synchronized foam opacity pulsing with local offshore crest travel and a beach swash front that advances/recedes on the existing surface. Main/live continuation and no repeated design questions already authorized.

Design: existing single RGBA foam mesh keeps positions/normals/indices, footprint and sheltered-harbour alpha. Remap UVs once into one512×1024 alpha atlas with padded offshore/land V bands and continuous world-space phase. Absolute simulation time scrolls the standard material atlas through four6.4s waves and a25.6s strength envelope; offshore crest moves toward shore, then low-sand swash runs inland and fades. Constant material opacity. RGB/alpha/contact data stay static. No additional shader, mesh, material, texture count, dependency, physical water displacement or per-frame buffer upload. Atlas replaces the512² mask (RGBA8 base memory1→2MiB plus mipmaps).
- [x] RED/GREEN: bounded opacity, shared phase continuity, advancing/receding front, different longshore phases, deterministic paused/rewound time and a fragment-sampled interior crest on endpoint-only strips.
- [x] Integrate owner into sileWater; verify no per-frame vertex uploads, existing world cleanup and intentional foam UV delta and unchanged other geometry/collision fingerprints.
- [x] ActualGL/GPU time-separated fixed coastal views; fresh scoped review.
- [x] Node22ARM64/infra/ViteARM64; publish2.47 app-only AWS, verify live/SHAs/WSS/browser, main push/notes.

Limits: six-second-class authored visual surf cycle, not tide/wave hydrodynamics or measured Şile wave climate. Water collision remains mean level. Test snapshots must use fixed time and do not prove realflight.

Review ruling: endpoint-only offshore strips cannot show a moving interior crest with vertex alpha. Replace that approach with one512×1024 alpha atlas, two padded V bands, standard material and absolute U offset. UVs intentionally remap once; RGBA/positions/normals/indices/contacts remain static. Four6.4s waves in25.6s atlas period. No per-frame buffer updates or30Hz cap. Texture count, mesh/material count unchanged.

Completed:571/571 Node22ARM64,8focused,11infra,ViteARM64; clean delta review; actualGL/GPU coastal phases;v2.47.0-5f986166dd40 live/288manifest/120runtimeSHA/HTTPS/WSS/host isolation verified. Historical CPU-focused7/7 did not expose interpolation defect; new actual-atlas interior regression closes that gap. Geometry excluding intentional foam UV byte-equal to2.46; physical contacts byte-equal. No FPS claim.
