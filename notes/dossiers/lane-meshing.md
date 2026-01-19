# Dossier: Meshing (BRepMesh / IMeshTools / IMeshData)

Status: draft

## Purpose

Capture OCCT’s B-Rep tessellation (“meshing”) entry points, parameterization, and discrete-model orchestration. This dossier focuses on how meshing is staged (model build → edge discretization → healing/pre/post processing → face discretization), what parameters mean at the API surface, and which tolerance/guardrails are enforced.

## Mental model (human-first)

Meshing in OCCT is a **derived artifact pipeline**: you start from an exact B-Rep (`TopoDS_Shape`) and produce a `Poly_Triangulation` attached back onto faces/edges. The important consequence is that meshing is not “just triangles”; it must respect:
- the topology graph (shared edges, face boundaries)
- the parametric geometry (surface UV space and curve parameterization)
- the same tolerance conventions used by modeling algorithms

Practically, you control meshing by choosing a deflection/angle policy, and OCCT orchestrates the phases via an `IMeshTools_Context`. When debugging, look for: parameter normalization (clamps/defaults), which phase fails (build model vs discretize edges vs discretize faces), and whether old triangulation/polygons are being cleaned and replaced.

## Provenance (required)

- OCCT version + build config: `notes/maps/provenance.md`
- Evidence sources are cited inline in this dossier (file paths under `occt/src/`).

## Scenario + observable outputs (required)

- Scenario: mesh a simple planar face using explicit `IMeshTools_Parameters`.
- Observable outputs: mesher status flags; face triangulation node/triangle counts; presence of edge polygons on triangulation.
- Success criteria: meshing succeeds without exception; triangulation exists and counts are stable for the scenario.

## Walkthrough (repro-driven)

1) Run: `bash repros/lane-meshing/run.sh`
2) Inspect the oracle output: `repros/lane-meshing/golden/meshing.json`
3) Interpret the output as “how sensitive is the discretization?”:
   - Each shape (`shapes.box`, `shapes.cylinder`) has a list of `runs[]` with:
     - inputs: `deflection`, `angle_rad`
     - outputs: `faces_with_triangulation`, `total_nodes`, `total_triangles`, `status_flags`
   - Expectation to internalize:
     - On curved geometry (cylinder), smaller `deflection` should usually increase `total_nodes`/`total_triangles`.
     - On simple planar boxes, counts may stay stable across deflections because the triangulation is already minimal for flat faces.

## Spine (call chain) (required)

1) `occt/src/BRepMesh/BRepMesh_IncrementalMesh.hxx` — `BRepMesh_IncrementalMesh::Perform` (entrypoint)
2) `occt/src/IMeshTools/IMeshTools_Context.hxx` — `IMeshTools_Context` (phase orchestration)
3) `occt/src/IMeshTools/IMeshTools_Parameters.hxx` — `IMeshTools_Parameters` (parameter policy)
4) `occt/src/IMeshData/IMeshData_Model.hxx` — `IMeshData_Model` (discrete model interface)

## High-level pipeline

- Entry point: `BRepMesh_IncrementalMesh` is the main “mesh this shape” algorithm object; constructors can auto-run `Perform()`, and the class exposes a `Perform()` overload taking an `IMeshTools_Context`. (`occt/src/BRepMesh/BRepMesh_IncrementalMesh.hxx`)
- Parameters: meshing is configured via `IMeshTools_Parameters` (deflection, angle, min size, relative mode, surface deflection control, etc.). (`occt/src/IMeshTools/IMeshTools_Parameters.hxx`)
- Context-driven orchestration: `IMeshTools_Context` is an extensible façade that caches a discrete model plus algorithm instances for each phase:
  1) `BuildModel()` (via `IMeshTools_ModelBuilder`)
  2) `DiscretizeEdges()` (edge discret algo)
  3) `HealModel()` (optional discrete-model healing)
  4) `PreProcessModel()` / `PostProcessModel()` (aux steps like cleaning old triangulation)
  5) `DiscretizeFaces()` (face discret algo)
  6) `Clean()` (drops the cached model if `CleanModel` is enabled). (`occt/src/IMeshTools/IMeshTools_Context.hxx`)
- Discrete model interface: the model produced by the builder is represented via `IMeshData_Model` (faces/edges collections over a `TopoDS_Shape`). (`occt/src/IMeshData/IMeshData_Model.hxx`)

## Key classes/files

- `occt/src/BRepMesh/BRepMesh_IncrementalMesh.hxx` — `BRepMesh_IncrementalMesh::Perform` + `initParameters()` (main entrypoint + guardrails)
- `occt/src/IMeshTools/IMeshTools_Parameters.hxx` — `IMeshTools_Parameters` (parameter meanings + defaults)
- `occt/src/IMeshTools/IMeshTools_Context.hxx` — `IMeshTools_Context` (phase orchestration + dependency injection of tools)
- `occt/src/IMeshData/IMeshData_Model.hxx` — `IMeshData_Model` (discrete model interface: faces/edges; shape max size)

