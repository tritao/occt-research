---
id: task-7.2
title: 'Dossier: shape-healing-analysis'
status: Done
assignee:
created_date: '2026-01-15 00:00'
updated_date: '2026-01-15 01:54:26'
labels:
  - 'lane:shape-healing-analysis'
  - 'type:dossier'
dependencies:
  - task-7.1
parent_task_id: task-7
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:shape-healing-analysis/type:dossier

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/dossier_task.md`.

Primary artifact:
- `notes/dossiers/lane-shape-healing-analysis.md`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dossier written to notes/dossiers/lane-shape-healing-analysis.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Use lane map `notes/maps/lane-shape-healing-analysis.md` to anchor scope and entry points.
2) Identify the main “shape fixing” façade (`ShapeFix_*`) and “analysis” utilities (`ShapeAnalysis_*`) that decide tolerances/validity.
3) Capture typical repair flows (e.g., fixing shells/solids, wires, pcurves, tolerances) and which steps are optional/parametrized.
4) Write `notes/dossiers/lane-shape-healing-analysis.md` from `notes/dossiers/_template.md` with file+symbol citations.
5) Summarize in task notes and mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Wrote `notes/dossiers/lane-shape-healing-analysis.md` from `notes/dossiers/_template.md` using `notes/maps/lane-shape-healing-analysis.md`.
- Evidence: `occt/src/ShapeFix/ShapeFix_Root.hxx` (precision + min/max tolerance bounds + context/messaging), `occt/src/ShapeFix/ShapeFix_Shape.hxx` (top-level `Perform()` façade + modes + `SameParameter()`), `occt/src/ShapeFix/ShapeFix_Wire.hxx` (documented fix strategy + ordered `Perform()` pipeline + pcurve/3d curve fixes), `occt/src/ShapeFix/ShapeFix_Face.hxx` (face/wire/seam/natural bounds fixes; small-area wire heuristic), `occt/src/ShapeAnalysis/ShapeAnalysis_ShapeTolerance.hxx` (min/max/avg tolerance scans), `occt/src/ShapeUpgrade/ShapeUpgrade_ShapeDivide.hxx` + `occt/src/ShapeBuild/ShapeBuild_ReShape.hxx` (divide + recorded modifications + DONE/FAIL statuses).
- Optional repro deferred; can add `repros/lane-shape-healing-analysis/` later.
<!-- SECTION:NOTES:END -->
