# Şile rock contact follow-up

> **For agentic workers:** Execute inline with superpowers:executing-plans and one fresh final review.

Goal: prevent the drone sphere entering a visible coastal rock face while its centre is still over water. Continue user-authorized main/live workflow without another approval round.

Reproduction: a10m vertical source coast at x=0, land x<0, unarmed drone x=.1/y5/r=.24 remains unseparated; centre-only terrain query returns distant sea plane. This is a real body/contact mismatch. Existing sea→land interception handles centre crossings but does not address this overlap.

Approach: use the existing uploaded indexed Float32 coast-cliff geometry for exact triangle contacts, through existing swept/discrete triangle-sphere solver. Add contacts after terrace/link/armour assembly (pads resets the wall list). New contact records marked coast-cliff/mesh owner, no landing on vertical faces. Terrain query/render/source geometry stay unchanged.

Performance: opt-in static wall index prepared after Şile world assembly. Bounded32m XZ grid, oversized/global fallback, bounded query fallback, candidate order preserved; final solver retains fullXYZ AABB/triangle checks. Unprepared/mutated-length arrays retain original linear behavior. WeakMap lifecycle, no new GPU resources.

- [x] RED/GREEN rendered cliff sphere overlap + swept crossing/miss + indexed uploaded vertex equality.
- [x] Bounded index tests: candidate order/dedup, swept coverage, oversized/huge query fallback and appended-array fallback; compare physical results indexed/unindexed.
- [x] Integrate, prove whole-world visual/source geometry unchanged and actual rock near-face probes. Fresh scoped review and fixed GL/GPU visual check.
- [x] Node22ARM64/infra/Vite/ARM64; publish2.46 app-only AWS,verify live/source hashes/WSS/browser,push main clean and update notes.

Limits: exact contact follows authored visible rock surface, not surveyed rock detail or real flight calibration. Water physics stays at mean sea level. No speculative terrain rebuilding.

Evidence: docs/sile-cliff-contact-validation.json.7focusedRED→GREEN;567/567Node22ARM64(158493ms),11infra,ViteARM64;freshreviewclean.30actualrockprobes indexed/linear exact;visualhash==2.45.52,290clifffaces/61,228walls;candidate405–1156/mean750.7,notFPS. v2.46.0-16eb380405d8 live;288manifest120runningSHA;7tenants/nginxunchanged. Main final identity in ignoredgit-result after push.
