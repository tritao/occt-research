---
id: task-11
title: Schema migration (strict)
status: In Progress
assignee:
created_date: '2026-01-15 01:29:54'
updated_date: '2026-01-15 01:54:26'
labels:
  - 'schema-migration'
dependencies:
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Schema migration meta-task (auto-managed).

- schema_migration_level: strict
- schema_fingerprint: a697ee6cc01b

Run:
- `just validate-md-strict`
- `python3 tools/seed_schema_migration_tasks.py --level strict`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All targeted docs pass `strict` validation
- [ ] #2 Task list reflects current `strict` failures (seed script rerun)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Run validator to get current failures.
2) Generate/update per-file tasks with the seeder.
3) Fix files until validation passes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

<!-- SECTION:NOTES:END -->
