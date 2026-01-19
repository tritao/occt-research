# Dossier: Booleans (BOPAlgo / BOPDS / BRepAlgoAPI)

Status: draft

## Purpose

Capture OCCT’s Boolean Operations (“BOP”) subsystem at a practical level: the separation between (1) intersection / splitting, (2) data structure storage of intersections and “same domain” groupings, and (3) building/assembling final results (fuse/common/cut/section). Focus is on the shape-level API contracts and the robustness knobs surfaced through this stack.

## Mental model (human-first)

OCCT booleans are not “one algorithm”; they are a **pipeline** that turns two sets of shapes into a new topology graph. The two most important phases are:

1) **Intersection + splitting**: compute intersections between arguments, create “paves” (split points), and split edges/faces so that the result can be assembled from compatible pieces.
2) **Build result**: classify pieces as IN/OUT/ON and stitch the kept pieces into a valid result shape.

The hard part is robustness: almost everything is tolerance-driven, and the system exposes a report mechanism so you can see warnings/failures rather than guessing. When debugging, you usually want to answer:
- Did we successfully compute and store intersections?
- Did splitting produce consistent sub-edges/sub-faces?
- Did classification choose the expected pieces?

## Provenance (required)

- OCCT version + build config: `notes/maps/provenance.md`
- Evidence sources are cited inline in this dossier (file paths under `occt/src/`).

## Scenario + observable outputs (required)

- Scenario: fuse two solids that partially overlap.
- Observable outputs: warning/error alerts in `BOPAlgo_Options` report; counts of result solids/faces/edges.
- Success criteria: result is non-null; no fail alerts; stable topology counts within tolerance expectations.

## Walkthrough (repro-driven)

1) Run: `bash repros/lane-booleans/run.sh`
2) Inspect the oracle output: `repros/lane-booleans/golden/booleans.json`
3) Read it as “is the pipeline healthy?” signals:
   - Inputs sanity: `inputs.*.bbox` should match the constructed operands.
   - Per operation (`ops.fuse`, `ops.common`, `ops.cut`):
     - Health: `has_errors=false` and `has_warnings=false`
     - Validity: `is_valid=true` (via `BRepCheck_Analyzer`)
     - Topology size proxies: `counts.{solids,faces,edges,vertices}`
     - Geometry envelope: `bbox` should match the expected extents of the boolean result.

## Spine (call chain) (required)

1) `occt/src/BRepAlgoAPI/BRepAlgoAPI_BooleanOperation.hxx` — `BRepAlgoAPI_BooleanOperation::Build` (API entrypoint)
2) `occt/src/BRepAlgoAPI/BRepAlgoAPI_BuilderAlgo.hxx` — `BRepAlgoAPI_BuilderAlgo::IntersectShapes` / `BuildResult` (orchestration)
3) `occt/src/BOPAlgo/BOPAlgo_PaveFiller.hxx` — `BOPAlgo_PaveFiller::PerformInternal` (intersection + splitting)
4) `occt/src/BOPAlgo/BOPAlgo_BOP.hxx` — `BOPAlgo_BOP::Perform` (build phase)
5) `occt/src/BOPAlgo/BOPAlgo_Options.hxx` — `BOPAlgo_Options::GetReport` (warnings/errors)

## High-level pipeline

- API layer: `BRepAlgoAPI_BooleanOperation` (and convenience wrappers like `BRepAlgoAPI_Fuse`) define the Objects/Tools split and the chosen operation type (fuse/common/cut/section). (`occt/src/BRepAlgoAPI/BRepAlgoAPI_BooleanOperation.hxx`, `occt/src/BRepAlgoAPI/BRepAlgoAPI_Fuse.hxx`)
- General Fuse API glue: `BRepAlgoAPI_BuilderAlgo` orchestrates the overall run, owns the intersection tool (`myDSFiller`) and builder (`myBuilder`), and exposes user-visible options like non-destructive mode, glue mode, inverted-solid checking, and history collection. (`occt/src/BRepAlgoAPI/BRepAlgoAPI_BuilderAlgo.hxx`)
- Intersection phase (“DS filler”): `BOPAlgo_PaveFiller` performs pairwise intersection in a fixed order (VV, VE, EE, VF, EF, FF) and stores results into the Boolean data structure. (`occt/src/BOPAlgo/BOPAlgo_PaveFiller.hxx`)
- Data structure: `BOPDS_DS` stores arguments, per-shape info/ranges (“rank”), pave blocks and face state pools, “same domain” collections, and multiple interference tables; it initializes with a fuzz parameter defaulted to `Precision::Confusion()`. (`occt/src/BOPDS/BOPDS_DS.hxx`)
- Build phase: `BOPAlgo_BOP` consumes prepared intersection results (via `BOPAlgo_PaveFiller`) and assembles the final result according to the chosen Boolean operation; special handling exists for empty shapes and for solids building. (`occt/src/BOPAlgo/BOPAlgo_BOP.hxx`)
- Reporting: shared options infrastructure (`BOPAlgo_Options`) provides warning/error aggregation via `Message_Report` and exposes fuzzy tolerance, parallel mode, and OBB filtering toggles used by Boolean-component algorithms. (`occt/src/BOPAlgo/BOPAlgo_Options.hxx`)

