# Dossier: TopoDS_Shape + BRep_Tool

Status: draft

## Purpose

Capture how OCCT represents topology (`TopoDS_Shape`/`TopoDS_TShape`) and how `BRep_Tool` exposes underlying geometry (curves, surfaces, triangulation, tolerances) for B-Rep shapes.

## High-level pipeline

- `TopoDS_Shape` is a light handle that references a shared `TopoDS_TShape` plus a per-instance `TopLoc_Location` and `TopAbs_Orientation` to place and orient the underlying topology. Shape identity and equality are driven by `TShape` + location + orientation rules. (`occt/src/TopoDS/TopoDS_Shape.hxx`)
- `TopoDS_TShape` is the shared topological container that stores child shapes and status flags (free/modified/checked/orientable/closed/infinite/convex/locked). (`occt/src/TopoDS/TopoDS_TShape.hxx`)
- `BRep_Tool` traverses `BRep_TFace`/`BRep_TEdge`/`BRep_TVertex` and their curve/surface representations to return geometry (surface, curve, polygon, triangulation) and metadata (tolerances, flags). (`occt/src/BRep/BRep_Tool.hxx`, `occt/src/BRep/BRep_Tool.cxx`)

## Key classes/files

- `occt/src/TopoDS/TopoDS_Shape.hxx` — `TopoDS_Shape::Location`, `TopoDS_Shape::Orientation`, `TopoDS_Shape::IsSame`, `TopoDS_Shape::IsEqual` (shape handle, placement, identity semantics)
- `occt/src/TopoDS/TopoDS_Shape.hxx` — `TopoDS_Shape::validateTransformation` (rejects scaling/negative transforms when requested)
- `occt/src/TopoDS/TopoDS_TShape.hxx` — `TopoDS_TShape` (shared topological container, children list + flags)
- `occt/src/BRep/BRep_Tool.hxx` — `BRep_Tool::Surface`, `BRep_Tool::Curve`, `BRep_Tool::Triangulation` (geometry access APIs)
- `occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::CurveOnSurface`, `BRep_Tool::CurveOnPlane` (PCurve access + planar fallback)
- `occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::Tolerance` (face/edge/vertex tolerance with minimum clamp)
- `occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::Parameter`, `BRep_Tool::Pnt` (vertex parameterization and location-aware point access)
- `occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::IsClosed` (edge closure checks via surface PCurves or triangulation)

## Core data structures + invariants

- Structure: `TopoDS_Shape` (`occt/src/TopoDS/TopoDS_Shape.hxx`)
  - Invariants: a shape is null when `myTShape` is null; `Nullify()` clears location and resets orientation to `TopAbs_EXTERNAL`.
  - Equality tiers: `IsPartner()` compares only `TShape`, `IsSame()` adds location, `IsEqual()` adds orientation.
- Structure: `TopoDS_TShape` (`occt/src/TopoDS/TopoDS_TShape.hxx`)
  - Invariants: children are stored in `TopoDS_ListOfShape`; flags define free/modified/checked/orientable/closed/infinite/convex/locked.
  - On construction, `Free`, `Modified`, and `Orientable` are set, while `Checked` is cleared; `Modified(true)` forces `Checked(false)`.
- Structure: `BRep_TFace`/`BRep_TEdge`/`BRep_TVertex` via `TShape()` (`occt/src/BRep/BRep_Tool.cxx`)
  - Invariants: geometry is accessed by downcasting `TShape()` to BRep_* types; curve/surface representations are iterated from each edge.

## Tolerance / robustness behaviors (observed)

- `occt/src/TopoDS/TopoDS_Shape.hxx` — `validateTransformation()` rejects transforms with scale deviation beyond `TopLoc_Location::ScalePrec()` or negative scale when `theRaiseExc` is true.
- `occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::Tolerance()` clamps face/edge/vertex tolerances to at least `Precision::Confusion()`.
- `occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::CurveOnSurface()` falls back to planar projection when no PCurve is stored, marking `theIsStored` false.
- `occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::IsClosed()` returns false for planar surfaces, otherwise checks closed-surface PCurves or closed triangulation polygons.
- `occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::Parameter()` uses vertex tolerance to disambiguate parameters on closed curves, with special handling for infinite parameter ranges.
- `occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::Pnt()` and `BRep_Tool::Tolerance()` throw `Standard_NullObject` when the vertex lacks a stored point.

## Runnable repro (optional)

One minimal runnable reproduction (if needed) under `repros/`:
- Path: `repros/topology-brep-tool/README.md` (not created)
- How to run: N/A
- Expected output: N/A

## Compare to papers / alternatives

- Parasolid / ACIS B-Rep kernels: similar split between topological entities and underlying geometry, but with different APIs and persistence models; OCCT exposes more direct accessors in `BRep_Tool`.
- CGAL `Surface_mesh` or `Polyhedron_3`: half-edge based, primarily polygonal; simpler data model but less direct support for analytic curves/surfaces and PCurve duals.
- OpenVDB or voxel/SDF pipelines: prioritize volumetric robustness over exact topology; easier boolean ops but loses explicit edge/face parameterization that `BRep_Tool` exposes.
