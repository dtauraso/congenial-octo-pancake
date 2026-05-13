# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task:
     lock the editor pulse path (input → readgate with a non-`in0`
     schema port) in a contract test, then extend to multi-hop
     (relay, join). Editor pulse verified live at tip `ef5db1a`.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — forever-loop substrate background; layered with the resolved
     slot-in-node model.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

State at handoff (2026-05-13, end of session):

  **Active branch:** `task/substrate-slot-in-node`. Tip `ef5db1a`.
  Editor pulse path now works live for input → readgate. The
  slot-id mismatch that was silently crashing the driver mid-step
  is fixed. Session commits:

  - `ef5db1a` substrate: thread schema port names as slot ids into
    node bodies. `ReadGateBody`/`RelayBody`/`JoinBody` take slot
    ids as props (defaults preserve test literals);
    `RSubstrateNode` passes `data.inputs[i].name`. Prior to this,
    `Wire.canAccept` threw `Node: unknown slot chainIn` inside
    the driver's run loop and no pulse animated.
  - `96718ac` substrate: prevent fossil pulses across spec edits
    by keying `<Wire>` on its structural props.
  - `4b0dae9` substrate: dispatch relay/join in editor + thread
    cohort/gate. Adds `cohort-assign.ts`, `CohortAssigner.tsx`;
    `registry` exposes `setCohorts`/`getWireCohort`;
    `RSubstrateEdge` passes `cohort`+`gate` to `<Wire>`.
  - `fd7ad63` docs: substrate primitive landing rule in CLAUDE.md
    (test path + editor path, dual dispatch).

  **Gates at handoff:** tsc clean, 123/123 vitest, `check:loc`
  clean. Open housekeeping: `check-substrate-vocab.mjs` stale
  (`substrate/` → `substrate-r/`); `task/in0-readgate-emission-ack`
  past retire (needs user sign-off to delete).

## Dev-loop

Read [MODEL.md](../../../MODEL.md), CLAUDE.md's "Substrate
primitive landing rule", and the three primitive files:
[RSubstrateNode.tsx](../../../tools/topology-vscode/src/webview/substrate-r/RSubstrateNode.tsx),
[RSubstrateEdge.tsx](../../../tools/topology-vscode/src/webview/substrate-r/RSubstrateEdge.tsx),
[node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx).
After any substrate-r edit, run `npm run build` — vitest/tsc
alone don't refresh `out/webview.js`, and a stale bundle is what
made the "no pulse after reload" symptom appear before `ef5db1a`.

## Next move

See [handoff-next-task.md](handoff-next-task.md). Lock the fixed
editor pulse path in a contract test (a readgate whose schema
input port is not `"in0"`), then extend to multi-hop (relay,
join). If any case parks, capture the failing topology as a
contract test before fixing.

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
