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

State at handoff (2026-05-09, thirty-third session):
  Active branch: `task/node-ticks`. Phase 2 landed and **visually
  verified** (commit `6550ae2`). User confirms ⏭ → +1 in ticked
  Shape A. The fix: module-scope subscriber set so subs survive
  runtime swaps, and label routes through `tickedTickCount()` when
  `isTickedActive()` (was reading `getTotalTicks()`, which Shape A
  incremented twice per step — once for Input, once for ReadGate).
  Branch is ready to merge to `main` pending sign-off. Default
  callback substrate untouched. Pair substrate still user-verified
  under manual ack (contract test pinned at commit `ccd1f19`).

  Pre-existing failures unrelated to this session, still red on the
  branch (do not block next move, but worth triaging):
    - `test/contracts/shape-d-cycle.test.ts` — ackEdge depth
      assertion fails (ackEdge seed/listener attachment race).
    - `test/contracts/handle-load-repro.test.ts` — real
      `topology.json` flow.

  Carried context: Shape D self-pumps via `fb56c30`'s i1 fan-out +
  one-shot `seedLoop` + per-round `setTimeout(0)` yield in
  `andGateLoopFanOut`. Conceptual frame: **concurrent clocks frozen
  on command**. Manual-ack doc:
  [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

  Working tree: `topology.json` (`"runtime": "ticked"` flag for
  verification) and `topology.view.json` (camera drift) — editor
  state, intentionally not committed. Reference branches retained:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

**Merge `task/node-ticks` → `main` with sign-off** (see
[handoff-next-task.md](handoff-next-task.md)). Phase 2 is visually
verified; merge unblocks Phase 3 (drag-resilient pulse rendering).
Other dormant options:

  - **Triage the two pre-existing red tests** (shape-d-cycle,
    handle-load-repro). May resolve as a side effect of ticked
    substrate phase 5.
  - **Shape D port** under manual-ack
    ([handoff-shape-d-plan.md](handoff-shape-d-plan.md)) — superseded
    by ticked substrate phase 5.
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
