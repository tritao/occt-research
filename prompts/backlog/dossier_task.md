# Dossier task prompt (OCCT)

Use this prompt when working on a **type:dossier** Backlog task.

Rules:
- Do not modify anything under `occt/`.
- Keep research outputs in:
  - `notes/dossiers/` (the dossier itself)
  - `repros/` (optional runnable repros and oracle outputs)
- When writing notes, cite file paths and class/function names used.
- Keep dossiers auditable: separate “verified” claims (grounded in code) from hypotheses.
- Prefer using MCP tools:
  - Backlog MCP: view/update tasks, add implementation plan, update acceptance criteria.
  - occt-lsp MCP: symbol lookup (definition/references/hover) to validate interpretations.

Workflow:
1) Read the task, then add an “Implementation plan” section to the task via Backlog MCP.
2) Identify the entry points (classes/functions) and locate their definitions and key call paths.
3) Write down one concrete scenario + observable outputs (what you could measure/log/assert).
4) Build a short “spine” (5–15 symbols in approximate call order) to anchor the dossier.
5) Summarize the high-level pipeline (phases + data flow).
6) Extract core data structures + invariants (as inferred from code).
7) Note tolerance/robustness behaviors observed (epsilons, fuzzy tolerances, fallback paths, error handling).
8) Optionally capture failure modes/diagnostics (exceptions, warnings, alerts).
9) Write `notes/dossiers/<slug>.md` using `notes/dossiers/_template.md` (includes provenance + scenario + spine).
10) If a runnable repro / oracle outputs are required, add them under `repros/<slug>/` (README + run steps + golden outputs).
11) Summarize findings into the task notes (short, actionable bullets).

Acceptance criteria checklist (suggested):
- [ ] Dossier exists/updated under `notes/dossiers/`
- [ ] Claims cite file paths and class/function names
- [ ] Dossier includes: provenance + scenario + spine
- [ ] Task plan added before changes
- [ ] Optional repro + oracle outputs exist under `repros/...` (if requested)
