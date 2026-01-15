---
id: task-2
title: 'Dossier: TopoDS_Shape + BRep_Tool area report'
status: Done
assignee: []
created_date: '2025-12-25 03:41'
updated_date: '2026-01-15 00:33'
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

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dossier exists at notes/dossiers/topology-brep-tool.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Locate TopoDS_Shape and BRep_Tool definitions and key call paths in occt source.
2) Extract pipeline, data structures/invariants, and tolerance/robustness behaviors with file/class citations.
3) If a repro is needed, create a minimal runnable repro under `repros/topology-brep-tool/` exercising TopoDS_Shape + BRep_Tool.
4) Fill `notes/dossiers/topology-brep-tool.md` from `notes/dossiers/_template.md` with required sections and citations.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Verified existing dossier at `notes/dossiers/topology-brep-tool.md`.
- Evidence sources: `occt/src/TopoDS/TopoDS_Shape.hxx`, `occt/src/TopoDS/TopoDS_TShape.hxx`, `occt/src/BRep/BRep_Tool.hxx`, `occt/src/BRep/BRep_Tool.cxx`, `occt/src/TopLoc/TopLoc_Location.hxx`, `occt/src/Precision/Precision.hxx`.
- Repro not created (optional); can add later under `repros/topology-brep-tool/`.
<!-- SECTION:NOTES:END -->
