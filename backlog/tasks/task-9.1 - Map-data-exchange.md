---
id: task-9.1
title: 'Map: data-exchange'
status: Done
assignee:
created_date: '2026-01-15 00:00'
updated_date: '2026-01-15 01:54:26'
labels:
  - 'lane:data-exchange'
  - 'type:map'
dependencies:
parent_task_id: task-9
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:data-exchange/type:map

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/map_task.md`.

Primary artifact:
- `notes/maps/lane-data-exchange.md`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Map written to notes/maps/lane-data-exchange.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Confirm entry packages in notes/maps/lanes.md.
2) Use notes/maps/packages.json to identify the biggest exchange packages (Step*/IGES*/RWStep*/RWIGES* plus Interface/IFSelect/Transfer/STEPControl/IGESControl).
3) Extract include edges for those packages from notes/maps/include_graph.exchange_vis.dot.
4) Spot-check key entry points with occt-lsp hover (STEPControl_Reader, IGESControl_Reader, IFSelect_SessionPilot, Transfer_TransientProcess).
5) Write notes/maps/lane-data-exchange.md with evidence + suggested dossier entry points.
6) Summarize findings in task notes and mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Wrote `notes/maps/lane-data-exchange.md` (package sizes from `notes/maps/packages.json`; include edges from `notes/maps/include_graph.exchange_vis.dot` / `notes/maps/include_graph.exchange_vis.md`).
- Key entry points: `occt/src/STEPControl/STEPControl_Reader.hxx` (`STEPControl_Reader`), `occt/src/IGESControl/IGESControl_Reader.hxx` (`IGESControl_Reader`), `occt/src/IFSelect/IFSelect_SessionPilot.hxx` (`IFSelect_SessionPilot`), `occt/src/Transfer/Transfer_TransientProcess.hxx` (`Transfer_TransientProcess`).
- Next: proceed to `task-9.2` dossier using the “Suggested dossier entry points” section.
<!-- SECTION:NOTES:END -->
