# Dossier: Meshing (BRepMesh / IMeshTools / IMeshData)

Status: draft

## Purpose

Capture OCCT’s B-Rep tessellation (“meshing”) entry points, parameterization, and discrete-model orchestration. This dossier focuses on how meshing is staged (model build → edge discretization → healing/pre/post processing → face discretization), what parameters mean at the API surface, and which tolerance/guardrails are enforced.

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

## Runnable repro (optional)

Not created for this dossier (can be added under `repros/lane-meshing/` if/when needed).

## Compare to papers / alternatives

- Mesh-first pipelines (triangle meshes + mesh booleans/repair): often simpler and fast for realtime rendering, but lose exact B-Rep parametric intent; OCCT’s meshing sits on top of B-Rep topology and aims to produce triangulation as a derived artifact.
- Adaptive remeshing / quality-driven meshing libraries: can optimize aspect ratios and manifoldness aggressively; OCCT exposes a parameter set (min size, surface deviation controls, “allow quality decrease”) and delegates phase tools via `IMeshTools_Context`.
- Point-cloud / implicit surface discretization: robust for noisy inputs but lacks explicit topology connectivity; OCCT assumes a `TopoDS_Shape` topology graph as the starting point and builds a discrete model around faces/edges.
