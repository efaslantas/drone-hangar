# Şile preview reuse correction

> Inline execution via superpowers:executing-plans; one fresh final scopedreview. Existing no commit/push/merge and app-onlypublish authorization persist.

**Goal:** Repeated entry into already-selected Şile inspection must not dispose/rebuild the identical billboard world.
**Root cause:** main selectMap.commit always invokes billboard.setMap; billboard.setMap unconditionally clearWorld/buildWorld even when successful existing world already matches. Actual browser repeatedclick3sCDPtimeouts in2.31/2.32documented. Main flightworld already uses worldMatches; preview lacks equivalent guard.
**Architecture:** Extract current preview-map replacement body within billboard.js as updateBillboardMap(scene,camera,id,{reduced,crafts}); setMap delegates. Preserve successful world only when map/options and existing world match; initial/changed/externalclear/failedbuild must rebuild. No changed world geometry/render/physics/profile.
**Review focus:** initialmapmustbuild; sameŞilekeepsresources/crafts/camera; actualmapchangeandexternalclearrebuild/disposeexactlyonce; failedbuildmustretry; reuseshouldnotmutatecameraorresources.

- [x] Write realScene/actualsource resource identity, disposal, initial/change/clear/retry tests; RED thenGREEN.
- [x] LocalUI repeatentry measurement and visiblemapchange/flightchecks, preserveprofiles.
- [x] Freshreview/fixImportant,fullNode22/infra/Vite/ARM64.
- [x] Version2.33/app-onlypublish/live/source/WSS/isolation/docs/memory.

Evidence: docs/sile-preview-reuse-validation.json. Published2.33; one deferredMinor testcoveragegap recorded, no blockingreviewfinding. No commit/push/merge.
