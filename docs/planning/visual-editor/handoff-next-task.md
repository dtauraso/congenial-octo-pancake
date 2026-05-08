# Handoff — Next task (START HERE)

**State:** `main` at `392602f`. `task/node-ticks` at `4827ea2`
(pushed, not yet merged) carrying two pause-freeze remount fixes
plus the Wire ready/value back-channel API.

**Next session is the consumer commit.** The API in `4827ea2` is
inert until something calls `awaitReady` / `awaitValue`. That is
explicitly the job of the next session — do not re-design the API,
do not commit on this branch in the meantime.

## What's done

- Visuals 1–4 on the wires runtime (flash, glow, held, buffered).
- Pause = mid-arc freeze; concurrent clocks frozen on command.
- Pause-freeze survives PulseInstance remount (`a0260fb`,
  `e5b20d7`).
- Wire gained predictive back-channels (`4827ea2`):
    - sender side: `ready`, `onReadyChange(fn)`, `awaitReady()`
    - receiver side: `hasValue`, `onValueChange(fn)`, `awaitValue()`
  Level-triggered awaits resolve immediately if the condition holds;
  change listeners are edge-triggered. `awaitValue` does NOT ack;
  receiver must call `ackWire` explicitly. Architectural invariant
  pinned: one sender per wire — contention is modeled at receiver
  nodes with N inbound wires, not at the wire layer. 9 new contract
  tests; 246/246 green; tsc + build clean.

## What the next session should do

Thread the new API through a real consumer. Two pieces, ideally
landed as separate commits:

1. **`inputLoop` uses `awaitReady`.** Replace the implicit ack-wait
   inside `await out.send(v)` with an explicit predictive gate:
   `await out.awaitReady(); await out.send(v);`. Today's behavior
   is unchanged (single-sender topology), but this is the shape
   future gated loops will compose with. Verify all existing tests
   stay green; no editor-visible change.

2. **First multi-input node loop.** Pilot port — most natural
   target is `ChainInhibitorNode` or a thin `andGateLoop(inbound[])`
   used internally by it. Loop body shape:
   ```ts
   while (!stopped) {
     const vs = await Promise.all(inbound.map(w => w.awaitValue()));
     // …compute…
     await out.awaitReady();
     await out.send(result);
     for (const w of inbound) ackWire(w);
   }
   ```
   This extends `match.ts` beyond the trivial Input→ReadGate
   predicate and is the first commit where the new API earns its
   keep. Coordinate with port-plan steps 4–6 in
   [../sim-substrate/rebuild-plan.md](../sim-substrate/rebuild-plan.md).

## What's NOT done (and why it's parked)

- Legacy globals (`sim/runner`, `sim/event-bus`, `legacyRunnerState`,
  `pauseRunner`, `isPlaying`) still imported by AnimatedEdge,
  PulseInstance, TimelinePanel, Bookmarks, RunnerProbe,
  fold-halo-probe, `_handle-load`, `_on-node-drag`. Removing them
  is gated on the multi-input node port above.

## Working tree note

`.claude/settings.json` and `topology.view.json` carry orthogonal
uncommitted drift. Leave or stash.

## ALWAYS clause

At end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
