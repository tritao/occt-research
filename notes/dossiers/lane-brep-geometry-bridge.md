# Dossier: B-Rep geometry bridge (BRep / BRepTools / BRepAdaptor / BRepBuilderAPI)

Status: draft

## Purpose

Explain how OCCT bridges *topology* (`TopoDS_*`) to *geometry* (`Geom*`, `gp*`) for B-Rep shapes:
- **Access**: retrieving curves/surfaces/triangulations/tolerances from shapes (`BRep_Tool`).
- **Adaptation**: treating topological entities like analytic objects (edge → `Adaptor3d_Curve`) (`BRepAdaptor_Curve`).
- **Construction**: consistent “builder API” shape result + subshape history (`BRepBuilderAPI_MakeShape`).
- **Utilities**: post-processing/update, UV bounds, triangulation management (`BRepTools`).

## Mental model (human-first)

This lane is the “wiring harness” between the topological graph (edges/faces/wires) and the geometric objects that give them meaning (3D curves, surfaces, 2D pcurves). OCCT is intentionally flexible: the *same* edge may have multiple geometric representations available, and algorithms choose what they need.

The key ideas to internalize:
- A `TopoDS_Edge` can have **a 3D curve**, **a pcurve on a specific face**, and/or **a polygon on a triangulation** (discrete). These are not redundant; they serve different algorithmic needs.
- Pcurves are **face-relative**: the same edge will generally have a different pcurve on each adjacent face.
- Most getters return a geometry object *plus a location*; if you ignore the returned `TopLoc_Location`, you get the right type but the wrong placement.
- If a representation is missing, OCCT often has a **fallback** (e.g. planar projection for planar faces). That fallback is convenient but can surprise you if you expect “missing means error”.

## Provenance (required)

- OCCT version + build config: `notes/maps/provenance.md`
- Repro oracle: `repros/lane-brep-geometry-bridge/` (see `bridge.json`).

## Scenario + observable outputs (required)

- Scenario: build a planar face from a rectangular wire and query an edge’s 3D curve and its pcurve on that face.
- Observable outputs: curve types/ranges; surface type; curve-vs-surface point distance via pcurve UV; triangulation stats after meshing.
- Success criteria: distance is ~0 within epsilon; triangulation exists after meshing.

## Walkthrough (repro-driven)

1) Run: `bash repros/lane-brep-geometry-bridge/run.sh`
2) Inspect the oracle output: `repros/lane-brep-geometry-bridge/golden/bridge.json`
3) Use it to anchor the “multiple representations” idea:
   - Edge representations:
     - 3D curve: `edge.curve3d.type`, `edge.curve3d.first/last`, `edge.curve3d.mid_point_world`
     - Pcurve on a face: `edge.pcurve.type`, `edge.pcurve.mid_uv`
     - Consistency flags: `edge.same_parameter`, `edge.same_range`, `edge.tolerance`
   - Face representation:
     - `face.surface_type` (planar in this repro)
     - `face.surface_mid_from_pcurve` and `face.curve_surface_mid_distance` (sanity check that pcurve+surface round-trips to the 3D edge)
   - Location handling:
     - `location_effect.move` vs `location_effect.surface_location` is the “don’t drop the location” reminder
   - Triangulation as a derived rep:
     - `triangulation.has_face_triangulation`, `triangulation.nb_nodes`, `triangulation.nb_triangles`

## Spine (call chain) (required)

1) `occt/src/BRep/BRep_Tool.hxx` — `BRep_Tool::Curve` / `CurveOnSurface` / `Surface` (bridge getters)
2) `occt/src/BRep/BRep_Tool.hxx` — `BRep_Tool::Triangulation` / `PolygonOnTriangulation` (mesh attachments)
3) `occt/src/BRepMesh/BRepMesh_IncrementalMesh.hxx` — `BRepMesh_IncrementalMesh::Perform` (triangulation production)
4) `occt/src/BRepAdaptor/BRepAdaptor_Curve.hxx` — `BRepAdaptor_Curve` (edge-as-curve adapter)

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
- `notes/dossiers/api-brepadaptor-curve-line.md` — `BRepAdaptor_Curve::Line()` (type precondition, representation choice, location transform)
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

## Failure modes + diagnostics (recommended)

- “Pcurve is missing”: `BRep_Tool::CurveOnSurface` can return `theIsStored=false` and synthesize a pcurve for planar faces; treat this as a signal that the model is under-specified, not necessarily a hard error.
- “Geometry is correct but appears in the wrong place”: double-check you applied both `TopoDS_Shape` locations and the returned representation location (`E.Location() * curveRep.Location()` pattern).
- “Distance isn’t ~0”: suspect a mismatch between 3D curve and pcurve parameterization (`SameParameter`/`SameRange` flags), or tolerance/precision issues on the edge/face.

## Runnable repro (optional)

- Path: `repros/lane-brep-geometry-bridge/README.md`
- How to run: `repros/lane-brep-geometry-bridge/run.sh`
- Oracle outputs: `repros/lane-brep-geometry-bridge/golden/bridge.json`

## Compare to papers / alternatives

- Parasolid / ACIS-style B-Rep kernels: similar separation between topological entities and underlying geometric representations; OCCT’s bridge layer exposes multiple representations (3D curves, pcurves, polygons, triangulations) with explicit fallbacks (e.g. planar projection).
- Half-edge mesh libraries: geometry is primarily polygonal; there’s no equivalent of dual (3D curve + 2D pcurve on a surface) representations, so “bridge” logic is much simpler but less expressive for CAD workflows.
- Direct NURBS evaluation libraries: focus on `Geom*` only; OCCT’s bridge integrates these with topology, locations, and tolerance management (clamping via `Precision::Confusion()`).
