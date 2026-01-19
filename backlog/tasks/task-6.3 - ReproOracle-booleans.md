---
id: task-6.3
title: 'Repro+Oracle: booleans'
status: Done
assignee:
created_date: '2026-01-15 01:00'
updated_date: '2026-01-18 22:50:54'
labels:
  - 'lane:booleans'
  - 'type:oracle'
  - 'type:repro'
dependencies:
  - task-6.2
parent_task_id: task-6
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:booleans/type:repro-oracle

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/repro_oracle_task.md`.

Primary artifacts:
- `repros/lane-booleans/README.md`
- `repros/lane-booleans/golden/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Repro README exists under repros/lane-booleans/
- [x] #2 Oracle outputs exist under repros/lane-booleans/golden/
- [x] #3 Match criteria documented (exact vs tolerant)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Define oracle outputs: result validity, errors/warnings, and topology counts per boolean op.
2) Implement a deterministic C++ repro (two overlapping solids) running FUSE/CUT/COMMON with parallel disabled.
3) Emit JSON with counts (solids/faces/edges/vertices), bbox, validity, and error flags.
4) Store golden JSON under `repros/lane-booleans/golden/` and document match criteria in README.
5) Mark task Done with coverage + next extension.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented repro+oracle under `repros/lane-booleans/` (FUSE/COMMON/CUT with parallel disabled). Golden output: `repros/lane-booleans/golden/booleans.json` (validity, has_errors/warnings, topology counts, bbox per op). Run: `cmake --build build-occt --target TKBO TKBool` then `bash repros/lane-booleans/run.sh`.
Not covered yet: fuzzy booleans (`SetFuzzyValue`), non-solid operands (faces/shells), and section/splitter workflows.
<!-- SECTION:NOTES:END -->
