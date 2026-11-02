# Şile road influence index

Execute inline with `superpowers:executing-plans`, followed by one fresh scoped review. Stay on main and publish the existing app, as authorized by the user.

Goal: reduce road-query CPU without changing any ground tint value, geometry, map source or collision data. The baseline profile found 7,557 road segments scanned at each qualifying ground vertex; the field closure consumed about 862 ms self time over two real world builds.

Use `roadFieldIndex(roads)` in the existing neighbourhood owner. A 48 m grid returns conservative, immutable candidates in source order. Limit each segment to 1,024 cells and the entire grid to 65,536 references. Unsafe, nonfinite or oversized segments remain in a global fallback. Keep the exact AABB, distance and smooth/min calculation. No global cache or physics change.

- [x] Record baseline Float64 field digest and full world fingerprint. Observe failing lookup tests, then implement the index.
- [x] Verify inclusive negative boundaries, variable widths, zero-length segments, unsafe ranges, overflow order, duplicates and spatial reduction.
- [x] Match all 83,025 field values and geometry/material/collision fingerprints; profile construction and check actual GL/WebGPU rendering.
- [x] Fresh scoped review; fix coverage finding. Run Node 22 suite, infra checks, Vite and ARM64 build.
- [x] Publish 2.36, verify HTTPS/source/WSS/profile/other tenants, update evidence, commit and push main clean.

Timings are local Node construction diagnostics with a canvas shim, not device loading or frame-rate guarantees. The map retains its source, 30 m DSM and representative architecture limitations.
