# Lane map: fillets

Scope: edge blending (fillets/chamfers) and the solid fillet builder pipeline (contours → surfaces → corner filling → topology build).

Source lane definition: `notes/maps/lanes.md` (entry packages: `BRepFilletAPI`, `FilletSurf`, `ChFi3d`, `ChFiDS`, `ChFiKPart`).

## Provenance (required)

- OCCT version + build config: `notes/maps/provenance.md`
- Map inputs:
  - `notes/maps/packages.json`
  - `notes/maps/include_graph.core.dot` / `notes/maps/include_graph.core.md`
  - `notes/maps/cmake-targets.dot.TKFillet`

## Package footprint (size proxy)

From `notes/maps/packages.json`:
- `BRepFilletAPI`: 3 sources, 4 headers
- `FilletSurf`: 2 sources, 5 headers
- `ChFi3d`: 19 sources, 7 headers
- `ChFiDS`: 12 sources, 30 headers
- `ChFiKPart`: 14 sources, 16 headers

## Core types / entry points (with code citations)

- `occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx` — `BRepFilletAPI_MakeFillet` (public API for solid/shell fillets; owns the internal builder)
- `occt/src/BRepFilletAPI/BRepFilletAPI_MakeChamfer.hxx` — `BRepFilletAPI_MakeChamfer` (public API for chamfers; similar “local operation” framing)
- `occt/src/BRepFilletAPI/BRepFilletAPI_LocalOperation.hxx` — `BRepFilletAPI_LocalOperation` (common base for local edge ops; contour/edge enumeration APIs)
- `occt/src/ChFi3d/ChFi3d_FilBuilder.hxx` — `ChFi3d_FilBuilder` (solid fillet builder implementation)
- `occt/src/ChFi3d/ChFi3d_Builder.hxx` — `ChFi3d_Builder` (builder core; contour walking and construction orchestration)
- `occt/src/ChFiDS/ChFiDS_Stripe.hxx` — `ChFiDS_Stripe` (a fillet “stripe”: one contour’s worth of computed surfaces + corner data)
- `occt/src/ChFiDS/ChFiDS_ErrorStatus.hxx` — `ChFiDS_ErrorStatus` (error classification used by `StripeStatus`)

## Include graph evidence (who pulls these packages in)

Data source: `notes/maps/include_graph.core.dot` (edges shown are “package A includes package B” counts).

Top inbound include edges into lane packages (size proxies, not semantics):
- `QABugs` -> `BRepFilletAPI`: 4
- `BRepTest` -> `BRepFilletAPI`: 4
- `BRepTest` -> `FilletSurf`: 3
- `BRepTest` -> `ChFi3d`: 2
- `BRepOffset` -> `ChFiDS`: 2
- `BRepBlend` -> `ChFiDS`: 2

## Local dependency shape (what these packages depend on)

Internal lane edges (within fillet toolkit packages):
- `ChFi3d` -> `ChFiDS`: 136
- `ChFiKPart` -> `ChFiDS`: 22
- `FilletSurf` -> `ChFiDS`: 12
- `BRepFilletAPI` -> `ChFiDS`: 7

Largest external edges originating in lane packages:
- `ChFiKPart` -> `gp`: 119
- `ChFi3d` -> `TopoDS`: 68
- `ChFi3d` -> `TopOpeBRepDS`: 64
- `ChFi3d` -> `BRepBlend`: 52
- `ChFi3d` -> `Geom`: 50
- `ChFi3d` -> `Geom2d`: 30

Toolkit-level context:
- `notes/maps/cmake-targets.dot.TKFillet` shows `TKFillet` depends on `TKBRep`, `TKGeomAlgo`, `TKTopAlgo`, `TKMath`, and `TKernel` (among others).

## Suggested dossier entry points (next task)

If writing `notes/dossiers/lane-fillets.md`, start from:

- `occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx` (+ `occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.cxx`) — contour creation APIs, build loop, and the outward-facing error surface (`NbFaultyContours`, `StripeStatus`, partial result behavior)
- `occt/src/ChFi3d/ChFi3d_FilBuilder.hxx` — fillet builder object model (builder owns DS and the “walking” pipeline)
- `occt/src/ChFiDS/ChFiDS_Stripe.hxx` (+ `occt/src/ChFiDS/ChFiDS_Spine.hxx`) — what a “stripe/spine” means in filleting terms (contour-level state)
- `occt/src/ChFiDS/ChFiDS_ErrorStatus.hxx` — decode `StripeStatus` and distinguish “radius too big” from walking/twisted-surface failures

