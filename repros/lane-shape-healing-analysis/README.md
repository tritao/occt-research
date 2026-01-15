# Repro: lane-shape-healing-analysis

## Goal

Exercise OCCT “shape healing” primitives in a deterministic way by creating a nearly-closed wire with a small gap and attempting to close it using `ShapeFix_Wire`.

Oracle outputs focus on:

- start/end vertex gap distance (before/after)
- whether the wire is topologically closed (same first/last vertex)
- `ShapeFix_Wire::FixClosed` status bits

## Preconditions

- OCCT build exists and includes `TKShHealing` (run `just occt-build` if needed).

## How to run (OCCT oracle)

From repo root:

- `just occt-build`
- `bash repros/lane-shape-healing-analysis/run.sh`

## Outputs

- Output files:
  - `repros/lane-shape-healing-analysis/golden/shape-healing.json`
- Match criteria:
  - exact: all strings, bools
  - tolerant: all floating-point fields (gap distances, tolerances), compare within `eps = 1e-9`
