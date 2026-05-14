# Plan — Per-edge slots on ReadGate (slotJoinLoop)

**Motivation.** Current `joinLoop` is a global barrier: one
`awaitValue[]` plus one `Promise.all(awaitReady)`. There is no
per-source holding, so the slowest inbound paces everyone and a
suppressed timeline still has to participate in the barrier. The
latch+AND-gate topology (CLAUDE.md) wants each inbound edge to have
its own 1-deep slot, with the slot's empty/full state telling that
specific source to send / hold.

**End shape.** ReadGate has N inbound edges, each with a slot:
  - slot empty → emit `ready` upstream on that edge → source may send
  - slot full  → withhold `ready` on that edge → source holds
  - fire when all slots full → onFire → per-edge ack drains slots
    individually as the visual layer's `PulseInstance.onDone` resolves
    each edge's pulse.

## Steps

1. **Per-edge identity on the wire ready back-channel.**
   Today `awaitReady` is per-node. Extend the wire API so a sender
   gates on the ready of the *specific edge* it sends on, and a
   receiver can resolve ready per inbound edge. Smallest change that
   unlocks everything else.

2. **`slotJoinLoop` primitive** (alongside `joinLoop`, do not
   replace yet). N slots, each `{ value?: T, full: boolean }`. Per-
   slot `ready` promise re-armed on drain. Fire when every slot is
   full; onFire reads slot values; drain on per-edge ack.

3. **`ackWire(edgeId)`** in the visual layer. `PulseInstance.onDone`
   currently acks by destination node; route it by inbound edge id
   so only that slot drains.

4. **`matchSubstrate` shape C + setup in `runtime-wires-shapes.ts`.**
   Wire each ReadGate inbound to its own slot rather than fanning
   into one `awaitValue[]`. Pre-existing shape B keeps using
   `joinLoop` until ported.

5. **Contract test.** Two sources, one held (no ack) while the other
   drains and refills its slot independently. Mirrors
   `runtime-wires-inhibitor.test.ts` style with manual ack pacing.

6. **Port shape B to `slotJoinLoop`**, retire `joinLoop` once no
   consumer remains. Update memory
   [feedback_substrate_visual_pacer.md](../../../memory/feedback_substrate_visual_pacer.md)
   to note slots replace the barrier.

## Finding (2026-05-08): per-edge slot pacing already works

Step 1 ("per-edge identity on the wire ready back-channel") was based
on a misread. Each `Wire` is already a per-edge object with its own
`awaitReady`, `_ack`, and 1-slot `pending` buffer (see
[wire.ts](../../../tools/topology-vscode/src/substrate/wire.ts)).
The contract test
[join-loop-slot-pacing.test.ts](../../../tools/topology-vscode/test/contracts/join-loop-slot-pacing.test.ts)
verifies: when wA is acked while wB is still held, source A refills
wA (1 → 2) and joinLoop does not refire until wB is also acked.
Per-source slot backpressure is structural, not pending.

What `joinLoop` actually has that the user might want to revisit:
  - **Fire barrier** (all slots full at once) — unchanged by per-edge
    pacing.
  - **Drain barrier** (`Promise.all(awaitReady)` after onFire) — the
    loop waits for *every* edge to drain before re-entering
    `awaitValue`, but level-triggered `awaitValue` resolves
    immediately for any edge that has refilled in the meantime, so
    the barrier costs nothing in the symmetric case.

So options A (drop drain barrier) and B (fire per arrival) are real
design changes but not required to fix any current behavioral gap.
Decision deferred until a topology surfaces the need.
