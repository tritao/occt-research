---
id: task-8.1
title: 'Map: meshing'
status: Done
assignee:
created_date: '2026-01-15 00:00'
updated_date: '2026-01-15 01:54:26'
labels:
  - 'lane:meshing'
  - 'type:map'
dependencies:
parent_task_id: task-8
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:meshing/type:map

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/map_task.md`.

Primary artifact:
- `notes/maps/lane-meshing.md`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Map written to notes/maps/lane-meshing.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Confirm entry packages in notes/maps/lanes.md.
2) Extract include edges + package sizes for BRepMesh/IMeshData/IMeshTools (if present) from notes/maps/include_graph.core.dot + notes/maps/packages.json.
3) Spot-check key entry points with occt-lsp hover (BRepMesh_IncrementalMesh, IMeshTools_Parameters).
4) Write notes/maps/lane-meshing.md with evidence + suggested dossier entry points.
5) Summarize findings in task notes and mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Wrote `notes/maps/lane-meshing.md` (sizes from `notes/maps/packages.json`; include edges from `notes/maps/include_graph.core.dot` / `notes/maps/include_graph.core.md`).
- Key entry points: `occt/src/BRepMesh/BRepMesh_IncrementalMesh.hxx` (`BRepMesh_IncrementalMesh`), `occt/src/IMeshTools/IMeshTools_Parameters.hxx` (`IMeshTools_Parameters`), `occt/src/IMeshTools/IMeshTools_Context.hxx` (`IMeshTools_Context`).
- Noted parameter guardrails in `BRepMesh_IncrementalMesh::initParameters()` (throws on invalid deflection/angle).
- Next: proceed to `task-8.2` dossier using the “Suggested dossier entry points” section.
<!-- SECTION:NOTES:END -->
