# Dossier: Fillets (BRepFilletAPI / ChFi3d / ChFiDS)

Status: draft

## Purpose

Capture how OCCT builds **solid/shell fillets** (and related edge blending) in a debuggable way: from selecting edges, through building tangent-edge contours, through the internal “stripe” data structures and surface construction, to assembling a resulting B-Rep and surfacing failure modes like “radius too big” vs “walking failure”.

This dossier focuses on **3D fillets on solids** via `BRepFilletAPI_MakeFillet` (constant radius in the repro), with pointers to chamfers where it clarifies the shared architecture.

## Mental model (human-first)

A fillet is not “one surface”. It is a **local remodeling operation** that replaces sharp edge regions with a smooth blend subject to tangency/continuity constraints:

- You pick one or more edges on a support shape.
- OCCT groups them into **contours** (chains of tangent edges).
- For each contour, it constructs one or more **blend surfaces** along a “spine” (the traced path of the contour).
- At vertices where multiple filleted edges meet, it must compute **corner patches** and ensure all adjacent pieces join with the requested continuity (typically G1 / C1).

The important debugging shift: treat filleting as a **pipeline with per-contour statuses**. The question is not “did it work”, but:

- Which contour failed?
- Did the builder even start (often “radius too big”)?
- Did it fail during walking/propagation along the contour?
- Did it compute a partial result (hole / missing corner fill)?

## Provenance (required)

- OCCT version + build config: `notes/maps/provenance.md`
- Evidence sources are cited inline in this dossier (file paths under `occt/src/`).

## Scenario + observable outputs (required)

- Scenario: fillet a box edge with a small radius (expected success), then attempt an oversized radius (expected failure).
- Observable outputs:
  - per-contour status: `BRepFilletAPI_MakeFillet::StripeStatus(IC)` (`ChFiDS_ErrorStatus`)
  - whether the builder is “done”: `BRepBuilderAPI_Command::IsDone()` (via `BRepFilletAPI_MakeFillet`)
  - partial result behavior: `HasResult()` / `BadShape()`
  - B-Rep validity: `BRepCheck_Analyzer::IsValid()` and topology counts/bbox as sanity checks
- Success criteria:
  - small-radius cases: `is_done=true`, `stripe_status=ChFiDS_Ok`, `is_valid=true`
  - oversized-radius case: `is_done=false` and `stripe_status` indicates start failure or other classified error

## Walkthrough (repro-driven)

1) Run: `bash repros/lane-fillets/run.sh`
2) Inspect the oracle output: `repros/lane-fillets/golden/fillets.json`
3) Read it as “per contour health” signals:
   - `build.is_done`: whether `Shape()` is available (if false, do not expect a result)
   - `build.nb_contours` and `build.contours[*].stripe_status_name`: which contour(s) failed and why
   - `partial_result.has_bad_shape`: whether OCCT produced a partial “bad shape” after a failure
   - `result.surface_types`: a quick signal that new blend faces exist (often cylindrical/toroidal / BSpline surfaces)

## Spine (call chain) (required)

1) `occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx` — `BRepFilletAPI_MakeFillet::Add` / `Build` (API entry + build loop)
2) `occt/src/ChFi3d/ChFi3d_FilBuilder.hxx` — `ChFi3d_FilBuilder` (internal builder owned by the API)
3) `occt/src/ChFiDS/ChFiDS_Stripe.hxx` — `ChFiDS_Stripe` (contour-level results: surfaces + corner data)
4) `occt/src/ChFiDS/ChFiDS_ErrorStatus.hxx` — `ChFiDS_ErrorStatus` (classification surfaced through `StripeStatus`)

## High-level pipeline

- Selection + contouring: input edges are grouped into contours (tangent chains) and associated with fillet parameters (constant/variable radius). (`occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx`)
- Builder setup: the API owns an internal “fillet builder” that allocates and fills the fillet DS and drives the algorithm. (`occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx`, `occt/src/ChFi3d/ChFi3d_FilBuilder.hxx`)
- Walking / propagation: the builder “walks” along each contour, constructing blend surfaces over the supporting faces and updating per-contour state. (builder implementation; see `occt/src/ChFi3d/ChFi3d_Builder.hxx` and related `.cxx`)
- Corner filling: at vertices where multiple fillet branches meet, the builder constructs corner patches and resolves continuity/geometry constraints. (corner-related logic in `ChFi3d` and `ChFiKPart` packages)
- Topology build: computed surfaces are trimmed into faces and stitched into a new B-Rep, replacing the original sharp-edge neighborhood. The API then exposes the result or a partial “bad shape” if some parts failed. (`BRepFilletAPI_MakeFillet::HasResult` / `BadShape`)

