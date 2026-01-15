---
id: task-5.1
title: 'Map: brep-geometry-bridge'
status: Done
assignee:
created_date: '2026-01-15 00:00'
updated_date: '2026-01-15 01:54:26'
labels:
  - 'lane:brep-geometry-bridge'
  - 'type:map'
dependencies:
parent_task_id: task-5
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:brep-geometry-bridge/type:map

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/map_task.md`.

Primary artifact:
- `notes/maps/lane-brep-geometry-bridge.md`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Map written to notes/maps/lane-brep-geometry-bridge.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Reconfirm lane entry packages in notes/maps/lanes.md.
2) Extract include-graph edges for BRep/BRepTools/BRepAdaptor/BRepBuilderAPI from notes/maps/include_graph.core.dot and sizes from notes/maps/packages.json.
3) Spot-check key entry points with occt-lsp hover (BRep_Tool, BRepBuilderAPI_MakeShape, BRepAdaptor_Curve/Surface, BRepTools).
4) Write notes/maps/lane-brep-geometry-bridge.md with evidence + suggested dossier entry points.
5) Summarize findings in task notes and mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Wrote `notes/maps/lane-brep-geometry-bridge.md` (sizes from `notes/maps/packages.json`; include edges from `notes/maps/include_graph.core.dot` / `notes/maps/include_graph.core.md`).
- Key entry points: `occt/src/BRep/BRep_Tool.hxx` (`BRep_Tool`), `occt/src/BRepTools/BRepTools.hxx` (`BRepTools`), `occt/src/BRepAdaptor/BRepAdaptor_Curve.hxx` (`BRepAdaptor_Curve`), `occt/src/BRepBuilderAPI/BRepBuilderAPI_MakeShape.hxx` (`BRepBuilderAPI_MakeShape`).
- Next: proceed to `task-5.2` dossier using the “Suggested dossier entry points” section.
<!-- SECTION:NOTES:END -->
