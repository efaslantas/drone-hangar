# Şile harbour shore connections

> Use superpowers:executing-plans inline, with one fresh final scoped reviewer. Main and same app-only publication already authorized. User opted out of repeated design questions.

Goal: correct the three source piers that visually float apart from the shore, and give the harbour edge an engineered quay finish. Do not move boats, existing source piers, castle, source coastline or fill the sea.

Evidence: actual fixed-camera world proves disconnected roots. Source root shore gaps approximately 5/22/40m. Wikimedia CC0 Şile Limanı Ağustos2024 photo (https://commons.wikimedia.org/wiki/File:%C5%9Eile_Liman%C4%B1_A%C4%9Fustos_2024.jpg) shows sloping connections to the shore. Source OSM pier IDs1485112033/35/37 map open centerlines, leaving unmodelled connections. Link dimensions and construction remain authored, not surveyed.

Architecture: new src/sile-mooring.js plans bounded shore links from source pier endpoints, closest existing coastline and a fully landed shore end. Render slim sloping deck with side rails; expose exactly the drawn triangles as new records in existing terrainWalls contact owner. Extend that owner to accept explicit triangles with source labels, retaining old vertical-wall path and contact order. No new platform fills or invisible wedge under bridges; real underpasses remain flyable. Add quay faces using existing harbourLayout source edge selection and splitTerrainEdge. Call after buildingPads so wall records are retained.

Review focus: valid landed full-width ends, pier deck overlap, water beneath links, near miss vs swept face/edge contacts, NaN/invalid/out-of-scope data, teardown and rendering/collision byte agreement, no authored features in non-Şile worlds.

- [x] RED: planner links attach landed endpoints and original pier; exact arbitrary triangle contact top/bottom/edge/sweep without underpass box; unchanged source.
- [x] GREEN: plan/render links + quay and explicit-triangle contact path, preserve existing wall cases. Actual fixed-camera before/after GL/GPU.
- [x] Fresh review; fix Important, full Node22/infra/Vite/ARM64. Update old world golden with explicit new geometry scope.
- [x] 2.38 publish, source/health/WSS/profile/shared-tenant checks; docs/main commit/push/notes.

Ruling: use narrow source-anchored ramps rather than invented landfill or relocating source piers. No real engineering/photogrammetry/vehicle validation claim. Existing2.37 CPU correction finished separately.
