# Lane map: brep-geometry-bridge

Scope: boundary representation helpers that connect topology (`TopoDS`) to geometry (`Geom`, `gp`) and provide common construction/adaptation utilities.

Source lane definition: `notes/maps/lanes.md` (entry packages: `BRep`, `BRepTools`, `BRepAdaptor`, `BRepBuilderAPI`).

## Package footprint (size proxy)

From `notes/maps/packages.json`:
- `BRep`: 21 sources, 25 headers, 36 class/struct decls
- `BRepBuilderAPI`: 21 sources, 31 headers, 59 class/struct decls
- `BRepTools`: 15 sources, 16 headers, 37 class/struct decls
- `BRepAdaptor`: 4 sources, 6 headers, 26 class/struct decls

## Core types / entry points (with code citations)

- `occt/src/BRep/BRep_Tool.hxx` — `BRep_Tool` (geometry accessors for B-Rep shapes)
- `occt/src/BRepTools/BRepTools.hxx` — `BRepTools` (utilities: wire exploration, dumping/IO helpers, UV bounds, updates, comparisons, mapping)
- `occt/src/BRepAdaptor/BRepAdaptor_Curve.hxx` — `BRepAdaptor_Curve` (treat an edge as an `Adaptor3d_Curve`; accounts for locations; can fall back to curve-on-surface)
- `occt/src/BRepBuilderAPI/BRepBuilderAPI_MakeShape.hxx` — `BRepBuilderAPI_MakeShape` (root class for shape construction; stores result + history hooks)

## Include graph evidence (who pulls these packages in)

Data source: `notes/maps/include_graph.core.dot` (heaviest edges summarized in `notes/maps/include_graph.core.md`).

Top inbound include edges into lane packages:
- `QABugs` -> `BRepBuilderAPI`: 46
- `BRepFill` -> `BRep`: 44
- `ShapeFix` -> `BRep`: 44
- `BOPAlgo` -> `BRep`: 42
- `BRepTools` -> `BRep`: 35
- `BRepFill` -> `BRepTools`: 30
- `TopOpeBRepTool` -> `BRep`: 30
- `PrsDim` -> `BRepAdaptor`: 24
- `BRepFill` -> `BRepAdaptor`: 20

## Local dependency shape (what these packages depend on)

From `notes/maps/include_graph.core.dot` (largest direct edges originating in lane packages):
- `BRep` -> `Standard`: 72
- `BRepBuilderAPI` -> `Standard`: 69
- `BRepBuilderAPI` -> `TopoDS`: 47
- `BRepTools` -> `TopoDS`: 57
- `BRepTools` -> `TopTools`: 32
- `BRepBuilderAPI` -> `gp`: 28
- `BRepBuilderAPI` -> `Geom`: 21
- `BRepAdaptor` -> `gp`: 27

## Suggested dossier entry points (next task)

If writing `task-5.2` (dossier), start from:
- `occt/src/BRep/BRep_Tool.hxx` (+ `occt/src/BRep/BRep_Tool.cxx`) — which geometry/tolerance data is stored on faces/edges/vertices and how it is retrieved
- `occt/src/BRepAdaptor/BRepAdaptor_Curve.hxx` — how location and curve-on-surface fallbacks are handled for edges
- `occt/src/BRepTools/BRepTools.hxx` — key “after building a shape” utilities (update/UV bounds, mapping 3D edges, comparisons)
- `occt/src/BRepBuilderAPI/BRepBuilderAPI_MakeShape.hxx` — how construction results and subshape history are represented/exposed
