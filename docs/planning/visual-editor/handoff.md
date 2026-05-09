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

State at handoff (2026-05-09, sixteenth session):
  Active branch: `task/node-ticks` (merged to `main` at `2957316` via
  `--no-ff`; branch retained for further work). Latest commit on the
  branch: `62b9f6f`.

  Shape D plan filed at
  [handoff-shape-d-plan.md](handoff-shape-d-plan.md): close the cycle
  by adding `i0.out → i1.in`, then matcher, setup, dispatch, cycle
  seed, contract test (six increments). All six committed; item 6b
  pinned a finding (see below).

  **Items 1–6 are committed (`9006ec7`, `d38cf4e`, `aebef03`,
  `dcf14b7`, `8fb4c12`, `efb4fa9`, `62b9f6f`).** [topology.json](../../../topology.json)
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
  readGate → i0 → i1. Item 6b landed at `62b9f6f`:
  [shape-d-cycle.test.ts](../../../tools/topology-vscode/test/contracts/shape-d-cycle.test.ts)
  loads the 4-edge topology end-to-end and asserts the no-stacking
  invariant (depth ≤ 1, arrives == acks) on `i1->readGate.ack` and
  on the new `i0->i1` edge. **Finding from 6b:** Shape D sustains
  exactly ONE full propagation. After the first round-trip,
  cycleWire/outWire empty out and ackWireE has no perpetual driver,
  so readGate parks at step A awaitValue forever. The seed is
  one-shot, and the cycle as wired needs another driver to keep
  refilling ackWireE. Test pins ≥1 cycle rather than the ≥2 the
  plan optimistically called for.

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

**Cycle-2 gap diagnosis** (seventeenth session, attempted fix reverted
to keep tree at `62b9f6f`): the topology IS balanced; the blocker is
substrate microtask ordering. Full diagnosis and next-move options in
[handoff-cycle2-diagnosis.md](handoff-cycle2-diagnosis.md). Read that
before touching shape-d.ts or node-loop.ts.

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
