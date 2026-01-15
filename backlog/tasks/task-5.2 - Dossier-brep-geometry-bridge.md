---
id: task-5.2
title: 'Dossier: brep-geometry-bridge'
status: Done
assignee:
created_date: '2026-01-15 00:00'
updated_date: '2026-01-15 01:54:26'
labels:
  - 'lane:brep-geometry-bridge'
  - 'type:dossier'
dependencies:
  - task-5.1
parent_task_id: task-5
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:brep-geometry-bridge/type:dossier

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/dossier_task.md`.

Primary artifact:
- `notes/dossiers/lane-brep-geometry-bridge.md`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dossier written to notes/dossiers/lane-brep-geometry-bridge.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Use lane map `notes/maps/lane-brep-geometry-bridge.md` to anchor scope and entry points.
2) Trace BRep_Tool accessors + fallbacks, BRepAdaptor_Curve adaptation rules, and BRepBuilderAPI_MakeShape result/history contract.
3) Capture tolerance/robustness behaviors (min tolerance clamps, null/exception paths, planar fallbacks) with file+symbol citations.
4) Write `notes/dossiers/lane-brep-geometry-bridge.md` from `notes/dossiers/_template.md`.
5) Summarize in task notes and mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Wrote `notes/dossiers/lane-brep-geometry-bridge.md` from `notes/dossiers/_template.md` using `notes/maps/lane-brep-geometry-bridge.md`.
- Evidence: `occt/src/BRep/BRep_Tool.{hxx,cxx}` (geometry access + fallbacks + tolerance clamping), `occt/src/BRepAdaptor/BRepAdaptor_Curve.hxx` (edge-as-curve adaptation), `occt/src/BRepBuilderAPI/BRepBuilderAPI_MakeShape.hxx` (builder result + history), `occt/src/BRepTools/BRepTools.hxx` (UV bounds/update/triangulation helpers).
<!-- SECTION:NOTES:END -->
