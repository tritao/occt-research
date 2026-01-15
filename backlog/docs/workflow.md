# Workflow (OCCT-under-the-hood)

This repo is organized to make OCCT understandable without touching upstream sources (`occt/` is read-only).

## Artifact locations

- `notes/maps/`: generated structural maps (package sizes, include graphs, toolkit graphs)
- `notes/dossiers/`: evidence-based writeups (use `notes/dossiers/_template.md`)
- `repros/<slug>/`: runnable experiments + oracle outputs (golden results)
- `notes/overview.md` + `notes/maps/hub-*.md`: generated navigators (edit only inside `MANUAL:*` blocks)
- `backlog/tasks/`: task tracking + implementation plans

## Standard task chain (repeat for each lane/area)

1) **Map** (`type:map`)
   - Output: `notes/maps/lane-<slug>.md`
   - Purpose: “where to look” + evidence from generated maps
2) **Dossier** (`type:dossier`, depends on Map)
   - Output: `notes/dossiers/lane-<slug>.md`
   - Purpose: “how it works” with citations + a short call-chain spine
3) **Repro + oracle** (`type:repro` / `type:oracle`, depends on Dossier; recommended)
   - Output: `repros/<slug>/README.md` + `repros/<slug>/golden/`
   - Purpose: concrete scenarios + observable outputs to regress against OCCT

## Definition of done (quality gates)

- Maps: cite `notes/maps/*` inputs and reference `notes/maps/provenance.md`.
- Dossiers: include provenance, scenario + observable outputs, and a 5–15 item spine (file + symbol).
- Repros: document match criteria and store oracle outputs in a stable format (prefer JSON).

## Schema migrations (when templates evolve)

The validator schemas in `tools/schemas/` define required structure for key markdown types.

Workflow:
1) Update templates/schemas (usually tightening `*.strict.schema.json`).
2) Seed/update migration tasks from current strict failures: `just schema-seed`.
3) Work the generated tasks until `just validate-md-strict` passes (or until you've intentionally deferred items).

## Backlog sync (lane tasks from repo state)

Lane tasks can be kept consistent with repo state (artifacts + baseline validation) via:
- `just backlog-sync`

This script auto-manages lane tasks by adding a `task_sync_key:` in the Description block and updating task status based on whether lane map/dossier/repro artifacts exist and pass `just validate-md`.
