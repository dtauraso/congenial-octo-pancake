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

State at handoff (2026-05-09, thirty-first session):
  Active branch: `task/node-ticks`. **Ticked substrate phase 2
  landed (commit `c881ada`)**: the 600ms auto-driver is gone. The
  ticked runtime now advances only on `tickedStep()`. The Step
  button in `TransportControls.tsx` is wired to call `tickedStep()`
  when `isTickedActive()`; Play/Pause is disabled in that mode (no
  Resume — phase 2 deliberately omits wall-clock auto-play). New
  APIs in `src/substrate/ticked/`: `subscribeTicked`,
  `tickedInboxSnapshot`. Phase 1 contract test still green and was
  updated to match the simplified `startTickedShapeA(spec)`
  signature. Phase 2 UI behavior (P2 exit criterion: pause Shape A
  mid-run, single step advances exactly one hop, inbound-port
  readouts match) is **not yet visually verified** this session —
  next session must drive the editor to confirm before merging to
  main. Default callback substrate untouched. Pair substrate still
  user-verified under manual ack (contract test pinned at commit
  `ccd1f19`).

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

  Working tree: clean except `topology.view.json` (incidental drift,
  leave or stash). Reference branches retained:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

**Verify phase 2 in the editor**, then merge `task/node-ticks` to
`main` per the plan ("merge to main after phase 2 so later phases
have a stable base"). Verification: load a Shape A spec with
`runtime: "ticked"`, observe the system is paused-by-default,
click ⏭ and confirm the tick counter increments by one per click
and the readGate held-value display updates one input at a time.
If verified, merge with sign-off (per CLAUDE.md "merging a task
branch into `main`" requires explicit sign-off). After merging,
start **phase 3 — drag-resilient pulse rendering** on a fresh
task branch (independent of phases 1–2). See
[handoff-ticked-substrate-plan.md](handoff-ticked-substrate-plan.md). Other dormant options:

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
