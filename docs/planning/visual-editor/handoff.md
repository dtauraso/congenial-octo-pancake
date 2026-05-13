# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task:
     drive a real topology in the editor (input → relay → readgate,
     or join chain) and verify pulses flow end-to-end through the
     slot-in-node loop now that the editor path dispatches all four
     kinds and threads cohort/gate.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — forever-loop substrate background; layered with the resolved
     slot-in-node model.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

State at handoff (2026-05-13, end of session):

  **Active branch:** `task/substrate-slot-in-node`. Three commits
  landed this session catching the editor path up to the test
  path:

  - `96718ac` substrate: prevent fossil pulses across spec edits.
    `<Wire>` is now keyed by its structural props so a spec edit
    can't leave an `in-flight` phase stranded in a re-used React
    instance.
  - `4b0dae9` substrate: dispatch relay/join in editor + thread
    cohort/gate. `RSubstrateNode` now dispatches `relay` and
    `join` in addition to `input` and `readgate`. New
    [cohort-assign.ts](../../../tools/topology-vscode/src/webview/substrate-r/cohort-assign.ts)
    computes cohorts from raw edge tuples (no parseSpec port
    validation, so mid-edit invalid specs don't throw). New
    [CohortAssigner.tsx](../../../tools/topology-vscode/src/webview/substrate-r/CohortAssigner.tsx)
    watches React Flow's edges and pushes the cohort map into
    [registry.tsx](../../../tools/topology-vscode/src/webview/substrate-r/registry.tsx)
    (now exposes `setCohorts` / `getWireCohort`). Mounted inside
    `<ReactFlow>` in
    [AppView.tsx](../../../tools/topology-vscode/src/webview/rf/app/AppView.tsx).
    [RSubstrateEdge.tsx](../../../tools/topology-vscode/src/webview/substrate-r/RSubstrateEdge.tsx)
    now passes `cohort` and `gate` to `<Wire>`.
  - `fd7ad63` docs: substrate primitive landing rule. CLAUDE.md
    encodes: a primitive isn't landed until both `TopologyRoot`
    (test) **and** `RSubstrateNode`/`RSubstrateEdge` (editor)
    dispatch to it.

  **Why this session existed:** the prior handoff said "verify
  pulses in the editor," but the editor had been silently lagging
  the test path since `31c6cdb` — relay/join/cohort/gate never
  reached `RSubstrateNode`/`RSubstrateEdge`. The verification
  target was impossible. Fixed by catching the editor path up and
  writing the rule into CLAUDE.md.

  **Gates at handoff:** `tsc --noEmit` clean. `npx vitest run` →
  123 passing across 21 files. `npm run check:loc` clean.
  `check-substrate-vocab.mjs` still stale (targets `substrate/`,
  live dir is `substrate-r/`) — fix queued.

  **Auto-retire signal:** `task/in0-readgate-emission-ack` still
  past its retire condition. Branch deletion is destructive
  shared-state — needs explicit user sign-off. Flag at next
  opportunity.

  **Pre-existing uncommitted diff:** `topology.view.json` still
  carries a modification that pre-dates this work; not touched.

## Dev-loop

Read [MODEL.md](../../../MODEL.md), the new CLAUDE.md "Substrate
primitive landing rule" section, and
[RSubstrateNode.tsx](../../../tools/topology-vscode/src/webview/substrate-r/RSubstrateNode.tsx)
+ [RSubstrateEdge.tsx](../../../tools/topology-vscode/src/webview/substrate-r/RSubstrateEdge.tsx).
Next step is real-editor verification — see
[handoff-next-task.md](handoff-next-task.md).

## Next move

See [handoff-next-task.md](handoff-next-task.md). Load a topology
in the editor with at least an input and a readgate (preferably
also a relay or join), step the transport, and confirm pulses
arrive at the destination slot. If any case parks, capture the
failing topology as a contract test before fixing.

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
