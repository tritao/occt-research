# Lane map: topology-data-model

Scope: topological data model and its invariants (shape types, locations, sharing).

Source lane definition: `notes/maps/lanes.md` (entry packages: `TopoDS`, `TopAbs`, `TopLoc`, `TopTools`).

## Package footprint (size proxy)

From `notes/maps/packages.json`:
- `TopoDS`: 15 sources, 29 headers, 29 class/struct decls
- `TopTools`: 4 sources, 49 headers, 9 class/struct decls
- `TopLoc`: 5 sources, 8 headers, 6 class/struct decls
- `TopAbs`: 1 sources, 4 headers, 1 class/struct decls

## Core types / entry points (with code citations)

- `occt/src/TopoDS/TopoDS_Shape.hxx` — `TopoDS_Shape` (shape handle: underlying TShape + location + orientation)
- `occt/src/TopoDS/TopoDS_TShape.hxx` — `TopoDS_TShape` (shared topological container; stores components and flags)
- `occt/src/TopLoc/TopLoc_Location.hxx` — `TopLoc_Location` (composite transform / placement)
- `occt/src/TopAbs/TopAbs_ShapeEnum.hxx` — `TopAbs_ShapeEnum` (shape kind taxonomy: COMPOUND…VERTEX/SHAPE)
- `occt/src/TopAbs/TopAbs_Orientation.hxx` — `TopAbs_Orientation` (orientation semantics for sharing/reversing topology)
- `occt/src/TopTools/TopTools_ListOfShape.hxx` — `TopTools_ListOfShape` (typedef: `NCollection_List<TopoDS_Shape>`)
- `occt/src/TopTools/TopTools_IndexedMapOfShape.hxx` — `TopTools_IndexedMapOfShape` (typedef: `NCollection_IndexedMap<TopoDS_Shape, TopTools_ShapeMapHasher>`)

## Include graph evidence (who pulls these packages in)

Data source: `notes/maps/include_graph.core.dot` (heaviest edges summarized in `notes/maps/include_graph.core.md`).

Top inbound include edges into `TopoDS`:
- `BRepFill` -> `TopoDS`: 164
- `ShapeFix` -> `TopoDS`: 139
- `TopOpeBRepBuild` -> `TopoDS`: 129
- `LocOpe` -> `TopoDS`: 112
- `BOPAlgo` -> `TopoDS`: 109

Top inbound include edges into `TopTools`:
- `BRepFill` -> `TopTools`: 92
- `BOPAlgo` -> `TopTools`: 90
- `LocOpe` -> `TopTools`: 82
- `TopOpeBRepBuild` -> `TopTools`: 80
- `TopOpeBRepTool` -> `TopTools`: 67

Top inbound include edges into `TopAbs` (orientation/type used widely across algorithms):
- `ChFi3d` -> `TopAbs`: 25
- `TopOpeBRepBuild` -> `TopAbs`: 25
- `TopOpeBRepDS` -> `TopAbs`: 22
- `TopOpeBRep` -> `TopAbs`: 17
- `TopOpeBRepTool` -> `TopAbs`: 13

Top inbound include edges into `TopLoc` (placement used across B-Rep operations):
- `BRep` -> `TopLoc`: 22
- `DNaming` -> `TopLoc`: 7
- `BRepSweep` -> `TopLoc`: 6
- `BRepTools` -> `TopLoc`: 6
- `ShapeCustom` -> `TopLoc`: 6

## Local dependency shape (what these packages depend on)

From `notes/maps/include_graph.core.dot` (largest direct edges originating in lane packages):
- `TopoDS` -> `Standard`: 48
- `TopLoc` -> `Standard`: 27
- `TopTools` -> `TopoDS`: 29
- `TopTools` -> `NCollection`: 29
- `TopoDS` -> `TopAbs`: 12
- `TopoDS` -> `TopLoc`: 3

## Suggested dossier entry points (next task)

If writing `task-4.2` (dossier), start from:
- `occt/src/TopoDS/TopoDS_Shape.hxx` — identity semantics (`IsPartner`/`IsSame`/`IsEqual`), `Location()`, `Orientation()`
- `occt/src/TopoDS/TopoDS_TShape.hxx` — component storage + flags (free/modified/checked/orientable/closed/…)
- `occt/src/TopLoc/TopLoc_Location.hxx` — what invariants are enforced for transforms/composition
- `occt/src/TopAbs/TopAbs_Orientation.hxx` + `occt/src/TopAbs/TopAbs_ShapeEnum.hxx` — the semantic “vocabulary” used everywhere else
