---
id: task-9.3
title: 'Repro+Oracle: data-exchange'
status: Done
assignee:
created_date: '2026-01-15 01:00'
updated_date: '2026-01-18 22:50:54'
labels:
  - 'lane:data-exchange'
  - 'type:oracle'
  - 'type:repro'
dependencies:
  - task-9.2
parent_task_id: task-9
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:data-exchange/type:repro-oracle

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/repro_oracle_task.md`.

Primary artifacts:
- `repros/lane-data-exchange/README.md`
- `repros/lane-data-exchange/golden/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Repro README exists under repros/lane-data-exchange/
- [x] #2 Oracle outputs exist under repros/lane-data-exchange/golden/
- [x] #3 Match criteria documented (exact vs tolerant)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Define oracle outputs for a STEP roundtrip: read/write status, model entity count, and topology counts after import.
2) Implement a deterministic C++ repro that builds a simple shape (box + translated cylinder as a compound), writes STEP, reads it back, and transfers roots.
3) Emit JSON including: write status, read status, nb entities, nb roots, transfer ok, and imported shape topology counts + bbox.
4) Store golden JSON under `repros/lane-data-exchange/golden/` and document match criteria in README.
5) Mark task Done with coverage + next extension.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented repro+oracle under `repros/lane-data-exchange/` performing a STEP roundtrip (write/read/transfer). Golden output: `repros/lane-data-exchange/golden/data-exchange.json` (read/write return statuses, model entity count, transferred roots, topology counts + bbox for source vs imported). Run: `cmake --build build-occt --target TKDESTEP TKXSBase` then `bash repros/lane-data-exchange/run.sh`.
Not covered yet: AP selection differences (203/214/242), assembly/product structure, colors/names, units/tolerance conversion nuances, and non-STEP formats (IGES, glTF).
<!-- SECTION:NOTES:END -->
