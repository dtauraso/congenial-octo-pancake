# Next task: cohort gate + registry (commit 2 of slot-in-node)

**Branch:** `task/substrate-slot-in-node`.
**Status:** first code commit landed (31c6cdb, pushed). Wire
transient, slot on destination node, `(destNodeRef, destSlotId)`
binding, parseSpec validation, slot-phase manual button, contract
tests green. **Cohort + global gate not started.**

## What to read

1. [MODEL.md](../../../MODEL.md) — "Ticks and stepping".
2. [diagrams/model-revised-draft/13-tick-as-edge-cohort.svg](../../../diagrams/model-revised-draft/13-tick-as-edge-cohort.svg)
   + [14-step-budget.svg](../../../diagrams/model-revised-draft/14-step-budget.svg).
3. Current driver:
   [useTickDriver.ts](../../../tools/topology-vscode/src/webview/substrate-r/useTickDriver.ts)
   — round close is currently "all wires empty," which under the
   slot-in-node model fires the moment every in-flight wire has
   arrived. Cohort gating replaces that one-shot close with a
   release-by-cohort axis.

## Target shape

- **Cohort assignment.** At wire-time, each wire gets cohort N =
  max(predecessor cohorts) + 1. Compute during parseSpec or on the
  fly when wires register; the spec is small enough that either
  works. Store the assignment somewhere the gate can query
  (registry-side cohort map keyed by wire id).
- **Global play/pause gate.** Single observable axis. `release(N)`
  permits cohort N's wires to dispatch `arrive`; other cohorts
  stay in-flight. `step()` becomes `release(current cohort)`, then
  advances the cohort cursor. Random-access stepping = `release(N)`
  for arbitrary N.
- **`Wire.complete()` rerouting.** Today the RAF callback calls
  `complete()` directly. Under the gate, `complete()` should ask
  the gate "is my cohort released?" and otherwise park. The
  parked wire resumes when the gate releases its cohort.
- **`useTickDriver` retires the "all wires empty" close.** Tick =
  cohort cursor, not round-close. Halt/resume become "freeze the
  cursor" / "resume cursor advance".

## Concrete starting steps

1. Decide whether cohort lives in parseSpec output (static
   topology) or in the registry (runtime). MODEL.md framing leans
   wire-time → static; do the simpler thing first and revisit if
   dynamic topologies arrive.
2. Sketch the gate as a tiny module
   (`tools/topology-vscode/src/webview/substrate-r/cohort-gate.ts`)
   with `release(N)`, `isReleased(N)`, `subscribe(N, cb)`. Tests
   first.
3. Thread the gate into Wire: pass via context or prop alongside
   `destNodeRef`. On RAF completion, check gate before dispatching
   `arrive`.
4. Rewrite the tick driver around the cohort cursor; update the
   smoke test to drive by cohort release rather than round close.

## Latent hazards

- Don't reintroduce a parked value anywhere — the parked state is
  the destination slot. A "park in the wire until the gate opens"
  refactor would be the wrong shape; park is *in the gate*, not in
  the wire's value.
- Don't make the gate observable as "tick N is global wall time."
  It's an axis the user can scrub; nothing in the substrate cares
  what cohort is current except wires waiting on their own number.

## ALWAYS clause

(See handoff.md — same clause applies.)
