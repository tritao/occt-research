# Repro: lane-brep-geometry-bridge

## Goal

Exercise the “topology ↔ geometry bridge” APIs in OCCT: edge 3D curve vs pcurve on face, surface access, tolerance/same-parameter flags, location effects, and triangulation availability after meshing.

## Preconditions

- OCCT build exists and includes ModelingData/Algorithms libs (run `just occt-build` if needed).

## How to run (OCCT oracle)

From repo root:

- `just occt-build`
- `bash repros/lane-brep-geometry-bridge/run.sh`

## Outputs

- Output files:
  - `repros/lane-brep-geometry-bridge/golden/bridge.json`
- Match criteria:
  - exact: all strings, bools, integers (counts), and enum-like fields
  - tolerant: all floating-point fields (points/UV/parameters/distances), compare within `eps = 1e-9`

## Scenarios covered / not covered

- Covered:
  - planar face + boundary edge: `BRep_Tool::Curve()` vs `BRep_Tool::CurveOnSurface()` + `BRep_Tool::Surface()`
  - `BRep_Tool` flags/tolerances: `SameParameter`, `SameRange`, `Tolerance`
  - location effects using `TopoDS_Shape::Moved(TopLoc_Location)`
  - triangulation availability after `BRepMesh_IncrementalMesh`
- Not covered (next extension):
  - seam edges / closed surfaces (two pcurves for one edge)
  - non-planar surfaces (e.g., cylinder) and pcurve parameterization subtleties
  - polygon-on-triangulation per-edge outputs on curved faces
