# Dossier: Visualization (AIS / Prs3d / V3d / Graphic3d / OpenGl)

Status: draft

## Purpose

Capture OCCT’s interactive visualization stack at the abstraction boundaries an application typically touches: interactive objects and selection (`AIS_*`), viewer/view lifecycle (`V3d_*`), and rendering backend separation (`Graphic3d_*` vs `OpenGl_*`). The emphasis here is on how shapes become presentations in a viewer, how selection/highlighting is managed, and what the driver abstraction is responsible for.

## Mental model (human-first)

Visualization in OCCT is a layered pipeline that turns “a shape” into “something you can see and pick”:
- `AIS_*` is the application-facing layer: interactive objects, display modes, selection/highlight policies.
- `Prs3d` / presentation managers build and cache the draw structures for those interactive objects.
- `V3d_*` manages viewers and views (camera, clipping, redraw).
- `Graphic3d` abstracts the rendering driver; `OpenGl_*` is the default backend implementation.

If you understand these boundaries, debugging becomes much simpler: most “why is this not visible/selectable?” issues are either an AIS-context state issue (modes/selection) or a view/driver lifecycle issue (structures not updated/redrawn).

## Provenance (required)

- OCCT version + build config: `notes/maps/provenance.md`
- Evidence sources are cited inline in this dossier (file paths under `occt/src/`).

## Scenario + observable outputs (required)

- Scenario: tessellate a shape using `Prs3d_Drawer` settings and inspect the resulting triangulation size proxies (no GUI).
- Observable outputs: absolute vs relative deflection; effective deflection; whether tessellation existed and was recomputed; node/triangle counts.
- Success criteria: tessellation is reproducible under fixed settings and responds predictably to deflection policy.

## Walkthrough (repro-driven)

1) Run: `bash repros/lane-visualization/run.sh`
2) Inspect the oracle output: `repros/lane-visualization/golden/visualization.json`
3) Use it to connect “drawer settings” to “triangle counts”:
   - For each shape (`shapes.box`, `shapes.cylinder`), compare scenarios under `scenarios.*`:
     - Policy knobs: `deflection_mode` plus `abs_deflection` / `rel_coeff`
     - What OCCT actually uses: `effective_deflection`
     - Whether tessellation existed and was recomputed: `is_tessellated_before/after`, `tessellate_recomputed`
     - Size proxies: `triangulation.total_nodes` and `triangulation.total_triangles`

## Spine (call chain) (required)

1) `occt/src/OpenGl/OpenGl_GraphicDriver.hxx` — `OpenGl_GraphicDriver` (backend driver)
2) `occt/src/V3d/V3d_Viewer.hxx` — `V3d_Viewer::CreateView` (viewer/view creation)
3) `occt/src/V3d/V3d_View.hxx` — `V3d_View::SetWindow` / redraw (window binding + redraw)
4) `occt/src/AIS/AIS_InteractiveContext.hxx` — `AIS_InteractiveContext::Display` / `Update` (display lifecycle)
5) `occt/src/AIS/AIS_Shape.hxx` — `AIS_Shape` (shape presentation + selection modes)

## High-level pipeline

- Backend setup: application creates a `Graphic3d_GraphicDriver` (usually `OpenGl_GraphicDriver`) that owns low-level resources and creates views/structures. (`occt/src/Graphic3d/Graphic3d_GraphicDriver.hxx`, `occt/src/OpenGl/OpenGl_GraphicDriver.hxx`)
- Viewer/view lifecycle:
  - `V3d_Viewer` is constructed over a `Graphic3d_GraphicDriver`, owns a `Graphic3d_StructureManager`, and creates `V3d_View` instances. (`occt/src/V3d/V3d_Viewer.hxx`)
  - `V3d_View` binds to a window (`SetWindow`), exposes redraw/update methods, and provides view-level configuration. (`occt/src/V3d/V3d_View.hxx`)
- Interaction & selection:
  - `AIS_InteractiveContext` manages display state, recomputation, selection activation, and highlighting for `AIS_InteractiveObject` instances across one or more viewers. It expects objects to be modified through the context once loaded. (`occt/src/AIS/AIS_InteractiveContext.hxx`)
  - `AIS_Shape` is the common interactive object for displaying `TopoDS_Shape`, supports shape decomposition for subshape selection modes, and owns per-object presentation attributes (`Prs3d_Drawer`). (`occt/src/AIS/AIS_Shape.hxx`)
- Z-layer and immediate rendering: viewer and context expose “immediate” redraw paths and Z-layer usage for highlighting; e.g., highlight styles are described as using top/topmost Z-layers and immediate redraw via `V3d_View::RedrawImmediate()`. (`occt/src/AIS/AIS_InteractiveContext.hxx`, `occt/src/V3d/V3d_Viewer.hxx`)

## Key classes/files

- `occt/src/AIS/AIS_InteractiveContext.hxx` — `AIS_InteractiveContext` (display/redisplay/update; selection activation; highlight styles)
- `occt/src/AIS/AIS_Shape.hxx` — `AIS_Shape` (shape presentation + decomposition selection modes + per-object drawer overrides)
- `occt/src/V3d/V3d_Viewer.hxx` — `V3d_Viewer` (viewer lifecycle; view creation; redraw; Z-layer management; driver access)
- `occt/src/V3d/V3d_View.hxx` — `V3d_View::SetWindow` / redraw APIs (window binding + view services)
- `occt/src/Graphic3d/Graphic3d_GraphicDriver.hxx` — `Graphic3d_GraphicDriver` (create/remove structures/views; layers; VBO/vsync; resource limits)
- `occt/src/OpenGl/OpenGl_GraphicDriver.hxx` — `OpenGl_GraphicDriver` (OpenGL implementation; context init; caps; view/structure bookkeeping)

