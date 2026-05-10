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

State at handoff (2026-05-09, twenty-second session):
  Active branch: `task/node-ticks`. Latest code commit: `2b64352`
  (spike: route Shape A through step substrate). Build + tsc clean.
  No code changes this session — conceptual diagnosis only, plus a
  CLAUDE.md edit splitting the "ask industry" rule into medium vs.
  substance.

  **Long-train diagnosis concluded:** under await, pacing was a
  side-effect of `await wire.send` blocking — never a node-local
  rule. Step substrate exposes that pacing was never declared. The
  fix is per-node state, not FRAME_MS tuning, not a tick counter.
  Chosen rule for `in0`: `if (prevSlotEmpty && slot.empty) emit`,
  update `prevSlotEmpty` at end of step. No clock awareness inside
  the node. Full reasoning in
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

**Active task: implement the chosen per-node rule on Input for Shape
A.** Single-file change in `src/substrate/step/`: add
`prevSlotEmpty` state to the Input step-node, gate emit on
`prevSlotEmpty && slot.empty`, update at end of `step()`. Rebuild,
observe in editor — expect discrete arcs (one pulse per two ticks
minimum). Do **not** tune FRAME_MS, do **not** add a `cooldownTicks`
field — both re-introduce substrate coupling. See
[handoff-step-function-spike.md](handoff-step-function-spike.md) for
the full reasoning and decision tree after the rule lands. Both
[handoff-timeout-removal.md](handoff-timeout-removal.md) and
[handoff-uniform-node-plan.md](handoff-uniform-node-plan.md) remain
on hold pending this.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
