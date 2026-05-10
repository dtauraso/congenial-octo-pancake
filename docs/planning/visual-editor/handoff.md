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

State at handoff (2026-05-09, seventeenth session):
  Active branch: `task/node-ticks` (merged to `main` at `2957316` via
  `--no-ff`; branch retained for further work). Latest commit on the
  branch: `6548f9b` (self-pumping cycle, ticks counter, step button
  removed).

  Shape D plan filed at
  [handoff-shape-d-plan.md](handoff-shape-d-plan.md): close the cycle
  by adding `i0.out → i1.in`, then matcher, setup, dispatch, cycle
  seed, contract test (six increments). All six committed; item 6b
  pinned a finding (see below).

  **Items 1–6 committed** (Shape D plan completed `9006ec7..62b9f6f`,
  see git log). 4-edge topology shape
  `"input+inhibitor->readGate->i0->i1"` routes to
  [runtime-wires-shape-d.ts](../../../tools/topology-vscode/src/substrate/runtime-wires-shape-d.ts).
  Contract test
  [shape-d-cycle.test.ts](../../../tools/topology-vscode/test/contracts/shape-d-cycle.test.ts)
  now asserts ≥3 round-trips with no pulse stacking. Suite green
  (259/259), tsc + build clean.

  Earlier-branch context: `e9e3fef` fixed `andGateLoop` pacing
  (mirrors joinLoop). `TriggerGate` plumbing is unused but in tree.
  Shape C paces i1 via manual-ack. Conceptual frame: **concurrent
  clocks frozen on command**. Manual-ack mechanism doc:
  [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

  Working tree: `.claude/settings.json` and `topology.view.json` carry
  incidental drift — leave or stash. Reference branches retained:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

Path chosen: **cycle close i0→i1** (Shape D) — items 1–6 done
(`9006ec7`, `d38cf4e`, `aebef03`, `dcf14b7`, `8fb4c12`, `efb4fa9`,
`62b9f6f`). Suite green (259/259); tsc + build clean.

**Cycle-2 gap closed** at `5193bc6`; editor self-pumps without
clicks at `6548f9b`. Substrate primitive
`andGateLoopWithCycleInputs` in
[node-loop-cycle.ts](../../../tools/topology-vscode/src/substrate/node-loop-cycle.ts)
gives feedback inbounds consume-on-read. `selfAckEdges` concept on
ShapeSetup tells the visual layer to skip arc-completion auto-ack
on those edges. Shape D declares ackEdge as self-ack and has zero
manual-ack edges. Editor tick counter (`ticks N`) wired in
TimelinePanel. Per-node StepButton removed. Diagnosis history in
[handoff-cycle2-diagnosis.md](handoff-cycle2-diagnosis.md).

**Open question for next session: in0 is the rate-driver, not
the cycle.** With manual-ack removed, `inputLoop` cycles through
its queue (`[0, 1]`) forever, sending each value as fast as inWire
acks. So in0 fires continuously. User flagged: "why is in0
constantly sending pulses to readGate?" Three options to evaluate:
  (a) **One-shot input.** in0 sends queue once then stops.
      Requires readGate to stop demanding chainIn every cycle —
      either drop AND, or change shape.
  (b) **Cycle-paced input.** inputLoop gates on a downstream
      signal (e.g., wait for round-trip completion before next
      send). Adds new gate plumbing.
  (c) **Cycle drives chainIn too.** Add feedback into chainIn
      (e.g., i1 fans out to both readGate.chainIn and .ack). in0
      becomes a one-time seed. Closes the cycle fully.
Decision belongs to next session; user wants to think on it.

Other open paths
([handoff-next-task.md](handoff-next-task.md)) — Shape C contract
test, deleting unused `TriggerGate` — remain available. Before
touching the manual-ack code, read
[../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
