---
id: task-9.3
title: 'Repro+Oracle: data-exchange'
status: To Do
assignee:
created_date: '2026-01-15 01:00'
updated_date: '2026-01-15 01:54:26'
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
- [ ] #1 Repro README exists under repros/lane-data-exchange/
- [ ] #2 Oracle outputs exist under repros/lane-data-exchange/golden/
- [ ] #3 Match criteria documented (exact vs tolerant)
<!-- AC:END -->
