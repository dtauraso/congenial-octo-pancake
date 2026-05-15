# Shape D — close i0→i1 (plan)

Shape D = Shape C + edge `i0.out → i1.in`. This closes the first
cycle: `in0 → readGate → i0 → i1 → readGate.ack`. i1 stops being
driven by a synthetic unit queue; i0 stops being a sink.

## Increments (one commit each, ~$0.50–$1.50 cadence)

1. **Spec edge** — add `i0.out → i1.in` (chain) to
   [topology.json](../../../topology.json). At this point
   `matchSubstrate` will reject the spec (4 edges, no matcher) and the
   topology falls through to the legacy runner. That is fine and
   expected for one commit.

2. **Match** — add `matchInputReadGateInhibitorCycle` to
   [match.ts](../../../tools/topology-vscode/src/substrate/match.ts):
   4 nodes / 4 edges, the Shape C three plus the new i0→i1 chain edge
   (sourceHandle `out`, targetHandle `in`). Register in
   `matchSubstrate` and `matchSubstrateShape`
   (`"input+inhibitor->readGate->i0->i1"`).

3. **Setup** — new `setupInputReadGateInhibitorCycle` in
   [runtime-wires-shapes.ts](../../../tools/topology-vscode/src/substrate/runtime-wires-shapes.ts):
   - i0: `andGateLoop([readGateOutWire], i0OutWire, ([v]) => v)` —
     passthrough, no longer a sink.
   - i1: `andGateLoop([i0OutWire], ackWire, ([v]) => v)` — no more
     synthetic unit queue; drop i1's `inputLoop`.
   - Keep input's `inputLoop`, readGate's `andGateLoop`, and the two
     manual-ack edges (in0→readGate, i1→readGate).
   - publish/markBuffered/clearBuffered for the new edge on i0.in
     was already present in Shape C (out edge); replicate the same
     pattern for the new i0→i1 edge on i1.in.

4. **Dispatch** — route the new shape in
   [runtime-wires.ts](../../../tools/topology-vscode/src/substrate/runtime-wires.ts).

5. **Cycle seed** — open question. The cycle has no external pump
   for i1 anymore. Options:
   - Seed i0 or i1 with a held value at startup so the first ack
     pulse to readGate exists before in0 sends.
   - Let readGate's first cycle be unblocked because the ack wire
     starts in a "ready" state (no pulse in flight). Verify against
     the wire's initial-ready semantics before assuming.
   - Check whether `andGateLoop` already handles the empty-inbound
     start case correctly (last session's fix made external ack
     load-bearing — initial state matters).

   Likely the cleanest answer is to keep i1's first send as an
   initial token (one-shot) but route subsequent sends from the
   cycle. Verify on first run.

6. **Contract test** — split into two commits:
   - **6a (done, `efb4fa9`)** — bump `handle-load-repro.test.ts`
     3→4 edges so the suite is green before adding new logic.
   - **6b (next)** — new Shape D contract test asserting no pulse
     stacking on i1→readGate.ack *and* on the new i0→i1 edge
     across at least two cycles. Keep ≤100 LOC.

## Read first

- [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md) —
  external acker is the only acker. Both `joinLoop` and
  `andGateLoop` rely on this. Closing the cycle does not change
  the rule, but adds a second internal andGateLoop hop that has
  to obey it.
- [handoff-next-task.md](handoff-next-task.md) — current state of
  the branch.
