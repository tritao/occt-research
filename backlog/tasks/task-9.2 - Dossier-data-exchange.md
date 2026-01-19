---
id: task-9.2
title: 'Dossier: data-exchange'
status: Done
assignee:
created_date: '2026-01-15 00:00'
updated_date: '2026-01-18 22:50:54'
labels:
  - 'lane:data-exchange'
  - 'type:dossier'
dependencies:
  - task-9.1
parent_task_id: task-9
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:data-exchange/type:dossier

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/dossier_task.md`.

Primary artifact:
- `notes/dossiers/lane-data-exchange.md`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dossier written to notes/dossiers/lane-data-exchange.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Use lane map `notes/maps/lane-data-exchange.md` to anchor scope and entry points.
2) Summarize the “reader” surface (`STEPControl_Reader`, `IGESControl_Reader`) and its base (`XSControl_Reader`).
3) Capture where shape healing / processing parameters are configured and the default hooks used by format-specific readers.
4) Describe session/selection automation via `IFSelect_SessionPilot` and transfer internals via `Transfer_TransientProcess` (model/graph/context + checks).
5) Write `notes/dossiers/lane-data-exchange.md` from `notes/dossiers/_template.md`, then mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Wrote `notes/dossiers/lane-data-exchange.md` from `notes/dossiers/_template.md` using `notes/maps/lane-data-exchange.md`.
- Evidence: `occt/src/XSControl/XSControl_Reader.hxx` (work session + selection/transfer workflow; shape processing parameters/flags), `occt/src/STEPControl/STEPControl_Reader.hxx` + `occt/src/IGESControl/IGESControl_Reader.hxx` (format-specific readers + default healing hooks), `occt/src/Transfer/Transfer_TransientProcess.hxx` (model/graph/context + trace/check helpers), `occt/src/IFSelect/IFSelect_SessionPilot.hxx` (command-driven session automation).
- Optional repro deferred; can add `repros/lane-data-exchange/` later.
<!-- SECTION:NOTES:END -->
