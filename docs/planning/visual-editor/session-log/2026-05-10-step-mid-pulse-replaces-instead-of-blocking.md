## 2026-05-10 — step mid-pulse replaces in-flight pulse instead of blocking

**Observation:** During step-7c proof-out (`topology.frameRendererEnabled` on,
`spec.runtime: "ticked"`, shape `input->readGate`). Pressing Step
advances input one item at a time, in order. Pressing Step again
*before* the pulse animation finishes does not block — the in-flight
pulse is replaced on the wire by the next value.

**Diagnosis:** Not a substrate cap-1 violation. Trace:
  - `step()` runs nodes in topological order. `inputRunner.run` calls
    `ctx.send(edge, v)` → `publishEdgeArrive(edge, v)` → push to slot.
    `readGateRunner.run` (same tick) drains the slot via `recv`.
    Between ticks the slot is empty, so the next Step's send is legal
    (no throw, no block).
    [ticked/shape-a.ts:21-38](../../../tools/topology-vscode/src/substrate/ticked/shape-a.ts#L21-L38),
    [ticked/runtime.ts:38-48](../../../tools/topology-vscode/src/substrate/ticked/runtime.ts#L38-L48).
  - `send` publishes `edgeArrive`; `recv` publishes nothing. The
    painter only hears arrive events and binds the wire's "carrying"
    visual to the latest value. Two arrives in quick succession ⇒
    visual replacement.

**Why this surfaced now:** Step 7c (`168675e` painter) just landed
and is the first time per-wire painting consumed FrameMsg from the
ticked substrate. The pacing contract — what the painter does when
arrive events outrun the pulse animation — was never specified.
handoff-substrate-iteration assigned pacing to the renderer; 7c
built the painter as a stateless mirror of the latest event, which
is one valid renderer but not a *pacing* one.

**Decision:** Log only; pacing is a renderer-side choice and needs
the user's call. Three options worth weighing:
  1. **Animation = one tick.** Pulse duration is tied to whatever the
     user perceives as a step. No queue needed; replacement becomes
     impossible because the previous pulse has visually finished by
     the time Step returns.
  2. **Disable Step while animating.** Simple, preserves the longer
     pulse animation, but couples UI input to renderer state.
  3. **Queue arrives in the painter.** Subsequent arrives play in
     order after the current pulse finishes. Preserves animation
     length and keeps Step responsive, at the cost of renderer state
     drifting behind substrate state — visually misleading once
     drift exceeds one or two pulses.

Option 1 is the most model-coherent (substrate is timing-free; the
"step" is the pacing unit). Option 3 reintroduces a queue the
substrate explicitly doesn't have.

**Outcome:** logged only; awaiting the pacing decision.
