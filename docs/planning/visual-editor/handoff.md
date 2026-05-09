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

State at handoff (2026-05-09, end of thirteenth session):
  Active branch: `task/node-ticks` (merged to `main` at `2957316` via
  `--no-ff`; branch retained for further work). Latest commit on the
  branch: `e9e3fef`.

  This session **fixed the `andGateLoop` bug** uncovered last session.
  andGateLoop now mirrors joinLoop: after `out.send`, it `awaitReady`s
  each inbound instead of self-acking. Pulses no longer stack on
  inbound wires; i1→readGate.ack paces correctly through the
  manual-ack edge.

  Shape C dropped the per-loop trigger gate; i1's send loop now paces
  naturally via the manual-ack button, same as in0. The `TriggerGate`
  module + `awaitOpen` plumbing on `inputLoop` remain in tree as a
  potential debug pacer, but no shape registers a trigger slot. The
  panel button component is still wired and harmless when triggerSlots
  is empty.

  258/258 vitest; tsc + build clean.

  Prior-session highlights (consult `git log` for full history):
  - `a884cba` per-loop trigger gate workaround (now superseded by the
    proper fix in `e9e3fef`).
  - `fbe61ab` Shape C wired (4 nodes / 3 edges), readGate switched
    from `joinLoop` to `andGateLoop` (the swap that introduced the
    bug fixed this session).
  - `2f48ea9` back-channel-era contract tests
    (`input-loop-await-ready`, `runtime-wires-manual-ack`).
  - `7d2ae39` multi-edge manual-ack + "clear both" button; mechanism
    doc at [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).
  - Earlier on branch: `joinLoop`, Shape B, `runtime-wires` dispatch,
    visuals 1–4, pause-as-mid-arc-freeze. Conceptual frame:
    **concurrent clocks frozen on command**.

  Working tree: `.claude/settings.json` and `topology.view.json` carry
  incidental drift; orthogonal — leave or stash. Prior branches
  preserved as reference: `task/runtime-substrate-rebuild`,
  `task/wires`, `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

Start at [handoff-next-task.md](handoff-next-task.md). With andGateLoop
fixed, the open paths are: **(a) pick i0's outbound** (cycle close to
i1, branch to a second ReadGate, or feed a Distribute/EdgeNode —
recommended: cycle close to i1); **(b) write the Shape C contract
test** still owed; or **(c) decide whether to delete the now-unused
`TriggerGate` module / `awaitOpen` plumbing or keep them as a debug
pacer**. Before touching the manual-ack code, read
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
