### 9. Time and space complexity

**What it checks.** Hot paths don't have hidden quadratic or worse
behavior on node count, edge count, frame count, or trace length.
Specific paths to scrutinize:

- **`topogen` run.** Total time should be roughly linear in spec
  size. Nested loops over nodes × edges should be justified or
  flattened.
- **Animation tick.** Per-frame work in the editor should be O(n)
  in visible nodes/edges, not O(n²). React Flow re-render
  triggers should be scoped (memoization, selector-narrowing in
  the Zustand store).
- **Trace decode and replay.** Decoding a trace and stepping
  through frames should be O(frames) per playback, not
  O(frames²).
- **Save / load round-trip.** O(spec size); no accidental
  whole-file re-parse per field change.
- **Spatial cost.** No accidental retention (closures capturing
  large objects, listeners not cleaned up, history stacks growing
  unbounded — `zundo` middleware should have a configured limit).

**Passing.** Findings list with rough Big-O estimate per hot path
and any concrete numbers if profiling was done.

**Cadence.** On demand. Triggered by user reporting slowness, or
after a substrate-touching change.

**Cost.** Medium-to-large ($10–$25 for a real profiling-backed
pass).
