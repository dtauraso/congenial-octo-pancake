# Cohort: deferred substrate feature

Retired from the v0 substrate on 2026-05-14. This file preserves the
design intent so it can be re-derived against real self-sustaining-mode
requirements later, rather than against the speculative ones it was
built against the first time.

## What cohort was

A **lap label** on wires. Each wire carried a `cohort: number`
assigned by `parseSpec` via a topological pass: source-of-Input was
cohort 0, each downstream hop incremented by 1.

A **cohort gate** in the substrate held a monotonic `released: Set<number>`.
The driver called `gate.release(N)` to authorize cohort-N wires to
dispatch `arrive`. Wires whose cohort was not yet released would park
and subscribe to the gate.

A **cohort cursor** lived in `useTickDriver`. Tick was the cursor.
`step()` ran every node's `run()`, released the current cursor's
cohort, and advanced the cursor when all cohort-N wires returned to
`empty`.

Files that held the machinery, for re-archaeology:

- `tools/topology-vscode/src/webview/substrate-r/cohort-gate.ts`
- `tools/topology-vscode/src/webview/substrate-r/cohort-assign.ts`
- `tools/topology-vscode/src/webview/substrate-r/CohortAssigner.tsx`
- `cohort?: number` prop on `Wire`, `RSubstrateEdge`, and `RWireSpec`
- Cursor (`cursorRef`) + cohort-filtered round-close inside
  `useTickDriver.ts`

## What it was for

**Self-sustaining mode.** In disruption mode the topology fires once
per external input; every wire pulses exactly once and "which lap" is
trivially zero. In self-sustaining mode, the topology cycles
indefinitely — the same wire fires many times in succession, and
observers need a way to distinguish *this* pulse from the *next* one
on the same wire. Cohort was the lap counter that made that
distinction observable.

Three concrete uses anticipated:

1. **Round-close per lap.** Without cohort, "round close = all wires
   empty" is only meaningful for a topology that quiesces. A
   self-sustaining cycle never has all wires empty simultaneously, so
   the legacy quiesce-based round-close had to be replaced by a
   per-lap round-close (cohort-N round closes when cohort-N wires are
   empty, even if cohort-N+1 wires are still mid-flight).
2. **Park-and-release across laps.** A wire that finishes its RAF can
   park at the gate, waiting for its lap to be authorized. This lets
   the substrate hold back lap-N+1 until lap-N has been observed.
3. **Cycle-relative ordering invariants.** Tests and the editor's
   tick readout could refer to "the pulse on edge e during cohort N"
   unambiguously.

## Why it was retired in v0

- **Anticipatory infrastructure with no live consumer.** Self-sustaining
  mode is in [MODEL.md](../../MODEL.md) but not yet implemented. The
  cohort gate, cursor, and parking machinery existed only to support a
  mode that doesn't run.
- **It paid real cost.** Two parallel "release" axes (cohort gate +
  pause axis) made every pause-shaped question ambiguous: which axis
  governs which behavior? The monotonic-released-set design (release
  only ever adds) was a known foot-gun — after one lap, every cohort
  was permanently released, making the gate useless for further
  authority over wires.
- **Pause clarified the model.** The pause-as-substrate work showed
  the substrate already needs a non-monotonic, all-wires-uniform axis.
  Cohort's monotonic, per-lap axis is structurally different and
  shouldn't be conflated. When self-sustaining mode lands, cohort can
  be re-derived against that axis distinction, not retrofitted onto
  whatever shape we happen to have.

## When to bring it back

When self-sustaining mode is being designed in earnest. Specifically:

- A node kind that cycles (its output feeds back into its input chain)
  is being modeled and the editor needs to show "lap N" vs "lap N+1"
  pulses without confusing the observer.
- Test contracts need to assert ordering between laps, not just
  "eventually fires."
- The pause axis is insufficient for a desired control — e.g. "release
  one lap and re-pause" (analogous to step today, but lap-scoped).

At that point, re-derive cohort from those concrete requirements.
Likely shape: cohort is *not* re-monotonic; it has a clear release/
revoke semantics; it composes with the pause axis rather than
duplicating it.

## Reference: pause-as-substrate diagram

See [visual-editor/diagrams/pause-as-substrate-property.svg](visual-editor/diagrams/pause-as-substrate-property.svg)
for the axis distinction this retirement clarifies.