## Core data structures + invariants

- Structure: `AIS_InteractiveContext` (`occt/src/AIS/AIS_InteractiveContext.hxx`)
  - “Modify through context” invariant: once an interactive object is known by the context, it should be modified via context methods, not by calling methods directly on the object. (Class comment)
  - Default selection mode activation: `Display()` documents that the object’s default selection mode is automatically activated when `GetAutoActivateSelection()` is true (default). (`AIS_InteractiveContext::Display` comment, `SetAutoActivateSelection`)
  - Highlighting styles as policy objects: highlight styles are stored as `Prs3d_Drawer` instances keyed by `Prs3d_TypeOfHighlight`, with documented defaults for colors and Z-layer usage. (`AIS_InteractiveContext::HighlightStyle` comment)

- Structure: `AIS_Shape` (`occt/src/AIS/AIS_Shape.hxx`)
  - Shape decomposition enabled: `AcceptShapeDecomposition()` returns true, enabling “standard activation modes” (subshape selection) in a local context. (`AIS_Shape::AcceptShapeDecomposition`, class comment)
  - Selection mode ↔ shape type mapping: `SelectionType()` and `SelectionMode()` provide a fixed mapping between selection modes (0..8) and `TopAbs_ShapeEnum` (shape/vertex/edge/…/compound). (`AIS_Shape::SelectionType`, `AIS_Shape::SelectionMode`)
  - Per-object presentation overrides: `AIS_Shape` supports local deviation coefficients/angles and uses `Prs3d_Drawer` “own settings” to override global display precision. (`AIS_Shape` class comment; `SetOwnDeviationCoefficient`, `SetOwnDeviationAngle`)

- Structure: `V3d_Viewer` / `Graphic3d_GraphicDriver` (`occt/src/V3d/V3d_Viewer.hxx`, `occt/src/Graphic3d/Graphic3d_GraphicDriver.hxx`)
  - Driver boundary: viewer owns a `Graphic3d_GraphicDriver` that creates/owns `Graphic3d_CView` and `Graphic3d_CStructure` resources. (`Graphic3d_GraphicDriver::CreateView`, `CreateStructure`)
  - Layer ownership invariant: Z-layers are controlled at the viewer/driver level and apply across managed views; e.g., `V3d_Viewer::AddZLayer()` documents layers are added to all views and not per-view. (`V3d_Viewer::AddZLayer` comment, `Graphic3d_GraphicDriver` layer APIs)

- Structure: `OpenGl_GraphicDriver` (`occt/src/OpenGl/OpenGl_GraphicDriver.hxx`)
  - Context initialization modes: supports creating its own default GL context (`InitContext`) or initializing from an existing EGL context (`InitEglContext`). (`OpenGl_GraphicDriver::InitContext`, `InitEglContext`)
  - State counters: maintains counters for OpenGL structures and primitive array unique IDs, implying internal cache invalidation/versioning mechanics. (`OpenGl_StateCounter`, `OpenGl_GraphicDriver::GetStateCounter`, `GetNextPrimitiveArrayUID`)

## Tolerance / robustness behaviors (observed)

- Capability guards: `Graphic3d_GraphicDriver` exposes `InquireLimit()` and convenience queries (max lights/clip planes/views), making hardware/driver capability explicit. (`occt/src/Graphic3d/Graphic3d_GraphicDriver.hxx`)
- VBO usage constraints: `OpenGl_GraphicDriver::EnableVBO()` warns it should be called before any primitives are displayed; disabling VBO degrades performance. (`occt/src/OpenGl/OpenGl_GraphicDriver.hxx`)
- Vertical sync control: driver abstraction exposes `IsVerticalSync()`/`SetVerticalSync()` and OpenGL driver implements them. (`occt/src/Graphic3d/Graphic3d_GraphicDriver.hxx`, `occt/src/OpenGl/OpenGl_GraphicDriver.hxx`)

## Failure modes + diagnostics (recommended)

- “My shape isn’t tessellated”: check whether the deflection policy is too strict/too loose and whether tessellation is actually invoked (the repro records before/after + recompute flags).
- Triangulation density surprises: compare `effective_deflection` rather than just the raw drawer parameters; relative policies can produce counterintuitive results depending on shape size.
- GUI issues (not covered by repro): if display/selection is broken in an app, focus on `AIS_InteractiveContext` state (display/selection modes, highlight style) and `V3d_View` redraw lifecycle.

## Runnable repro (optional)

- Path: `repros/lane-visualization/README.md`
- How to run: `repros/lane-visualization/run.sh`
- Oracle outputs: `repros/lane-visualization/golden/visualization.json`

## Compare to papers / alternatives

- Scene-graph renderers (VTK, three.js): often operate over mesh/scene primitives and manage selection at application level; OCCT’s AIS layer integrates B-Rep shape decomposition selection and presentation attributes for CAD-style interaction.
- “Immediate mode” GUI render integration: some apps embed OpenGL/Vulkan directly; OCCT’s `Graphic3d_GraphicDriver`/`V3d` stack provides a portable view/structure abstraction with backend-specific implementations.
- Modern GPU APIs (Vulkan/Metal/D3D12): offer explicit control and potentially better performance; OCCT’s default backend is OpenGL (`OpenGl_GraphicDriver`), with an abstraction boundary that could support alternative backends while keeping AIS/V3d APIs stable.
