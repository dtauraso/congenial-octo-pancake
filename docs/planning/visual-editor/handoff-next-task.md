# Handoff — Next task (START HERE)

**State:** `task/node-ticks`. Pair substrate now uses **manual ack**
on `wForward`. Slot-and-button backpressure is the design: in0
sends one pulse, readGate's slot stays full, user clicks
"⏏ in0→readGate" to clear it, in0 sends the next pulse. Build green.
**Visual cadence still not verified by user this session.**

## What changed this session

`substrate/runtime-wires-pair.ts` →
`setupInputReadGatePair` now returns
`manualAckEdges: [{ id: edge.id, label: "in0→readGate" }]`.

Why: previously `wForward` was acked by the visual layer on pulse-arc
completion, which fired `wForward.onAck` → `wPermit.send("go")` →
in0 sent again. That's a free-running loop paced only by arc
duration — pulses look constant. With `manualAckEdges`, the visual
layer suppresses arc-completion auto-ack on this edge; the user's
button press is now the only thing that calls `ackWire(wForward)`,
which triggers the same `onAck` → permit → next-send chain.

The button infrastructure already existed:
[ClearSlotButton.tsx](../../../tools/topology-vscode/src/webview/panels/ClearSlotButton.tsx)
renders one button per `manualAckEdges` entry, disabled until the
wire is `inFlight`, calling `clearManualAckSlot(edgeId)` on click.

## Routing (unchanged)

```
USE_PAIR_SUBSTRATE_SHAPE_A = true   // wins for shape "input->readGate"
USE_STEP_SUBSTRATE_SHAPE_A = false  // dormant
```

Shapes B, C, D untouched. Their existing `manualAckEdges` declarations
remain.

## Verify in the editor

1. `cd tools/topology-vscode && npm run build`, then F5 / Run
   Extension. Open the Shape A spec at repo root (single Input →
   ReadGate, edge `in0.out->readGate.chainIn`).
2. Expected: one pulse traverses `in0→rg`, lands at readGate, slot
   stays occupied. Button "⏏ in0→readGate" becomes enabled.
3. Click the button → wire acks → permit fires → in0 sends the next
   pulse. One round-trip per click.
4. If a single click does NOT produce exactly one new pulse, or
   pulses still stack without clicks, the bug is in the wire/permit
   chain in `runtime-wires-pair.ts` or in the visual layer's
   `_manualAckSet` enforcement.

## Open question (unchanged)

Should `wPermit` carry the value back (so readGate logic can depend
on what it received) or just an opaque "go" token? Defer until a
single pulse round-trips cleanly under manual ack.

## Contract status

`test/contracts/runtime-wires-manual-ack.test.ts` pins
`isSelfAckEdge("in0->rg") === false` for the pair shape. The new
behavior also implies the edge SHOULD appear in `getManualAckEdges()`.
Consider tightening the contract test to assert that, in a follow-up
commit if the visual cadence checks out.

## On hold until visual verification

- Shape D port and uniform-node work
  ([handoff-shape-d-plan.md](handoff-shape-d-plan.md),
  [handoff-timeout-removal.md](handoff-timeout-removal.md),
  [handoff-uniform-node-plan.md](handoff-uniform-node-plan.md)).
- Shape C contract test.

## Working tree at handoff

After commit: clean except `topology.view.json` (incidental drift,
leave or stash).

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
