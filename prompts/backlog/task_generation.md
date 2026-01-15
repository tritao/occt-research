# OCCT task generation (systematic, lane-based)

Purpose: generate a complete, repeatable initial backlog for OCCT research without missing major areas.

Pipeline:
1) Use OCCT’s module/toolkit taxonomy as the ground truth.
2) Cross-check with maps (`notes/maps/packages.md`, `notes/maps/include_graph.core.md`).
3) Define research lanes + entry packages (explicit output artifact).
4) For each lane, generate a map task and a dossier task.
5) Order tasks: maps -> dossiers; core lanes first.

Lane definition (derived, not pre-filled):
- Start from OCCT toolkits/modules and group them into lanes (avoid inventing categories without evidence).
- Use `notes/maps/toolkits.dot` and `notes/maps/cmake-targets.dot` to understand toolkit structure; use `notes/maps/packages.md` + include graphs to validate hotspots.
- Produce a lane list + entry package list as a repo artifact (e.g., `notes/maps/lanes.md`) and reference it from the backlog task.

Entry package selection:
- Use top packages by size and fan-in from `notes/maps/packages.md` and `notes/maps/include_graph.core.md`.
- For exchange/vis, use `notes/maps/include_graph.exchange_vis.md`.
- Pick 3-5 packages per lane; ensure each lane has at least one high fan-in package.

Task template per lane:
- Map task: “Generate lane-specific map + brief findings” (output under `notes/maps/`).
- Dossier task: “Write dossier for lane entry packages” (output under `notes/dossiers/`).
 - Repro/oracle task (optional but recommended): “Minimal runnable repro + oracle outputs” (output under `repros/`).
- For conciseness, tasks should reference `prompts/backlog/map_task.md` or `prompts/backlog/dossier_task.md` instead of duplicating workflow instructions.
- Use Backlog MCP tools (`task_create`, `task_edit`, `milestone_add`, etc.) for task creation/updates when available; fall back to CLI only if MCP isn’t available.

Acceptance criteria (for each task):
- References cite file paths and class/function names.
- Dossier includes: purpose + pipeline, key classes/files, data structures + invariants, tolerance/robustness notes, compare-to section, and (if needed) an optional runnable repro under `repros/...`.
- Repro/oracle tasks define match criteria and store outputs in a stable format (e.g., JSON).

Notes:
- Keep tasks small and independent.
- Avoid modifying `occt/` (read-only).

System plan (Backlog.md):
1) Create a milestone per lane (or a parent “Lane: <name>” task if milestones aren’t desired).
2) Add tasks per lane (either subtasks or linked tasks):
   - Map (`type:map`)
   - Dossier (`type:dossier`) depends on Map
   - Repro/oracle (`type:repro` / `type:oracle`) depends on Dossier (optional but recommended)
3) Add labels:
   - `lane:<slug>` where `<slug>` is kebab-case (e.g., `lane:topology`, `lane:booleans`, `lane:meshing`, `lane:data-exchange`).
   - `type:map`, `type:dossier`, `type:repro`, `type:oracle` as appropriate.
4) Add dependencies: dossier depends on map for the same lane.
5) Execute tasks in order: core lanes first, then exchange/vis.

Definition of done (lane list):
- Each lane has a 1-2 sentence description and 3-5 entry packages.
- Each lane cites at least one supporting artifact from `notes/maps/` (e.g., a hotspot edge from an include graph, or a toolkit from `toolkits.dot`).
- The lane list is written to `notes/maps/lanes.md` and referenced from the parent lane task/milestone notes.
