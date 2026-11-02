# Arcade FPV visual realism

User approved model/material/light/environment improvements for a convincing fictional FPV aftermath atmosphere. Reuse the existing game and source-backed aircraft/controller configuration; no flight physics, target motion, contact or replacement rules change. Existing autonomy preference covers implementation and established Azure publication.

Deliver a detailed street section and coherent arena: sourced damaged-plaster PBR walls, metre-scaled asphalt/concrete/gravel, photographic overcast sky/environment, varied facade damage/road wear; scanned barriers and small street props inside fixed, deterministic collision envelopes with visible fallbacks. Replace simple colourful toy construction with detailed fictional cars/hobby plane/quad art. Keep four object identities and authored paths. Default arcade rings/routes off, a flight-menu checkbox restores them. Preserve clear FPV lens/user camera preferences.

Approaches: more post effects alone would retain primitive silhouettes; wholesale engine migration would discard functioning input/sim code. Chosen current-engine asset/material/geometry pass, starting with one detailed street and extending consistent materials across arena.

Constraints: Poly Haven sources CC0 and checksum verified; originals + source manifest retained, 512/1024 WebP for surface quality. Asset loads local/self-hosted and token guarded; failure keeps fallback. HDR sky daytime only, no daylight panorama at night. Quality changes never alter collision/targets; low releases asset copies/reveals fallbacks. Scene cache/clear owns asynchronous copies and environment state. No automatic ARM or persisted RC/camera changes. New solids remain clear of all object loops and 6m spawn.

Evidence: tests for material channel scale/linear data, asset failure/stale/quality cleanup and deterministic collision, guide opt-in, valid detailed art, full suite/build; WebGL/WebGPU + mobile/day/night/pause/retry and normal-Pist return QA; independent review; Azure candidate/production/HTTPS verification and screenshot. Authored vehicle art is not a measured real vehicle replica; photorealism/hardware validation not claimed.
