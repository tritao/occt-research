---
id: task-7.1
title: 'Map: shape-healing-analysis'
status: Done
assignee:
created_date: '2026-01-15 00:00'
updated_date: '2026-01-18 22:50:54'
labels:
  - 'lane:shape-healing-analysis'
  - 'type:map'
dependencies:
parent_task_id: task-7
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:shape-healing-analysis/type:map

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/map_task.md`.

Primary artifact:
- `notes/maps/lane-shape-healing-analysis.md`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Map written to notes/maps/lane-shape-healing-analysis.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Confirm entry packages in notes/maps/lanes.md.
2) Extract include edges + package sizes for ShapeFix/ShapeAnalysis/ShapeUpgrade from notes/maps/include_graph.core.dot + notes/maps/packages.json.
3) Spot-check key entry points with occt-lsp hover (ShapeFix_Shape, ShapeAnalysis_*).
4) Write notes/maps/lane-shape-healing-analysis.md with evidence + suggested dossier entry points.
5) Summarize findings in task notes and mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Wrote `notes/maps/lane-shape-healing-analysis.md` (sizes from `notes/maps/packages.json`; include edges from `notes/maps/include_graph.core.dot` / `notes/maps/include_graph.core.md`).
- Key entry points: `occt/src/ShapeFix/ShapeFix_Shape.hxx` (`ShapeFix_Shape`), `occt/src/ShapeAnalysis/ShapeAnalysis_ShapeTolerance.hxx` (`ShapeAnalysis_ShapeTolerance`), `occt/src/ShapeUpgrade/ShapeUpgrade_ShapeDivide.hxx` (`ShapeUpgrade_ShapeDivide`).
- Next: proceed to `task-7.2` dossier using the “Suggested dossier entry points” section.
<!-- SECTION:NOTES:END -->
