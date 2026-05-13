# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task: the
     spec now accepts cycles (cohorts assigned at wire-creation
     order) and the live rig closes a readGate → i0 → i1 → readGate
     loop. Next is teaching readgate's firing rule to load its `out`
     port so the cycle actually pulses.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — forever-loop substrate background; layered with the resolved
     slot-in-node model.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

State at handoff (2026-05-13, mid-session):

  **Active branch:** `task/substrate-slot-in-node`. Tip pre-handoff
  is `7407aa6`; working tree has uncommitted cycle support that
  this handoff covers. Session moves since `7407aa6`:

  - `assignCohorts` in
    [spec.ts](../../../tools/topology-vscode/src/webview/substrate-r/spec.ts)
    rewritten from DFS-with-cycle-throw to wire-creation-order
    iteration. Each wire's cohort is computed from its source
    node's already-assigned incoming wires at the moment the wire
    is reached. Cycles no longer throw; back-edges land at the
    highest cohort by construction.
  - Same file: readgate output arity relaxed from fixed-0 to
    variable-arity, matching its variable-arity inputs. Instances
    can declare an `out` port to close a feedback cycle.
  - [r-parse-cohort.test.ts](../../../tools/topology-vscode/test/contracts/r-parse-cohort.test.ts)
    adds a cycle test (readgate → i0 → i1 → readgate, plus
    in → readgate) asserting cohorts `[0, 1, 2, 3]`, no throw.
  - [topology.json](../../../topology.json): added `i0`
    (ChainInhibitor), readGate1 instance output `out`, edges
    `readGate1.out → i0.in` and `i0.out → i1.in`. The cycle closes
    through the pre-existing `i1.out → readGate1.chainIn2`.
  - Initial reload crashed with a blank diagram — root cause was a
    stray `"side": "top"` on readGate1's output, which the editor
    schema (`left|right` only) rejected. Removed.

  **Gates at handoff:** tsc clean, 126/126 vitest (including the
  new cycle test), `check:loc` clean, `out/webview.js` rebuilt,
  cycle renders in the editor after reload. The cycle does **not
  pulse yet** — readgate's firing rule still ignores its new `out`
  port (next task). Open housekeeping unchanged:
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

See [handoff-next-task.md](handoff-next-task.md). Teach `readgate`'s
firing rule to load its `out` port when the AND arms, so the
readGate → i0 → i1 → readGate cycle pulses end-to-end without
manual `⇢` clicks. Land on both test and editor paths per the
substrate primitive landing rule. Settle the "what value does
readgate emit" design question before coding.

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
