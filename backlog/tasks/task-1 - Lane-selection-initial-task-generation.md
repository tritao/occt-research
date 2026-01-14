---
id: task-1
title: Lane selection + initial task generation
status: To Do
assignee: []
created_date: '2025-12-25 03:32'
updated_date: '2025-12-25 03:34'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Generate the initial lane list and seed the backlog with lane map+dossier tasks per `prompts/backlog/task_generation.md`.

Primary artifact:
- `notes/maps/lanes.md` (lane list + entry packages, derived from existing maps)

This task is responsible for creating the initial Backlog.md tasks (map + dossier) and milestones/labels/dependencies that reference that lane list.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `notes/maps/lanes.md` exists and lists lanes with 1–2 sentence descriptions and 3–5 entry packages each, citing at least one supporting artifact under `notes/maps/` per lane.
- [ ] #2 Backlog has one milestone (or parent task) per lane and exactly two tasks per lane: `type:map` and `type:dossier`.
- [ ] #3 Each `type:dossier` task depends on its corresponding `type:map` task.
- [ ] #4 All lane tasks reference `prompts/backlog/map_task.md` or `prompts/backlog/dossier_task.md` instead of duplicating workflow instructions.
- [ ] #5 All tasks are labeled with `lane:<slug>` and `type:<map|dossier>`.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Confirm/refresh `notes/maps/lanes.md` against `notes/maps/packages.md` + include graphs (core + exchange/vis).
2) Create milestones `Lane: <slug>` for each lane in `notes/maps/lanes.md`.
3) For each lane, create two tasks:
   - `Map: lane:<slug>` labeled `lane:<slug>`, `type:map`, milestone `Lane: <slug>`, description references `prompts/backlog/map_task.md` and names output file under `notes/maps/`.
   - `Dossier: lane:<slug>` labeled `lane:<slug>`, `type:dossier`, milestone `Lane: <slug>`, depends on the map task, description references `prompts/backlog/dossier_task.md` and names output file under `notes/dossiers/` (optional repro under `tools/repros/...`).
4) Update `task-1` with links/IDs of created tasks and check acceptance criteria.
5) Mark `task-1` Done once lane tasks exist and dependencies/labels are correct.
<!-- SECTION:PLAN:END -->
