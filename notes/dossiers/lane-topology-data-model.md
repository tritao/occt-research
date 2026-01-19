# Dossier: Topology data model (TopoDS / TopLoc / TopAbs / TopTools)

Status: draft

## Purpose

Describe OCCT’s core topological data model: how shapes are represented and shared (`TopoDS_Shape` / `TopoDS_TShape`), how placement is encoded and composed (`TopLoc_Location`), how type + orientation semantics are represented (`TopAbs_*`), and how shapes are stored in common containers with well-defined identity semantics (`TopTools_*`).

## Mental model (human-first)

OCCT’s topology is designed around **cheap-by-value “instances” over shared payloads**:
- `TopoDS_TShape` is the shared payload (the actual topological structure + attached representations).
- `TopoDS_Shape` is an instance handle: `(TShape pointer, Location, Orientation)`.

This design is why copying shapes is usually cheap and why “identity” has multiple tiers:
- same payload only (`IsPartner`)
- same payload + same placement (`IsSame`)
- same payload + placement + orientation (`IsEqual`)

Most downstream algorithms assume this model: they pass `TopoDS_Shape` by value, rely on sharing to avoid deep copies, and use `TopTools_*` containers keyed by `(payload, location)` (orientation typically ignored). If a result looks duplicated, missing, or unexpectedly “the same”, it’s almost always because of one of these identity tiers.

## Provenance (required)

- OCCT version + build config: `notes/maps/provenance.md`
- Evidence sources are cited inline in this dossier (file paths under `occt/src/`).

## Scenario + observable outputs (required)

- Scenario: build a compound with two instances of the same sub-shape at different locations and traverse it.
- Observable outputs: `TopoDS_Shape::IsPartner/IsSame/IsEqual` behavior; location/orientation propagation; identity semantics in `TopTools_*` containers.
- Success criteria: traversal and identity semantics match the described invariants (no accidental deep copies).

## Walkthrough (repro-driven)

1) Run: `bash repros/lane-topology-data-model/run.sh`
2) Inspect the oracle output: `repros/lane-topology-data-model/golden/topology-data-model.json`
3) Read it as “proofs” of core invariants:
   - Identity tiers:
     - `identity.instA_vs_instB` should show `is_partner=true` but `is_same=false` (same payload, different location)
     - `identity.instA_vs_instARev` should show `is_same=true` but `is_equal=false` (same payload + location, different orientation)
   - Location is per-instance: `location.instB_translation` shows the translation used to create a second instance.
   - Map semantics ignore orientation: `maps.indexed_map_of_shape_sizes` stays at 1 when only orientation flips, but increases when location changes.
   - Traversal results line up with instancing: `traversal.instA_vertex_count` / `instB_vertex_count` vs `compound_unique_vertex_count`.

## Spine (call chain) (required)

1) `occt/src/TopoDS/TopoDS_Shape.hxx` — `TopoDS_Shape` (value handle + identity tiers)
2) `occt/src/TopoDS/TopoDS_TShape.hxx` — `TopoDS_TShape` (shared topology payload)
3) `occt/src/TopLoc/TopLoc_Location.hxx` — `TopLoc_Location` (instance placement)
4) `occt/src/TopExp/TopExp_Explorer.hxx` — `TopExp_Explorer` (graph traversal)
5) `occt/src/TopTools/TopTools_ShapeMapHasher.hxx` — `TopTools_ShapeMapHasher` (identity-based hashing)

## High-level pipeline

- Vocabulary: algorithms speak in terms of `TopAbs_ShapeEnum` (kind: edge/face/...) and `TopAbs_Orientation` (direction + inside/outside semantics). (`occt/src/TopAbs/TopAbs_ShapeEnum.hxx`, `occt/src/TopAbs/TopAbs_Orientation.hxx`)
- Representation: a `TopoDS_Shape` is a lightweight value object that points to a shared `TopoDS_TShape` plus per-instance `TopLoc_Location` and `TopAbs_Orientation`. (`occt/src/TopoDS/TopoDS_Shape.hxx`, `occt/src/TopoDS/TopoDS_TShape.hxx`)
- Sharing model: multiple `TopoDS_Shape` values can share the same `TopoDS_TShape` while varying location and/or orientation (`IsPartner`/`IsSame`/`IsEqual`). (`occt/src/TopoDS/TopoDS_Shape.hxx` — `TopoDS_Shape::IsPartner`, `TopoDS_Shape::IsSame`, `TopoDS_Shape::IsEqual`)
- Placement composition: `TopLoc_Location` encodes a composite transform as a chain of (datum, power) items; composition cancels matching items when possible (`Multiplied`) and inversion reverses the chain and negates powers (`Inverted`). (`occt/src/TopLoc/TopLoc_Location.hxx`, `occt/src/TopLoc/TopLoc_Location.cxx`)
- Containers: common “maps of shapes” use `TopTools_ShapeMapHasher`, which hashes with `std::hash<TopoDS_Shape>` and compares using `TopoDS_Shape::IsSame` (i.e., orientation is ignored for map identity). (`occt/src/TopTools/TopTools_ShapeMapHasher.hxx`, `occt/src/TopoDS/TopoDS_Shape.hxx`)

