---
id: task-8.3
title: 'Repro+Oracle: meshing'
status: Done
assignee:
created_date: '2026-01-15 01:00'
updated_date: '2026-01-18 22:50:54'
labels:
  - 'lane:meshing'
  - 'type:oracle'
  - 'type:repro'
dependencies:
  - task-8.2
parent_task_id: task-8
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:meshing/type:repro-oracle

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/repro_oracle_task.md`.

Primary artifacts:
- `repros/lane-meshing/README.md`
- `repros/lane-meshing/golden/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Repro README exists under repros/lane-meshing/
- [x] #2 Oracle outputs exist under repros/lane-meshing/golden/
- [x] #3 Match criteria documented (exact vs tolerant)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Define oracle outputs: per-deflection mesh triangle/node counts and status flags.
2) Implement C++ repro that meshes a box and a cylinder with two deflection settings (parallel disabled).
3) Emit JSON with per-shape/per-deflection totals and representative face stats.
4) Store golden JSON under `repros/lane-meshing/golden/` and document match criteria in README.
5) Mark task Done with coverage + next extension.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented repro+oracle under `repros/lane-meshing/` using `BRepMesh_IncrementalMesh` (parallel disabled) on a box + cylinder, capturing triangle/node totals across coarse vs finer deflection. Golden output: `repros/lane-meshing/golden/meshing.json`. Run: `cmake --build build-occt --target TKMesh` then `bash repros/lane-meshing/run.sh`.
Not covered yet: per-face triangulation breakdown, edge discretization stats, and sensitivity to angular deflection / relative deflection modes.
<!-- SECTION:NOTES:END -->
