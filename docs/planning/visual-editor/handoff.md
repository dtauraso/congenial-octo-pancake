# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task:
     `ChainInhibitor` is now a substrate-r primitive with a manual
     single-pulse emit button. Next is locking the inhibitor → AND
     readgate path in a contract test, then giving the inhibitor an
     upstream source so emission is self-driven instead of manual.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — forever-loop substrate background; layered with the resolved
     slot-in-node model.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

State at handoff (2026-05-13, mid-session):

  **Active branch:** `task/substrate-slot-in-node`. Tip is
  `2cec842` ("substrate: ChainInhibitor primitive with manual
  single-pulse emit"). Session moves since `211f33f`:

  - New substrate-r kind `chaininhibitor`
    ([spec.ts](../../../tools/topology-vscode/src/webview/substrate-r/spec.ts))
    with ports `{ inputs: ["in"], outputs: ["out"] }`.
  - `ChainInhibitorBody` in
    [node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx)
    fires chain pass-through under slot-in-node (consume `in` →
    load `out`) and adds a `⇢` button that loads a single value
    (`1`) onto the out wire when `wire.canAccept` is true. Button
    disarms on click; re-arms when the downstream slot drains.
  - Both dispatch paths
    ([TopologyRoot](../../../tools/topology-vscode/src/webview/substrate-r/TopologyRoot.tsx),
    [RSubstrateNode](../../../tools/topology-vscode/src/webview/substrate-r/RSubstrateNode.tsx))
    dispatch `chaininhibitor` → `ChainInhibitorBody`.
  - Live rig: [topology.json](../../../topology.json) — `i1` is
    now `type: "ChainInhibitor"` (no `data.init`, output `out` kept
    on the left side). Original orange coloring comes from
    `NODE_TYPES["ChainInhibitor"]`. Edge `i1.out → readGate1.chainIn2`
    unchanged. Sublabel in `topology.view.json` renamed to
    "ChainInhibitor".

  **Gates at handoff:** tsc clean, 125/125 vitest, `check:loc`
  clean, `out/webview.js` rebuilt. Open housekeeping unchanged:
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
alone don't refresh `out/webview.js`.

## Next move

See [handoff-next-task.md](handoff-next-task.md). Lock the
ChainInhibitor → ReadGate AND path in a contract test through
the editor's React Flow path. Then decide whether i1 stays
manually emitting (button-driven) or gets an upstream Input so
the chain is fully self-driven. Capture any parking topology
as a failing test before fixing.

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
