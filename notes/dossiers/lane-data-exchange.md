# Dossier: Data exchange (STEP / IGES / XSControl / IFSelect / Transfer)

Status: draft

## Purpose

Capture OCCT’s “data exchange” stack at the level where a file becomes a `TopoDS_Shape`: format-specific readers (STEP/IGES), the shared `XSControl_Reader` groundwork (work session + selections + transfer bookkeeping), and the transfer process machinery that maps an `InterfaceModel` entity graph into application objects with trace/check support.

## Mental model (human-first)

Data exchange in OCCT is a **two-world bridge**:
- World A: a schema/entity graph (“interface model”) representing what the file says.
- World B: OCCT application objects (most commonly `TopoDS_Shape`) representing what you can model with.

The reader façade (`STEPControl_Reader` / `IGESControl_Reader`) loads the file, but the *real work* is transfer:
- select which entities/roots to convert
- transfer them into shapes
- accumulate checks, warnings, and statistics so you can understand what was dropped, approximated, or healed

If a file “loads but gives weird shapes”, you usually want to inspect the transfer process diagnostics and unit handling before blaming modeling algorithms.

## Provenance (required)

- OCCT version + build config: `notes/maps/provenance.md`
- Evidence sources are cited inline in this dossier (file paths under `occt/src/`).

## Scenario + observable outputs (required)

- Scenario: read a small STEP/IGES file, transfer roots to shapes, and inspect transfer checks/statistics.
- Observable outputs: `IFSelect_ReturnStatus`; warning/fail messages; number of transferred roots/shapes; units used during transfer.
- Success criteria: clean inputs transfer without fail status; warnings are stable and traceable.

## Walkthrough (repro-driven)

1) Run: `bash repros/lane-data-exchange/run.sh`
2) Inspect the oracle output: `repros/lane-data-exchange/golden/data-exchange.json`
3) Read it as a minimal “import contract” checklist:
   - STEP IO health: `step.write_status` and `step.read_status` should be `RetDone`.
   - Transfer health: `step.nb_roots_for_transfer` and `step.nb_roots_transferred` should match expectation (usually 1 for the simple compound in this repro).
   - “Did we preserve the shape?”: compare `source.counts`/`source.bbox` vs `imported.counts`/`imported.bbox` (they should match in this controlled roundtrip).
   - File-level scale proxy: `step.model_nb_entities` gives a rough sense of how big the STEP model is (useful when correlating transfer time/complexity later).

## Spine (call chain) (required)

1) `occt/src/XSControl/XSControl_Reader.hxx` — `XSControl_Reader::ReadFile` (shared load)
2) `occt/src/STEPControl/STEPControl_Reader.hxx` — `STEPControl_Reader::ReadFile` / `TransferRoots` (STEP façade)
3) `occt/src/IGESControl/IGESControl_Reader.hxx` — `IGESControl_Reader::NbRootsForTransfer` (IGES façade)
4) `occt/src/Transfer/Transfer_TransientProcess.hxx` — `Transfer_TransientProcess` (transfer trace/check support)
5) `occt/src/IFSelect/IFSelect_SessionPilot.hxx` — `IFSelect_SessionPilot::Perform` (scriptable session)

## High-level pipeline

- Reader façade (format-specific):
  - `STEPControl_Reader` reads STEP data, supports transfer of roots/lists/entities, and exposes unit discovery and system length unit control. (`occt/src/STEPControl/STEPControl_Reader.hxx`)
  - `IGESControl_Reader` reads IGES data and supports “visible roots only” mode for transfer root selection. (`occt/src/IGESControl/IGESControl_Reader.hxx`)
- Shared reader base: `XSControl_Reader` provides the general workflow:
  1) load a file into an `Interface_InterfaceModel` (`ReadFile`/`ReadStream`)
  2) compute a selection of entities to transfer (defaulting to the whole model if not specified)
  3) transfer entities into OCCT shapes and accumulate results across runs (until cleared). (`occt/src/XSControl/XSControl_Reader.hxx`)
- Shape processing hooks: `XSControl_Reader` supports configuring shape processing/healing parameters and “operations flags”, while `STEPControl_Reader` / `IGESControl_Reader` override default shape-fix parameters and default process flags used by the base class. (`occt/src/XSControl/XSControl_Reader.hxx`, `occt/src/STEPControl/STEPControl_Reader.hxx`, `occt/src/IGESControl/IGESControl_Reader.hxx`)
- Session/selection automation: `IFSelect_SessionPilot` interprets alphanumeric commands and delegates to activators to manipulate an `IFSelect_WorkSession` (rules for selection/dispatch, file data, evaluations, transfer results). (`occt/src/IFSelect/IFSelect_SessionPilot.hxx`)
- Transfer internals: `Transfer_TransientProcess` is a transfer process specialized for transient/app objects, aware of the source `InterfaceModel` and optional graph; it provides trace/check helpers, a named context map, and typed-graph queries. (`occt/src/Transfer/Transfer_TransientProcess.hxx`)

## Key classes/files

- `occt/src/STEPControl/STEPControl_Reader.hxx` — `STEPControl_Reader` (STEP read/check/transfer; units + default shape-fix hooks)
- `occt/src/IGESControl/IGESControl_Reader.hxx` — `IGESControl_Reader` (IGES read/check/transfer; visible-root filtering; default shape-fix hooks)
- `occt/src/XSControl/XSControl_Reader.hxx` — `XSControl_Reader` (work session + selection + transfer statistics/check printing; shape processing parameter API)
- `occt/src/IFSelect/IFSelect_SessionPilot.hxx` — `IFSelect_SessionPilot` (command-driven session control via activators)
- `occt/src/Transfer/Transfer_TransientProcess.hxx` — `Transfer_TransientProcess` (model/graph/context-aware transient transfer; trace/check helpers)

