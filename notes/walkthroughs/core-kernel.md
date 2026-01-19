# Walkthrough: Core kernel (tolerances, transforms, handles)

This walkthrough is a practical “how to read the kernel rules” guide using the existing repro.

## Run the repro

- `just occt-build`
- `bash repros/lane-core-kernel/run.sh`

Oracle output:
- `repros/lane-core-kernel/golden/core-kernel.json`

## What to look at

- `precision.*`: the tolerance vocabulary (`Confusion`, `Angular`, etc.) that higher-level algorithms reuse everywhere.
- `gp.transform`: a concrete example of `gp_Trsf` application (translation + rotation) producing a stable point.
- `handles.*`: refcount behavior for handle-managed objects (`Standard_Transient` + `opencascade::handle<T>`).

Next: connect these tolerances to booleans/meshing guardrails (`notes/walkthroughs/booleans.md`, `notes/walkthroughs/meshing.md`).

