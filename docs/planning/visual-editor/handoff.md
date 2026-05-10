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

State at handoff (2026-05-09, twenty-first session):
  Active branch: `task/node-ticks`. Latest commit: `2b64352` (spike:
  route Shape A through step substrate). Build + tsc clean. Step
  substrate landed in two commits:

  - `2997c67` — scaffold: `src/substrate/step/{node,driver,shape-a}.ts`.
    Minimal `StepNode` interface (slot-based, `step()` no-op until
    conditions hold), `setInterval`-based `Driver`.
  - `2b64352` — integration: `step/shape-a-setup.ts` reuses
    `createWire`+`buildWires` and registers the same
    publishHeld/publishTick/markBuffered/clearBuffered listeners as
    the await path. `step/runtime.ts` holds the active driver/wires
    and exposes start/stop/pause/resume. `runtime-wires.ts` gates on
    `USE_STEP_SUBSTRATE_SHAPE_A = true` and delegates when shape ===
    `"input->readGate"`. Await-runtime stop body factored into
    `runtime-wires-stop.ts` to stay under the 200-LOC budget.

  **Spike result on Shape A: animation runs as a "long train" of
  pulses** (user-observed in editor). See
  [handoff-step-function-spike.md](handoff-step-function-spike.md)
  for diagnosis options.

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

**Active task: diagnose & resolve the "long train" pulse stacking on
Shape A under the step substrate.** Read
[handoff-step-function-spike.md](handoff-step-function-spike.md) —
it lists three diagnosis options (FRAME_MS tuning, tick-level
backpressure, decoupled visual cadence) and the decision tree after
diagnosis. Both
[handoff-timeout-removal.md](handoff-timeout-removal.md) and
[handoff-uniform-node-plan.md](handoff-uniform-node-plan.md) remain
on hold pending this resolution.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
