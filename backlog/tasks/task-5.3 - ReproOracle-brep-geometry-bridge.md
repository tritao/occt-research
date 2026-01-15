---
id: task-5.3
title: 'Repro+Oracle: brep-geometry-bridge'
status: Done
assignee: []
created_date: '2026-01-15 01:00'
updated_date: '2026-01-15 02:13'
labels:
  - 'lane:brep-geometry-bridge'
  - 'type:oracle'
  - 'type:repro'
dependencies:
  - task-5.2
parent_task_id: task-5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:brep-geometry-bridge/type:repro-oracle

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/repro_oracle_task.md`.

Primary artifacts:
- `repros/lane-brep-geometry-bridge/README.md`
- `repros/lane-brep-geometry-bridge/golden/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Repro README exists under repros/lane-brep-geometry-bridge/
- [x] #2 Oracle outputs exist under repros/lane-brep-geometry-bridge/golden/
- [x] #3 Match criteria documented (exact vs tolerant)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Define oracle outputs (JSON schema) covering: edge 3D curve vs pcurve, surface type/params, location effects, triangulation stats, and tolerances.
2) Ensure OCCT is built locally (run `just occt-build` if needed) so we can link against `TKBRep`/`TKGeomBase` etc.
3) Implement a minimal C++ repro under `repros/lane-brep-geometry-bridge/` that constructs a small face+edge scenario, queries BRep/Geom bridge APIs, runs meshing, and emits deterministic JSON.
4) Save oracle output(s) under `repros/lane-brep-geometry-bridge/golden/` and document match criteria (exact vs tolerant) in the README.
5) Summarize coverage + next extension in task notes and mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added runnable repro under `repros/lane-brep-geometry-bridge/`.
- Oracle output: `repros/lane-brep-geometry-bridge/golden/bridge.json` (includes OCCT version, edge curve3d/pcurve types+ranges, surface type, tolerances/flags, location effects, and triangulation stats).
- How to run: `just occt-build` then `bash repros/lane-brep-geometry-bridge/run.sh`.
- Match criteria: exact for non-floats; floats within `eps=1e-9` (documented in the repro README).
- Not covered yet: seam/closed-surface edges with two pcurves, non-planar surfaces (cylinder), and deeper polygon-on-triangulation details.

Fixed `repros/lane-brep-geometry-bridge/run.sh` repo-root detection; verified OCCT deps are buildable (`cmake --build build-occt --target TKMesh TKTopAlgo TKGeomAlgo TKBRep TKGeomBase TKPrim TKG3d TKG2d TKMath TKernel`) and repro runs (`bash repros/lane-brep-geometry-bridge/run.sh`).
<!-- SECTION:NOTES:END -->
