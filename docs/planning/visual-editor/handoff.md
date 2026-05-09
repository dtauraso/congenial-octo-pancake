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

State at handoff (2026-05-09, mid fourteenth session):
  Active branch: `task/node-ticks` (merged to `main` at `2957316` via
  `--no-ff`; branch retained for further work). Latest commit on the
  branch: `9006ec7`.

  Shape D plan filed at
  [handoff-shape-d-plan.md](handoff-shape-d-plan.md): close the cycle
  by adding `i0.out → i1.in`, then matcher, setup, dispatch, cycle
  seed, contract test (six increments).

  **Item 1 of the plan is committed (`9006ec7`).**
  [topology.json](../../../topology.json) now has the i0→i1 chain
  edge (4 nodes / 4 edges). With no Shape D matcher yet,
  `matchSubstrate` rejects this spec and the topology falls through to
  the legacy runner. Expected — resume at item 2 (matcher).

  Prior in-session work (already committed at `e9e3fef`): fixed the
  `andGateLoop` pacing bug. andGateLoop now mirrors joinLoop —
  `awaitReady`s each inbound after `out.send` instead of self-acking.
  Pulses stop stacking on i1→readGate.ack. Shape C dropped the
  per-loop trigger gate; i1's send loop paces via the manual-ack
  button, same as in0. `TriggerGate` module + `awaitOpen` plumbing on
  `inputLoop` remain in tree as a potential debug pacer.

  258/258 vitest; tsc + build clean as of `e9e3fef`. Next step is
  item 2 (matcher).

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

Path chosen: **cycle close i0→i1** (Shape D). Plan at
[handoff-shape-d-plan.md](handoff-shape-d-plan.md). Item 1 (spec edge)
is committed (`9006ec7`). Resume at item 2 (matcher). Other open paths
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
