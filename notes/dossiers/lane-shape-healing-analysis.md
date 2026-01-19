# Dossier: Shape healing + analysis (ShapeFix / ShapeAnalysis / ShapeUpgrade)

Status: draft

## Purpose

Capture the “shape healing” toolkit that sits between raw/topologically-valid OCCT shapes and downstream algorithms that assume cleaner inputs (booleans, meshing, exchange). This dossier focuses on (1) how fixing is structured (facades and per-entity tools), (2) how tolerances are inspected/limited, and (3) how upgrades record modifications through a context / reshape mechanism.

## Mental model (human-first)

This lane is the “make it usable” layer that sits between real-world inputs and strict modeling algorithms. The key pattern is:
- **Analyze** a shape to find defects (gaps, small edges, inconsistent orientation, tolerance issues).
- **Fix** using a staged pipeline (whole shape → faces → wires → edges).
- **Record modifications** so callers can understand and post-process what changed.

In OCCT, fixes are rarely “silent”. The system tends to expose:
- statuses/flags (“done”, “failed”, etc.)
- a *reshape* mapping (old subshape → new subshape) so downstream code can update references

If you’re seeing booleans/meshing/exchange failures, this lane is often the pragmatic first stop: heal enough for the downstream algorithm to have a clean topological/parametric substrate.

## Provenance (required)

- OCCT version + build config: `notes/maps/provenance.md`
- Evidence sources are cited inline in this dossier (file paths under `occt/src/`).

## Scenario + observable outputs (required)

- Scenario: run shape healing over an imported shape and inspect what was changed.
- Observable outputs: DONE/FAIL status flags; messages via registrator; tolerance scans via `ShapeAnalysis_ShapeTolerance`.
- Success criteria: fixes surface as explicit status/messages and are reproducible.

## Walkthrough (repro-driven)

1) Run: `bash repros/lane-shape-healing-analysis/run.sh`
2) Inspect the oracle output: `repros/lane-shape-healing-analysis/golden/shape-healing.json`
3) Use it to reason about what “healing” means mechanically:
   - Inputs + policy: `params.gap_y`, `params.max_tolerance`, `params.precision_confusion`
   - Before/after observables:
     - Gap distance: `before.gap` → `after.gap`
     - Topological closure: `before.topo_closed` → `after.topo_closed`
     - Tolerances adjusted as part of the fix: `before.v_first_tolerance` / `before.v_last_tolerance` vs after
   - Fix outcomes:
     - Which steps did anything: `fix.fix_connected_return`, `fix.fix_closed_return`
     - Status interpretation: `fix.status_connected` and `fix.status_closed` (DONE/FAIL/OK flags)

## Spine (call chain) (required)

1) `occt/src/ShapeFix/ShapeFix_Shape.hxx` — `ShapeFix_Shape::Perform` (high-level façade)
2) `occt/src/ShapeFix/ShapeFix_Face.hxx` — `ShapeFix_Face::Perform` (face/wire fixes)
3) `occt/src/ShapeFix/ShapeFix_Wire.hxx` — `ShapeFix_Wire::Perform` (wire repair pipeline)
4) `occt/src/ShapeAnalysis/ShapeAnalysis_ShapeTolerance.hxx` — `ShapeAnalysis_ShapeTolerance::Tolerance` (tolerance scan)
5) `occt/src/ShapeBuild/ShapeBuild_ReShape.hxx` — `ShapeBuild_ReShape::Apply` (recorded substitutions)

## High-level pipeline

- Inspect tolerances and hotspots: `ShapeAnalysis_ShapeTolerance` computes min/max/avg tolerances over sub-shapes and can return the sub-shapes over / within a tolerance threshold. (`occt/src/ShapeAnalysis/ShapeAnalysis_ShapeTolerance.hxx`)
- Apply fixing at increasing granularity:
  - `ShapeFix_Shape` is a general façade that iterates on sub-shapes and delegates to specific fix tools (solid/shell/face/wire/edge). (`occt/src/ShapeFix/ShapeFix_Shape.hxx`)
  - Fix tools are parametrized by a shared “root” that carries precision + min/max tolerance bounds, optional context for recording substitutions, and a message registrator. (`occt/src/ShapeFix/ShapeFix_Root.hxx`)
  - Typical fixing decisions operate via: (a) increasing tolerances, (b) changing topology, or (c) changing geometry (explicitly documented for wire fixing). (`occt/src/ShapeFix/ShapeFix_Wire.hxx`)
