# Dossier: Core kernel (Standard / NCollection / gp / Geom / Geom2d / math)

Status: draft

## Purpose

Capture the “core kernel” layer of OCCT: foundational runtime conventions (`Standard` handles/RTTI/exceptions), core containers (`NCollection`), basic geometric primitives and transforms (`gp`), analytic / spline geometry (`Geom`/`Geom2d`), and low-level numerical utilities (`math`). This is the substrate that most downstream modeling/booleans/meshing/exchange code builds on.

## Mental model (human-first)

This lane is “the rules of physics” for the rest of OCCT. If you understand how OCCT represents numbers, transforms, and geometry primitives here, the higher-level algorithms stop feeling magical: they are mostly orchestration plus a lot of careful tolerance handling.

In practice, most modeling code is built out of:
- **Lifetime + error conventions** (`Standard_Transient`, `opencascade::handle<T>`, OCCT exception types)
- **Tolerance vocabulary** (`gp::Resolution()`, `Precision::*`) used everywhere to decide “equal enough”
- **Value geometry primitives** (`gp_*`) for points/vectors/axes/transforms (cheap, non-persistent)
- **Parametric geometry** (`Geom*`/`Geom2d*`) for curves/surfaces (persistent, handle-managed, often shared)

When something looks “robust” (or “mysteriously fuzzy”) later, it’s usually because the code is consistently using the same kernel tolerances and guardrails defined here.

## Provenance (required)

- OCCT version + build config: `notes/maps/provenance.md`
- Evidence sources are cited inline in this dossier (file paths under `occt/src/`).

## Scenario + observable outputs (required)

- Scenario: exercise handle lifetime (`Standard_Transient`) and tolerance constants used throughout modeling.
- Observable outputs: refcount behavior; exceptions on invalid construction; values of `Precision::*` and `gp::Resolution()`.
- Success criteria: invariants described here match observed behavior and constants.

## Walkthrough (repro-driven)

1) Run: `bash repros/lane-core-kernel/run.sh`
2) Inspect the oracle output: `repros/lane-core-kernel/golden/core-kernel.json`
3) Map the output back to concepts in this lane:
   - Tolerance vocabulary: `precision.confusion`, `precision.angular`, `precision.p_confusion`
   - Baseline numeric “treat as zero”: `gp.resolution`
   - Transform semantics: `gp.transform` shows a point transformed by a `gp_Trsf` (translation + rotation)
   - Handle/refcount model: `handles.refcount_after_new`, `handles.refcount_after_copy`, `handles.refcount_after_nullify_copy`
   - Container sanity: `ncollection.list.size` and `ncollection.list.sum`

## Spine (call chain) (required)

1) `occt/src/Standard/Standard_Transient.hxx` — `Standard_Transient` (handle-managed lifetime)
2) `occt/src/Standard/Standard_Handle.hxx` — `opencascade::handle<T>` (RAII + refcount)
3) `occt/src/Precision/Precision.hxx` — `Precision::*` (tolerance vocabulary)
4) `occt/src/gp/gp.hxx` — `gp::Resolution()` (baseline epsilon)

## High-level pipeline

- Runtime layer: objects that participate in OCCT’s handle-based lifetime model derive from `Standard_Transient` and are managed via `Handle(T)` / `opencascade::handle<T>`. (`occt/src/Standard/Standard_Transient.hxx`, `occt/src/Standard/Standard_Handle.hxx`)
- Data layer: generic containers (`NCollection_List`, `NCollection_DataMap`, etc.) store and move data using OCCT allocators and exception conventions. (`occt/src/NCollection/NCollection_List.hxx`, `occt/src/NCollection/NCollection_DataMap.hxx`)
- Geometry layer:
  - `gp` provides non-persistent primitives (points/vectors/axes/transforms) and a baseline numeric tolerance `gp::Resolution()`. (`occt/src/gp/gp.hxx`, `occt/src/gp/gp_Pnt.hxx`, `occt/src/gp/gp_Trsf.cxx`)
  - `Geom`/`Geom2d` provide curve/surface abstractions; spline types (e.g. `Geom_BSplineCurve`) encode continuity/validity constraints via knot multiplicities and weights. (`occt/src/Geom/Geom_BSplineCurve.hxx`, `occt/src/Geom2d/Geom2d_BSplineCurve.hxx`)
