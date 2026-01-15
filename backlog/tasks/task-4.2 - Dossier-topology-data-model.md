---
id: task-4.2
title: 'Dossier: topology-data-model'
status: Done
assignee:
created_date: '2026-01-15 00:00'
updated_date: '2026-01-15 01:54:26'
labels:
  - 'lane:topology-data-model'
  - 'type:dossier'
dependencies:
  - task-4.1
parent_task_id: task-4
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:topology-data-model/type:dossier

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/dossier_task.md`.

Primary artifact:
- `notes/dossiers/lane-topology-data-model.md`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dossier written to notes/dossiers/lane-topology-data-model.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Review lane map `notes/maps/lane-topology-data-model.md` and confirm entry packages.
2) Use occt-lsp to locate key methods on `TopoDS_Shape`, `TopoDS_TShape`, and `TopLoc_Location` that encode identity/placement/sharing invariants.
3) Extract core structures and invariants (shape kind, orientation, location composition, containers).
4) Note robustness/tolerance/defensive behaviors (null shapes, validation, exception paths) with file+symbol citations.
5) Write `notes/dossiers/lane-topology-data-model.md` using `notes/dossiers/_template.md` and update task notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Wrote `notes/dossiers/lane-topology-data-model.md` from `notes/dossiers/_template.md` using lane map `notes/maps/lane-topology-data-model.md`.
- Evidence sources: `occt/src/TopoDS/TopoDS_Shape.hxx` (identity tiers + transform validation + hash), `occt/src/TopoDS/TopoDS_TShape.hxx` (flags + children), `occt/src/TopLoc/TopLoc_Location.{hxx,cxx,lxx}` (composition, inversion, hashing), `occt/src/TopAbs/*` (orientation + kind vocab), `occt/src/TopTools/*` (shape map hasher).
- No repro yet; add under `repros/lane-topology-data-model/` if needed.
<!-- SECTION:NOTES:END -->