- Apply upgrades / controlled splitting: `ShapeUpgrade_ShapeDivide` can split faces in shells under criteria, tracks modifications in a `ShapeBuild_ReShape` context, and reports DONE/FAIL statuses. (`occt/src/ShapeUpgrade/ShapeUpgrade_ShapeDivide.hxx`, `occt/src/ShapeBuild/ShapeBuild_ReShape.hxx`)
- Report what happened: the shape-healing toolchain uses bit-like DONE/FAIL flags via `ShapeExtend_Status`, which can be queried after operations like `Perform()` / `Apply()`. (`occt/src/ShapeExtend/ShapeExtend_Status.hxx`)

## Key classes/files

- `occt/src/ShapeFix/ShapeFix_Root.hxx` — `ShapeFix_Root` (shared precision + tolerance limits; context + messaging)
- `occt/src/ShapeFix/ShapeFix_Shape.hxx` — `ShapeFix_Shape::Perform` (high-level “fix the shape” façade + mode flags)
- `occt/src/ShapeFix/ShapeFix_Face.hxx` — `ShapeFix_Face::Perform` (face/wire repairs: orientation, missing seam, natural bounds, small area wires)
- `occt/src/ShapeFix/ShapeFix_Wire.hxx` — `ShapeFix_Wire::Perform` (wire repair strategy and ordering; topology/geometry modification modes; pcurve/3d curve fixes)
- `occt/src/ShapeAnalysis/ShapeAnalysis_ShapeTolerance.hxx` — `ShapeAnalysis_ShapeTolerance` (min/max/avg; sub-shape filtering by tolerance)
- `occt/src/ShapeUpgrade/ShapeUpgrade_ShapeDivide.hxx` — `ShapeUpgrade_ShapeDivide::Perform` / `GetContext()` (face splitting + recorded modifications)
- `occt/src/ShapeBuild/ShapeBuild_ReShape.hxx` — `ShapeBuild_ReShape::Apply` / `Status` (apply recorded substitutions; DONE/FAIL reporting)
- `occt/src/ShapeExtend/ShapeExtend_Status.hxx` — `ShapeExtend_Status` (DONE#/FAIL# flag vocabulary)

## Core data structures + invariants

- Structure: `ShapeFix_Root` (`occt/src/ShapeFix/ShapeFix_Root.hxx`)
  - Shared parameterization: fix tools inherit precision (`SetPrecision`/`Precision`) and tolerance bounds (`SetMinTolerance`/`SetMaxTolerance`, `LimitTolerance`). This suggests a design invariant: “repairs should not silently exceed configured bounds”. (`ShapeFix_Root::LimitTolerance`)
  - Optional “context”: a `ShapeBuild_ReShape` can be attached to record and later apply substitutions, allowing multi-step repairs to compose and be replayed. (`ShapeFix_Root::SetContext`, `ShapeFix_Root::Context`)
  - Message channel: fix operations can attach messages with gravity (info/warning/fail) through a registrator. (`ShapeFix_Root::SendMsg`, `ShapeFix_Root::SetMsgRegistrator`)

- Structure: `ShapeFix_Shape` (`occt/src/ShapeFix/ShapeFix_Shape.hxx`)
  - Delegation tree: exposes accessors to per-entity tools (`FixSolidTool`, `FixShellTool`, `FixFaceTool`, `FixWireTool`, `FixEdgeTool`) and mode flags to enable/disable broad categories of fixes. (`ShapeFix_Shape::*Tool`, `ShapeFix_Shape::*Mode`)
  - Post-fix parameterization: includes a protected `SameParameter()` helper that fixes “same parameterization” issues by updating tolerances of corresponding topological entities (indicating a common repair step after geometry/topology edits). (`ShapeFix_Shape::SameParameter`, `FixSameParameterMode`)

- Structure: `ShapeFix_Wire` (`occt/src/ShapeFix/ShapeFix_Wire.hxx`)
  - Explicit repair mechanisms: wire fixing is documented as choosing among tolerance increases, topology changes, or geometry changes; this choice is gated by modes such as `ModifyTopologyMode` and `ModifyGeometryMode`. (Class comment; `ShapeFix_Wire::ModifyTopologyMode`, `ShapeFix_Wire::ModifyGeometryMode`)
  - Ordered “public-level” repair sequence: `Perform()` documents a default ordering (`FixReorder` → `FixSmall` → `FixConnected` → `FixEdgeCurves` → `FixDegenerated` → `FixSelfIntersection` → `FixLacking`) with conditional execution depending on wire ordering and modes. (`ShapeFix_Wire::Perform` comment)
  - Curve/pcurve repair grouping: `FixEdgeCurves()` groups 3D/pcurve-related fixes in a documented order, including pcurve add/remove, seam fixing, shifted pcurves, and same-parameter enforcement. (`ShapeFix_Wire::FixEdgeCurves` comment)

- Structure: `ShapeUpgrade_ShapeDivide` (`occt/src/ShapeUpgrade/ShapeUpgrade_ShapeDivide.hxx`)
  - Context as a first-class output: after `Perform()`, `GetContext()` returns a `ShapeBuild_ReShape` containing recorded modifications, suggesting an invariant that upgrades should be traceable and replayable. (`ShapeUpgrade_ShapeDivide::GetContext`, `ShapeUpgrade_ShapeDivide::SetContext`)

## Tolerance / robustness behaviors (observed)

- Tolerance inspection patterns: `ShapeAnalysis_ShapeTolerance::Tolerance` returns min/max/avg over sub-shapes depending on `mode` and supports restricting the scan to specific sub-shape types. (`occt/src/ShapeAnalysis/ShapeAnalysis_ShapeTolerance.hxx`)
- Tolerance bounds as an explicit policy: `ShapeFix_Root` stores min/max tolerance and provides `LimitTolerance()` to clamp a tolerance into the configured bounds. (`occt/src/ShapeFix/ShapeFix_Root.hxx`)
- Precision drives detection thresholds: many fix routines are documented as using “precision” to detect gaps and decide whether to add edges / increase tolerance (e.g., `ShapeFix_Wire::FixGaps3d`, `ShapeFix_Wire::FixGaps2d`). (`occt/src/ShapeFix/ShapeFix_Wire.hxx`)
- Hardcoded heuristics appear at the tool boundary: `ShapeFix_Face::FixSmallAreaWire` documents detecting “small area wires” with area less than `100*Precision::PConfusion()` and removing those internal wires (optionally removing faces with small outer wires). (`occt/src/ShapeFix/ShapeFix_Face.hxx`)
- Status reporting is bitwise-like: tools query outcomes via `Status(ShapeExtend_Status)` with DONE/FAIL flags; this is shared across fixers (`ShapeFix_Shape`, `ShapeFix_Face`), reshapers (`ShapeBuild_ReShape`), and upgraders (`ShapeUpgrade_ShapeDivide`). (`occt/src/ShapeExtend/ShapeExtend_Status.hxx`, `occt/src/ShapeBuild/ShapeBuild_ReShape.hxx`)

## Failure modes + diagnostics (recommended)

- Fix did nothing (`fix.*_return=false` and DONE flags not set): either the defect is outside the tool’s scope (e.g., needs on-face pcurve fixes) or the defect exceeds configured bounds (precision/tolerance).
- Gap closes but tolerances balloon: healing may “solve” a gap by increasing tolerances; always record and audit tolerance changes (`v_*_tolerance`) before using the result in downstream modeling.
- Downstream algorithms still fail after healing: check whether the remaining issues are geometric (pcurves/seams) vs topological (connectivity/orientation); `ShapeFix_Wire` is only one piece of the stack.

## Runnable repro (optional)

- Path: `repros/lane-shape-healing-analysis/README.md`
- How to run: `repros/lane-shape-healing-analysis/run.sh`
- Oracle outputs: `repros/lane-shape-healing-analysis/golden/shape-healing.json`

## Compare to papers / alternatives

- STEP “healing” toolchains (commercial CAD kernels / exchange pipelines): often provide aggressive model repairs with proprietary heuristics and domain knowledge about importers; OCCT exposes a composable set of fix steps with explicit mode flags and explicit tolerance/precision parameters.
- Mesh repair libraries (e.g., manifold enforcement, self-intersection removal): can make downstream mesh booleans/meshing stable, but do not preserve B-Rep parametric intent (pcurves/seams/face boundaries) that OCCT’s `ShapeFix_*` tools operate on.
- Exact topology repair approaches (arrangements/exact arithmetic): can be more correct under degeneracies but are substantially heavier; OCCT’s shape healing relies on configured tolerances + targeted heuristics (gap fixing, seam fixes, tolerance limiting) and exposes status reporting for iterative workflows.
