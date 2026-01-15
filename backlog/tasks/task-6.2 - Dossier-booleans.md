---
id: task-6.2
title: 'Dossier: booleans'
status: Done
assignee: []
created_date: '2026-01-15 00:00'
updated_date: '2026-01-15 00:39'
labels:
  - 'lane:booleans'
  - 'type:dossier'
dependencies:
  - task-6.1
parent_task_id: task-6
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execute via prompts/backlog/dossier_task.md.

Primary artifact:
- notes/dossiers/lane-booleans.md

Inputs:
- Entry packages from notes/maps/lanes.md
- Results from the map task task-6.1

Optional:
- If you need a runnable repro, put it under tools/repros/lane-booleans/.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dossier written to notes/dossiers/lane-booleans.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Use lane map `notes/maps/lane-booleans.md` to anchor scope and entry points.
2) Trace the split between intersection (`BOPAlgo_PaveFiller`) and build (`BOPAlgo_BOP`) and how DS (`BOPDS_DS`) is initialized and populated.
3) Capture robustness/tolerance knobs: fuzz (default `Precision::Confusion()`), safe/non-destructive mode, gluing, and surfaced warning/error alerts.
4) Write `notes/dossiers/lane-booleans.md` from `notes/dossiers/_template.md`.
5) Summarize in task notes and mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Wrote `notes/dossiers/lane-booleans.md` from `notes/dossiers/_template.md` using `notes/maps/lane-booleans.md`.
- Evidence: `occt/src/BOPAlgo/BOPAlgo_PaveFiller.hxx` (intersection order, warnings/errors, non-destructive, glue, p-curve handling), `occt/src/BOPAlgo/BOPAlgo_BOP.hxx` (build-phase rules + solid builder), `occt/src/BOPDS/BOPDS_DS.hxx` (DS pools + `Init(theFuzz = Precision::Confusion())`), `occt/src/BOPAlgo/BOPAlgo_Options.hxx` (fuzzy/parallel/OBB + report), `occt/src/BRepAlgoAPI/BRepAlgoAPI_BuilderAlgo.hxx` (API options surface), `occt/src/BRepAlgoAPI/BRepAlgoAPI_BooleanOperation.hxx` + `occt/src/BRepAlgoAPI/BRepAlgoAPI_Fuse.hxx` (API entry points).
- Optional repro deferred; can add `tools/repros/lane-booleans/` later.
<!-- SECTION:NOTES:END -->
