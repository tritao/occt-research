# Dossier: Fillet and Chamfer Algorithm (ChFi3d)

Status: draft

## Purpose

Explain OCCT’s fillet/chamfer implementation (the `ChFi3d` + `ChFiDS` lane) in a way that maps:
API calls → internal phases → observable outputs you can log in a repro.

This dossier is intentionally *debug-oriented*: it focuses on “what the algorithm is trying to do”, “what it stores while doing it”, and “how failures surface”.

## Provenance

- OCCT version: 7.9.3
- Evidence repro/oracle: `repros/lane-fillets/golden/fillets.json`
- Maps provenance: `notes/maps/provenance.md`

## Key classes/files

Entry packages (lane footprint):
- `BRepFilletAPI` (public API)
- `ChFi3d` (builders/orchestration)
- `ChFiDS` (data model for spines/stripes/surf patches)
- `ChFiKPart` (analytic special cases for common surface-type combinations)

Key files (good starting anchors):
- `occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx`
- `occt/src/BRepFilletAPI/BRepFilletAPI_MakeChamfer.hxx`
- `occt/src/ChFi3d/ChFi3d_Builder.hxx`
- `occt/src/ChFi3d/ChFi3d_FilBuilder.hxx`
- `occt/src/ChFi3d/ChFi3d_ChBuilder.hxx`
- `occt/src/ChFiDS/ChFiDS_Spine.hxx`
- `occt/src/ChFiDS/ChFiDS_Stripe.hxx`
- `occt/src/ChFiDS/ChFiDS_SurfData.hxx`
- `occt/src/ChFiKPart/ChFiKPart_ComputeData.cxx`

### Entry points (public API)

Fillet:
- `occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx` — `BRepFilletAPI_MakeFillet` (constant-radius, variable-radius, and law-driven fillets)
- Internal builder: `occt/src/ChFi3d/ChFi3d_FilBuilder.hxx` — `ChFi3d_FilBuilder` (subclass of `occt/src/ChFi3d/ChFi3d_Builder.hxx`)

Chamfer:
- `occt/src/BRepFilletAPI/BRepFilletAPI_MakeChamfer.hxx` — `BRepFilletAPI_MakeChamfer`
- Internal builder: `occt/src/ChFi3d/ChFi3d_ChBuilder.hxx` — `ChFi3d_ChBuilder`

Shared diagnostics surface (fillets expose it directly; chamfers mostly don’t):
- `occt/src/ChFiDS/ChFiDS_ErrorStatus.hxx` — `ChFiDS_ErrorStatus`

## Scenario + observable outputs

Use the fillets repro to keep this dossier grounded in observable fields:
- Repro runner: `repros/lane-fillets/run.sh`
- Oracle output: `repros/lane-fillets/golden/fillets.json`
- Case-by-case reading guide: `notes/walkthroughs/fillets-cases.md`

All outputs are recorded to `repros/lane-fillets/golden/fillets.json`:
- build-level outcome: `did_throw`, `is_done`, `exception`
- contour-level structure: `nb_contours`, per-contour `nb_edges`, `edge_indices`, `nb_surf`
- fillet-only diagnostics: `StripeStatus(IC)` + `NbFaultyContours()` + `NbFaultyVertices()`
- geometry/topology outcomes: `result.is_valid` (via `BRepCheck_Analyzer`), topo counts, bbox, face surface-type histogram
- “partial result” behavior for fillets: `HasResult()` + `BadShape()` (only meaningful when corners fail but some stripes succeeded)

## Spine (call chain)

Suggested reading order (public → internal):

1) `occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx` — public API (`Add`, `Build`, contour inspection + `StripeStatus`)
2) `occt/src/ChFi3d/ChFi3d_FilBuilder.hxx` — fillet builder (inherits the shared builder base)
3) `occt/src/ChFi3d/ChFi3d_Builder.hxx` — shared builder: “compute surfaces + rebuild topology”
4) `occt/src/ChFiDS/ChFiDS_Spine.hxx` — spine (guideline) data model + key warning about non‑C2 guidance
5) `occt/src/ChFiDS/ChFiDS_Stripe.hxx` / `occt/src/ChFiDS/ChFiDS_SurfData.hxx` — stripe + patch/interference state
6) `occt/src/ChFiKPart/ChFiKPart_ComputeData.cxx` — analytic special cases (KPart) vs general paths

## Core data structures + invariants

This lane’s internal state is spread across `ChFiDS` types that describe:
1) the *path to follow* (spine),
2) the *band* of blend to build (stripe),
3) the *piecewise surface patches + face interferences* (surf data).

### `ChFiDS_Spine` (the guideline)

File: `occt/src/ChFiDS/ChFiDS_Spine.hxx`

A spine represents the “guideline” along which the blend is propagated. It is conceptually “an ordered contour” plus metadata about endpoints, tangency propagation, and how to parameterize along the chain.

The file contains a blunt warning that frames a lot of downstream robustness issues:

> IMPORTANT NOTE: the guideline represented in this way is not C2, although the path claims it.

