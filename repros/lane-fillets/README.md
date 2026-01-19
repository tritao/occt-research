# Repro: lane-fillets

## Goal

Exercise OCCT solid fillets deterministically and record stable, machine-checkable outputs:

- `BRepFilletAPI_MakeFillet` contour building + build results
- per-contour failure status (`ChFiDS_ErrorStatus`)
- partial-result behavior (`HasResult`/`BadShape`)
- result validity (`BRepCheck_Analyzer::IsValid`)
- result topology counts (solids/faces/edges/vertices) and bounding box

## Preconditions

- OCCT build exists and includes fillet libs (`TKFillet`) (run `just occt-build` if needed).

## How to run (OCCT oracle)

From repo root:

- `just occt-build`
- `bash repros/lane-fillets/run.sh`

## Outputs

- Output files:
  - `repros/lane-fillets/golden/fillets.json`
- Match criteria:
  - exact: all strings, bools, integers (counts), and enum-like fields
  - tolerant: all floating-point fields (bbox), compare within `eps = 1e-9`

## Scenarios covered / not covered

- Covered:
  - constant-radius fillet on a box edge (single edge)
  - 3-edge corner fillet attempt (edges meeting at one vertex)
  - failure example where radius is too large
- Not covered (next extension):
  - variable-radius laws (`Law_Function`, `UandR`) and per-edge radius bounds
  - chamfers (`BRepFilletAPI_MakeChamfer`)
  - non-manifold/wire-edge fillets, and filleting after booleans/healing

