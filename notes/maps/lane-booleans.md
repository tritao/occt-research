# Lane map: booleans

Scope: boolean operations pipeline, data structures, and robustness decisions.

Source lane definition: `notes/maps/lanes.md` (entry packages: `BOPAlgo`, `BOPDS`, `BRepAlgoAPI`).

## Package footprint (size proxy)

From `notes/maps/packages.json`:
- `BOPAlgo`: 39 sources, 36 headers, 41 class/struct decls
- `BOPDS`: 9 sources, 53 headers, 33 class/struct decls
- `BRepAlgoAPI`: 10 sources, 10 headers, 14 class/struct decls

## Core types / entry points (with code citations)

- `occt/src/BOPAlgo/BOPAlgo_PaveFiller.hxx` — `BOPAlgo_PaveFiller` (intersection phase over sub-shapes; stores results into DS)
- `occt/src/BOPAlgo/BOPAlgo_BOP.hxx` — `BOPAlgo_BOP` (build phase; combines splits into fuse/common/cut results)
- `occt/src/BOPDS/BOPDS_DS.hxx` — `BOPDS_DS` (boolean operation data structure: arguments, shape info, interferences, pools)
- `occt/src/BRepAlgoAPI/BRepAlgoAPI_Fuse.hxx` — `BRepAlgoAPI_Fuse` (API wrapper for boolean union)

## Include graph evidence (who pulls these packages in)

Data source: `notes/maps/include_graph.core.dot` (heaviest edges summarized in `notes/maps/include_graph.core.md`).

Top inbound include edges into lane packages:
- `BOPAlgo` -> `BOPDS`: 136
- `BOPTest` -> `BOPAlgo`: 35
- `BRepAlgoAPI` -> `BOPAlgo`: 22
- `QABugs` -> `BRepAlgoAPI`: 18
- `BRepFeat` -> `BRepAlgoAPI`: 15

## Local dependency shape (what these packages depend on)

From `notes/maps/include_graph.core.dot` (largest direct edges originating in lane packages):
- `BOPAlgo` -> `BOPDS`: 136
- `BOPAlgo` -> `TopoDS`: 109
- `BOPAlgo` -> `TopTools`: 90
- `BOPAlgo` -> `Standard`: 85
- `BOPAlgo` -> `BOPTools`: 64
- `BOPAlgo` -> `IntTools`: 47
- `BOPAlgo` -> `BRep`: 42
- `BOPDS` -> `Standard`: 59
- `BOPDS` -> `NCollection`: 47
- `BRepAlgoAPI` -> `Standard`: 30

## Suggested dossier entry points (next task)

If writing `task-6.2` (dossier), start from:
- `occt/src/BOPAlgo/BOPAlgo_PaveFiller.hxx` (+ `occt/src/BOPAlgo/BOPAlgo_PaveFiller.cxx`) — intersection pipeline and key “robustness modes” (fuzzy, safe processing, gluing)
- `occt/src/BOPDS/BOPDS_DS.hxx` — how arguments, interferences, and “same domain” collections are represented
- `occt/src/BOPAlgo/BOPAlgo_BOP.hxx` — how build/assembly is staged after intersection, and which failure/warning alerts exist
- `occt/src/BRepAlgoAPI/BRepAlgoAPI_Fuse.hxx` — API contract for union and how it plugs into the underlying BOP pipeline
