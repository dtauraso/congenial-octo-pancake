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
  branch: `5193bc6` (Shape D cycle-2 gap closed; self-pumping).

  Shape D plan filed at
  [handoff-shape-d-plan.md](handoff-shape-d-plan.md): close the cycle
  by adding `i0.out → i1.in`, then matcher, setup, dispatch, cycle
  seed, contract test (six increments). All six committed; item 6b
  pinned a finding (see below).

  **Items 1–6 committed** (`9006ec7`, `d38cf4e`, `aebef03`,
  `dcf14b7`, `8fb4c12`, `efb4fa9`, `62b9f6f`). [topology.json](../../../topology.json)
  has the i0→i1 chain edge; `matchSubstrate` accepts the 4-edge spec
  as shape `"input+inhibitor->readGate->i0->i1"`;
  `setupInputReadGateInhibitorCycle` lives in
  [runtime-wires-shape-d.ts](../../../tools/topology-vscode/src/substrate/runtime-wires-shape-d.ts)
  (separate file to keep `runtime-wires-shapes.ts` under 200-LOC).
  A local one-shot `seedLoop` puts `1` onto `ackWireE` at startup so
  readGate unblocks on first iteration. Item 6b at `62b9f6f`:
  [shape-d-cycle.test.ts](../../../tools/topology-vscode/test/contracts/shape-d-cycle.test.ts)
  asserts no-stacking on the cycle/ack edges (≥1 cycle).
  **Finding (now superseded — see cycle-2 diagnosis below):** Shape D
  sustains exactly ONE round-trip; original framing was "ackWireE has
  no perpetual driver." Real cause is substrate microtask ordering,
  not topology.

  Suite is green as of `62b9f6f` (259/259). tsc + build clean.

  Earlier-branch context: `e9e3fef` fixed `andGateLoop` pacing
  (mirrors joinLoop, no self-ack). `TriggerGate` + `awaitOpen` remain
  as a potential debug pacer. Shape C paces i1 via manual-ack,
  same as in0. Mechanism: [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).
  Conceptual frame: **concurrent clocks frozen on command**.

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

**Cycle-2 gap closed** at `5193bc6`. New primitive
`andGateLoopWithCycleInputs` in
[node-loop-cycle.ts](../../../tools/topology-vscode/src/substrate/node-loop-cycle.ts)
gives feedback inbounds consume-on-read (sync ack inside step A;
excluded from step D awaitReady). Used for readGate in Shape D with
`ackWireE` marked as cycle input. Manual-ack on `i1->readGate.ack`
removed (cycle wires self-ack). Test tightened to >=3 round-trips.
Diagnosis history retained in
[handoff-cycle2-diagnosis.md](handoff-cycle2-diagnosis.md). Hand-test
in editor still TODO — visual layer pulse animation on cycle wires
may be invisible (substrate acks before arc completes); separate
follow-up if it's a problem.

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
