# Generate OCCT area report (dossier)

Goal: produce a single dossier-style research report for a given OCCT area (package/subsystem) with concrete code citations.

Hard rules:
- Do not modify anything under `occt/` (read-only).
- Write output to `notes/dossiers/<slug>.md` using `notes/dossiers/_template.md` as the structure.
- When writing notes, cite **file paths** and **class/function names** used.
 - Fill “Provenance”, “Scenario + observable outputs”, and “Spine (call chain)” sections (required in the template).

Inputs you must ask the user for (or infer from the task):
- Area scope: 1-3 entry symbols (preferred) and/or 1-3 packages.
- Desired output slug: `<slug>` for the dossier filename.

Workflow:
1) Identify the entry points (classes/functions) and locate their definitions and key call paths.
2) Summarize the high-level pipeline (phases + data flow).
3) Extract core data structures + invariants (as inferred from code).
4) Note tolerance/robustness behaviors observed (epsilons, fuzzy tolerances, fallback paths, error handling).
6) Fill `notes/dossiers/<slug>.md` using the template, keeping it concise and evidence-based.

Done when:
- The dossier follows the template and includes citations.
