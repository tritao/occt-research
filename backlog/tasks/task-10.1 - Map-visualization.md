---
id: task-10.1
title: 'Map: visualization'
status: Done
assignee:
created_date: '2026-01-15 00:00'
updated_date: '2026-01-15 01:54:26'
labels:
  - 'lane:visualization'
  - 'type:map'
dependencies:
parent_task_id: task-10
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:visualization/type:map

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/map_task.md`.

Primary artifact:
- `notes/maps/lane-visualization.md`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Map written to notes/maps/lane-visualization.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Confirm entry packages in notes/maps/lanes.md.
2) Extract include edges + package sizes for AIS/Prs3d/Graphic3d/OpenGl/V3d/Select3D from notes/maps/include_graph.exchange_vis.dot + notes/maps/packages.json.
3) Spot-check key entry points with occt-lsp hover (AIS_Shape, Graphic3d_GraphicDriver, OpenGl_GraphicDriver, V3d_View).
4) Write notes/maps/lane-visualization.md with evidence + suggested dossier entry points.
5) Summarize findings in task notes and mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Wrote `notes/maps/lane-visualization.md` (sizes from `notes/maps/packages.json`; include edges from `notes/maps/include_graph.exchange_vis.dot` / `notes/maps/include_graph.exchange_vis.md`).
- Key entry points: `occt/src/AIS/AIS_Shape.hxx` (`AIS_Shape`), `occt/src/V3d/V3d_View.hxx` (`V3d_View`), `occt/src/Graphic3d/Graphic3d_GraphicDriver.hxx` (`Graphic3d_GraphicDriver`), `occt/src/OpenGl/OpenGl_GraphicDriver.hxx` (`OpenGl_GraphicDriver`).
- Next: proceed to `task-10.2` dossier using the “Suggested dossier entry points” section.
<!-- SECTION:NOTES:END -->
