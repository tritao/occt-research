# Lane map: <lane-slug>

Scope: <what this lane covers in one sentence>.

Source lane definition: `notes/maps/lanes.md` (entry packages: `<PkgA>`, `<PkgB>`, …).

## Provenance (required)

- OCCT version + build config: `notes/maps/provenance.md`
- Map inputs:
  - `notes/maps/packages.json`
  - `notes/maps/include_graph.core.dot` / `notes/maps/include_graph.core.md`
  - `notes/maps/include_graph.exchange_vis.dot` / `notes/maps/include_graph.exchange_vis.md` (if relevant)
  - `notes/maps/toolkits.dot` / `notes/maps/cmake-targets.dot` (if relevant)

## Package footprint (size proxy)

From `notes/maps/packages.json`:
- `<PkgA>`: <n> sources, <n> headers, <n> class/struct decls

## Core types / entry points (with code citations)

- `occt/src/<Pkg>/<File>.hxx` — `<Symbol>` (<role>)

## Include graph evidence (who pulls these packages in)

Data source: `notes/maps/include_graph.<core|exchange_vis>.dot` (heaviest edges summarized in `notes/maps/include_graph.<core|exchange_vis>.md`).

Top inbound include edges into lane packages:
- `<FromPkg>` -> `<ToPkg>`: <count>

## Local dependency shape (what these packages depend on)

From `notes/maps/include_graph.<core|exchange_vis>.dot` (largest direct edges originating in lane packages):
- `<FromPkg>` -> `<ToPkg>`: <count>

## Suggested dossier entry points (next task)

If writing `task-<id>` (dossier), start from:
- `occt/src/<Pkg>/<File>.hxx` (+ `.../<File>.cxx`) — <what to learn here>