## Key classes/files

- `occt/src/BRepAlgoAPI/BRepAlgoAPI_BooleanOperation.hxx` — `BRepAlgoAPI_BooleanOperation::Build` (root API for boolean ops; sets operation type; uses Objects/Tools split)
- `occt/src/BRepAlgoAPI/BRepAlgoAPI_BuilderAlgo.hxx` — `BRepAlgoAPI_BuilderAlgo` (orchestration; `SetNonDestructive`, `SetGlue`, `SetCheckInverted`, history toggles; access to DS filler + builder)
- `occt/src/BOPAlgo/BOPAlgo_PaveFiller.hxx` — `BOPAlgo_PaveFiller` (intersection + splitting; writes into DS; exposes section attributes + non-destructive + glue + p-curve handling)
- `occt/src/BOPAlgo/BOPAlgo_BOP.hxx` — `BOPAlgo_BOP` (build/assembly for fuse/common/cut with Objects/Tools grouping rules; `TreatEmptyShape`, `BuildSolid`)
- `occt/src/BOPDS/BOPDS_DS.hxx` — `BOPDS_DS::Init` (DS initialization with fuzz default `Precision::Confusion()`; central storage for pools + interferences)
- `occt/src/BOPAlgo/BOPAlgo_Options.hxx` — `BOPAlgo_Options` (reporting; `SetFuzzyValue`, `SetRunParallel`, `SetUseOBB`)

## Core data structures + invariants

- Structure: `BOPDS_DS` (`occt/src/BOPDS/BOPDS_DS.hxx`)
  - Arguments + shape catalog: a single DS instance holds the input argument list plus a growing catalog of shapes/sub-shapes (source and newly created). (`BOPDS_DS::SetArguments`, `BOPDS_DS::Append`, `BOPDS_DS::NbShapes`)
  - Index ranges (“rank”): each argument (and its sub-shapes) occupy a defined index range and expose a “rank” query for provenance/group association. (`BOPDS_DS::Range`, `BOPDS_DS::Rank`, `BOPDS_DS::NbRanges`)
  - Pools with cross-links:
    - edge split representation via pave blocks and (optional) common blocks, with explicit update hooks. (`BOPDS_DS::PaveBlocksPool`, `BOPDS_DS::UpdatePaveBlocks`, `BOPDS_DS::UpdateCommonBlock`)
    - face state pool with explicit “In/On” update and query APIs. (`BOPDS_DS::FaceInfoPool`, `BOPDS_DS::UpdateFaceInfoIn`, `BOPDS_DS::UpdateFaceInfoOn`)
  - Interference tables: DS maintains multiple typed collections for VV/VE/VF/EE/EF/FF and related interference categories. (Documented in the DS overview comment; e.g. `myInterfVV`..`myInterfFF` in `occt/src/BOPDS/BOPDS_DS.hxx`)

- Structure: `BOPAlgo_PaveFiller` (`occt/src/BOPAlgo/BOPAlgo_PaveFiller.hxx`)
  - Ordered intersection pipeline: performs pairwise intersections in the documented shape-type order (VV → … → FF) and persists results into the DS owned by the Boolean component. (Class comment)
  - Splitting semantics: explicitly splits edge “pave blocks” based on computed paves and may create “same domain” vertices when valid ranges are absent. (`BOPAlgo_PaveFiller::SplitPaveBlocks` comment, `BOPAlgo_PaveFiller::AnalyzeShrunkData` comment)

## Tolerance / robustness behaviors (observed)

