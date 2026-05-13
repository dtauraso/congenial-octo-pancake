# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task:
     the editor cycle (readGate1 ↔ i0 ↔ i1) needs live-user
     verification. readgate now emits `1` on its `out` port, wire
     delivery is decoupled from RAF animation, and the driver
     auto-advances through idle cohorts at ~60Hz in resume mode.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — forever-loop substrate background; layered with the resolved
     slot-in-node model.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

State at handoff (2026-05-13, end-of-session):

  **Active branch:** `task/substrate-slot-in-node`. Tip `f7236cf`.
  Working tree clean (all session changes committed). 127/127
  vitest green, tsc clean, `check:loc` clean, `out/webview.js`
  rebuilt.

  Session moves since `f2ee9ba`:

  - `06a76fe` ReadGateBody fires its `out` port (emits `1`) when
    all slots are filled and the out wire `canAccept`. Editor and
    contract paths both dispatch. New test
    [r-topology-readgate-emit.test.tsx](../../../tools/topology-vscode/test/contracts/r-topology-readgate-emit.test.tsx).
    Node-kinds split into siblings to stay under the LOC budget.
  - `b552b0d` Wire substrate delivery decoupled from RAF: gate
    release writes the slot via a `pendingDeliver` flag; RAF only
    tracks visual `animDone`; `in-flight → empty` requires both.
    Removes the back-edge parking race.
  - `f7236cf` Driver fast-path now re-arms
    `requestAnimationFrame(advance)` in resume mode so the cursor
    keeps walking through idle cohorts (~60Hz). Halted/step mode
    unchanged.

  **What's open:** the cycle should now sustain itself in the
  editor. User needs to reload the webview and confirm. If it
  still stalls, the suspect zones in handoff-next-task.md are the
  starting points. Housekeeping (vocab-check path,
  `task/in0-readgate-emission-ack` retire) carried.

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

See [handoff-next-task.md](handoff-next-task.md). Verify the cycle
self-sustains in the live editor; log any remaining friction to
[session-log.md](session-log.md) and address in follow-up commits
on this branch.

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