- Numeric layer: `math` exposes table-driven quadrature and other utilities used pervasively by higher-level algorithms. (`occt/src/math/math.hxx`)
- Precision vocabulary: `Precision` centralizes conventional tolerances for comparisons in real and parametric spaces (confusion/angular/intersection/approximation). (`occt/src/Precision/Precision.hxx`)

## Key classes/files

- `occt/src/Standard/Standard_Transient.hxx` — `Standard_Transient` (ref counting + RTTI entrypoint)
- `occt/src/Standard/Standard_Handle.hxx` — `Handle(T)` / `opencascade::handle<T>` (handle semantics; `EndScope()` decref+delete on zero; hash specialization)
- `occt/src/NCollection/NCollection_List.hxx` — `NCollection_List<T>` (allocator-backed list; throws `Standard_NoSuchObject` on empty access)
- `occt/src/NCollection/NCollection_DataMap.hxx` — `NCollection_DataMap<K,V>` (hash map with `operator()` accessor semantics; base map + node deleter)
- `occt/src/gp/gp.hxx` — `gp::Resolution()` (baseline “avoid division by zero” tolerance) and global axes/origin helpers
- `occt/src/gp/gp_Pnt.hxx` — `gp_Pnt` (3D point primitive)
- `occt/src/gp/gp_Trsf.cxx` — `gp_Trsf::SetScale()` / `SetScaleFactor()` (guards scale against `gp::Resolution()`; uses `Standard_ConstructionError_Raise_if`)
- `occt/src/Precision/Precision.hxx` — `Precision::Angular()`, `Precision::Confusion()` (recommended tolerances and derived ones like `Intersection()` / `Approximation()`)
- `occt/src/Geom/Geom_BSplineCurve.hxx` — `Geom_BSplineCurve` (B-spline definition + construction constraints)
- `occt/src/Geom2d/Geom2d_BSplineCurve.hxx` — `Geom2d_BSplineCurve` (2D counterpart; used heavily in parameter-space workflows)
- `occt/src/math/math.hxx` — `math` (Gauss/Kronrod utilities, etc.)

## Core data structures + invariants

- Structure: `Standard_Transient` (`occt/src/Standard/Standard_Transient.hxx`)
  - Ref-counted lifetime: handle operations increment/decrement an internal atomic counter; `Delete()` is virtual and called when count reaches 0 (default deletes `this`). (`Standard_Transient::IncrementRefCounter`, `Standard_Transient::DecrementRefCounter`, `Standard_Transient::Delete`)
  - Safety guard: `This()` raises `Standard_ProgramError` if ref counter is zero (prevents handles to stack-allocated objects / constructor misuse). (`Standard_Transient::This`)

- Structure: `Handle(T)` / `opencascade::handle<T>` (`occt/src/Standard/Standard_Handle.hxx`)
  - Scope end semantics: `EndScope()` decrements and deletes if counter hits zero, then nulls the pointer. (`opencascade::handle::EndScope`)
  - Hash semantics: `std::hash<Handle(T)>` hashes the raw pointer value (uintptr). (`occt/src/Standard/Standard_Handle.hxx`)

- Structure: `gp` primitives (`occt/src/gp/gp_Pnt.hxx`, `occt/src/gp/gp_XYZ.hxx`, `occt/src/gp/gp_Trsf.hxx`)
  - Value types: most `gp_*` types are plain value objects (non-persistent by design). (`occt/src/gp/gp.hxx`)
  - Transform invariants: transform setters validate degenerate parameters using `gp::Resolution()`; e.g. scaling must not be near zero. (`occt/src/gp/gp_Trsf.cxx` — `gp_Trsf::SetScale`, `gp_Trsf::SetScaleFactor`)

