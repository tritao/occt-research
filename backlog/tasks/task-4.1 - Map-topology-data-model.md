---
id: task-4.1
title: 'Map: topology-data-model'
status: Done
assignee: []
created_date: '2026-01-15 00:00'
updated_date: '2026-01-15 00:13'
labels:
  - 'lane:topology-data-model'
  - 'type:map'
dependencies: []
parent_task_id: task-4
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execute via prompts/backlog/map_task.md.

Primary artifact:
- notes/maps/lane-topology-data-model.md (lane-specific map + findings)

Inputs:
- Lane definition and entry packages in notes/maps/lanes.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Map written to notes/maps/lane-topology-data-model.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Reconfirm lane entry packages in notes/maps/lanes.md.
2) Extract TopAbs/TopLoc/TopoDS/TopTools include edges from notes/maps/include_graph.core.dot.
3) Spot-check key types with occt-lsp hover (TopoDS_Shape, TopLoc_Location, TopAbs_Orientation).
4) Write notes/maps/lane-topology-data-model.md with evidence + next dossier entry points.
5) Summarize findings in task notes and mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Wrote `notes/maps/lane-topology-data-model.md` (package footprint from `notes/maps/packages.json`, include edges from `notes/maps/include_graph.core.dot` / `notes/maps/include_graph.core.md`).
- Key entry points: `occt/src/TopoDS/TopoDS_Shape.hxx` (`TopoDS_Shape`), `occt/src/TopoDS/TopoDS_TShape.hxx` (`TopoDS_TShape`), `occt/src/TopLoc/TopLoc_Location.hxx` (`TopLoc_Location`), `occt/src/TopAbs/TopAbs_Orientation.hxx` (`TopAbs_Orientation`), `occt/src/TopAbs/TopAbs_ShapeEnum.hxx` (`TopAbs_ShapeEnum`).
- Next: proceed to `task-4.2` dossier using the “Suggested dossier entry points” section.
<!-- SECTION:NOTES:END -->