## Key classes/files

- `occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx` — primary entry point; contour enumeration (`NbContours`, `NbEdges`), error surfacing (`NbFaultyContours`, `StripeStatus`), and partial result (`HasResult`, `BadShape`)
- `occt/src/BRepFilletAPI/BRepFilletAPI_MakeChamfer.hxx` — chamfer analog; useful for comparing “same local operation shell” with different geometry construction
- `occt/src/ChFi3d/ChFi3d_FilBuilder.hxx` — internal fillet builder object model used by the API
- `occt/src/ChFi3d/ChFi3d_Builder.hxx` — builder orchestration primitives used by concrete builders
- `occt/src/ChFiDS/ChFiDS_Stripe.hxx` — stores per-contour computed geometry/topology (“stripe”)
- `occt/src/ChFiDS/ChFiDS_Spine.hxx` / `occt/src/ChFiDS/ChFiDS_FilSpine.hxx` — notion of “spine” along which the blend is parameterized
- `occt/src/ChFiKPart/ChFiKPart_ComputeData.hxx` (and neighbors) — corner/cross-section helpers (where corner robustness work often lives)

## Core data structures + invariants

- **Contour**: a set of tangent edges treated as one fillet “stripe”; contour indices (`IC`) are the unit of status reporting (`StripeStatus(IC)`) and surface enumeration. (`BRepFilletAPI_MakeFillet.hxx`)
- **Stripe** (`ChFiDS_Stripe`): stores the surfaces and trimming information produced for a contour; a failed contour may still have partial surfaces computed. (`occt/src/ChFiDS/ChFiDS_Stripe.hxx`)
- **Spine** (`ChFiDS_*Spine`): the curve-like abstraction representing progression along a contour; radius laws (constant/variable) are expressed along the spine parameter. (`occt/src/ChFiDS/ChFiDS_Spine.hxx`)
- **Invariant**: when `IsDone()==true`, `Shape()` must return a consistent B-Rep (though it may still fail validity checks if tolerances/geometry are problematic); when `IsDone()==false`, the only safe outputs are the per-contour error statuses and (optionally) a partial `BadShape()`.

## Tolerance / robustness behaviors (observed)

- “Radius too big” is a first-class error: the API surfaces `ChFiDS_StartsolFailure` as a likely indicator that construction cannot start (often due to radius/geometry constraints). (`occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx`, `occt/src/ChFiDS/ChFiDS_ErrorStatus.hxx`)
- Filleting is highly sensitive to support-face quality and edge tangency chains:
  - self-intersections or near-degenerate edges can cause walking failures (`ChFiDS_WalkingFailure`)
  - corner resolution is a common robustness hotspot (multi-edge junctions)
- Partial results are an expected mode: `HasResult()` can be true even when the full build fails, returning a shape with holes/missing corners via `BadShape()`. (`BRepFilletAPI_MakeFillet::HasResult` / `BadShape`)

## Failure modes + diagnostics (recommended)

- `build.is_done=false`: treat as “no final shape”; inspect `build.contours[*].stripe_status_name` and start by reducing radius or simplifying selection.
- `nb_faulty_contours>0`: localize the failing contour (`FaultyContour(i)`) and focus on its edges/support faces.
- `is_valid=false` with `is_done=true`: you got a result that violates B-Rep validity; suspect tiny edges, tolerance mismatches, or corner patch issues.
- If fillets follow booleans/import: run shape healing first; fillets often magnify small defects.

## Runnable repro (optional)

- Path: `repros/lane-fillets/README.md`
- How to run: `repros/lane-fillets/run.sh`
- Oracle outputs: `repros/lane-fillets/golden/fillets.json`

## Compare to papers / alternatives

- Rolling-ball / offset-surface view (classic CAD fillets): conceptually simple (offset faces by radius, intersect offsets, trim), but requires many robust intersection/trimming steps; OCCT’s builder package architecture reflects that complexity.
- Polygonal fillets (mesh beveling): easier to implement and robust for visualization, but does not preserve analytic/spline surface definitions or CAD continuity constraints; OCCT targets B-Rep + geometric continuity.
- Exact arithmetic kernels: can make predicates robust, but fillet construction still needs robust surface/surface intersections and trimming; OCCT’s approach leans on tolerances and dedicated healing/repair tooling.

