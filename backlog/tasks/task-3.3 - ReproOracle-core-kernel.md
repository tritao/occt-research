---
id: task-3.3
title: 'Repro+Oracle: core-kernel'
status: Done
assignee:
created_date: '2026-01-15 01:00'
updated_date: '2026-01-18 22:50:54'
labels:
  - 'lane:core-kernel'
  - 'type:oracle'
  - 'type:repro'
dependencies:
  - task-3.2
parent_task_id: task-3
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:core-kernel/type:repro-oracle

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/repro_oracle_task.md`.

Primary artifacts:
- `repros/lane-core-kernel/README.md`
- `repros/lane-core-kernel/golden/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Repro README exists under repros/lane-core-kernel/
- [x] #2 Oracle outputs exist under repros/lane-core-kernel/golden/
- [x] #3 Match criteria documented (exact vs tolerant)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added `repros/lane-core-kernel/` repro+oracle; deps: `TKernel`, `TKMath`. Run: `cmake --build build-occt --target TKernel TKMath` then `bash repros/lane-core-kernel/run.sh` (writes `repros/lane-core-kernel/golden/core-kernel.json`).
<!-- SECTION:NOTES:END -->
