# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open friction:
     diagnose the manual-take "multiple clicks" bug, then port
     `<Node>` bodies for remaining node types as each surfaces.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — substrate model background (forever-loops). Realized by the
     React-component substrate now on `main`.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-11, mid-session):

  **Active branch:** `main`. `task/edge-visual-fidelity` merged
  (commit `b54f299`). Latest commit `3d6e719` tweaks pulse
  rendering — value label drawn next to the pulse circle while
  `loaded`, speed slowed to 0.08 px/ms — and makes the clear-slot
  (`ManualTakeButton`) background white in both armed and disabled
  states. Opacity + cursor still distinguish the two.

  **Open friction:** user reports having to click the clear-slot
  button multiple times to advance to the next input value. Root
  cause not yet diagnosed. Wiring analysis suggests one click
  should advance one item; suspects include listener-notification
  reentrancy in `Wire.apply()` (recursive `ack` mid-iteration
  leaves listeners receiving phase transitions out of order
  depending on Set insertion order) and microtask-vs-render
  ordering for `ManualTakeButton`'s `phaseKind` state.

  **Gates:** build ✓ after last edit; tsc/vitest not re-run since
  merge; LOC ✓.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place.

## Next move

Diagnose the multi-click bug before further node-kind work. Ask
the user:

  - When a click "fails," does the pulse visibly start moving
    (slow at 0.08 px/ms could mask the advance) or does the wire
    stay empty?
  - Does the value label change between failing clicks?
  - Is the button visually enabled when failing clicks land?

Likely fix area: [Wire.tsx](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx)
`apply()` — the for-of over `phaseListenersRef` calls listeners
with the closured `next`, but a listener that triggers a
recursive apply (e.g. `InputBody` calling `ack` on `taken`) makes
later listeners in the same outer iteration receive a stale
phase.

After that bug closes, posture returns to friction-driven; the
remaining owed work is porting `<Node>` bodies for
ChainInhibitor, AndGate, Partition, EdgeNode, etc., one type at a
time as it surfaces. See [handoff-next-task.md](handoff-next-task.md).

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the active branch
(main if no task is in flight). Do not rely on chat history; the
next AI may be a fresh model with no transcript. The rendered
handoff must itself contain this same ALWAYS clause so the loop is
self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
