# Tick-Loop Redesign Plan

## Summary

`Node.fill()` currently calls `onRun()` synchronously, making wake event-driven.
ReadGate fires two successive loads per cycle (Rule 2: partial → emit 0; Rule 1:
full → emit 1), both targeting `i0.in`. The second arrives before the first wire
clears, triggering the in-flight assertion in `Wire.load`. Fix: replace the
synchronous wake with a **polling model** — each node body re-evaluates its
firing rule each RAF step rather than being woken by `fill`. `Node.fill` becomes
a pure slot write; no `onRun` call follows. Bodies poll slot state and load
outbound wires when their precondition holds and the wire can accept.

## Model Alignment

**MODEL.md edits are required.** Two pinned positions in MODEL.md conflict
with this redesign and must be revised before code lands:

1. **"Firing as a control-flow event"** (MODEL.md §"Firing rule and slot
   writes", line 97): *"A node fires the moment its precondition holds —
   this is a control-flow event, not a scheduled callback or a clock
   interrupt."* RAF-driven polling is exactly the "clock interrupt" shape
   this clause forbids. The clause was written to rule out the old tick-walker
   pattern; the new model still satisfies the spirit (a node only acts when
   its precondition holds, and `run()` is idempotent when it doesn't) but
   the wording needs to acknowledge that the *observation* of preconditions
   runs at RAF cadence even though the *firing decision* remains
   precondition-gated. Proposed revision: weaken the clause to forbid
   precondition-independent firing, not RAF-paced observation.

2. **"Global gate halts every node at once via the pause axis"**
   (MODEL.md §"React surface realization", line 131; §"Driver", line 70).
   The pause axis currently targets nodes. This redesign moves pause to
   the wire layer (see Pause Semantics below). MODEL.md needs to be
   updated so the pause axis halts *wire animations*, not nodes; nodes
   tick freely and observe the resulting input-state stillness.

The wire's in-flight traversal time (the one permitted duration in
MODEL.md's allowed vocabulary) still governs delivery; that part stands.

## Substrate Primitive Changes

**Node.tsx**
- Remove the `onRunRef.current?.()` call inside `fill()` (line 71).
- Keep `run(): void` on `NodeHandle` — callers that self-schedule will invoke it.
- Remove `subscribeSlot` if it becomes unused (audit after migration).

**Wire.tsx**
- Remove `subscribeCanAccept` from `WireHandle` interface and implementation
  (listeners set, `destSlotUnsubRef`, `notifyCanAccept` calls, lazy unsub).
- `canAccept` getter stays — bodies read it synchronously each poll.
- **Pause hookup moves here.** Wire subscribes to the pause axis; while
  paused, its RAF animation step is a no-op (frozen in-flight, no progress,
  no `dest.fill`). Resume continues from the frozen position. Previously
  pause was observed at the node layer; this redesign concentrates it
  on wires.
- Otherwise (animation, `load`, `arrive`, `complete`) unchanged.

## Node Body Pattern Under the New Model

Every body gains a RAF poll loop. Canonical shape:

```
useEffect(() => {
  let raf = 0;
  const step = () => {
    run();                          // same firing rule, no change
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}, [run]);
```

`run()` already guards on `canAccept` and slot phase — no new logic needed.
**Bodies do not check pause** — that lives in the wire layer. Bodies that are
exhausted (InputBody `"exhausted"` phase) return immediately on every poll;
cost is one function call per RAF per exhausted node.

`InputBody` currently subscribes `subscribeCanAccept`; that subscription is
replaced by the poll (added in step 1, subscription dropped in step 2).

## Open Design Decisions

**Pause semantics.** _Decided:_ pause applies to wires only, not nodes.
Node tick loops keep running; their `run()` bodies don't check pause. When
paused, wires freeze their animations (no `dest.fill` fires), so node ticks
naturally find no new input state and decide to emit nothing. Resume thaws
wires; the held in-flight pulses finish their transit and the nodes pick up
work on the next tick. No pause-aware code in any body; pause is a wire-layer
concern.

**Wire delivery into a filled slot.**
Under polling, a wire that arrives (animation ends) while the destination slot is
already `filled` would call `fill()` which throws. Two sub-options:
A: `Wire` defers `dest.fill` until `dest.slotPhase(destSlotId) === "empty"`, by
re-checking each RAF step (wire holds the value past animation end).
B: parseSpec validation prevents topologies where two in-flight wires can target
the same slot simultaneously. Enforcing topology correctness eliminates the
runtime deferral need.
_Lean: Option B long-term (parseSpec catch). Option A as short-term safety net
to avoid crashes while topology validation is incomplete — a `pendingDeliver`
flag already exists in Wire for exactly this purpose._

**Tick-rate uniformity.**
All nodes share the same RAF loop; there is no per-node rate. This matches MODEL
§"Ticks and stepping" which requires no central walker and no per-node clocks.

## Migration Steps

1. **Add RAF poll to InputBody (alongside existing subscription)** — add
   the canonical RAF poll loop to InputBody. Leave the existing
   `subscribeCanAccept` subscription in place for this one commit; the two
   wake sources coexist briefly (both call the same idempotent `run()`,
   so the redundancy is harmless). Tests stay green.

2. **Remove `subscribeCanAccept` from Wire and InputBody** — strip the
   `WireHandle` interface entry, the impl (listeners set, `destSlotUnsubRef`,
   `notifyCanAccept` calls, lazy unsub), and InputBody's subscription
   useEffect. InputBody's RAF poll from step 1 is now the sole wake.
   Tests stay green.

3. **Remove `onRun` call from `Node.fill`** — make fill a pure state write.
   Tests that rely on synchronous wake from non-Input bodies will fail;
   expected (restored by step 4).

4. **Add RAF poll to every other body** — RelayBody, ChainInhibitorBody,
   JoinBody, ReadGateBody, InhibitRightGateBody, RegisterBody. Each body:
   add the loop, remove any `onRun` prop threading from the parent. Restore
   tests per body.

5. **Remove `onRun` from NodeProps** — if nothing passes it after step 4, drop
   the prop and the ref. Clean compile.

6. **Wire deferred-deliver safety net** — if `dest.fill` is called while slot
   filled, hold the value and retry each RAF step (Option A interim). Add a
   test for this case.

7. **Move pause axis subscription from nodes to wires** — wire RAF step
   becomes a no-op while paused (held in-flight position preserved). Remove
   any node-side pause observation. Update axis tests.

8. **Update MODEL.md** — revise the "control-flow event, not a clock
   interrupt" clause and the "pause axis halts nodes" clause to match the
   new model (see Model Alignment).

9. **Regression: ReadGate ring** — run the full ReadGate ring test that
   exposed the original bug. Confirm no in-flight assertion fires.

## Risks and Rollback

**Risk:** RAF polling adds CPU cost proportional to live node count. For the
current topology sizes (< 20 nodes), this is negligible.

**Risk:** Body `run()` must be idempotent and cheap when precondition is unmet.
All existing bodies already return early on unmet preconditions.

**Rollback:** Each migration step is a standalone green commit. Reverting to the
event-driven model means re-adding the `onRun` call in `Node.fill` and removing
the poll loops — a mechanical revert.
