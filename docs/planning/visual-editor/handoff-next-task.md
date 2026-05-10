# Handoff — Next task (START HERE)

**State:** `task/node-ticks`. Pair substrate uses **manual ack** on
`wForward` and is **user-verified end-to-end on Shape A** as of
2026-05-09. First pulse lands and stays; each ⏏ click yields exactly
one new pulse; no clicks → no pulses. Build green.

## What changed this session

[ClearSlotButton.tsx](../../../tools/topology-vscode/src/webview/panels/ClearSlotButton.tsx)
`OneClearButton` now derives `occupied` from `wire.state` on every
arrive/ack event, instead of toggling two independent setters.

Why: when ⏏ was clicked, `ackWire(wForward)` fired onAck listeners
in registration order. The permit-release handler synchronously
cascaded into `wForward.send(v)` (next pulse), which fires onArrive
listeners including the button's `setOccupied(true)`. Then control
returned to the outer onAck loop and ran the button's
`setOccupied(false)` — which was registered after the substrate's
own onAck handlers. Final React state was `false`, button disabled,
cycle 2 unreachable. Reading `wire.state` on each event makes
listener order irrelevant.

## Routing (unchanged)

```
USE_PAIR_SUBSTRATE_SHAPE_A = true   // wins for shape "input->readGate"
USE_STEP_SUBSTRATE_SHAPE_A = false  // dormant
```

Shapes B, C, D untouched.

## Pick the next move

Three things are now unblocked. Suggested order:

### 1. Tighten the manual-ack contract test (small, do first)

`test/contracts/runtime-wires-manual-ack.test.ts` currently asserts
that for Shape A under the pair substrate
`getManualAckEdges()` is `[]`. That was true under the prior design
(visual layer auto-acked). Now the pair shape registers
`{ id: "in0->rg", label: "in0→readGate" }`. Update the assertion;
add a click-roundtrip test if straightforward (call
`clearManualAckSlot` and assert the wire refills with the next
queue value).

### 2. Shape D port

See [handoff-shape-d-plan.md](handoff-shape-d-plan.md). The
manual-ack pacing model is now the established pattern; port D's
internal loop to use it where applicable.

### 3. Uniform-node work / timeout removal

[handoff-uniform-node-plan.md](handoff-uniform-node-plan.md) and
[handoff-timeout-removal.md](handoff-timeout-removal.md). Both were
gated on the pair model being trusted; that gate is lifted.

## Open question (unchanged)

Should `wPermit` carry the value back (so readGate logic can depend
on what it received) or remain an opaque "go" token? Defer until a
shape that needs the value motivates it.

## Working tree at handoff

Clean except `topology.view.json` (incidental drift, leave or stash).

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
