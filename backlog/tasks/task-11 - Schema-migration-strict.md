---
id: task-11
title: Schema migration (strict)
status: Done
assignee:
created_date: '2026-01-15 01:29:54'
updated_date: '2026-01-19 01:04:27'
labels:
  - 'schema-migration'
dependencies:
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Schema migration meta-task (auto-managed).

- schema_migration_level: strict
- schema_fingerprint: 8d399b7fc72e

Run:
- `just validate-md-strict`
- `python3 tools/seed_schema_migration_tasks.py --level strict`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All targeted docs pass `strict` validation
- [x] #2 Task list reflects current `strict` failures (seed script rerun)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Run validator to get current failures.
2) Generate/update per-file tasks with the seeder.
3) Fix files until validation passes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Ran `python3 tools/validate_md_types.py --level strict`: OK.
- Patched all failing lane maps/dossiers to include required strict headings.
- Re-ran `python3 tools/seed_schema_migration_tasks.py --level strict`: 0 failing docs; task list updated.
<!-- SECTION:NOTES:END -->

<!-- SECTION:NOTES:END -->
