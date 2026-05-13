# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task:
     ReadGate is now an N-slot AND on both paths and the live editor
     has a 2-input AND rig; next is locking the editor AND in a
     contract test, then a real multi-hop with `Relay` fed by a
     third Input.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — forever-loop substrate background; layered with the resolved
     slot-in-node model.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

State at handoff (2026-05-13, mid-session):

  **Active branch:** `task/substrate-slot-in-node`. Tip is the
  variable-arity readgate landing (commit message:
  "substrate: variable-arity readgate + per-instance port overrides").
  Session moves since the prior tip `42c9ec9`:

  - `readgate` arity relaxed to N ≥ 1 in
    [spec.ts](../../../tools/topology-vscode/src/webview/substrate-r/spec.ts);
    other kinds still fixed.
  - `ReadGateBody` rewritten for AND semantics over N slots — one
    button, armed only when every slot is `filled`, consumes all on
    click. `ManualTakeButton` is now used only by `r-node` tests.
  - Both dispatch paths
    ([TopologyRoot](../../../tools/topology-vscode/src/webview/substrate-r/TopologyRoot.tsx),
    [RSubstrateNode](../../../tools/topology-vscode/src/webview/substrate-r/RSubstrateNode.tsx))
    pass the full inputs array to `ReadGateBody`.
  - Editor `Node` gains per-instance `inputs?` / `outputs?` Port
    overrides, parsed and validated end-to-end; `spec-to-flow`
    projects them into React Flow `data.inputs` / `data.outputs`.
  - `Port` gains optional `side?: "left" | "right"`;
    `RSubstrateNode` groups handles by effective side. Demonstrated
    by `i1` declaring `outputs: [{ side: "left" }]` in the live rig.
  - `Relay` registered in
    [node-types.ts](../../../tools/topology-vscode/src/schema/node-types.ts)
    — it was missing, which is why a fresh `Relay` node rendered
    with no handles and silently swallowed its outgoing edge.
  - Live rig: [topology.json](../../../topology.json) has `in08` and
    `i1` (both `Input` for now — "i1 is a source for now") feeding
    `readGate1.chainIn` and `chainIn2`. Visual sublabel on `i1`
    still says "Relay"; rename via the editor inspector when
    convenient.

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

See [handoff-next-task.md](handoff-next-task.md). Lock the 2-slot
AND in a contract test through the editor's React Flow path, then
swap `i1` to a real `Relay` fed by a third Input so the multi-hop
path is exercised end-to-end. Capture any parking topology as a
failing test before fixing.

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
