# Runtime material variants

Derived from the CC0 JPEG sources documented in ../sources.json. Original source checksums refer to the original JPEGs, not these derivatives.

Desktop uses 1024px WebP; touch devices use 512px WebP. Encoded with Pillow/libwebp, method 6, quality 92 for normal maps and 82 for color/roughness; resizing uses Lanczos. All 30 images were decoded and their dimensions checked.

Complete texture library: originals 13,164,312 bytes; desktop variants 5,124,116 bytes; mobile variants 1,149,264 bytes. Maps load only the materials they use.


2.5 runtime quality: low uses the existing procedural maps; medium uses these512px variants, high uses1024px on desktop and512px on touch. New grass_ground is not a WebP derivative here: its three original1024px JPEGs live in ../grass_ground. For medium/touch the browser downsamples their decoded images to512px for GPU upload; JPEG download size is unchanged.

2.14 close ground: floor materials keep1024px at desktopmedium/high; othermedium surfaces512px. Touch remains capped512,lowprocedural. Existing files reused; no new asset download variant. WorldXZ metreUVs and authored1.5–2mtiles align fallback/PBR; these tiles are not measured scan dimensions.