## Key classes/files

- `occt/src/TopoDS/TopoDS_Shape.hxx` — `TopoDS_Shape::Nullify`, `TopoDS_Shape::Location`, `TopoDS_Shape::Move`, `TopoDS_Shape::IsPartner`/`IsSame`/`IsEqual` (value handle + identity tiers)
- `occt/src/TopoDS/TopoDS_Shape.hxx` — `TopoDS_Shape::validateTransformation` (optional rejection of scaling / negative transforms via `TopLoc_Location::ScalePrec()`)
- `occt/src/TopoDS/TopoDS_TShape.hxx` — `TopoDS_TShape::NbChildren`, `TopoDS_TShape::EmptyCopy`, `TopoDS_TShape::Modified` (shared container + flags and child storage)
- `occt/src/TopLoc/TopLoc_Location.hxx` / `occt/src/TopLoc/TopLoc_Location.cxx` / `occt/src/TopLoc/TopLoc_Location.lxx` — `TopLoc_Location::Multiplied`, `TopLoc_Location::Inverted`, `TopLoc_Location::IsEqual`, `TopLoc_Location::HashCode` (placement chain composition + hashing)
- `occt/src/TopAbs/TopAbs.hxx` — `TopAbs::Compose`, `TopAbs::Reverse`, `TopAbs::Complement` (orientation algebra used by `TopoDS_Shape`)
- `occt/src/TopAbs/TopAbs_ShapeEnum.hxx` / `occt/src/TopAbs/TopAbs_Orientation.hxx` — `TopAbs_ShapeEnum`, `TopAbs_Orientation` (type and orientation vocab)
- `occt/src/TopTools/TopTools_ShapeMapHasher.hxx` — `TopTools_ShapeMapHasher::operator()` (hashes shapes; equality uses `TopoDS_Shape::IsSame`)
- `occt/src/TopTools/TopTools_ListOfShape.hxx` — `TopTools_ListOfShape` (typedef list of `TopoDS_Shape`)
- `occt/src/TopTools/TopTools_IndexedMapOfShape.hxx` — `TopTools_IndexedMapOfShape` (typedef indexed map keyed by `TopoDS_Shape`)

## Core data structures + invariants

- Structure: `TopoDS_Shape` (`occt/src/TopoDS/TopoDS_Shape.hxx`)
  - Nullness: `IsNull()` is `myTShape.IsNull()`. `Nullify()` clears `myTShape`, clears `myLocation`, and resets orientation to `TopAbs_EXTERNAL`. (`TopoDS_Shape::IsNull`, `TopoDS_Shape::Nullify`)
  - Identity tiers (increasing strictness):
    - `IsPartner()` compares only the shared implementation pointer (`myTShape`). (`TopoDS_Shape::IsPartner`)
    - `IsSame()` compares `myTShape` + `myLocation` (orientation ignored). (`TopoDS_Shape::IsSame`)
    - `IsEqual()` compares `myTShape` + `myLocation` + `myOrient`. (`TopoDS_Shape::IsEqual`)
  - Location semantics:
    - `Location(const TopLoc_Location&, theRaiseExc)` optionally calls `validateTransformation(theLoc.Transformation())` before storing. (`TopoDS_Shape::Location`, `TopoDS_Shape::validateTransformation`)
    - `Move(thePosition, theRaiseExc)` composes locations as `myLocation = thePosition * myLocation` (pre-multiply). (`TopoDS_Shape::Move`)
  - Hash/Map semantics: `std::hash<TopoDS_Shape>` combines `theShape.TShape().get()` with `std::hash<TopLoc_Location>{}(theShape.Location())` and ignores `Orientation()`. (`occt/src/TopoDS/TopoDS_Shape.hxx` — `std::hash<TopoDS_Shape>::operator()`)

- Structure: `TopoDS_TShape` (`occt/src/TopoDS/TopoDS_TShape.hxx`)
  - Child storage: direct sub-shapes are stored in `TopoDS_ListOfShape myShapes` (which is `NCollection_List<TopoDS_Shape>`). `NbChildren()` returns `myShapes.Size()`. (`TopoDS_TShape::NbChildren`, `occt/src/TopoDS/TopoDS_ListOfShape.hxx`)
  - Flags are packed into `myFlags` and exposed as `Free`, `Locked`, `Modified`, `Checked`, `Orientable`, `Closed`, `Infinite`, `Convex`.
  - “Modified implies unchecked”: `Modified(true)` explicitly clears `Checked`. (`TopoDS_TShape::Modified`)
  - Copy without children: `EmptyCopy()` is virtual and used by `TopoDS_Shape::EmptyCopy()` to keep geometry but drop sub-shapes. (`TopoDS_TShape::EmptyCopy`, `TopoDS_Shape::EmptyCopy`)

