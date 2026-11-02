# Şile shoreline fix plan
Spec: docs/superpowers/specs/2026-11-01-sile-shore-design.md
Inline executing-plans; one fresh final reviewer. Preserve earlier work and branch, no commit/push. Azure release already authorized.
1. Reproduce actual spill with failing test; add pure polygon subtraction regressions. Implement UV-preserving convex subtraction over source land triangulation; integrate at existing foam owner.
2. Full tests/build and source diff review; fresh independent review of algorithm, Float32 precision, holes/islands, UVs, geometry budget and collision invariance. Necessary regression fixes.
3. Version2.7.1 docs, manifest/source verified Azure candidate and backup/release, HTTPS source hashes, live browser proof. Preserve TX15 settings.
Review Focus: land wholly inside foam triangle without intersecting its edges; holes and reversed winding; degeneracy, bounding filters, precision after Float32; UV interpolation and draw/mesh growth; source/collision/RC unchanged.