- Structure: `NCollection_List<T>` (`occt/src/NCollection/NCollection_List.hxx`)
  - Empty guards: `First()`/`Last()` raise `Standard_NoSuchObject` on empty list. (`NCollection_List::First`, `NCollection_List::Last`)
  - Allocator-aware splice: appending another list either glues nodes when allocators match or copies otherwise. (`NCollection_List::Append(NCollection_List&)`)

- Structure: `NCollection_DataMap<K,V>` (`occt/src/NCollection/NCollection_DataMap.hxx`)
  - Node encapsulation: map nodes store a key + value and are deleted via a static deleter that uses the OCCT allocator. (`NCollection_DataMap::DataMapNode::delNode`)
  - “Extended array” access: documentation frames `operator()` as item access by key, but assignment requires key already bound. (`NCollection_DataMap` docs)

- Structure: `Geom_BSplineCurve` (`occt/src/Geom/Geom_BSplineCurve.hxx`)
  - Validity constraints: constructors specify monotonic knot ordering, multiplicity bounds, and pole count constraints (periodic/non-periodic). (`Geom_BSplineCurve` constructors’ documented conditions)

## Tolerance / robustness behaviors (observed)

- `occt/src/gp/gp.hxx` — `gp::Resolution()` returns `RealSmall()` and is the baseline “treat as zero” threshold used widely to avoid division-by-zero and degenerate constructions.
- `occt/src/gp/gp_Trsf.cxx` — `gp_Trsf::SetScale()` raises `Standard_ConstructionError` when `Abs(scale) <= gp::Resolution()` (degenerate scale).
- `occt/src/Precision/Precision.hxx` — conventional tolerances:
  - `Precision::Angular()` is `1.e-12` (radians)
  - `Precision::Confusion()` is `1.e-7` (distance in “model units”)
  - Derived tolerances like `Intersection()` = `Confusion()/100` and `Approximation()` = `Confusion()*10` encode “stricter for intersection, looser for approximation”.
- `occt/src/NCollection/NCollection_List.hxx` — empty access throws `Standard_NoSuchObject` (fail-fast on misuse).

## Failure modes + diagnostics (recommended)

- “Everything is off by 1e-7”: check whether the code is using `Precision::Confusion()` vs a custom epsilon; this tolerance is the default “distance equality” across the kernel.
- Unexpected exceptions in geometry construction (e.g. scaling): expect guardrails that treat near-zero as invalid; many setters raise `Standard_ConstructionError` when `Abs(value) <= gp::Resolution()`.
- Refcount surprises: if `Standard_Transient::This()` raises or counts don’t match, suspect a non-handle-managed object or misuse of raw pointers instead of `opencascade::handle<T>`.

## Runnable repro (optional)

- Path: `repros/lane-core-kernel/README.md`
- How to run: `repros/lane-core-kernel/run.sh`
- Oracle outputs: `repros/lane-core-kernel/golden/core-kernel.json`

## Compare to papers / alternatives

- Eigen / Blaze for linear algebra: offer SIMD-tuned matrix/vector ops with modern C++ APIs; OCCT’s `gp` favors stable ABI + domain-specific primitives (axes, transforms, conics) and kernel-wide tolerance conventions (`gp::Resolution`, `Precision::*`).
- CGAL’s geometric kernels: emphasize exact predicates / robustness via exact arithmetic; OCCT’s core layer uses floating tolerances and explicit “confusion/angular” thresholds, with higher-level algorithms expected to manage tolerances and healing.
- STL containers: `std::vector`/`std::unordered_map` provide generic containers; `NCollection` integrates OCCT allocators, exception types, and long-standing ABI patterns used across the kernel.
