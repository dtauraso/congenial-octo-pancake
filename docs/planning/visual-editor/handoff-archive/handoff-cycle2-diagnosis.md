# Cycle-2 gap diagnosis (seventeenth session)

The 6b finding ("ackWireE has no perpetual driver") is closer to right
than the topology-deficit framing suggested. Token-balance analysis
shows the 4-edge Shape D topology IS balanced 1:1 on every wire — i1
IS a perpetual driver in principle. The real blocker is **substrate
microtask ordering**, not topology.

Two distinct issues surface when you reclassify `i1->readGate.ack`
from manual-ack to auto-ack (which is the correct semantic — it's a
cycle wire, not an external feed):

1. **Seed bootstrap race.** `seedLoop`'s send onto `ackWireE` fires
   during the microtask drain inside `startWiresRuntime`, before any
   test-side `onArrive` listener can attach. The seed token sits
   inFlight forever, blocking i1 at `awaitReady(ackWireE)`. The old
   manual-ack path "worked" only because `clearManualAckSlot` polls
   wire state (not arrival events).

2. **Inter-cycle awaitValue race.** Even after manually draining the
   seed, cycle 2 doesn't fire. After i1's cycle-1 send onto
   `ackWireE`, the auto-ack microtask drains the token before
   readGate's andGateLoop re-enters its top `awaitValue` step — so
   `pending` is null when readGate looks. This contradicts the
   "pacing-by-external-ack is load-bearing" comment in
   [node-loop.ts:62](../../../tools/topology-vscode/src/substrate/node-loop.ts#L62).

A reverted attempt landed and was rolled back (tree kept at `62b9f6f`):
removed `i1->readGate.ack` from `manualAckEdges`, added auto-ack
listener in test, tightened assertion to ≥3 cycles. Cycle 2 still
didn't fire — the microtask race above. See chat transcript of
seventeenth session for the full trace.

## Next-move options

- **(a) Consume-on-read `awaitValue`.** Snapshot value AND ack
  atomically. Simplest patch; violates the load-bearing
  pacing-by-external-ack comment, so it's a real design decision, not
  a quick fix.
- **(b) Consume-then-ack primitive on cycle wires.** Keep
  external-pacing for non-cycle wires; new primitive only for
  feedback edges. More invasive but preserves existing semantics.
- **(c) Restructure `andGateLoop`.** Make top-of-loop `awaitValue`
  happen synchronously after prior `awaitReady` resolution,
  eliminating the microtask gap. Subtler — may not be expressible
  without changing wire.ts.

Whichever lands, also fix the seed bootstrap race: attach the
cycle-edge auto-ack listener inside the substrate setup (before
`seedLoop` enqueues its send) rather than letting tests/views attach
it post-hoc.

After the fix, tighten `shape-d-cycle.test.ts` from ≥1 to ≥3 cycles
(proves self-pumping without brittleness).
