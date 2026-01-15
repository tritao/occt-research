---
id: task-4.3
title: 'Repro+Oracle: topology-data-model'
status: To Do
assignee:
created_date: '2026-01-15 01:00'
updated_date: '2026-01-15 01:54:26'
labels:
  - 'lane:topology-data-model'
  - 'type:oracle'
  - 'type:repro'
dependencies:
  - task-4.2
parent_task_id: task-4
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:topology-data-model/type:repro-oracle

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/repro_oracle_task.md`.

Primary artifacts:
- `repros/lane-topology-data-model/README.md`
- `repros/lane-topology-data-model/golden/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Repro README exists under repros/lane-topology-data-model/
- [ ] #2 Oracle outputs exist under repros/lane-topology-data-model/golden/
- [ ] #3 Match criteria documented (exact vs tolerant)
<!-- AC:END -->
