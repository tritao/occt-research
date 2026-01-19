# Walkthrough: Topology data model (identity, location, orientation)

This walkthrough shows the handful of invariants you need to keep in your head when working with `TopoDS_Shape`.

## Run the repro

- `just occt-build`
- `bash repros/lane-topology-data-model/run.sh`

Oracle output:
- `repros/lane-topology-data-model/golden/topology-data-model.json`

## What to look at

- Identity tiers in `identity.*`
  - Same payload only: `is_partner`
  - Same payload + location: `is_same`
  - Same payload + location + orientation: `is_equal`
- Location is per-instance: `location.instB_translation`
- Maps ignore orientation by design: `maps.indexed_map_of_shape_sizes`

If this is surprising, it will explain many downstream “why is this considered the same shape?” bugs.

