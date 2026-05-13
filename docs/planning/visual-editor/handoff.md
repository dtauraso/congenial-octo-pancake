# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task:
     cycle is live-verified; next is housekeeping (vocab-check
     path, parked-branch retire) and deciding the fate of the
     manual `⇢` debug button on ChainInhibitor.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — forever-loop substrate background; layered with the resolved
     slot-in-node model.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

State at handoff (2026-05-13, end-of-session):

  **Active branch:** `task/substrate-slot-in-node`. Tip `f7236cf`.
  Working tree clean. 127/127 vitest green, tsc clean,
  `check:loc` clean, `out/webview.js` rebuilt.

  **Live-verified:** user reloaded the webview and confirmed the
  cycle (readGate1 ↔ i0 ↔ i1, `in08 → chainIn`) self-sustains in
  resume mode — pulses continuously, no manual step clicks needed
  to drain the i1→readGate back-edge. The three commits since
  `f2ee9ba` (readgate `out` emit, RAF-decoupled wire delivery,
  driver fast-path rAF re-arm) resolve the parking friction.

  **What's open:** housekeeping carries — fix
  `scripts/check-substrate-vocab.mjs` path
  (`substrate/` → `substrate-r/`), and flag
  `task/in0-readgate-emission-ack` for user-approved deletion.
  Decide whether to retire ChainInhibitor's manual `⇢` button now
  that the cycle runs on its own (debug aid vs. dead UI). Branch
  is ready for sign-off to merge to `main`.

## Dev-loop

Read [MODEL.md](../../../MODEL.md), CLAUDE.md's "Substrate
primitive landing rule", the three primitive files
([RSubstrateNode.tsx](../../../tools/topology-vscode/src/webview/substrate-r/RSubstrateNode.tsx),
[RSubstrateEdge.tsx](../../../tools/topology-vscode/src/webview/substrate-r/RSubstrateEdge.tsx),
[node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx)
+ siblings), and
[Wire.tsx](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx)
for the decoupled-clocks model. After any substrate-r edit, run
`npm run build` — vitest/tsc alone don't refresh `out/webview.js`.

## Next move

See [handoff-next-task.md](handoff-next-task.md). Cycle is
verified; clear housekeeping items and ask user about merging to
`main`. Log any new friction to
[session-log.md](session-log.md).

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to
the state you're leaving the branch in, and commit on the active
branch (main if no task is in flight). Do not rely on chat
history; the next AI may be a fresh model with no transcript. The
rendered handoff must itself contain this same ALWAYS clause so
the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
