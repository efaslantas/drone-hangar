# Şile coastline and street source audit

> Execute inline with superpowers:executing-plans and one fresh final reviewer. Main/app-only publication authorized; user opted out of repeated design questions.

Goal: audit the full existing2x2km map against retained OSM source and fix confirmed conversion/render omissions. Do not claim surveyed geometry, all of Şile district or measured street widths.

Confirmed: all338currentlyrepresented roadway IDs match source within0.0071m conversion rounding; one26.68m primary_link1025872605 omitted by filter. Source footbridge1531132593 has~180m openwater where land-clipping hides it. Coastway256360436 is valid closed CCW islet4199.9m², but nearest-segment sign at a concave vertex falsely rejects its polygonized face; entire292m coastline missing, maxsourceconversiongap110.8m. Native DSM island heights0, so elevation remains approximate rather than invented survey.339total source road IDs;0sourcewidthtags. Live OSM API confirms the two roadway tags, snapshot references retained.

Architecture: factor source classifier/road extraction into tools/sile_geography.py, consumed by existing prepare-sile-map.py. Classify closed coastline interior via polygon containment and winding before directed open-coast fallback. Include *_link street classes and source names/bridge tags. Regenerate with original SHA-verified source/DEM to ignored output; preserve only intended changes and sync context counts. Independent GIS audit checks symmetric source conversion residuals and completeness, bridge source support and centerline/building conflicts. Render water-crossing source footway using existing mooring surface publisher/contact owner; heights are authored endpoint-based clearance, publicly declared. Coastline/native heights remain source-derived. Publish source-audit report/map reference on existing source page.

- [x] RED classifier concave island, allsource road IDs/link metadata, actual source footbridge render/contact; implement source fixes and stage regenerated data.
- [x] Independent before/after geometry audit, all7coastways/339roadIDs, fullwidth/default disclosures; visual GL/GPU coast/bridge/street views. Inspect source elevation limitation.
- [x] Fresh review, fix Important with RED→GREEN; fullNode22/GIS/infra/Vite/ARM64; update legitimate geometry/count goldens around corrected data.
- [x] 2.40 app-only publication/source/HTTPS/WSS/profile/tenants checks; main commit/push clean and notes.

Review focus: closed coast holes/orientation/nested rings; source clipping and duplicateway pieces; no openwater route silently dropped; endpoint land support and exact drawn contact triangles; copied provenance hash coherence; no unrelated data displacement or invented measurement claims.
