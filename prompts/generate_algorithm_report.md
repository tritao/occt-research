# Generate OCCT algorithm report (prose + evidence)

Goal: produce a human-readable algorithm writeup like “Fillet and Chamfer Algorithm (ChFi3d)” that is:
- phase-oriented (pipeline narrative),
- structure-oriented (core DS types + invariants),
- failure-oriented (status codes + how to debug),
- and backed by runnable evidence (repro + oracle JSON when possible).

Hard rules:
- Never modify anything under `occt/` (read-only).
- Prefer outputs in `notes/dossiers/` and `notes/walkthroughs/`.
- Cite file paths under `occt/src/` when making claims.

Inputs (ask if missing):
- Algorithm name (e.g. “fillets”, “booleans”).
- 1–3 entry points (classes/functions) OR lane slug (`notes/maps/lanes.md`).
- Optional: a repro oracle JSON path to treat as ground truth.

Workflow (systematic):
1) **Start from evidence**:
   - Run/inspect the repro oracle (or create a minimal repro if missing).
   - Record what the algorithm exposes as statuses/errors and what’s observable (counts/bbox/validity).
2) **Map entry points to code**:
   - Public API entry headers (e.g. `BRepFilletAPI_MakeFillet.hxx`).
   - Internal builder/orchestrator class (e.g. `ChFi3d_*Builder`).
3) **Extract “shape of the algorithm”**:
   - Identify phases and the primary loop(s): walking, intersection, splitting, building, etc.
   - Write 3–6 phases, each with: goal, inputs/outputs, key files.
4) **Extract core data structures**:
   - For each DS type: what it stores, what invariants it expects, how failures manifest.
   - Prefer: class-level comments and enums (error/status types).
5) **Explain failure modes as first-class**:
   - Make a table: failure mode → phase → status/exception → next debug step.
6) **Make it runnable**:
   - Tie at least 3 oracle fields back to code phases (why that field exists; what it tells you).

Scaffolding helper:
- Generate a starting draft with:
  - `just algo-report fillets "Fillet and Chamfer Algorithm (ChFi3d)"`
  - then fill in the draft using the workflow above.

Done when:
- A human can read it and answer: “what are the phases, what are the key DS, what fails, what do I check first?”

