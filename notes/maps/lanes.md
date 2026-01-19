# OCCT research lanes (derived)

This is a derived lane list used to seed and organize research tasks.

Sources used:
- `notes/maps/packages.md` (package size hotspots)
- `notes/maps/include_graph.core.md` (core include fan-in/out hotspots)
- `notes/maps/include_graph.exchange_vis.md` (exchange/vis include hotspots)
- `notes/maps/toolkits.dot` and `notes/maps/cmake-targets.dot` (toolkit/target structure)

## lane:core-kernel

Focus: foundational types, math, geometry primitives and curves/surfaces.

Entry packages:
- `Standard`, `NCollection`, `math`, `gp`, `Geom`, `Geom2d`

Anchor symbols (examples):
- `occt/src/gp/gp_Pnt.hxx` (`gp_Pnt`)
- `occt/src/Geom/Geom_BSplineCurve.hxx` (`Geom_BSplineCurve`)

Map evidence:
- High fan-in to `Standard` and `gp` appears repeatedly in `notes/maps/include_graph.core.md` (e.g., `Geom` -> `Standard`, `Geom` -> `gp`, `math` -> `Standard`).

## lane:topology-data-model

Focus: topological data model and its invariants (shape types, locations, sharing).

Entry packages:
- `TopoDS`, `TopAbs`, `TopLoc`, `TopTools`

Anchor symbols (examples):
- `occt/src/TopoDS/TopoDS_Shape.hxx` (`TopoDS_Shape`)

Map evidence:
- Many modeling/algorithms include `TopoDS` heavily (`notes/maps/include_graph.core.md` shows multiple edges to `TopoDS`, e.g. `BRepFill` -> `TopoDS`).

## lane:brep-geometry-bridge

Focus: boundary representation helpers that connect topology (TopoDS) to geometry (Geom, gp).

Entry packages:
- `BRep`, `BRepTools`, `BRepAdaptor`, `BRepBuilderAPI`

Anchor symbols (examples):
- `occt/src/BRep/BRep_Tool.hxx` (`BRep_Tool`)

Map evidence:
- `BRepFill` has strong dependencies on `TopoDS`, `Geom`, `gp` in `notes/maps/include_graph.core.md`.

## lane:booleans

Focus: boolean operations pipeline, data structures, and robustness decisions.

Entry packages:
- `BOPAlgo`, `BOPDS`, `BRepAlgoAPI`

Anchor symbols (examples):
- `occt/src/BOPAlgo/BOPAlgo_PaveFiller.hxx` (`BOPAlgo_PaveFiller`)
- `occt/src/BOPAlgo/BOPAlgo_BOP.hxx` (`BOPAlgo_BOP`)
- `occt/src/BRepAlgoAPI/BRepAlgoAPI_Fuse.hxx` (`BRepAlgoAPI_Fuse`)

Map evidence:
- `BOPAlgo` is a top package by size in `notes/maps/packages.md`.
- `BOPAlgo` -> `BOPDS` and `BOPAlgo` -> `TopoDS` appear as heavy edges in `notes/maps/include_graph.core.md`.

## lane:fillets

Focus: edge blending operations (fillet/chamfer) and the fillet builder pipeline for solids/shells.

Entry packages:
- `BRepFilletAPI`, `FilletSurf`, `ChFi3d`, `ChFiDS`, `ChFiKPart`

Anchor symbols (examples):
- `occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx` (`BRepFilletAPI_MakeFillet`)
- `occt/src/ChFi3d/ChFi3d_Builder.hxx` (`ChFi3d_Builder`)
- `occt/src/ChFiDS/ChFiDS_ErrorStatus.hxx` (`ChFiDS_ErrorStatus`)

Map evidence:
- `ChFi3d` -> `ChFiDS` is a heavy internal edge in `notes/maps/include_graph.core.md` (fillet builder depends on fillet DS).
- `TKFillet` toolkit sits on top of `TKBRep`, `TKGeomAlgo`, and `TKTopAlgo` (see `notes/maps/cmake-targets.dot.TKFillet`).

## lane:shape-healing-analysis

Focus: shape validation, fixing, and upgrades; typical entry points when dealing with imperfect input.

Entry packages:
- `ShapeFix`, `ShapeAnalysis`, `ShapeUpgrade`

Anchor symbols (examples):
- `occt/src/ShapeFix/ShapeFix_Shape.hxx` (`ShapeFix_Shape`)

Map evidence:
- `ShapeFix` -> `TopoDS` and `ShapeFix` -> `Standard` show up in `notes/maps/include_graph.core.md`.

## lane:meshing

Focus: triangulation and mesh generation.

Entry packages:
- `BRepMesh`, `IMeshData`, `IMeshTools` (where available)

Anchor symbols (examples):
- `occt/src/BRepMesh/BRepMesh_IncrementalMesh.hxx` (`BRepMesh_IncrementalMesh`)

Map evidence:
- `BRepMesh` is among the larger core packages by source files in `notes/maps/packages.md`.

## lane:data-exchange

Focus: STEP/IGES/XCAF import/export and translation layers.

Entry packages:
- `STEPControl`, `IGESControl`, `Step*`, `IGES*`, `Interface`, `IFSelect`, `Transfer`

Anchor symbols (examples):
- `occt/src/STEPControl/STEPControl_Reader.hxx` (`STEPControl_Reader`)
- `occt/src/IGESControl/IGESControl_Reader.hxx` (`IGESControl_Reader`)

Map evidence:
- STEP/IGES packages dominate by size in `notes/maps/packages.md`.
- The exchange/vis include graph is dominated by `Step*` and `IGES*` edges in `notes/maps/include_graph.exchange_vis.md`.

## lane:visualization

Focus: interactive visualization stack and rendering backends.

Entry packages:
- `AIS`, `Prs3d`, `Graphic3d`, `OpenGl`, `V3d`, `Select3D`

Anchor symbols (examples):
- `occt/src/AIS/AIS_Shape.hxx` (`AIS_Shape`)
- `occt/src/Graphic3d/Graphic3d_GraphicDriver.hxx` (`Graphic3d_GraphicDriver`)

Map evidence:
- `Graphic3d`, `AIS`, and `OpenGl` are among the larger packages in `notes/maps/packages.md`.
- `AIS` -> `Prs3d` and `OpenGl` -> `Graphic3d` appear in `notes/maps/include_graph.exchange_vis.md`.
