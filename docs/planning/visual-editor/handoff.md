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

State at handoff (2026-05-09, fifteenth session):
  Active branch: `task/node-ticks` (merged to `main` at `2957316` via
  `--no-ff`; branch retained for further work). Latest commit on the
  branch: `efb4fa9`.

  Shape D plan filed at
  [handoff-shape-d-plan.md](handoff-shape-d-plan.md): close the cycle
  by adding `i0.out → i1.in`, then matcher, setup, dispatch, cycle
  seed, contract test (six increments). Item 6 split into two
  commits: (6a) bump `handle-load-repro.test.ts` 3→4 edges to green
  the suite; (6b) new Shape D contract test. 6a is done; 6b is next.

  **Items 1–5 + 6a are committed (`9006ec7`, `d38cf4e`, `aebef03`,
  `dcf14b7`, `8fb4c12`, `efb4fa9`).** [topology.json](../../../topology.json)
  has the i0→i1 chain edge; `matchSubstrate` accepts the 4-node/4-edge
  spec as shape `"input+inhibitor->readGate->i0->i1"`;
  `setupInputReadGateInhibitorCycle` lives in
  [runtime-wires-shape-d.ts](../../../tools/topology-vscode/src/substrate/runtime-wires-shape-d.ts)
  (kept separate so `runtime-wires-shapes.ts` stays under the 200-LOC
  budget); `startWiresRuntime` in
  [runtime-wires.ts](../../../tools/topology-vscode/src/substrate/runtime-wires.ts)
  routes the new shape to that setup. A local `seedLoop` in the same
  shape-d file does a one-shot `ackWireE.send(1)` at startup so
  readGate's andGateLoop unblocks on first iteration; subsequent acks
  come from i1's andGateLoop once value has propagated
  readGate → i0 → i1. Resume at item 6b (new Shape D contract test).

  Suite is green as of `efb4fa9` (258/258); the `handle-load-repro`
  3→4 edge bump landed in 6a. tsc + build clean.

  Earlier-branch context (see `git log` for details): `e9e3fef` fixed
  the `andGateLoop` pacing bug (now mirrors joinLoop — awaitReady on
  each inbound after `out.send` instead of self-acking; no pulse
  stacking on i1→readGate.ack). `TriggerGate` + `awaitOpen` plumbing
  on `inputLoop` remain in tree as a potential debug pacer. Shape C
  paces i1 via the manual-ack button, same as in0. Mechanism doc:
  [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).
  Conceptual frame: **concurrent clocks frozen on command**.

  Working tree: `.claude/settings.json` and `topology.view.json` carry
  incidental drift; orthogonal — leave or stash. Prior branches
  preserved as reference: `task/runtime-substrate-rebuild`,
  `task/wires`, `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

Path chosen: **cycle close i0→i1** (Shape D). Plan at
[handoff-shape-d-plan.md](handoff-shape-d-plan.md). Items 1–5 + 6a
are committed (`9006ec7`, `d38cf4e`, `aebef03`, `dcf14b7`, `8fb4c12`,
`efb4fa9`). Resume at **item 6b**: new Shape D contract test that
loads the 4-edge topology end-to-end and asserts no pulse stacking on
i1→readGate.ack and on the new i0→i1 edge across at least two cycles.
Suite is green (258/258 as of `efb4fa9`); tsc + build clean. Keep
≤100 LOC. Other open paths
([handoff-next-task.md](handoff-next-task.md)) — Shape C contract
test, deleting unused `TriggerGate` — remain available but parked
behind Shape D. Before touching the manual-ack code, read
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
