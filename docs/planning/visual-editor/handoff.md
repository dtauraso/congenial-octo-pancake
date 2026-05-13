# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task: add a
     2-input join node so multi-slot firing rules are exercised on
     the new substrate.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — forever-loop substrate background; layered with the resolved
     slot-in-node model.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

State at handoff (2026-05-13, end of session):

  **Active branch:** `task/substrate-slot-in-node`. Commit 3 of the
  slot-in-node series landed and pushed (`1ca6f9f`) — relay node +
  multi-cohort chain end-to-end. On top of the cohort gate +
  cursor driver (`5c68b67`) this session added:

  - [spec.ts](../../../tools/topology-vscode/src/webview/substrate-r/spec.ts)
    — `relay` kind registered in `NODE_KIND_PORTS` with `inputs:
    ["in0"]`, `outputs: ["out"]`.
  - [node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx)
    — `RelayBody`. Its `onRun` drains the `in0` slot to the
    outgoing wire when `wire.canAccept`. Because `Node.fill`
    re-invokes `onRun`, wire-arrival immediately triggers emission
    without waiting for the next driver pass.
  - [TopologyRoot.tsx](../../../tools/topology-vscode/src/webview/substrate-r/TopologyRoot.tsx)
    — dispatches the `relay` kind to `RelayBody`.
  - [r-topology-chain.test.tsx](../../../tools/topology-vscode/test/contracts/r-topology-chain.test.tsx)
    — 3 tests: parseSpec assigns w1=0/w2=1; one step parks w2 on
    the gate (readgate slot still empty, button not armed); a
    second step releases cohort 1 and the slot fills.

  **Gates at handoff:** `tsc --noEmit` clean. `npx vitest run` →
  120 passing across 20 files. `npm run check:loc` clean.
  `check-substrate-vocab.mjs` still stale (targets `substrate/`,
  the live dir is `substrate-r/`) — fix queued.

  **Auto-retire signal:** `task/in0-readgate-emission-ack` still
  past its retire condition. Branch deletion is destructive
  shared-state — needs explicit user sign-off. Flag at next
  opportunity.

  **Pre-existing uncommitted diff:** `topology.view.json` still
  carries a modification that pre-dates the slot-in-node work; not
  touched again.

  **Commits this session:** `1ca6f9f` substrate: relay node +
  multi-cohort chain (pushed).

## Dev-loop

Read [MODEL.md](../../../MODEL.md) +
[RelayBody](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx)
and the chain test
([r-topology-chain.test.tsx](../../../tools/topology-vscode/test/contracts/r-topology-chain.test.tsx)).
Next code change: a 2-input join node — see
[handoff-next-task.md](handoff-next-task.md).

## Next move

See [handoff-next-task.md](handoff-next-task.md). The next concrete
step is to add a `join` kind (slots `a`, `b`; output `out`) whose
firing rule requires both slots `filled`, then a contract test
demonstrating that the join doesn't emit until both predecessor
cohorts have arrived.

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
