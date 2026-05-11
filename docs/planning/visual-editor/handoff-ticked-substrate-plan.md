# Handoff — Ticked substrate plan

## Why

Make time a first-class, observable, controllable property of the
system. Today's callback substrate works but time is implicit — you
can't pause and say "the wave is here at tick N." Substrate-owned
ticks fix that. They're the literal mechanism behind "concurrent
clocks frozen on command" and the precondition for visibly verifying
claims like "lateral inhibition resolves in one tick" or
"set membership = small timing delay."

## Model

Substrate owns `nodes: NodeRunner[]`. Loop:

```
for n of nodes: n.run()    // consume inbound, work, send outbound
tick++                     // pulse traversal is INSIDE run()
```

- 1 pulse along a wire = inside one `run()` call. By the time `run()`
  returns, the value is at the receiver's inbound port.
- 1 full pass through `nodes` = 1 tick. Topological order so a wave
  propagates end-to-end in one tick on a DAG.
- Cycle back-edges defer to next tick (one tick of delay = what makes
  the cycle a cycle).

## Open issues (must address by the phase noted)

1. **Lateral inhibition needs simultaneity.** Sequential `for` loop
   means list-order accidentally picks the winner. Fix in phase 4 via
   two-phase commit (compute → stage → resolve → commit).
2. **Back-edges must be identified** (spec annotation or feedback
   arc set). Phase 5.
3. **Manual-ack vs. continuous loop.** Replace per-wire permit with
   "step one tick." Phase 6.
4. **Fan-in / AND-gate readiness** lives inside `run()` now. Phase 4.

## Phases

1. **MVP ticked substrate, Shape A only.** New file
   `src/substrate/ticked/runtime.ts`. Spec flag `runtime: "ticked"`.
   Contract: 5 inputs → 5 ticks, inbound ports empty between ticks.
2. **Step controls.** Pause / Step in TimelinePanel (no Resume —
   stepping replaces the auto-driver entirely; revisit wall-clock
   auto-play later if needed). `subscribeWireState` exposes inbound
   contents for between-tick inspection. This is the payoff phase —
   pause and *see* the wave.
3. **Drag-resilient pulse rendering.** Pulse animator parameterized
   by `t ∈ [0,1]` along path via `getPointAtLength`; recompute every
   frame from current React Flow path string. Independent of 1–2.
4. **Two-phase commit** (unblocks lateral inhibition). Triggered by
   first inhibitor port. Re-verify Shape A unaffected.
5. **Cycle support** (back-edges). Triggered by Shape D port. Likely
   resolves the existing red `shape-d-cycle` test as a side effect.
6. **Manual-ack reconciliation.** `⏏` button becomes "step one
   tick." Delete per-wire permit machinery from Shape A.
7. **Retire callback substrate.** Once A/B/C/D all run on ticked
   substrate, delete `runtime-wires*.ts` and `wire.onArrive`/`onAck`.
   Single substrate, single tick model.

## Branch & cost

- Stay on `task/node-ticks` through phase 2 (the proof). Merge to
  `main` after phase 2 so later phases have a stable base.
- Phases 3–7 each get their own task branch.
- Cost markers expected ≥$5 on phases 1, 2, 4, 5. Phases 3, 6, 7
  borderline / small.

## Exit criteria per phase

- **P1** Shape A ticks counter increments 1-per-pulse in editor.
- **P2** Pause Shape A mid-run, inbound-port readouts match, single
  step advances exactly one hop.
- **P3** Drag a node mid-pulse, pulse stays glued to wire.
- **P4** Lateral-inhibition contract test (two inhibitors, one
  input, only stronger fires) passes.
- **P5** Shape D self-pumps under ticked substrate, visual behavior
  matches today.
- **P6** Shape A ⏏ steps one tick; permit code deleted.
- **P7** No `runtime-wires*.ts`, all shapes green.

## Start here

Phase 1. Don't touch existing substrate; opt-in via spec flag so
Shape A can run on ticked while B/C/D continue on callbacks.
