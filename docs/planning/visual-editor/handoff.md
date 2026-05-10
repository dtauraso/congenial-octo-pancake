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

State at handoff (2026-05-09, twenty-third session):
  Active branch: `task/node-ticks`. Per-node `prevSlotEmpty` rule
  landed on the Input step-node in
  [src/substrate/step/shape-a.ts](../../../tools/topology-vscode/src/substrate/step/shape-a.ts).
  Build + tsc clean. **Symptom persists:** user observed in editor
  that edges still show long pulse trains. The rule as written did
  not change visible cadence.

  Suspected cause: writer-before-reader array order drains the
  slot same-tick, so `prevSlotEmpty` is always `true` end-of-step
  and Input emits every tick. Full diagnosis + candidate fixes in
  [handoff-step-function-spike.md](handoff-step-function-spike.md).

  Carried context: Shape D self-pumps via `fb56c30`'s i1 fan-out +
  one-shot `seedLoop` + per-round `setTimeout(0)` yield in
  `andGateLoopFanOut`. Old loop variants still in tree; retired in
  uniform-node step 7 (on hold pending spike outcome). Conceptual
  frame: **concurrent clocks frozen on command**. Manual-ack doc:
  [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

  Working tree: `.claude/settings.json`, `topology.view.json`, and
  pre-existing edits to `runtime-wires-shapes.ts` +
  `test/contracts/runtime-wires-manual-ack.test.ts` carry incidental
  drift — leave or stash. Reference branches retained:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

**Diagnose why the per-node rule did not change visible cadence on
Shape A.** Do this before porting any further nodes or shapes. The
rule is in
[src/substrate/step/shape-a.ts](../../../tools/topology-vscode/src/substrate/step/shape-a.ts);
the driver is in
[src/substrate/step/driver.ts](../../../tools/topology-vscode/src/substrate/step/driver.ts).

Suggested order (cheap to expensive):

  1. **Instrument first.** Log Input emits and ReadGate consumes
     per tick. Count over a 2-second window. If Input emits every
     tick, the rule is being short-circuited by same-tick drain
     (the most likely cause given writer-before-reader order). If
     emits are spaced but the editor still shows a long train, it's
     a visual layer issue.
  2. **If logic-side:** redesign the rule so it survives same-tick
     drain — e.g. add a `justEmitted` flag set on emit and cleared
     only after observing one full empty-without-emit tick. Stay
     clock-free; do not introduce FRAME_MS or counters.
  3. **If visual-side:** investigate
     [_use-pulse-lanes-wire.ts](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge/_use-pulse-lanes-wire.ts).

Shape D port and uniform-node work
([handoff-shape-d-plan.md](handoff-shape-d-plan.md),
[handoff-timeout-removal.md](handoff-timeout-removal.md),
[handoff-uniform-node-plan.md](handoff-uniform-node-plan.md))
remain on hold until Shape A reads as discrete arcs in the editor.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