- Structure: `TopLoc_Location` (`occt/src/TopLoc/TopLoc_Location.hxx`, `occt/src/TopLoc/TopLoc_Location.cxx`, `occt/src/TopLoc/TopLoc_Location.lxx`)
  - Identity representation: identity is encoded as an empty item list (`IsIdentity()` == `myItems.IsEmpty()`). (`TopLoc_Location::IsIdentity`)
  - Composition cancels: `Multiplied()` concatenates the (datum,power) chain and cancels when adjacent items reference the same datum and powers sum to 0. (`TopLoc_Location::Multiplied`)
  - Inversion reverses chain: `Inverted()` iterates the chain and reconstructs it with reversed order and negated powers. (`TopLoc_Location::Inverted`)
  - Hash code: `HashCode()` returns 0 for identity; otherwise hashes the datum handle + power sequence (seeded Murmur hash). (`TopLoc_Location::HashCode`)
  - Floating tolerances: `ScalePrec()` is `1.e-14` and is used by `TopoDS_Shape::validateTransformation()` to decide if non-unit scaling is acceptable. (`TopLoc_Location::ScalePrec`, `TopoDS_Shape::validateTransformation`)

- Structure: `TopTools_ShapeMapHasher` (`occt/src/TopTools/TopTools_ShapeMapHasher.hxx`)
  - Consistency: hash is `std::hash<TopoDS_Shape>` (ignores orientation), equality is `IsSame()` (also ignores orientation), so map keys treat `(TShape, Location)` as identity. (`TopTools_ShapeMapHasher::operator()`, `TopoDS_Shape::IsSame`)

## Tolerance / robustness behaviors (observed)

- `occt/src/TopoDS/TopoDS_Shape.hxx` — `TopoDS_Shape::validateTransformation` throws `Standard_DomainError` when `Abs(Abs(theTrsf.ScaleFactor()) - 1.) > TopLoc_Location::ScalePrec()` or when `theTrsf.IsNegative()`; this can be enabled by passing `theRaiseExc = Standard_True` to `TopoDS_Shape::Location` or `TopoDS_Shape::Move`.
- `occt/src/TopoDS/TopoDS_Shape.hxx` — `TopoDS_Shape::ShapeType()` documents `Standard_NullObject` if the shape is null (since it dereferences `myTShape`). (Callers should guard with `IsNull()`.)
- `occt/src/TopLoc/TopLoc_Location.hxx` — methods like `FirstDatum()` / `NextLocation()` document `Standard_NoSuchObject` if the location is empty; callers should guard with `IsIdentity()`.
- `occt/src/TopLoc/TopLoc_Location.cxx` — `Transformation()` returns a static identity `gp_Trsf` for the identity case, avoiding unnecessary storage/computation.

## Failure modes + diagnostics (recommended)

- “Why did my map treat reversed shapes as the same?”: many `TopTools_*` hashers compare with `TopoDS_Shape::IsSame` (payload + location) and intentionally ignore `Orientation()`.
- “Why is the same subshape duplicated?”: check whether you created distinct `TopoDS_Shape` instances with different `TopLoc_Location` (these are not `IsSame`).
- “My transform didn’t apply”: remember `TopoDS_Shape::Move` pre-multiplies (`newLoc * oldLoc`); ordering matters when composing locations.

## Runnable repro (optional)

- Path: `repros/lane-topology-data-model/README.md`
- How to run: `repros/lane-topology-data-model/run.sh`
- Oracle outputs: `repros/lane-topology-data-model/golden/topology-data-model.json`

## Compare to papers / alternatives

- Half-edge / winged-edge meshes (e.g., CGAL `Surface_mesh`, OpenMesh): explicit adjacency structures are straightforward for polygonal modeling, but don’t directly encode analytic geometry sharing + per-instance placement/orientation the way `TopoDS_Shape`/`TopoDS_TShape` does. (A B-Rep kernel usually needs both topology + parametric geometry.)
- Parasolid / ACIS-style kernels: similar split between lightweight “instance” handles and shared topological/geometric entities; OCCT’s exposed API makes the identity tiers (`IsPartner`/`IsSame`/`IsEqual`) and orientation algebra (`TopAbs`) explicit.
- Scene-graph instancing: conceptually similar to `TopoDS_Shape` as an instanced node pointing at shared payload plus a transform; OCCT couples this with topological orientation semantics (`TopAbs_Orientation`) and topological-kind vocabulary (`TopAbs_ShapeEnum`).