## Core data structures + invariants

- Structure: `XSControl_Reader` (`occt/src/XSControl/XSControl_Reader.hxx`)
  - Work-session centered: a reader owns or attaches to an `XSControl_WorkSession` and is responsible for setting the “norm” (controller) and session before reading/transferring. (`XSControl_Reader` ctors, `SetNorm`, `SetWS`, `WS`)
  - Transfer accumulation: documentation emphasizes that shapes are accumulated across successive transfers, and are cleared explicitly (e.g., `ClearShapes`) or reset by transfer methods like `TransferRoots`. (Class comment)
  - Shape processing configuration: exposes explicit parameter and flag APIs (`SetShapeFixParameters`, `SetShapeProcessFlags`) which implies a design invariant that healing is an explicit policy layer rather than an implicit side effect. (`XSControl_Reader` shape processing methods)

- Structure: `Transfer_TransientProcess` (`occt/src/Transfer/Transfer_TransientProcess.hxx`)
  - Source model/graph awareness: process can hold an `Interface_InterfaceModel` and (optionally) an `Interface_HGraph`; graph supersedes model for graph queries and is required for typed-sharing traversal. (`SetModel`, `SetGraph`, `HasGraph`, `TypedSharings`)
  - Named context map: provides `SetContext` / `GetContext` and exposes the underlying `NCollection_DataMap<TCollection_AsciiString, Handle(Standard_Transient)>`, enabling actor-specific configuration during transfer. (`Transfer_TransientProcess::Context`, `SetContext`, `GetContext`)
  - Check/trace coupling: `PrintTrace` and `CheckNum` are specialized to print entity labels/types and to map a transferred transient back to a model-number for check lists. (`Transfer_TransientProcess::PrintTrace`, `CheckNum`)

- Structure: `IFSelect_SessionPilot` (`occt/src/IFSelect/IFSelect_SessionPilot.hxx`)
  - Command → activator dispatch: pilot parses a command line into words (limited to 10), supports recording commands, and executes either built-ins or an activator library over the underlying work session. (`IFSelect_SessionPilot::SetCommandLine`, `NbWords`, `Perform`, `Do`)

## Tolerance / robustness behaviors (observed)

- Reader return status: `STEPControl_Reader::ReadFile` / `ReadStream` return `IFSelect_ReturnStatus`, reinforcing a “load first, check/transfer later” workflow with explicit status handling. (`occt/src/STEPControl/STEPControl_Reader.hxx`, `occt/src/XSControl/XSControl_Reader.hxx`)
- Units as a first-class concern (STEP): `STEPControl_Reader` can extract file unit names and allows setting/querying “system length unit” used by the transfer process. (`occt/src/STEPControl/STEPControl_Reader.hxx` — `FileUnits`, `SetSystemLengthUnit`, `SystemLengthUnit`)
- Data-quality guards (transfer): `Transfer_TransientProcess` exposes `IsDataLoaded` and `IsDataFail` to allow callers to avoid transferring entities with syntactic/semantic load-time issues. (`occt/src/Transfer/Transfer_TransientProcess.hxx`)
- Shape healing defaults live in readers: `STEPControl_Reader` and `IGESControl_Reader` override `GetDefaultShapeFixParameters()` and `GetDefaultShapeProcessFlags()` used by the base class, indicating format-level default healing policies. (`occt/src/STEPControl/STEPControl_Reader.hxx`, `occt/src/IGESControl/IGESControl_Reader.hxx`)
- Printing/check support: `XSControl_Reader` provides APIs to print load/transfer checks and transfer statistics, supporting iterative “import → inspect failures/warnings → adjust parameters → retransfer” workflows. (`occt/src/XSControl/XSControl_Reader.hxx`)

## Failure modes + diagnostics (recommended)

- `read_status` not `RetDone`: treat as a parsing/load problem (file corrupt/unsupported variant); start by printing load checks via `XSControl_Reader`.
- Transfer roots don’t transfer (`nb_roots_transferred` < expected): treat as a selection/transfer pipeline issue; inspect transfer checks in the `Transfer_TransientProcess` rather than assuming “empty file”.
- Shape counts/bbox mismatch after roundtrip: suspect unit scaling, shape processing defaults, or missing representation conversions; validate unit settings first (`SystemLengthUnit`).

## Runnable repro (optional)

- Path: `repros/lane-data-exchange/README.md`
- How to run: `repros/lane-data-exchange/run.sh`
- Oracle outputs: `repros/lane-data-exchange/golden/data-exchange.json`

## Compare to papers / alternatives

- STEPcode / IFCOpenShell / other schema-first toolchains: often focus on robust parsing and schema fidelity, leaving geometric translation to additional layers; OCCT bundles schema packages plus an integrated selection/session/transfer pipeline.
- Assimp-style “one shot” importers: optimized for mesh/scene ingestion; OCCT’s exchange pipeline is B-Rep centric and exposes fine-grained selection and transfer traceability (`Transfer_TransientProcess`, `IFSelect`).
- Commercial CAD exchange stacks: typically provide stronger format-specific healing and PMI/metadata handling at the cost of closed heuristics; OCCT exposes defaults plus explicit parameter/flag configuration for shape processing.
