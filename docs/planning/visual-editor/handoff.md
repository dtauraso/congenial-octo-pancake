# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task:
     substrate model just changed (delivery on RAF arrival, cohort
     out of delivery path). Live re-verify, retire ChainInhibitor's
     `⇢` debug button, then housekeeping.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — forever-loop substrate background; layered with the resolved
     slot-in-node model.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

State at handoff (2026-05-13, end-of-session):

  **Active branch:** `task/substrate-slot-in-node`. Tip `44406cd`.
  Working tree clean. 126/126 vitest green, tsc clean,
  `check:loc` clean, `out/webview.js` rebuilt.

  **Substrate model just changed.** Cohort is now observation-only
  (a label on wires for the scrub cursor) and delivery happens at
  RAF arrival, not at load. Net effect: a single `wire.load` no
  longer cascades synchronously through the topology — each hop
  costs one wire animation. See commit `44406cd` and
  [handoff-next-task.md](handoff-next-task.md) for the two user
  clarifications that drove the change.

  **Needs live re-verify.** The earlier cycle verification was
  under the old model. Reload the webview and confirm the cycle
  still pulses end-to-end in resume mode, with each hop visibly
  animating along one wire at a time.

  **What's open:** retire ChainInhibitor's `⇢` button (a non-source
  node shouldn't be able to originate values). Housekeeping carries
  — fix `scripts/check-substrate-vocab.mjs` path
  (`substrate/` → `substrate-r/`), flag
  `task/in0-readgate-emission-ack` for user-approved deletion.
  Then offer merge to `main`.

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

See [handoff-next-task.md](handoff-next-task.md). Live re-verify
the cycle under the new delivery-on-arrival model, retire
ChainInhibitor's `⇢` button, clear housekeeping items, then offer
merge to `main`. Log any new friction to
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
