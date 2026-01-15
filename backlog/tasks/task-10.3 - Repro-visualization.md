---
id: task-10.3
title: 'Repro+Oracle: visualization'
status: To Do
assignee:
created_date: '2026-01-15 01:00'
updated_date: '2026-01-15 01:54:26'
labels:
  - 'lane:visualization'
  - 'type:oracle'
  - 'type:repro'
dependencies:
  - task-10.2
parent_task_id: task-10
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:visualization/type:repro-oracle

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/repro_oracle_task.md`.

Primary artifacts:
- `repros/lane-visualization/README.md`
- `repros/lane-visualization/golden/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Repro README exists under repros/lane-visualization/
- [ ] #2 Oracle outputs exist under repros/lane-visualization/golden/ (if feasible)
- [ ] #3 Match criteria documented (exact vs tolerant)
<!-- AC:END -->
