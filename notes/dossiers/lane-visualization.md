# Dossier: Visualization (AIS / Prs3d / V3d / Graphic3d / OpenGl)

Status: draft

## Purpose

Capture OCCT’s interactive visualization stack at the abstraction boundaries an application typically touches: interactive objects and selection (`AIS_*`), viewer/view lifecycle (`V3d_*`), and rendering backend separation (`Graphic3d_*` vs `OpenGl_*`). The emphasis here is on how shapes become presentations in a viewer, how selection/highlighting is managed, and what the driver abstraction is responsible for.

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

## Runnable repro (optional)

Not created for this dossier (can be added under `repros/lane-visualization/` if/when needed).

## Compare to papers / alternatives

- Scene-graph renderers (VTK, three.js): often operate over mesh/scene primitives and manage selection at application level; OCCT’s AIS layer integrates B-Rep shape decomposition selection and presentation attributes for CAD-style interaction.
- “Immediate mode” GUI render integration: some apps embed OpenGL/Vulkan directly; OCCT’s `Graphic3d_GraphicDriver`/`V3d` stack provides a portable view/structure abstraction with backend-specific implementations.
- Modern GPU APIs (Vulkan/Metal/D3D12): offer explicit control and potentially better performance; OCCT’s default backend is OpenGL (`OpenGl_GraphicDriver`), with an abstraction boundary that could support alternative backends while keeping AIS/V3d APIs stable.
