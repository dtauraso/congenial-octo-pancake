# Refactor plan: uniform self-looping node

## Problem

Five loop variants have accumulated (`inputLoop`, `readGateLoop`,
`joinLoop`, `andGateLoop`, `andGateLoopWithCycleInputs`,
`andGateLoopFanOut`). Each new wiring shape spawned a new variant
carrying ad-hoc constructor flags (`cycleMask`, `outbound[]`, the
`setTimeout(0)` pacing yield). This is scar tissue, not design.

The project doc says behavior should emerge from wiring. Today,
behavior emerges from picking the right loop function.

## Decisions (locked, eighteenth session)

1. **`decide` shape: pure descriptor.** `decide(values) → { kind:
   "send", values: [...] } | { kind: "idle" } | { kind: "stop" }`.
   Unit-testable without a runtime.
2. **No cycle-edge concept.** Every edge is a size-1 buffered channel
   with identical semantics: read blocks empty, write blocks full,
   reader self-acks synchronously after capture. The graph does not
   need to know where cycles are. `Wire` already supports this — no
   `consumeOnRead` flag, no `cycleMask`, no graph cycle detection.
3. **Seed = first-class node kind.** A node whose `decide` returns
   `send` on round 0 and `stop` on round 1. No "prime descriptor on
   first round" special case for other nodes.
4. **Manual-ack buttons retire entirely.** Visual layer becomes a
   passive observer. The substrate self-acks every edge; visual just
   subscribes to `onArrive`/`onAck` for animation. `ClearSlotButton`
   plumbing is deleted in step 7.
5. **One step per session.** Branch stays green between commits.

## Target shape

```
nodeLoop(node):
  while running:
    await pauseGate                   // global subscribe
    values = await Promise.all(inbound.map(awaitValue))
    for each inbound: ackWire(w)      // self-ack, uniform
    desc = node.decide(values)        // only per-node difference
    switch desc.kind:
      "stop": exit
      "idle": continue
      "send":
        for each outbound[i]: await awaitReady; await send(desc.values[i])
    onTick
```

## Migration order (one commit each)

1. **New primitive.** `node-loop-uniform.ts` with `Descriptor`,
   `NodeSpec`, `nodeLoop(node)`. No call sites. Unit tests covering:
   input-style (no inbound, queue via decide closure), AND-join,
   fan-out, cycle self-pump, seed-then-stop, pause.
2. **Visual auto-acker opt-out.** Add a flag to `ShapeSetup` (or per
   wire) that the visual layer reads to skip its arc-completion ack.
   Today it skips manual-ack edges; extend the same opt-out to "self
   acks everything" shapes. No behavior change yet.
3. **Port Shape A** (`setupInputReadGate`) to `nodeLoop`. Suite green.
4. **Port Shape B** (`setupInputReadGateInhibitor`).
5. **Port Shape C** (`setupInputReadGateInhibitorWithI0`).
6. **Port Shape D** (`setupInputReadGateInhibitorCycle`). Lift the
   `setTimeout(0)` macrotask yield out of `andGateLoopFanOut` into the
   scheduler — one yield per global tick, not per fan-out node.
7. **Delete old variants** (`inputLoop`, `readGateLoop`, `joinLoop`,
   `andGateLoop`, `andGateLoopWithCycleInputs`, `andGateLoopFanOut`,
   `node-loop-cycle.ts`). Retire manual-ack plumbing in
   `runtime-wires.ts` + `ClearSlotButton`. Update
   [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md) (or
   delete it).
8. **Re-render handoff** describing post-refactor state.

## Out of scope

- New shapes / new node behaviors during the refactor.
- Visual layer beyond what's needed to keep it rendering.

## Risk

The consolidated loop is the hot path; a bug breaks every shape
simultaneously. Mitigation: keep old variants in tree until each
shape's last call site goes away (step 7), so any single broken
commit is bisectable to one shape.
