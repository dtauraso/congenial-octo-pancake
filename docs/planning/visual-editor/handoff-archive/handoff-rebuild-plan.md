# Handoff — Rebuild plan summary (carried forward)

Visual primitives:
  1. **chan → wire.** Spec'd by chan sketches.
  2. **Per-node running indicator (with reloop).** Prose spec only;
     drawn for the first time in port step 2.

Semantic contracts (Go-side tests under `internal/substrate/contracts/`
or equivalent):
  - **R1** Channel FIFO.
  - **R2** Select determinism = lowest-index.
  - **R3** Scheduler determinism (byte-identical state given same
    inputs).
  - **R4** No goroutine runs twice per step.
  - **R5** Animation step = state transition (sub-frame tweening of
    in-flight position OK; endpoints are the transitions).

Port plan steps:
  1. Chan→wire renderer + trivial two-node topology. ← **next**
  2. Per-node running indicator + reloop glyph.
  3. R1–R5 contract tests (red until substrate satisfies them).
  4. Pilot port: one inhibitor (smallest equivalent).
  5. Bulk port: input sources → latches → inhibitors → detectors →
     gates → partitions.
  6. Delete probe machinery (`.probe/stuck-pulse-last.json` family,
     `.probe/runner-errors-last.json`, `RunnerProbe` toolbar latches,
     `window.__resetPulseLeak`).

## Auto-retire signal for `task/in0-readgate-emission-ack`

Pre-authorised by rebuild-plan.md: delete the parked branch (local
+ remote) on the **first green rebuild contract test** (any of
R1–R5). No re-ask required.
