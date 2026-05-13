# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task:
     non-`in0` readgate contract test landed at `42c9ec9`; next is
     multi-hop in the editor (relay/join) and the optional mid-flight
     `pathD`-change pulse-progress test.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — forever-loop substrate background; layered with the resolved
     slot-in-node model.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

State at handoff (2026-05-13, end of session):

  **Active branch:** `task/substrate-slot-in-node`. Tip `42c9ec9`.
  Editor pulse path is now locked by a contract test for a non-`in0`
  readgate slot, closing the landing-rule drift between the editor
  and test paths. Session commits since last handoff:

  - `42c9ec9` substrate: lock editor pulse path with non-in0
    readgate contract test. Added per-node `ports` override on
    `RNodeSpec`; `parseSpec` validates against the effective ports;
    `TopologyRoot.NodeView` now threads `ports.inputs[i]` into
    relay/join/readgate bodies — matching `RSubstrateNode` on the
    editor path. New test `r-topology-readgate-port` covers
    `input → readgate` via slot `"chainIn"` and a parseSpec
    rejection case.

  Prior session tip was `05f0f5d` (RAF restart on `pathD` change)
  and `ef5db1a` (slot-id threading on the editor path).

  **Gates at handoff:** tsc clean, 125/125 vitest (+2 from the new
  contract test), `check:loc` clean. Open housekeeping unchanged:
  `check-substrate-vocab.mjs` stale (`substrate/` → `substrate-r/`);
  `task/in0-readgate-emission-ack` past retire (needs user sign-off
  to delete).

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
