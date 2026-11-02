# Şile liman yüzeyi ve taş dolgu

User continuation: improve resemblance to the existing AA2022 photograph within the current map. Author chooses the largest visible gap: uniformly brown harbour edges and western breakwater. Existing Three/Vite stack, no downloaded imagery or dependencies. Prior autonomous execution and same dirty branch preference persist; no commit/push/merge.

Approaches: globally recolour grass loses mapped landuse; inventing surveyed harbour geometry misstates evidence; selected approach partitions the existing land surface using an explicitly authored harbour-edge band and a source-coastline western arm polygon. The choice is the author's, within the user's realism request.

Hardscape geometry follows the existing terrain triangles exactly and replaces the same portion of soil, with no doubled coplanar surfaces. Harbour band is10m landward from source coastline segments near the mapped harbour; western arm uses existing coastline vertices. Distances/material extent are authored, not mapped surface measurements. Source shoreline, terrain heights, original prisms, flight forces/profile/RC and other maps stay unchanged.

Bounded inset rock armour adds visible solid obstacles on existing land. Every instance has its actual transformed geometry bounds in play.boxes, roots/footprint stay on land; skip roads, source buildings, existing props and spawn. One instanced batch, at most800 rocks; entire world at most45 meshes, quality does not remove collisions. No new water/traffic dynamics. Invalid/stale source skips harbour features. Resources owned by existing world lifecycle.

Acceptance: partition no overlaps/holes and conserves projected area for overlapping masks/holes/reversed rings; real patches match sampled terrain and do not cover beach/water; both harbour and western arm gain surface. Rocks are bounded/deterministic, each visible hard part fits collider and remains clear. Full tests/build, actual GL/GPU/quality/rebuild/mobile frame proof, independent final review, existing app-only AWS rollout with private image/hash/HTTPS/WSS checks and retained backups. Photo remains reference-only,2×2km coverage and authored limitations public.
