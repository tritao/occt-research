# Walkthrough: Meshing (deflection → triangles)

This walkthrough is about reading meshing as a sensitivity curve: change deflection and watch triangle counts change.

## Run the repro

- `just occt-build`
- `bash repros/lane-meshing/run.sh`

Oracle output:
- `repros/lane-meshing/golden/meshing.json`

## What to look at

Each shape has `runs[]` entries with `(deflection, angle_rad)` → `(total_nodes, total_triangles)`.

- For curved geometry (`cylinder`), decreasing `deflection` should usually increase `total_nodes/total_triangles`.
- For planar boxes, counts may stay stable because flat faces triangulate minimally.