That is: the spine is built from *topological edges* (often only C0/C1 joined), while the walking/approximation machinery benefits from smooth (C2) guidance.

Practical implication: whenever you see failures that look like “the marcher gets lost / diverges” or “twisted surface”, discontinuities in the spine’s direction/curvature across edge junctions are a prime suspect.

### `ChFiDS_Stripe` (one blend band along a spine)

File: `occt/src/ChFiDS/ChFiDS_Stripe.hxx`

A stripe is the unit of work: it binds a spine to a “set of surf data” (patches + their constraints), plus bookkeeping for orientations and endpoints.

In the repro, a “contour” roughly corresponds to “one stripe to compute” for a box: because box edges are not tangentially chained, each selected edge tends to form its own 1-edge contour.

### `ChFiDS_SurfData` (one surface patch + its constraints)

File: `occt/src/ChFiDS/ChFiDS_SurfData.hxx`

`ChFiDS_SurfData` stores:
- the index of the generated blend surface (“congé” surface),
- interferences on each supporting face (`ChFiDS_FaceInterference`): 2D trimming curves + relationship to face boundaries,
- the common points at patch boundaries (`ChFiDS_CommonPoint`), including “first/last on S1/S2”,
- twist flags (`TwistOnS1/TwistOnS2`) which indicate a self-inconsistent parameterization / folding.

One way to think of it:
- the blend surface itself is only half the problem;
- the *interference curves* on the support faces are what allow OCCT to trim and stitch topology back into a valid B-Rep.

## High-level pipeline

`ChFi3d_Builder` is described as:
> Root class for calculation of surfaces (fillets, chamfers) … and the reconstruction of the Shape.

File: `occt/src/ChFi3d/ChFi3d_Builder.hxx`

### Phase 1: Contour building (tangent propagation)

Triggered by:
- `BRepFilletAPI_MakeFillet::Add(...)` in `occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx`
- `BRepFilletAPI_MakeChamfer::Add(...)` in `occt/src/BRepFilletAPI/BRepFilletAPI_MakeChamfer.hxx`

The idea is the same for fillets and chamfers:
1) start from an edge you selected,
2) propagate across tangent-adjacent edges to build a “contour” (a spine),
3) associate that contour with the pair(s) of face chains on either side.

Observable in the repro:
- `build.nb_contours` and per-contour `nb_edges` / `edge_indices`

Debugging heuristics:
- If a fillet unexpectedly affects “more edges than you selected”, this phase is why.
- If the algorithm creates multiple contours when you expected one (or vice versa), check tangency assumptions at vertices.

### Phase 2: Surface strategy selection (analytic KPart vs general walk/approx)

OCCT has “KParticular” analytic paths for special surface-type combinations.
The analytic dispatcher is in:
- `occt/src/ChFiKPart/ChFiKPart_ComputeData.cxx`

That code checks surface types (e.g. plane/plane, plane/cylinder) and then calls dedicated constructors (e.g. `ChFiKPart_MakeFillet(...)`) rather than relying on the general walking+approximation machinery.

The builder invokes KPart paths while processing a stripe:
- `occt/src/ChFi3d/ChFi3d_Builder_2.cxx` includes `ChFiKPart_ComputeData.hxx` and calls `ChFiKPart_ComputeData::Compute(...)`.

Observable in the repro:
- `build.contours[*].computed_surface_types` tends to show clean analytic primitives on simple inputs (e.g. cylindrical surfaces for box-edge fillets).

### Phase 3: Core computation (walk/intersect/approx on support faces)

When KPart does not apply (or breaks across edge junctions), the algorithm falls back to more general intersection/walking logic.

One concrete example of this class of logic:
- `occt/src/ChFi3d/ChFi3d_Builder_0.cxx` uses `IntWalk_PWalking` as a fallback to construct a “presentable LineOn2S” by walking between two surfaces, controlling deflection via a `fleche` and adapting the `Step`.

This phase is where “sensitive numeric behavior” tends to live: step sizes, tolerances, parameter-space singularities, and assumptions about smoothness.

Observable in the repro (fillets):
- per-contour `stripe_status` / `stripe_status_name` via `BRepFilletAPI_MakeFillet::StripeStatus(IC)`
- failing start: the `radius=100` case shows `ChFiDS_StartsolFailure`

### Phase 4: Corner handling (2-corner vs 3+ corner)

When multiple stripes meet at a vertex, OCCT must create corner geometry that satisfies multiple constraints at once.

Entry points:
- `occt/src/ChFi3d/ChFi3d_FilBuilder_C2.cxx` — `ChFi3d_FilBuilder::PerformTwoCorner(...)`
- `occt/src/ChFi3d/ChFi3d_Builder_CnCrn.cxx` — `ChFi3d_Builder::PerformMoreThreeCorner(...)`

The 3+ corner path uses surface fitting / constraint satisfaction via:
- `occt/src/ChFi3d/ChFi3d_Builder_CnCrn.cxx` includes `GeomPlate_BuildPlateSurface.hxx`

This is also the primary place where “partial results with holes” can happen:
- `BRepFilletAPI_MakeFillet::HasResult()` / `BadShape()` exist specifically to return something usable when a corner filling fails but other stripes succeeded.

