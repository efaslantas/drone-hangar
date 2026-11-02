# Flyable Şile cave and natural arch implementation plan

> Execute inline with superpowers:executing-plans and one fresh final scoped review. User authorizes implementing both3Dvoids and publishing; prior main/no repeated approval preference applies.

Goal: drone can enter/turn/leave Feneraltı cave and traverse Su İçen Fil from sea to sea. Model is photo-informed/authored, NOT surveyed cave interior. Feneraltı position estimated from municipal/route photo region and snapped to source coast; arch anchored near public place pin41.1791141,29.6222048. All dimensions and placement offsets documented as assumptions.

Architecture: convex faceted arch volumes expressed as shared halfspaces. Clip existing cliff triangles against volumes; add exact interior roof/wall/back/floor triangles clipped to original land solid. Register those same uploaded Float32 triangles with the existing swept sphere solver. Original top terrain/source grid remains intact. Height-aware surface query returns cave floor/water only for points inside cavity; callers with no height retain native top terrain. Camera clearance includes cavity roof/walls. Keep existing static collision broadphase and no physics disable/teleport. Protect transitions and high-speed crossing, roof frominside and fromabove, nearroof body sphere, externalwater, floorlanding.

- [x] RED→GREEN pure volume clipping/contains/height-aware ground+camera behavior; source-consistent cavity fixtures and real placement/roof support audit.
- [x] Build carved cliff plus exact interior mesh/floor, world integration/cleanup, all dynamic ground queries; regression flight entry/traverse/walls/ceiling/floor/exits and full simulation path.
- [x] ActualGL/GPU cave-mouth/inside views and scripted real solver traversal via ignored QA UI; fresh scoped review,Node22ARM64/infra/ViteARM64. Record known experimentalGPU distant foliage issue separately.
- [x] Publish2.50 app-only AWS after checks; source/runtimeSHA/HTTPS/WSS/profile/hostisolation,main push and notes. Source OSM/DSM/CAD bytes remain unchanged.

Ruling: preserve existing3Droof geometry and carve only below it, with local source-solid clipping; do not widen water/land polygons or suppress all terrain contacts in a whole map region. Finite-height dynamic queries select the cavity; default queries stay native for planning/spawn/on-top behavior. Feneraltı is a blind sea cave with a small authored rear sand shelf; arch is through-open. No real-world drone passage/clearance claim.