- DS fuzz default: `BOPDS_DS::Init` defaults the fuzz parameter to `Precision::Confusion()`, implying a baseline “touching/coincidence” slack at DS initialization level unless overridden by caller. (`occt/src/BOPDS/BOPDS_DS.hxx`)
- Fuzzy tolerance as an explicit knob: `BOPAlgo_Options` exposes `SetFuzzyValue` / `FuzzyValue()` as an “additional tolerance … to detect touching or coinciding cases”, orthogonal to per-shape tolerances. (`occt/src/BOPAlgo/BOPAlgo_Options.hxx`)
- Non-destructive (safe) processing:
  - API contract: `BRepAlgoAPI_BuilderAlgo::SetNonDestructive` states that in non-destructive mode inputs are not modified; instead copies are created in the result when updates are needed. (`occt/src/BRepAlgoAPI/BRepAlgoAPI_BuilderAlgo.hxx`)
  - Intersection tool auto-switch: `BOPAlgo_PaveFiller::SetNonDestructive()` (no-arg) is documented to enable non-destructive mode automatically when an argument contains a locked sub-shape (`TopoDS_Shape::Locked()`). (`occt/src/BOPAlgo/BOPAlgo_PaveFiller.hxx`)
- Gluing mode: both API (`BRepAlgoAPI_BuilderAlgo::SetGlue`) and intersection implementation (`BOPAlgo_PaveFiller::SetGlue`) describe a glue option intended to speed up special cases where sub-shapes coincide. (`occt/src/BRepAlgoAPI/BRepAlgoAPI_BuilderAlgo.hxx`, `occt/src/BOPAlgo/BOPAlgo_PaveFiller.hxx`)
- P-curve/section handling: `BOPAlgo_PaveFiller` documents “section attributes” that can avoid approximation or building 2D curves; it also exposes `SetAvoidBuildPCurve` / `IsAvoidBuildPCurve` as a concrete toggle. (`occt/src/BOPAlgo/BOPAlgo_PaveFiller.hxx`)
- Inverted solid checking: `BRepAlgoAPI_BuilderAlgo::SetCheckInverted` documents that disabling this check for inverted solids “most likely will lead to incorrect results.” (`occt/src/BRepAlgoAPI/BRepAlgoAPI_BuilderAlgo.hxx`)
- Warning/error surface from intersection: `BOPAlgo_PaveFiller` documents a set of warning alerts (self-interference, too small/not splittable edges, bad positioning, intersection failures, acquired self-intersection, p-curve building failures) and error alerts (too few arguments, intersection failed, null input shapes). (`occt/src/BOPAlgo/BOPAlgo_PaveFiller.hxx`)
- Build-phase validations: `BOPAlgo_BOP` adds build-phase specific error/warning alerts around invalid operation type, disallowed operation on inputs, empty shapes, and solid-building failures. (`occt/src/BOPAlgo/BOPAlgo_BOP.hxx`)

## Failure modes + diagnostics (recommended)

- `has_errors=true`: treat this as “intersection/splitting failed”; the next step is to inspect the underlying `Message_Report` (surfaced via `BOPAlgo_Options`) and consider healing inputs first (`ShapeFix_*`).
- `is_valid=false`: the boolean produced a result but it violates B-Rep validity checks; common causes are tolerance mismatches, tiny edges, and inconsistent same-domain decisions.
- Topology counts change unexpectedly between runs: look for parallelism/ordering changes and tolerance knobs (`SetFuzzyValue`, glue mode); booleans are sensitive to small numeric differences.

## Runnable repro (optional)

- Path: `repros/lane-booleans/README.md`
- How to run: `repros/lane-booleans/run.sh`
- Oracle outputs: `repros/lane-booleans/golden/booleans.json`

## Compare to papers / alternatives

- Exact/robust kernels (e.g. CGAL exact kernels / Nef polyhedra): prioritize exact predicates and topological correctness under degeneracies, usually at significant runtime and implementation cost; OCCT’s BOP stack instead uses floating arithmetic + tolerance vocabulary (`Precision::Confusion()`, “fuzzy value”) and a healing/robustness toolchain around those choices.
- Polygon-mesh booleans (triangle mesh CSG): easier to implement and often faster for visualization pipelines, but do not preserve exact B-Rep geometry/topology and can create noisy or non-manifold results without heavy post-processing; OCCT targets B-Rep topology + geometry continuity.
- Voxel / SDF booleans: naturally robust against degeneracies and good for “solid modeling” operations, but lose exact boundaries and require resolution management; OCCT’s approach aims for exact curve/surface boundaries with tolerance-managed robustness.
