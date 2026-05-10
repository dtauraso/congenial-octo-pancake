# Handoff — Next task (START HERE)

**State:** `task/node-ticks`. Pair substrate landed in `98a2b0f`.
Build + tests green. **Visual cadence not yet verified in the
editor.** Next session opens the webview and watches.

## What landed

`substrate/runtime-wires-pair.ts` →
`setupInputReadGatePair(spec, wires)`:

- `wForward = wires.get(forwardEdge.id)` — cap 0, animated.
- `wPermit = createWire(..., 1)` — internal back-channel, never in
  the spec, never visible to the visual layer.
- in0 callback machine: `wPermit.onArrive` → `ackWire(wPermit)` →
  `wForward.send(next).catch(noop)`. No `await`.
- readGate callback machine: `wForward.onArrive` → `publishHeld` +
  `publishTick`. `wForward.onAck` → `wPermit.send("go").catch(noop)`.
  The `onAck` listener fires when the visual layer calls
  `ackWire(wForward)` on pulse-arc completion — that physical event
  is the only timer in the system.
- Seed: prime `wPermit.send("go")` once at setup so in0 fires its
  first send.
- Module-level `_activeStop` flips a `stopped` flag; called by
  `stopWiresRuntime` to break the permit/forward cycle on teardown.

Routing in `substrate/runtime-wires.ts`:

```
USE_PAIR_SUBSTRATE_SHAPE_A = true   // wins for shape "input->readGate"
USE_STEP_SUBSTRATE_SHAPE_A = false  // dormant; step/ kept as reference
```

Other shapes (B, C, D) are untouched.

## Contract change

`test/contracts/runtime-wires-manual-ack.test.ts`: Shape A no longer
asserts `selfAcksAll = true`. The pair substrate inverts that —
wForward MUST be acked by the visual layer (the arc-completion ack
is what gates the next permit). The new test pins
`isSelfAckEdge("in0->rg") === false`.

## Verify in the editor

1. `cd tools/topology-vscode && npm run build`, then F5 / Run
   Extension. Open a Shape A spec (single Input → ReadGate).
2. Watch the `in0→rg` wire. Expected: one pulse on the arc at a
   time, cadence = arc-traversal time. No stacking.
3. If clean → step substrate's same-tick drain was the cause; the
   tick/drain ordering thread can be retired. Resume Shape D /
   uniform-node work
   ([handoff-shape-d-plan.md](handoff-shape-d-plan.md),
   [handoff-uniform-node-plan.md](handoff-uniform-node-plan.md)).
4. If stacking persists → substrate is exonerated. Bug is in
   [_use-pulse-lanes-wire.ts](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge/_use-pulse-lanes-wire.ts).
   Investigate lanes/geometry there.

## Open question

Should `wPermit` carry the value back (so readGate logic can depend
on what it received) or just an opaque "go" token? Defer until a
single pulse round-trips cleanly.

## On hold until visual verification

- Shape D port and uniform-node work
  ([handoff-shape-d-plan.md](handoff-shape-d-plan.md),
  [handoff-timeout-removal.md](handoff-timeout-removal.md),
  [handoff-uniform-node-plan.md](handoff-uniform-node-plan.md)).
- Shape C contract test.

## Working tree

`.claude/settings.json`, `topology.view.json`, plus pre-existing
edits to `runtime-wires-shapes.ts` (legacy Shape A fallback now
dormant since pair routing wins) — leave or stash.

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
