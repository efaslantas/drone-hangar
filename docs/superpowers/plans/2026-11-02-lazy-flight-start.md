# Lazy flight world and painted start preparation

> Inline via superpowers:executing-plans; fresh final reviewer. User requests continuing from main after priorintegration; stay onmain, validate thencommit/push and same authorized app-onlypublish. No new worktree/branch.

**Goal:** Do not build/bake hidden flightworld during homepage startup; make firstflight construction explicit with painted busy feedback and duplicate/failure recovery.
**Rootcause:** main.js eagerlybuilds fullselectedworld at187/bakesPMREM at208 before startupready; billboard separatelybuilds sameSileforvisiblehomepage. Hiddenmainworld is unused untilflying.
**Architecture:** play=null/loadedMap=null untilstart; existingstartworld owner constructs/bakes atactualstart and reuses successfullybuiltworld thereafter. src/startup-gate.js gains concretecreateFlightStartGate({start,busy,error,paint}) ensuringbusy→paint→start withoneinflightrequest/finallyreset/retry. Mainwraps synchronousstartFlightNow; audio unlock staysinusergesture beforeawait; hangarinert+fixedbusyoverlay. No fakeprogress/cancellation promise; actualbuildremains synchronous afterloadingfeedbackpaint. Flight rejoin/start only after successfulworldconstruction; existinghangarconnection unchanged.
**Reviewfocus:** no nullplay access whilehangar; settings beforefirstworldapply; duplicateStartblocked; paint/buildfailureclearsbusy and retries; failedpartialworldcannotbeconsideredready; oldacademylinks/workshop/RC/inspectionprofilespreserved; liveworld unchanged oncebuilt; metadata/reportuses2.34.

- [x] GateRED→GREEN tests busy/paintorder, duplicateclick, build/paintfailureandretry; actualsourceworldprobe/initialbootbefore-after.
- [x] Lazyworld/mainbusyUIintegration; actualfirst/repeatflight, settings, RCprofile, failureandGL/GPUUI checks appropriate.
- [x] FreshreviewresolveImportant;fullNode22/infra/build/ARM64.
- [x] Commit/pushmain clean andauthorizedapp-only2.34publication;HTTPS/hash/WSS/tenants/profile/evidence/docs/memory.

Tradeoff: firstflightbuildmovesafterbutton, not eliminated; onlyhomepageworkreduced. Firstpreviewandactualworldbuildingaremainthread, stillcanblockbriefly. No physicalTX15/SITL/realILKE claims.

Evidence: docs/lazy-flight-start-validation.json; main deliverycommit finalstage, samepublished277runtimehash. Minor failurefocusrestoration deferred; no blockingreviewfinding.


2.35 follow-up: deferredfailurefocusminor resolved byboundedDOMcorrection andactualsyntheticUIRED→GREEN/Enterretry/homefallback checks; see docs/start-focus-validation.json. Existing524tests/11infra/buildpass; no newimplementationplanneeded forsmalllocalcorrection.
