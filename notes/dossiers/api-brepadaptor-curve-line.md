# Dossier: `BRepAdaptor_Curve::Line()`

Status: draft

## Purpose

Document what `BRepAdaptor_Curve::Line()` returns, when it is valid to call, and how location/representation choices affect the result.

## Provenance (required)

- OCCT version + build config: `notes/maps/provenance.md`
- Code references:
  - `occt/src/BRepAdaptor/BRepAdaptor_Curve.hxx`
  - `occt/src/BRepAdaptor/BRepAdaptor_Curve.cxx`
  - `occt/src/GeomAdaptor/GeomAdaptor_Curve.cxx`
  - `occt/src/Adaptor3d/Adaptor3d_CurveOnSurface.cxx`

## What the method does

`BRepAdaptor_Curve` adapts a `TopoDS_Edge` as an `Adaptor3d_Curve`. Internally it is in one of two modes:
- **3D curve mode**: `myConSurf` is null; geometry comes from `BRep_Tool::Curve(edge, location, first, last)`. (`occt/src/BRepAdaptor/BRepAdaptor_Curve.cxx` — `BRepAdaptor_Curve::Initialize(const TopoDS_Edge&)`)
- **Curve-on-surface mode**: `myConSurf` is non-null; geometry comes from an edge pcurve + surface, either as a fallback when the edge has no 3D curve, or forced by initializing with an edge+face. (`occt/src/BRepAdaptor/BRepAdaptor_Curve.hxx` + `BRepAdaptor_Curve::Initialize(const TopoDS_Edge&, const TopoDS_Face&)`)

`Line()` returns the analytic `gp_Lin` representation of the *current* adapted curve, then applies the stored placement transform:
- Delegate to `myCurve.Line()` (3D curve mode) or `myConSurf->Line()` (curve-on-surface mode).
- Apply `L.Transform(myTrsf)` and return. (`occt/src/BRepAdaptor/BRepAdaptor_Curve.cxx` — `BRepAdaptor_Curve::Line()`)

In practice: the returned `gp_Lin` is in the same coordinate system as `Value()/D0()/...` from the adaptor (i.e., with the underlying edge/surface location applied).

## Preconditions + exceptions

You must call `Line()` only when the curve type is a line:
- Check `GetType() == GeomAbs_Line` first. (`occt/src/BRepAdaptor/BRepAdaptor_Curve.cxx` — `BRepAdaptor_Curve::GetType()`)
- If the underlying curve is not a line, `Line()` raises `Standard_NoSuchObject` via:
  - `GeomAdaptor_Curve::Line()` in 3D curve mode. (`occt/src/GeomAdaptor/GeomAdaptor_Curve.cxx`)
  - `Adaptor3d_CurveOnSurface::Line()` in curve-on-surface mode. (`occt/src/Adaptor3d/Adaptor3d_CurveOnSurface.cxx`)

Related initializer failures to expect:
- `BRepAdaptor_Curve::Initialize(edge)` throws `Standard_NullObject("BRepAdaptor_Curve::No geometry")` when neither a 3D curve nor a usable pcurve-on-surface can be obtained. (`occt/src/BRepAdaptor/BRepAdaptor_Curve.cxx`)
- `BRepAdaptor_Curve::Initialize(edge, face)` raises if the edge has no pcurve on that face (per the class contract in `occt/src/BRepAdaptor/BRepAdaptor_Curve.hxx`).

## Representation choice matters

The *same* `TopoDS_Edge` can yield different results depending on how you initialize the adaptor:
- `BRepAdaptor_Curve(edge)` prefers a stored 3D curve if present, otherwise falls back to a pcurve-on-surface representation. (`occt/src/BRepAdaptor/BRepAdaptor_Curve.hxx`)
- `BRepAdaptor_Curve(edge, face)` forces curve-on-surface evaluation on that face (and will error if missing).

This is relevant for `Line()` because “is it a line?” is representation-dependent:
- An edge may have a 3D curve that is a `Geom_Line` (so `GetType()==GeomAbs_Line` and `Line()` works).
- An edge may have *no* 3D curve, but the pcurve-on-surface adaptor can still classify the resulting 3D curve as a line in certain elementary-surface cases.

One concrete example in OCCT: `Adaptor3d_CurveOnSurface` can classify a pcurve `Geom2d_Line` as a **3D line** for specific elementary surfaces (e.g., cylinder/cone iso-parameter curves). See `occt/src/Adaptor3d/Adaptor3d_CurveOnSurface.cxx` around assignments to `myType = GeomAbs_Line`.

## Location handling (why `Line()` transforms)

`BRepAdaptor_Curve` stores `myTrsf` from the `TopLoc_Location` returned by `BRep_Tool` during initialization:
- In 3D curve mode: from `BRep_Tool::Curve(edge, L, first, last)`.
- In curve-on-surface mode: from `BRep_Tool::Surface(face, L)` (edge+face initialization) or from `BRep_Tool::CurveOnSurface(edge, pcurve, surface, L, ...)` (fallback path).

All “geometric” accessors (`Value`, `D*`, and analytic getters like `Line()`) apply `myTrsf` before returning results. (`occt/src/BRepAdaptor/BRepAdaptor_Curve.cxx`)

If you need the untransformed analytic object for some reason, you must bypass `BRepAdaptor_Curve` and work with the underlying geometry + location yourself (e.g., via `BRep_Tool::Curve` / `CurveOnSurface`).

## Recommended usage pattern

- Prefer checking type before calling:
  - `if (aCurve.GetType() == GeomAbs_Line) { gp_Lin L = aCurve.Line(); }`
- If you need to know which representation is used:
  - `Is3DCurve()` vs `IsCurveOnSurface()` tells you whether the adaptor is backed by the 3D curve or a curve-on-surface. (`occt/src/BRepAdaptor/BRepAdaptor_Curve.hxx`)
- If you specifically want a face-relative pcurve-derived interpretation:
  - Initialize with `(edge, face)` and check `GetType()` again.

