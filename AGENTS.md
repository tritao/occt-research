# Agent instructions (OCCT research)

## Hard rules
- Treat `./occt` as READ-ONLY. Never modify upstream OCCT files.
- Put all outputs in:
  - `./notes` (maps + dossiers)
  - `./tools` (scripts)
  - `./oracles` (runnable OCCT experiments)
- When writing notes, cite **file paths** and **class/function names** you used.
- Prefer small reproducible scripts over long prose.
- Every dossier MUST include:
  - Purpose + high-level pipeline
  - Key classes/files (paths)
  - Core data structures + invariants (as inferred)
  - Tolerance/robustness behaviors observed in code
  - One runnable repro under `./oracles/`
  - “Compare to papers / alternatives” section

## Backlog.md workflow
- Use Backlog.md tasks as the source of truth.
- Before implementing a task, add a concrete implementation plan in the task file.
- Keep tasks small: one “map”, one “oracle”, one “dossier” per task when possible.
