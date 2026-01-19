---
id: task-7.3
title: 'Repro+Oracle: shape-healing-analysis'
status: Done
assignee:
created_date: '2026-01-15 01:00'
updated_date: '2026-01-18 22:50:54'
labels:
  - 'lane:shape-healing-analysis'
  - 'type:oracle'
  - 'type:repro'
dependencies:
  - task-7.2
parent_task_id: task-7
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task_sync_key: lane:shape-healing-analysis/type:repro-oracle

Source of truth: `notes/maps/lanes.md`.

Execute via `prompts/backlog/repro_oracle_task.md`.

Primary artifacts:
- `repros/lane-shape-healing-analysis/README.md`
- `repros/lane-shape-healing-analysis/golden/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Repro README exists under repros/lane-shape-healing-analysis/
- [x] #2 Oracle outputs exist under repros/lane-shape-healing-analysis/golden/
- [x] #3 Match criteria documented (exact vs tolerant)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Define oracle outputs: gap distance and topological closure before/after fixing.
2) Build a nearly-closed wire with a small endpoint gap.
3) Run `ShapeFix_Wire::FixClosed` (allow topology/geometry changes) and re-measure.
4) Emit JSON: gap_before/after, closure flags, fix status bits.
5) Store golden JSON under `repros/lane-shape-healing-analysis/golden/` and document match criteria; mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented repro+oracle under `repros/lane-shape-healing-analysis/`: builds a nearly-closed wire with a small endpoint gap, runs `ShapeFix_Wire` (topology+geometry modification enabled) and measures gap/closure before vs after. Golden output: `repros/lane-shape-healing-analysis/golden/shape-healing.json`.
Run: `cmake --build build-occt --target TKShHealing` then `bash repros/lane-shape-healing-analysis/run.sh`.
Not covered yet: fixing on-face pcurves, seam-edge cases, and higher-level `ShapeFix_Shape` pipelines on shells/solids.
<!-- SECTION:NOTES:END -->
