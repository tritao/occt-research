---
id: task-8.3
title: 'Repro+Oracle: meshing'
status: To Do
assignee:
created_date: '2026-01-15 01:00'
updated_date: '2026-01-15 01:54:26'
labels:
  - 'lane:meshing'
  - 'type:oracle'
  - 'type:repro'
dependencies:
  - task-8.2
parent_task_id: task-8
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:meshing/type:repro-oracle

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/repro_oracle_task.md`.

Primary artifacts:
- `repros/lane-meshing/README.md`
- `repros/lane-meshing/golden/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Repro README exists under repros/lane-meshing/
- [ ] #2 Oracle outputs exist under repros/lane-meshing/golden/
- [ ] #3 Match criteria documented (exact vs tolerant)
<!-- AC:END -->
