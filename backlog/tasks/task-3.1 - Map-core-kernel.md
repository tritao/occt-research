---
id: task-3.1
title: 'Map: core-kernel'
status: Done
assignee:
created_date: '2026-01-14 23:59'
updated_date: '2026-01-15 01:54:26'
labels:
  - 'lane:core-kernel'
  - 'type:map'
dependencies:
parent_task_id: task-3
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:core-kernel/type:map

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/map_task.md`.

Primary artifact:
- `notes/maps/lane-core-kernel.md`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Map written to notes/maps/lane-core-kernel.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Confirm entry packages in notes/maps/lanes.md.
2) Extract include edges + package sizes for Standard/NCollection/math/gp/Geom/Geom2d from notes/maps/include_graph.core.dot + notes/maps/packages.json.
3) Spot-check key entry points with occt-lsp hover (gp_Pnt, Geom_BSplineCurve, math).
4) Write notes/maps/lane-core-kernel.md with evidence + suggested dossier entry points.
5) Summarize findings in task notes and mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Wrote `notes/maps/lane-core-kernel.md` (sizes from `notes/maps/packages.json`; include edges from `notes/maps/include_graph.core.dot` / `notes/maps/include_graph.core.md`).
- Key entry points: `occt/src/gp/gp_Pnt.hxx` (`gp_Pnt`), `occt/src/Geom/Geom_BSplineCurve.hxx` (`Geom_BSplineCurve`), `occt/src/math/math.hxx` (`math`).
- Next: proceed to `task-3.2` dossier using the “Suggested dossier entry points” section.
<!-- SECTION:NOTES:END -->
