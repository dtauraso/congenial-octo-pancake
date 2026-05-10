# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-step1-notes.md](handoff-step1-notes.md) — what was
     built on the rebuild branch (decision audit, coupling hacks
     gated to step 1, automated logging, e2e).
  2. [handoff-gate-a.md](handoff-gate-a.md) — earlier merge to main
     (Gate A).
  3. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the next commit.
  4. [handoff-rebuild-plan.md](handoff-rebuild-plan.md) — port plan,
     contracts R1–R5, auto-retire signal.
  5. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-09, twenty-eighth session):
  Active branch: `task/node-ticks`. **Shape A pair substrate is now
  user-verified end-to-end under manual ack.** First pulse lands and
  stays; each ⏏ click produces exactly one new pulse; no clicks → no
  pulses.

  Bug fixed this session: in
  [ClearSlotButton.tsx](../../../tools/topology-vscode/src/webview/panels/ClearSlotButton.tsx),
  `OneClearButton` tracked occupancy via two independent boolean
  setters — `onArrive → setOccupied(true)` and `onAck →
  setOccupied(false)`. When ⏏ was clicked, `ackWire(wForward)` fired
  onAck listeners in registration order: clearBuffered, then the
  permit-release handler (which synchronously cascades into
  `wForward.send(v)` → arrive listeners → button's
  `setOccupied(true)`), then the button's `setOccupied(false)`. The
  late onAck setter overrode the nested arrive setter, leaving the
  button disabled even though the wire was inFlight with a fresh
  value — so cycle 2 was unreachable. Fix: read `wire.state` on every
  event instead. Listener order no longer matters.

  Carried context: Shape D self-pumps via `fb56c30`'s i1 fan-out +
  one-shot `seedLoop` + per-round `setTimeout(0)` yield in
  `andGateLoopFanOut`. Conceptual frame: **concurrent clocks frozen
  on command**. Manual-ack doc:
  [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

  Working tree: clean except `topology.view.json` (incidental drift,
  leave or stash). Reference branches retained:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

Pair substrate is verified on Shape A; previously on-hold work is
unblocked. Pick one of:

  - **Tighten the manual-ack contract test.** Assert that
    `getManualAckEdges()` for Shape A pair contains
    `{ id: "in0->rg", label: "in0→readGate" }`. The current test
    expects `[]` (pre-this-session design). See
    [handoff-next-task.md](handoff-next-task.md).
  - **Shape D port** under the same manual-ack model
    ([handoff-shape-d-plan.md](handoff-shape-d-plan.md)).
  - **Uniform-node work** ([handoff-uniform-node-plan.md](handoff-uniform-node-plan.md)).
  - **Timeout removal** in `andGateLoopFanOut`
    ([handoff-timeout-removal.md](handoff-timeout-removal.md)).

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
