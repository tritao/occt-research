---
id: task-4.3
title: 'Repro+Oracle: topology-data-model'
status: Done
assignee:
created_date: '2026-01-15 01:00'
updated_date: '2026-01-18 22:50:54'
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
- [x] #1 Repro README exists under repros/lane-topology-data-model/
- [x] #2 Oracle outputs exist under repros/lane-topology-data-model/golden/
- [x] #3 Match criteria documented (exact vs tolerant)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Define oracle outputs focusing on TopoDS identity tiers and TopLoc_Location effects.
2) Implement a small C++ repro that builds one base shape, then creates two instances at different locations + an orientation-flipped variant.
3) Emit deterministic JSON covering IsPartner/IsSame/IsEqual, map semantics (IndexedMapOfShape sizes), and traversal counts.
4) Store golden JSON under repros/lane-topology-data-model/golden/ and document match criteria in README.
5) Summarize coverage + next extension and mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented repro+oracle under `repros/lane-topology-data-model/`. Oracle output `repros/lane-topology-data-model/golden/topology-data-model.json` covers: TopoDS identity tiers (`IsPartner`/`IsSame`/`IsEqual`) across instances + orientation flip; location effect via translation; `TopTools_IndexedMapOfShape` size behavior (orientation ignored, location matters); and traversal vertex counts for a compound of two instances. Run: `cmake --build build-occt --target TKBRep TKTopAlgo TKPrim` then `bash repros/lane-topology-data-model/run.sh`.
Not covered yet: deeper `TopLoc_Location` datum-chain cancellation behavior, `TopoDS_Shape::Location(..., raiseExc)` negative/scale rejection, and container semantics for orientation-sensitive equality (`IsEqual`) keyed maps.
<!-- SECTION:NOTES:END -->
