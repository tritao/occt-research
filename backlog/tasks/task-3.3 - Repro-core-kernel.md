---
id: task-3.3
title: 'Repro+Oracle: core-kernel'
status: To Do
assignee:
created_date: '2026-01-15 01:00'
updated_date: '2026-01-15 01:54:26'
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
- [ ] #1 Repro README exists under repros/lane-core-kernel/
- [ ] #2 Oracle outputs exist under repros/lane-core-kernel/golden/
- [ ] #3 Match criteria documented (exact vs tolerant)
<!-- AC:END -->
