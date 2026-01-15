---
id: task-10.3
title: 'Repro+Oracle: visualization'
status: Done
assignee: []
created_date: '2026-01-15 01:00'
updated_date: '2026-01-15 13:03'
labels:
  - 'lane:visualization'
  - 'type:oracle'
  - 'type:repro'
dependencies:
  - task-10.2
parent_task_id: task-10
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:visualization/type:repro-oracle

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/repro_oracle_task.md`.

Primary artifacts:
- `repros/lane-visualization/README.md`
- `repros/lane-visualization/golden/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Repro README exists under repros/lane-visualization/
- [x] #2 Oracle outputs exist under repros/lane-visualization/golden/ (if feasible)
- [x] #3 Match criteria documented (exact vs tolerant)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Define oracle outputs around visualization-tessellation settings: deflection mode/value and resulting triangulation size proxies.
2) Implement a headless C++ repro using `Prs3d_Drawer` + `StdPrs_ToolTriangulatedShape::Tessellate` on a box + cylinder.
3) Emit deterministic JSON: computed deflection, tessellate changed flag, and total nodes/triangles.
4) Store golden JSON under `repros/lane-visualization/golden/` and document match criteria in README.
5) Mark task Done with coverage + next extension.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented headless visualization tessellation repro under `repros/lane-visualization/` using `Prs3d_Drawer` + `StdPrs_ToolTriangulatedShape::GetDeflection/IsTessellated/Tessellate` and emitting triangulation size proxies. Golden output: `repros/lane-visualization/golden/visualization.json`. Run: `cmake --build build-occt --target TKV3d` then `bash repros/lane-visualization/run.sh`.
Not covered yet: full `AIS_InteractiveContext` + `V3d_View` rendering/selection loop and OpenGL driver integration (would likely need offscreen/GL context).
<!-- SECTION:NOTES:END -->
