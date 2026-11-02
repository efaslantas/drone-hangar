# Şile water–sand transition

> **For agentic workers:** Execute inline with superpowers:executing-plans, then one fresh scoped review.

Goal: repair raised beach lips and make sea/sand appearance continuous, publishing app-only to existing AWS and pushing main (already authorized). User opts out of repeated design questions/worktrees.

Evidence:123 non-crop coast probes inside source sand include20 above.5m. Large western beach has source coast heights.044–1.309m; tiny eastern pocket reaches7.5m. Native30mDSM causes false sandy cliffs. Existing generic cliff interception already prevents rooftop teleportation; do not replace it blindly.

Design: keep canonical OSM/DSM bytes. Author an18m-wide beach approach, nominal8% slope, toe at mean sea+.03m; only lower existing broad sandy beach (never raise or flatten rocky pocket). Ramp joins share vertices, clip to existing sand/land, intersect native face with ramp planes so each result is a linear triangle. Preserve native heights beyond ramp and reject unsafe profiles/road or building intrusion. Piecewise triangle surface is the common owner for uploaded sand and terrain queries/normals; use bounded spatial indexing. Cliff splitting and draped paint must honor the same triangles. Sand darkens locally in first4m and fades inland; this is a visual wetting approximation, not measured tides/bathymetry.

Architecture: src/triangle-surface.js owns exact indexed barycentric query, edge cuts and surface partition; src/sile-beach.js owns source-scoped ramps/profile/wetting; geo-terrain composes the shared surface with existing platforms/pads; sile-world prepares it before context placement and uploads exact positions. Keep mesh count bounded and preserve unrelated source/castle/roads.

- [x] Regression: triangle surface/normal, diagonal draping/edge cuts, water classification and source immutability; beach toe/slopes/transition/native-road-building preservation and actual drone touchdown.
- [x] Implement bounded piecewise beach and wetting, integrate common geometry/collision owner. Verify all displayed/contact samples agree; no new seam/unsafe cuts.
- [x] Real WebGL/WebGPU before/after fixed views, source-wide audit and fresh scoped code review. Resolve important findings.
- [x] Node22ARM64 suite,infra,Vite/ARM64; update2.45 app only, verify live HTTPS/WSS/source hashes/browser, push main clean and update notes.

Risks: source sand/coast masks differ by millimetres; use existing rendering margin tolerance only. NativeDSM is approximate; profile is authored and public notes must say so. New beach triangles must not hijack water, castle platforms, road heights or building pads. Cache indices by surface lifetime, not mutable global world.

Ruling: initial1.5m source-height eligibility left several DSM peaks as sandy cliffs; broaden eligibility to2.5m and cap cut at2m, still only broad source sand and with native-matched inland edge. Actual final cut is audited. Edge height tolerance1.5cm accounts for source coast rounding vs subcentimetre beach mask; water classification stays canonical.

Final rulings: exact union clipping replaces inset-per-land-triangle sand clipping; acute inset gaps caused false lip spikes. Shared Float32 vertices are welded and T-junctions split. Query first chooses actual containment, then only0.2mm edge tolerance. Large sand masks must have>100m actual source-coast contact, avoiding the eastern grass regression. A separate authored2m inland wet apron closes narrow dry-mask/coast gaps (former lip -1152.38,487.29); unioned with sand and subtracted from grass through the same masks, never seawater landfill. Rounding-only vertex alignment remains1.5cm. Inland ramp edge is at least native grid height; actual max cut1.757m within2m cap. Rock pocket and source roads/buildings stay native.

Review: fresh review_waterline; original6.64s protection scan fixed using bounded spatial index (0.66s then0.95s final independent generation). No remaining actionable findings. All21 focused surface/beach/pad checks passed. GL/GPU close views clean. Earlier QA had passkey browser-extension errors; fresh final GL/GPU consolelogs[]; no application suppression.

Completion evidence: docs/sile-waterline-validation.json.560/560Node22ARM64(152404.76ms),21focused,11infra,ViteARM64,GL/GPU,clean finalreview. Published v2.45.0-fbd27ca93aaa;287manifest/119runningSHA;7tenants/nginx unchanged;liveDISARM0/3. Main final identity recorded in ignored git-result.json after push.
