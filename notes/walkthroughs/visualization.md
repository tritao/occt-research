# Walkthrough: Visualization tessellation (drawer → effective deflection → triangles)

This walkthrough makes the visualization-side tessellation knobs concrete, without a GUI.

Repro + oracle: `notes/walkthroughs/visualization-cases.md`.

## What to look at

For each shape, compare scenarios under `shapes.<name>.scenarios.*`:

- Policy knobs: `deflection_mode`, `abs_deflection`, `rel_coeff`
- What OCCT actually uses: `effective_deflection`
- Triangulation size proxies: `triangulation.total_nodes`, `triangulation.total_triangles`
