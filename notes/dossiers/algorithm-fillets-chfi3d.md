# Dossier: Fillet and Chamfer Algorithm (ChFi3d)

Status: draft

## Purpose

Produce a human-first, debuggable explanation of this algorithm, anchored in OCCT source files and runnable repro outputs.

## Provenance (required)

- OCCT version: 7.9.3
- Evidence repro/oracle: `repros/lane-fillets/golden/fillets.json`
- Maps provenance: `notes/maps/provenance.md`

## Scenario + observable outputs (required)

- Scenario: (describe one concrete, runnable scenario for this algorithm)
- Observable outputs: (oracle fields, error/status codes, topology counts, bboxes, timings)
- Success criteria: (what “good” looks like + tolerances)

## Spine (call chain) (required)

1) `occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx` — `BRepFilletAPI_MakeFillet`
2) `occt/src/ChFi3d/ChFi3d_Builder.hxx` — `ChFi3d_Builder`
3) `occt/src/ChFiDS/ChFiDS_ErrorStatus.hxx` — `ChFiDS_ErrorStatus`
4) `ChFi3d` — `ChFiDS`
5) `TKFillet` — `TKBRep`

## High-level pipeline

edge blending operations (fillet/chamfer) and the fillet builder pipeline for solids/shells.

Suggested phase breakdown (fill in and anchor to code):
1) Inputs + parameterization
2) Pre-analysis / contour building
3) Core computation (walking/solving/intersection/etc.)
4) Special cases / fallbacks
5) Topology reconstruction + validation

## Key classes/files

Entry packages:
- `BRepFilletAPI`, `FilletSurf`, `ChFi3d`, `ChFiDS`, `ChFiKPart`

Package footprint (from `notes/maps/packages.json`):
- `BRepFilletAPI`: 3 sources, 4 headers, 11 classes
- `FilletSurf`: 2 sources, 5 headers, 10 classes
- `ChFi3d`: 19 sources, 7 headers, 33 classes
- `ChFiDS`: 12 sources, 30 headers, 28 classes
- `ChFiKPart`: 14 sources, 16 headers, 5 classes

## Core data structures + invariants

- Structure: (name) (`occt/src/...`) — what it stores
  - Invariants: (what must hold, what breaks it)

Enum-like diagnostic surface:
- `occt/src/ChFiDS/ChFiDS_ErrorStatus.hxx`:
  - `ChFiDS_Ok`
  - `ChFiDS_Error`
  - `ChFiDS_WalkingFailure`
  - `ChFiDS_StartsolFailure`
  - `ChFiDS_TwistedSurface`

## Tolerance / robustness behaviors (observed)

- (list the tolerances/epsilons, how they’re propagated, and what the fallback paths are)

## Failure modes + diagnostics (recommended)

- (map each failure mode to a status/exception and to the phase where it occurs)

Include graph evidence (optional, size proxy):
- `ChFi3d` -> `ChFiDS`: 136
- `ChFiKPart` -> `ChFiDS`: 22
- `FilletSurf` -> `ChFiDS`: 12
- `BRepFilletAPI` -> `ChFiDS`: 7
- `ChFi3d` -> `ChFiKPart`: 5
- `FilletSurf` -> `ChFi3d`: 4
- `BRepFilletAPI` -> `ChFi3d`: 3

Largest outbound edges from lane packages:
- `ChFiKPart` -> `gp`: 119
- `ChFi3d` -> `TopoDS`: 68
- `ChFi3d` -> `TopOpeBRepDS`: 64
- `ChFi3d` -> `BRepBlend`: 52
- `ChFi3d` -> `gp`: 51
- `ChFi3d` -> `Geom`: 50
- `ChFiDS` -> `Standard`: 47
- `ChFi3d` -> `Standard`: 33
- `ChFiKPart` -> `Geom`: 32
- `ChFi3d` -> `Geom2d`: 30

## Compare to papers / alternatives

- Alternative A: (brief)
- Alternative B: (brief)
- Tradeoffs: (robustness vs exactness vs performance)
