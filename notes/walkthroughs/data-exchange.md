# Walkthrough: Data exchange (STEP roundtrip)

This walkthrough treats data exchange as a contract: “did the file load?”, “did roots transfer?”, “did the shape survive?”.

Repro + oracle: `notes/walkthroughs/data-exchange-cases.md`.

## What to look at

- `step.write_status` and `step.read_status` should be `RetDone`.
- `step.nb_roots_for_transfer` and `step.nb_roots_transferred` should match expectation.
- `source.counts`/`source.bbox` should match `imported.counts`/`imported.bbox` for this controlled roundtrip.
