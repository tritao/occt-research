# Walkthrough: Shape healing + analysis (closing gaps)

This walkthrough shows what “healing” looks like mechanically: detect a defect, apply a fix, and observe tolerance changes.

Repro + oracle: `notes/walkthroughs/shape-healing-analysis-cases.md`.

## What to look at

- `before.gap` → `after.gap` (did we actually close the gap?)
- `before.topo_closed` → `after.topo_closed` (topological closure)
- `after.v_first_tolerance` / `after.v_last_tolerance` (what tolerances changed to make it “work”?)
- `fix.status_*` (DONE/FAIL/OK flags)
