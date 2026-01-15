---
id: task-11.9
title: 'Schema migrate (strict): notes/dossiers/topology-brep-tool.md'
status: To Do
assignee:
created_date: '2026-01-15 01:29:54'
updated_date: '2026-01-15 01:54:26'
labels:
  - 'schema-migration'
  - 'kind:dossier'
dependencies:
parent_task_id: task-11
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Schema migration task (auto-managed).

schema_migration_target: notes/dossiers/topology-brep-tool.md
schema_migration_kind: dossier
schema_migration_level: strict
schema_fingerprint: a697ee6cc01b

Validation:
- baseline: `just validate-md`
- strict: `just validate-md-strict`

Current validator errors:
- headings: ['# Dossier: TopoDS_Shape + BRep_Tool', '## Purpose', '## High-level pipeline', '## Key classes/files', '## Core data structures + invariants', '## Tolerance / robustness behaviors (observed)', '## Runnable repro (optional)', '## Compare to papers / alternatives'] does not contain items matching the given schema
- headings: ['# Dossier: TopoDS_Shape + BRep_Tool', '## Purpose', '## High-level pipeline', '## Key classes/files', '## Core data structures + invariants', '## Tolerance / robustness behaviors (observed)', '## Runnable repro (optional)', '## Compare to papers / alternatives'] does not contain items matching the given schema
- headings: ['# Dossier: TopoDS_Shape + BRep_Tool', '## Purpose', '## High-level pipeline', '## Key classes/files', '## Core data structures + invariants', '## Tolerance / robustness behaviors (observed)', '## Runnable repro (optional)', '## Compare to papers / alternatives'] does not contain items matching the given schema
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `notes/dossiers/topology-brep-tool.md` passes `strict` validation
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
