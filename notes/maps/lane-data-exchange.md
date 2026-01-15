# Lane map: data-exchange

Scope: STEP/IGES/XCAF import/export and translation layers (schema packages, readers/writers, selection + transfer process).

Source lane definition: `notes/maps/lanes.md` (entry packages: `STEPControl`, `IGESControl`, `Step*`, `IGES*`, `Interface`, `IFSelect`, `Transfer`).

## Package footprint (size proxy)

From `notes/maps/packages.json` (selected entry packages):
- `STEPControl`: 5 sources, 6 headers, 36 class/struct decls
- `IGESControl`: 7 sources, 7 headers, 21 class/struct decls
- `XSControl`: 14 sources, 14 headers, 39 class/struct decls
- `IFSelect`: 77 sources, 89 headers, 93 class/struct decls
- `Interface`: 45 sources, 66 headers, 53 class/struct decls
- `Transfer`: 28 sources, 40 headers, 46 class/struct decls

Largest schema packages by sources (also from `notes/maps/packages.json`):
- `StepBasic`: 144 sources
- `StepVisual`: 135 sources
- `StepShape`: 103 sources
- `StepGeom`: 91 sources
- `IGESSolid`: 54 sources
- `IGESGeom`: 51 sources

## Core types / entry points (with code citations)

- `occt/src/STEPControl/STEPControl_Reader.hxx` — `STEPControl_Reader` (read/check/transfer STEP entities to shapes)
- `occt/src/IGESControl/IGESControl_Reader.hxx` — `IGESControl_Reader` (read/check/transfer IGES entities to shapes; provides default shape fixing hooks)
- `occt/src/IFSelect/IFSelect_SessionPilot.hxx` — `IFSelect_SessionPilot` (command-driven session control over work session / selections / transfer)
- `occt/src/Transfer/Transfer_TransientProcess.hxx` — `Transfer_TransientProcess` (transfer process from `InterfaceModel` to application objects; provides trace/check hooks)

## Include graph evidence (exchange/vis filtered view)

Data source: `notes/maps/include_graph.exchange_vis.dot` (heaviest edges summarized in `notes/maps/include_graph.exchange_vis.md`).

Heavy “RW* -> schema” edges dominate (read/write toolkits referencing STEP/IGES schema packages). Examples:
- `RWStepAP214` -> `StepBasic`: 266
- `StepAP214` -> `StepBasic`: 252
- `RWStepBasic` -> `StepBasic`: 248
- `RWStepBasic` -> `StepData`: 238
- `RWStepShape` -> `StepData`: 182
- `RWStepGeom` -> `StepGeom`: 182
- `IGESSolid` -> `IGESData`: 189
- `IGESGeom` -> `IGESData`: 185

Session/selection layer also shows strong coupling:
- `IFSelect` -> `Interface`: 201

## Local dependency shape (what these packages depend on)

TODO: Fill from `notes/maps/include_graph.exchange_vis.dot` (largest direct edges originating in lane packages), similar to other lane maps.

## Suggested dossier entry points (next task)

If writing `task-9.2` (dossier), start from:
- `occt/src/STEPControl/STEPControl_Reader.hxx` and `occt/src/IGESControl/IGESControl_Reader.hxx` — the “public” read/transfer APIs and where shape-fixing hooks live
- `occt/src/XSControl/*` + `occt/src/IFSelect/*` — selection, work session orchestration, and how command-driven flows are implemented
- `occt/src/Transfer/Transfer_TransientProcess.hxx` — trace/check/graph/model integration during transfer
- One representative heavy schema package (e.g. `occt/src/StepBasic/*` or `occt/src/IGESData/*`) to understand the scale and structure of entity graphs
