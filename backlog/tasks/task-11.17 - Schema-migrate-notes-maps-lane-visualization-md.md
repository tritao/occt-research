---
id: task-11.17
title: 'Schema migrate (strict): notes/maps/lane-visualization.md'
status: To Do
assignee:
created_date: '2026-01-15 01:29:54'
updated_date: '2026-01-15 01:54:26'
labels:
  - 'schema-migration'
  - 'kind:lane-map'
  - 'lane:visualization'
dependencies:
parent_task_id: task-11
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Schema migration task (auto-managed).

schema_migration_target: notes/maps/lane-visualization.md
schema_migration_kind: lane-map
schema_migration_level: strict
schema_fingerprint: a697ee6cc01b

Validation:
- baseline: `just validate-md`
- strict: `just validate-md-strict`

Current validator errors:
- headings: ['# Lane map: visualization', '## Package footprint (size proxy)', '## Core types / entry points (with code citations)', '## Include graph evidence (exchange/vis filtered view)', '## Local dependency shape (what these packages depend on)', '## Suggested dossier entry points (next task)'] does not contain items matching the given schema
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `notes/maps/lane-visualization.md` passes `strict` validation
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Add/adjust the required headings/sections for this document type.
2) Re-run `python3 tools/validate_md_types.py --root . --level strict`.
3) Mark task Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

<!-- SECTION:NOTES:END -->
