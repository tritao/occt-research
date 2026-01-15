---
id: task-3.2
title: 'Dossier: core-kernel'
status: Done
assignee:
created_date: '2026-01-14 23:59'
updated_date: '2026-01-15 01:54:26'
labels:
  - 'lane:core-kernel'
  - 'type:dossier'
dependencies:
  - task-3.1
parent_task_id: task-3
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:core-kernel/type:dossier

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/dossier_task.md`.

Primary artifact:
- `notes/dossiers/lane-core-kernel.md`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dossier written to notes/dossiers/lane-core-kernel.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Use lane map `notes/maps/lane-core-kernel.md` to anchor scope and entry points.
2) Use occt-lsp + source reads to extract core types/invariants for `Standard`, `NCollection`, `gp`, `Geom`, `Geom2d`, `math`.
3) Capture tolerance/robustness patterns (e.g., `gp::Resolution()`, `Precision::Confusion()/Angular()`, construction guards) with file+symbol citations.
4) Write `notes/dossiers/lane-core-kernel.md` using `notes/dossiers/_template.md`.
5) Summarize in task notes; optional repro deferred.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Wrote `notes/dossiers/lane-core-kernel.md` from `notes/dossiers/_template.md` using `notes/maps/lane-core-kernel.md`.
- Evidence: `occt/src/Standard/Standard_Transient.hxx` + `occt/src/Standard/Standard_Handle.hxx` (handles/refcount), `occt/src/gp/gp.hxx` + `occt/src/gp/gp_Trsf.cxx` (resolution + transform guards), `occt/src/Precision/Precision.hxx` (Confusion/Angular/etc), `occt/src/NCollection/NCollection_List.hxx` + `occt/src/NCollection/NCollection_DataMap.hxx` (container behaviors), `occt/src/Geom/Geom_BSplineCurve.hxx` + `occt/src/Geom2d/Geom2d_BSplineCurve.hxx` (spline validity constraints), `occt/src/math/math.hxx` (numerical utilities).
- Optional repro deferred; can add `repros/lane-core-kernel/` later.
<!-- SECTION:NOTES:END -->
