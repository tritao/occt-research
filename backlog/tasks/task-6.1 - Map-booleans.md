---
id: task-6.1
title: 'Map: booleans'
status: Done
assignee: []
created_date: '2026-01-15 00:00'
updated_date: '2026-01-15 00:22'
labels:
  - 'lane:booleans'
  - 'type:map'
dependencies: []
parent_task_id: task-6
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execute via prompts/backlog/map_task.md.

Primary artifact:
- notes/maps/lane-booleans.md (lane-specific map + findings)

Inputs:
- Lane definition and entry packages in notes/maps/lanes.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Map written to notes/maps/lane-booleans.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Confirm entry packages in notes/maps/lanes.md.
2) Extract include edges + package sizes for BOPAlgo/BOPDS/BRepAlgoAPI from notes/maps/include_graph.core.dot + notes/maps/packages.json.
3) Spot-check key entry points with occt-lsp hover (BOPAlgo_BOP, BOPAlgo_PaveFiller, BOPDS_DS, BRepAlgoAPI_Fuse).
4) Write notes/maps/lane-booleans.md with evidence + suggested dossier entry points.
5) Summarize findings in task notes and mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Wrote `notes/maps/lane-booleans.md` (sizes from `notes/maps/packages.json`; include edges from `notes/maps/include_graph.core.dot` / `notes/maps/include_graph.core.md`).
- Key entry points: `occt/src/BOPAlgo/BOPAlgo_PaveFiller.hxx` (`BOPAlgo_PaveFiller`), `occt/src/BOPAlgo/BOPAlgo_BOP.hxx` (`BOPAlgo_BOP`), `occt/src/BOPDS/BOPDS_DS.hxx` (`BOPDS_DS`), `occt/src/BRepAlgoAPI/BRepAlgoAPI_Fuse.hxx` (`BRepAlgoAPI_Fuse`).
- Next: proceed to `task-6.2` dossier using the “Suggested dossier entry points” section.
<!-- SECTION:NOTES:END -->
