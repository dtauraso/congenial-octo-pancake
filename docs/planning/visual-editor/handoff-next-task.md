# Handoff — Next task (START HERE)

**State:** `task/node-ticks`. Pair substrate uses **manual ack** on
`wForward` and remains user-verified end-to-end on Shape A. Build
green. Manual-ack contract test pinned to verified behavior in
commit `ccd1f19`.

## What changed this session

[runtime-wires-manual-ack.test.ts](../../../tools/topology-vscode/test/contracts/runtime-wires-manual-ack.test.ts):
- First test now asserts `getManualAckEdges()` for Shape A returns
  `[{ id: "in0->rg", label: "in0→readGate" }]` and
  `isManualAckEdge("in0->rg") === true` (was `[]` / `false` under
  the prior auto-ack design).
- New click-roundtrip test: starts shape A, waits for wForward to
  hold queue[0]=1, calls `clearManualAckSlot("in0->rg")`, asserts
  it returns true, waits for wForward to refill, asserts pending
  is queue[1]=2, then asserts no further pulse without a second
  click.

## Pre-existing red tests (carry into next session)

Two failures present before this session, unrelated to the change:
- `test/contracts/shape-d-cycle.test.ts` — ackEdge depth tracking
  fails (seed onArrive fires before listeners attach; existing
  compensation insufficient).
- `test/contracts/handle-load-repro.test.ts` — real-`topology.json`
  parse/match/build flow.

Triaging these is the cheapest cleanup before opening new work.

## Routing (unchanged)

```
USE_PAIR_SUBSTRATE_SHAPE_A = true   // wins for shape "input->readGate"
USE_STEP_SUBSTRATE_SHAPE_A = false  // dormant
```

Shapes B, C, D untouched.

## Pick the next move

### 1. Triage red tests (smallest, do first)

Both failures listed above. shape-d-cycle is interesting because it
overlaps with the next item; handle-load-repro may be schema/spec
drift on `topology.view.json` (working tree shows it as M).

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
