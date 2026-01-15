# Dossier: B-Rep geometry bridge (BRep / BRepTools / BRepAdaptor / BRepBuilderAPI)

Status: draft

## Purpose

Explain how OCCT bridges *topology* (`TopoDS_*`) to *geometry* (`Geom*`, `gp*`) for B-Rep shapes:
- **Access**: retrieving curves/surfaces/triangulations/tolerances from shapes (`BRep_Tool`).
- **Adaptation**: treating topological entities like analytic objects (edge → `Adaptor3d_Curve`) (`BRepAdaptor_Curve`).
- **Construction**: consistent “builder API” shape result + subshape history (`BRepBuilderAPI_MakeShape`).
- **Utilities**: post-processing/update, UV bounds, triangulation management (`BRepTools`).

## High-level pipeline

- Given a `TopoDS_*` shape, `BRep_Tool` accesses the underlying `BRep_T*` implementation (e.g. `BRep_TEdge`, `BRep_TFace`, `BRep_TVertex`) via `TShape()` and traverses stored curve/surface representations. (`occt/src/BRep/BRep_Tool.cxx`)
- For edges, the “best available geometry” is selected:
  - Prefer a stored 3D curve; otherwise fall back to a curve-on-surface (pcurve) representation; and if no pcurve is stored, attempt planar projection for planar surfaces. (`occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::Curve`, `BRep_Tool::CurveOnSurface`, `BRep_Tool::CurveOnPlane`)
- `BRepAdaptor_Curve` packages an edge as an `Adaptor3d_Curve`, accounting for locations; it uses 3D curve with priority, else curve-on-surface, and can be forced to use the pcurve by initializing with an edge+face. (`occt/src/BRepAdaptor/BRepAdaptor_Curve.hxx`)
- `BRepBuilderAPI_MakeShape` provides a common contract for builders: a stored result `TopoDS_Shape`, plus deferred hooks for subshape history (`Generated`, `Modified`, `IsDeleted`). (`occt/src/BRepBuilderAPI/BRepBuilderAPI_MakeShape.hxx`)
- `BRepTools` provides supporting operations (UV bounds, “Update” steps after topology creation, and triangulation lifecycle helpers). (`occt/src/BRepTools/BRepTools.hxx`)

## Key classes/files

- `occt/src/BRep/BRep_Tool.hxx` — `BRep_Tool` (geometry accessors for faces/edges/vertices, triangulations, tolerances)
- `occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::Curve`, `BRep_Tool::CurveOnSurface`, `BRep_Tool::CurveOnPlane`, `BRep_Tool::Tolerance`, `BRep_Tool::Pnt`, `BRep_Tool::Parameter`, `BRep_Tool::IsClosed`
- `occt/src/BRepAdaptor/BRepAdaptor_Curve.hxx` — `BRepAdaptor_Curve` (edge-as-curve adapter; 3D-vs-pcurve selection; location-aware)
- `occt/src/BRepBuilderAPI/BRepBuilderAPI_MakeShape.hxx` — `BRepBuilderAPI_MakeShape::Shape`, `Generated`, `Modified`, `IsDeleted` (builder result + history API)
- `occt/src/BRepTools/BRepTools.hxx` — `BRepTools::UVBounds`, `BRepTools::Update`, triangulation load/unload/activate helpers (post-processing utilities)

## Core data structures + invariants

- Structure: `BRep_Tool` access pattern (`occt/src/BRep/BRep_Tool.cxx`)
  - Most accessors downcast `TopoDS_*::TShape().get()` into `BRep_T*` types and then read stored fields/representations.
  - Edge curve representations are stored as a list and iterated; 3D curve (`IsCurve3D`) is preferred when present. (`BRep_Tool::Curve`)

- Structure: “identity + placement aware geometry”
  - `BRep_Tool::Curve(const TopoDS_Edge&, TopLoc_Location&, First, Last)` composes locations as `E.Location() * curveRep.Location()` and returns the stored range. (`occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::Curve`)
  - `BRep_Tool::Pnt(const TopoDS_Vertex&)` returns the stored point, transformed by `V.Location()` if not identity. (`occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::Pnt`)

- Structure: `BRepBuilderAPI_MakeShape` builder contract (`occt/src/BRepBuilderAPI/BRepBuilderAPI_MakeShape.hxx`)
  - Result is stored in `myShape`; `Shape()` raises `StdFail_NotDone` if not built. (`BRepBuilderAPI_MakeShape::Shape`)
  - Subshape history API is deliberately virtual/deferred: `Generated`, `Modified`, `IsDeleted`. (`BRepBuilderAPI_MakeShape`)

## Tolerance / robustness behaviors (observed)

- Minimum tolerance clamp:
  - `BRep_Tool::Tolerance(const TopoDS_Face&)` / `(const TopoDS_Edge&)` / `(const TopoDS_Vertex&)` clamp to at least `Precision::Confusion()`. (`occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::Tolerance(...)`)
- Curve-on-surface fallback:
  - `BRep_Tool::CurveOnSurface(E,S,L,First,Last,theIsStored)` returns stored pcurves when available; otherwise sets `*theIsStored = Standard_False` and tries `CurveOnPlane(...)` for planar surfaces. (`occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::CurveOnSurface`, `BRep_Tool::CurveOnPlane`)
- Closed-edge checks:
  - `BRep_Tool::IsClosed(E,S,L)` early-outs `false` for planar surfaces and otherwise checks for a “curve on closed surface” representation; triangulation-based closure is checked via “polygon on closed triangulation”. (`occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::IsClosed`)
- Null/exception paths:
  - `BRep_Tool::Pnt()` and `BRep_Tool::Tolerance(const TopoDS_Vertex&)` throw `Standard_NullObject` if the underlying `BRep_TVertex` is missing. (`occt/src/BRep/BRep_Tool.cxx`)
  - `BRep_Tool::Parameter(const TopoDS_Vertex&, const TopoDS_Edge&)` throws `Standard_NoSuchObject` when no parameter can be found. (`occt/src/BRep/BRep_Tool.cxx` — `BRep_Tool::Parameter(V,E)`)

## Runnable repro (optional)

Not created for this dossier (can be added under `repros/lane-brep-geometry-bridge/` if/when needed).

## Compare to papers / alternatives

- Parasolid / ACIS-style B-Rep kernels: similar separation between topological entities and underlying geometric representations; OCCT’s bridge layer exposes multiple representations (3D curves, pcurves, polygons, triangulations) with explicit fallbacks (e.g. planar projection).
- Half-edge mesh libraries: geometry is primarily polygonal; there’s no equivalent of dual (3D curve + 2D pcurve on a surface) representations, so “bridge” logic is much simpler but less expressive for CAD workflows.
- Direct NURBS evaluation libraries: focus on `Geom*` only; OCCT’s bridge integrates these with topology, locations, and tolerance management (clamping via `Precision::Confusion()`).
