# Dossier: <TITLE>

Status: draft

## Purpose

What problem/area this dossier covers and why it matters.

## Provenance (required)

- OCCT version: see `notes/maps/provenance.md`
- Assumptions: what build/config/runtime conditions matter for this dossier.

## Scenario + observable outputs (required)

Define 1 concrete scenario that makes the area “real” and debuggable:
- Scenario: <one sentence>
- Observable outputs: <what you can measure/log/assert>
- Success criteria: <what “correct” means, incl. tolerances>

## Spine (call chain) (required)

5–15 key symbols in approximate execution order (include file + symbol):
1) `path/to/file.hxx` — `Class::Method` (role)
2) …

## High-level pipeline

Describe the main phases and data flow at a subsystem level.

## Key classes/files

List the key entry points and supporting types with citations:
- `path/to/file.hxx` — `ClassName::MethodName` (role)

## Core data structures + invariants

What structures appear central, and what invariants you infer from the code:
- Structure: `TypeName` (where)
  - Invariants: …

## Tolerance / robustness behaviors (observed)

Record tolerance values, fuzzy comparisons, fallback paths, and error handling patterns you see:
- `path/to/file.cxx` — `FunctionName` uses `<tolerance>` for …

## Failure modes + diagnostics (recommended)

What can go wrong and how it is reported (exceptions, status codes, alerts, warnings):
- `path/to/file.cxx` — `FunctionName` emits <alert/status> when …

## Runnable repro + oracle outputs (optional, recommended)

If/when needed, add a minimal runnable repro under `repros/`:
- Path: `repros/<slug>/README.md`
- How to run: …
- Oracle outputs: `repros/<slug>/golden/*.json` (or similar)

## Compare to papers / alternatives

Briefly compare to at least 2–3 alternative approaches and tradeoffs:
- Alternative A: …
- Alternative B: …
