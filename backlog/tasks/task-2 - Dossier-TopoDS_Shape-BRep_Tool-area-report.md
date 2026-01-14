---
id: task-2
title: 'Dossier: TopoDS_Shape + BRep_Tool area report'
status: To Do
assignee: []
created_date: '2025-12-25 03:41'
updated_date: '2025-12-25 03:41'
labels:
  - dossier
  - occt
  - area-report
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Generate area report using `prompts/generate_dossier.md` for TopoDS_Shape and BRep_Tool. Output dossier slug: topology-brep-tool.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Locate TopoDS_Shape and BRep_Tool definitions and key call paths in occt source.
2) Extract pipeline, data structures/invariants, and tolerance/robustness behaviors with file/class citations.
3) If a repro is needed, create a minimal runnable repro under `tools/repros/topology-brep-tool/` exercising TopoDS_Shape + BRep_Tool.
4) Fill `notes/dossiers/topology-brep-tool.md` from `notes/dossiers/_template.md` with required sections and citations.
<!-- SECTION:PLAN:END -->