### Phase 5: Topology reconstruction + validation

Once surfaces and interferences are computed, the builder trims original faces, constructs new faces, and stitches everything into a final shape.

Observable in the repro:
- `result.is_valid` via `BRepCheck_Analyzer`
- topology counts (solids/faces/edges/vertices)
- bbox + face surface-type histogram

## Tolerance / robustness behaviors (observed)

There are two “tolerance control surfaces” that matter in practice:

1) **Public API knobs**:
   - `BRepFilletAPI_MakeFillet::SetParams(...)` and `SetContinuity(...)` in `occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx`
2) **Builder knobs** (shared by fillets and chamfers):
   - `ChFi3d_Builder::SetParams(...)` and `SetContinuity(...)` in `occt/src/ChFi3d/ChFi3d_Builder.hxx`

Even when you don’t call `SetParams`, internal code uses deflection/step concepts repeatedly when approximating curves/surfaces and when “walking” intersections.
For example, `occt/src/ChFi3d/ChFi3d_Builder_0.cxx` computes a `fleche` as a scaled distance and adapts `Step` while using `IntWalk_PWalking`.

Practical rule: when the failure looks “numeric” (walking/divergence/twist), the most useful parameters to experiment with are those affecting deflection/approximation and angular tolerances (G1/C1 expectations).

## Diagnostics: what you can query, and what it means

### `ChFiDS_ErrorStatus` (fillet stripe status)

File: `occt/src/ChFiDS/ChFiDS_ErrorStatus.hxx`

This enum is exposed directly by the fillet API:
- `BRepFilletAPI_MakeFillet::StripeStatus(IC)` in `occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx`

In the repro:
- `ChFiDS_Ok` is the common success status for simple cases
- `ChFiDS_StartsolFailure` appears for `radius=100` on a 10×10×10 box edge (the algorithm cannot even seed an initial solution)

Other statuses you should expect on harder inputs:
- `ChFiDS_WalkingFailure` (numeric divergence / marching trouble)
- `ChFiDS_TwistedSurface` (self-inconsistent / folded patch)
- `ChFiDS_Error` (fallback “something else went wrong”)

### “Computed surfaces” vs final topology

Two complementary views:
- per-contour computed surfaces: `NbComputedSurfaces(IC)` + `ComputedSurface(IC,IS)` (fillet-only; see `occt/src/BRepFilletAPI/BRepFilletAPI_MakeFillet.hxx`)
- final faces: `result.surface_types` (histogram of `BRep_Tool::Surface(face)->DynamicType()->Name()`)

These help answer different questions:
- “Did the algorithm manage to compute the blend patches at all?” → computed surfaces
- “Did the result rebuild stitch those patches into topology?” → final face histogram + validity

## Why fillets fail (a practical taxonomy)

1) **Start solution failure (`ChFiDS_StartsolFailure`)**
   - the radius/dist is geometrically infeasible or the seed solver can’t find a valid tangent configuration.
2) **Walking failure (`ChFiDS_WalkingFailure`)**
   - numeric marching diverges due to curvature, singularities, discontinuities at edge junctions, or tolerance/step choices.
3) **Twisted surface (`ChFiDS_TwistedSurface`)**
   - the parameterization folds; `ChFiDS_SurfData` has twist flags to record it, but recovery may be limited.
4) **Corner fill failure**
   - the constraint system at a multi-edge vertex becomes incompatible; corner surface fitting (`GeomPlate_BuildPlateSurface`) is a common place for this to surface.

The `ChFiDS_Spine.hxx` warning about non‑C2 guidance is a recurring root cause amplifier: even when each individual edge segment is well-behaved, transitions between segments can destabilize marching/approximation.

## Debug workflow (what to check first)

1) **Confirm contour propagation**: `nb_contours`, `contours[*].edge_indices`
2) **Confirm the algorithm built anything**: `build.is_done`; if false, check `stripe_status_name`
3) **If built, check shape health**: `result.is_valid` + topology counts
4) **If it partially built**: `has_result` + `partial_result.bad_shape_*`
5) **If it’s “mysteriously wrong”**: compare `computed_surface_types` vs final `surface_types` to see whether the failure is in surface computation or in topology reconstruction

## Compare to papers / alternatives

OCCT’s `ChFi3d` + `ChFiKPart` blend architecture mixes:
- analytic constructions for common primitives (KPart),
- plus a general “compute constraints on support faces → approximate surfaces → rebuild topology” pipeline.

Alternative families you may run into in literature and other kernels:
- “Rolling ball” formulations expressed as envelope surfaces / offset intersections (often similar in spirit to what OCCT’s walking machinery approximates).
- Medial-axis / Voronoi based blends (often stronger global reasoning, but harder to implement robustly on trimmed CAD surfaces).

Tradeoff framing (pragmatic):
- OCCT’s approach is very powerful on trimmed NURBS + mixed analytic surfaces, but is sensitive to tolerance chains, corner constraint compatibility, and guidance smoothness (the spine non‑C2 note is a concrete example of that tension).
