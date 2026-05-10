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

State at handoff (2026-05-09, thirtieth session):
  Active branch: `task/node-ticks`. **Ticked substrate phase 1
  landed** behind `spec.runtime: "ticked"`. New module
  `src/substrate/ticked/` with `runtime.ts` (engine), `shape-a.ts`
  (Shape A wiring), and `index.ts` (module-level dispatch).
  Dispatch in `runtime-wires.ts` is now factored through
  `runtime-wires-alts.ts` (extracted to keep the host file under
  the 200 LOC budget). Phase 1 contract test
  `test/contracts/ticked-substrate-shape-a.test.ts` pins:
  5 inputs → 5 ticks, inbound port empty between ticks; and that
  `startWiresRuntime` dispatches to the ticked module when the
  spec flag is set. Default callback substrate untouched. Pair
  substrate still user-verified under manual ack (contract test
  pinned at commit `ccd1f19`).

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

Phase 1 of the ticked-substrate plan landed (spec flag, Shape A
spike, contract test). Next move: **phase 2 — step controls**
(Pause / Step / Resume in TimelinePanel; expose inbound contents
between ticks via a subscribe API). See
[handoff-ticked-substrate-plan.md](handoff-ticked-substrate-plan.md).
The current phase 1 driver auto-ticks every 600 ms; phase 2 swaps
that for explicit step/play. Other dormant options:

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