## Core data structures + invariants

- Structure: `IMeshTools_Parameters` (`occt/src/IMeshTools/IMeshTools_Parameters.hxx`)
  - Defaults: `Angle=0.5`, `Deflection=0.001`, interior values set to `-1.0` (meaning “unset”), `MinSize=-1.0` (meaning “unset”), and several boolean switches (e.g., `ControlSurfaceDeflection=true`, `CleanModel=true`). (Default ctor)
  - Relative mode: `Relative` is documented as scaling edge deflection by edge size, and using max edge deflection for faces. (`IMeshTools_Parameters::Relative` comment)
  - Min size policy hook: `RelMinSize()` returns `0.1` and is used as a factor to derive a default `MinSize` from deflection. (`IMeshTools_Parameters::RelMinSize`)

- Structure: `IMeshTools_Context` (`occt/src/IMeshTools/IMeshTools_Context.hxx`)
  - Discrete model caching: context stores `myModel` and algorithm handles for each phase (builder, edge discretizer, healer, preprocess, face discretizer, postprocess). (`IMeshTools_Context` fields + getters/setters)
  - Phase-level failure semantics: the default implementations return `Standard_False` if required tools are missing (`myModelBuilder`, `myEdgeDiscret`, `myFaceDiscret`) or if no model exists yet. (`IMeshTools_Context::BuildModel`, `DiscretizeEdges`, `DiscretizeFaces`)
  - Cleanup invariant: `Clean()` nullifies the cached model only if `myParameters.CleanModel` is enabled. (`IMeshTools_Context::Clean`)

- Structure: `IMeshData_Model` (`occt/src/IMeshData/IMeshData_Model.hxx`)
  - Shape-scoped indexing: model exposes explicit face/edge counts plus “add/get by index” APIs for `TopoDS_Face` and `TopoDS_Edge`, implying a stable indexing layer over the shape’s discrete representation. (`IMeshData_Model::FacesNb`, `AddFace`, `GetFace`, `EdgesNb`, `AddEdge`, `GetEdge`)

## Tolerance / robustness behaviors (observed)

- Parameter validation guards: `BRepMesh_IncrementalMesh::initParameters()` enforces:
  - `Deflection >= Precision::Confusion()` (else throws `Standard_NumericError`)
  - `Angle >= Precision::Angular()` (else throws `Standard_NumericError`) (`occt/src/BRepMesh/BRepMesh_IncrementalMesh.hxx`)
- Interior defaults normalization:
  - `DeflectionInterior` is defaulted to `Deflection` when below `Precision::Confusion()`
  - `AngleInterior` is defaulted to `2.0 * Angle` when below `Precision::Angular()` (`occt/src/BRepMesh/BRepMesh_IncrementalMesh.hxx`)
- Minimum edge length normalization: when `MinSize < Precision::Confusion()`, it is set to:
  - `Max(IMeshTools_Parameters::RelMinSize() * Min(Deflection, DeflectionInterior), Precision::Confusion())` (`occt/src/BRepMesh/BRepMesh_IncrementalMesh.hxx`, `occt/src/IMeshTools/IMeshTools_Parameters.hxx`)

## Failure modes + diagnostics (recommended)

- No triangulation produced: check whether parameters were rejected (deflection/angle clamped/exception) and whether the context phases ran (`BuildModel`/`DiscretizeEdges`/`DiscretizeFaces`).
- Mesh density surprises: remember `Relative`/`Absolute` policies (and any min-size normalization); deflection can be internally adjusted (especially `MinSize`).
- Non-deterministic counts: ensure parallel meshing isn’t enabled and that you’re not reusing cached triangulations without cleaning (`IMeshTools_Context` / `CleanModel`).

## Runnable repro (optional)

- Path: `repros/lane-meshing/README.md`
- How to run: `repros/lane-meshing/run.sh`
- Oracle outputs: `repros/lane-meshing/golden/meshing.json`

## Compare to papers / alternatives

- Mesh-first pipelines (triangle meshes + mesh booleans/repair): often simpler and fast for realtime rendering, but lose exact B-Rep parametric intent; OCCT’s meshing sits on top of B-Rep topology and aims to produce triangulation as a derived artifact.
- Adaptive remeshing / quality-driven meshing libraries: can optimize aspect ratios and manifoldness aggressively; OCCT exposes a parameter set (min size, surface deviation controls, “allow quality decrease”) and delegates phase tools via `IMeshTools_Context`.
- Point-cloud / implicit surface discretization: robust for noisy inputs but lacks explicit topology connectivity; OCCT assumes a `TopoDS_Shape` topology graph as the starting point and builds a discrete model around faces/edges.
