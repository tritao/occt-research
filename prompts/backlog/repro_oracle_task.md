# Repro + oracle task prompt (OCCT)

Use this prompt when working on a **type:repro** and/or **type:oracle** Backlog task.

Rules:
- Do not modify anything under `occt/`.
- Keep runnable work under `repros/<slug>/`.
- Keep non-runnable writeups in `notes/dossiers/` (or task notes).
- Prefer small, deterministic outputs (text/JSON) over screenshots or GUIs.

Workflow:
1) Read the task, then add an “Implementation plan” section to the task via Backlog MCP.
2) Define the “oracle outputs” first:
   - what you will record (e.g., counts, classifications, tolerances hit, warnings)
   - what constitutes a match (exact vs tolerance-based)
3) Create/extend `repros/<slug>/README.md` with:
   - prerequisites (how to build/run)
   - how to generate outputs from OCCT (“oracle”)
   - how to validate results (expected output shape)
4) Store oracle outputs in a stable format under `repros/<slug>/golden/` (recommended: JSON).
5) Summarize into the task notes:
   - what the repro covers
   - what is *not* covered yet
   - next smallest extension

Acceptance criteria checklist (suggested):
- [ ] `repros/<slug>/README.md` exists/updated with run steps
- [ ] Oracle outputs stored under `repros/<slug>/golden/` (if requested)
- [ ] Match criteria documented (exact vs tolerant)
- [ ] Task plan added before changes
