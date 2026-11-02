# Şile rock weathering implementation plan

> **For agentic workers:** Execute inline with superpowers:executing-plans; one fresh final scoped reviewer.

Goal: make the sea-to-rock transition read as a continuously damp surface rather than a hard change of material at the authored wet-face contour. User authorized main/live continuation without repeated design questions.

Architecture: retain every existing rock vertex/index and exact physical contacts. Reuse the standard PBR material path and existing albedo/normal textures. A small world-height roughness atlas sampled with uv1 supplies smooth wet-to-dry response across both cliff face groups; their shared material eliminates the hard roughness/normal-scale/color switch. Existing dry island surface remains separately owned. Authored weathering, not a measured water/tide model. No geometry displacement, collision editing or dependencies. Original source OSM/DSM/CAD bytes preserved.

- [x] Record before view; RED tests for continuous sea-relative roughness, no vertical periodic wet bands, exact positions/indices/contacts and lifecycle.
- [x] Implement in sile-rock-view/world; inspect same GL/GPU views, check full/source fingerprints and update intentional UV1 visual snapshots.
- [x] One fresh scoped review; Node22ARM64 suite/infra/ViteARM64.
- [x] Publish2.48 app-only AWS; verify source SHA/HTTPS/WSS/profile/other7services; commit/push main, notes.

Ruling: prior approval covers implementation and publishing; remain on main. A new measured coastline or rock displacement would require additional survey evidence; this task improves material response on existing source-derived surfaces.

Ruling: close-up inspection also showed strong cellular texture repetition; authored rockTexel changes now soften cellular joints and add warped/localized beds and fissures, plus broad vertex-color weathering. PrimaryUVs/shape/indices unchanged; newuv1 and cliffcolor are intentional visual deltas. One512×256RGBA8 roughness atlas adds0.5MiB base plus mipmaps, no extra render pass or per-frame upload. Dry island and armour share the updated rock texture but retain geometry/material ownership.

Ruling: initial full Node22 run574/575 exposed the existing1..99percentile albedo-contrast guard (>48); new field was40.98. Raised only authored albedo weights;100×100 grid now55.625, focused shore-armour+weathering8/8. Preserve the guard, rebuild/re-stage image and rerun full suite before publish. No geometry/UV/contact changes from this adjustment.

Completed:v2.48.0-b2c6d496aef2;575/575Node22ARM64,11infra,ViteARM64,10reviewerfocused/cleanreview,GL/GPU coastal views;288manifest/120runtimeSHA/HTTPS/WSS/hostisolation verified. Red3missingbehavior failures observed before implementation. Existing island/dry-cliff identity assertion updated intentionally. Historical initialfocused run interrupted because failed material identity assertion was expanding large texture object diff; boolean ownership assertion and separate shared-normal check avoid it.
