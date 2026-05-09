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

State at handoff (2026-05-09, end of twelfth session):
  Active branch: `task/node-ticks` (merged to `main` at `2957316` via
  `--no-ff`; branch retained for further work). Latest commit on the
  branch: `a884cba`.

  This session **uncovered a real bug in `andGateLoop`** and shipped a
  workaround. The bug: andGateLoop acks its inbound wires internally
  ([node-loop.ts:79](../../../tools/topology-vscode/src/substrate/node-loop.ts#L79)),
  which defeats the manual-ack / visual-pacing model on Shape C. As a
  result, multiple pulses can stack on i1→readGate.ack at once
  (user observed). joinLoop got this right — andGateLoop did not when
  Shape C swapped to it for the emit capability.

  The workaround (commit `a884cba`) adds a **per-loop trigger gate**:
  `inputLoop` gains optional `awaitOpen`; a new `TriggerGate`
  ([trigger-gate.ts](../../../tools/topology-vscode/src/substrate/trigger-gate.ts))
  parks i1's loop until the user clicks ▶ on a new panel button
  ([TriggerSlotButton.tsx](../../../tools/topology-vscode/src/webview/panels/TriggerSlotButton.tsx)).
  Default closed; click toggles open/closed. Only i1 is gated; in0
  still has the same internal-ack issue on chainIn (per user
  direction).

  Underlying andGateLoop bug is **not** fixed — see
  [handoff-next-task.md](handoff-next-task.md). 258/258 vitest; tsc +
  build clean.

  Prior-session highlights (consult `git log` for full history):
  - `fbe61ab` Shape C wired (4 nodes / 3 edges), readGate switched
    from `joinLoop` to `andGateLoop` (the swap that introduced the
    bug above).
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

Start at [handoff-next-task.md](handoff-next-task.md). Two paths:
**(1) fix `andGateLoop` properly** (mirror joinLoop's post-fire
`awaitReady` step, then drop or repurpose the i1 trigger gate); or
**(2) pick i0's outbound** (cycle close to i1, branch to a second
ReadGate, or feed a Distribute/EdgeNode). Doing (1) first keeps later
shapes from inheriting the pacing bug. A Shape C contract test is
also still owed. Before touching the manual-ack code, read
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
