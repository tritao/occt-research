---
id: task-6.3
title: 'Repro+Oracle: booleans'
status: To Do
assignee:
created_date: '2026-01-15 01:00'
updated_date: '2026-01-15 01:54:26'
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
- [ ] #1 Repro README exists under repros/lane-booleans/
- [ ] #2 Oracle outputs exist under repros/lane-booleans/golden/
- [ ] #3 Match criteria documented (exact vs tolerant)
<!-- AC:END -->
