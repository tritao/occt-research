---
id: task-0
title: 'Workflow: hardening for systematic OCCT → Rust work'
status: Done
assignee: []
created_date: '2026-01-15 01:00'
updated_date: '2026-01-15 01:00'
labels:
  - workflow
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tighten the repo workflow so every OCCT area follows the same repeatable chain:
maps → dossiers → repro/oracle.

Primary artifacts:
- backlog/docs/workflow.md
- prompts/backlog/* (protocol prompts)
- notes/dossiers/_template.md (required structure)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Workflow doc exists under backlog/docs/
- [x] #2 Prompts updated to include provenance + spine + scenario
- [x] #3 Maps provenance generated as part of maps generation
- [x] #4 Backlog seeded with repro/oracle tasks per lane
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Add workflow doc + quality gates.
2) Update prompts and templates to enforce provenance/scenario/spine.
3) Add provenance generation to map pipeline.
4) Seed backlog tasks for repro/oracle per lane.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Workflow doc: `backlog/docs/workflow.md`
- New prompt: `prompts/backlog/repro_oracle_task.md`
- Templates: `notes/dossiers/_template.md`, `notes/maps/_template_lane.md`
- Maps provenance: `tools/write_provenance.sh` (wired into `tools/gen_maps.sh`)
<!-- SECTION:NOTES:END -->
