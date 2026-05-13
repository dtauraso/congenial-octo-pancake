# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task: add a
     fan-out (distribute) node so one source can feed multiple
     destinations under the slot-in-node substrate.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — forever-loop substrate background; layered with the resolved
     slot-in-node model.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

State at handoff (2026-05-13, end of session):

  **Active branch:** `task/substrate-slot-in-node`. Commit 4 of the
  slot-in-node series landed and pushed (`79ede00`) — 2-input join
  node. On top of the relay + multi-cohort chain (`1ca6f9f`) this
  session added:

  - [spec.ts](../../../tools/topology-vscode/src/webview/substrate-r/spec.ts)
    — `join` kind registered in `NODE_KIND_PORTS` with `inputs:
    ["a", "b"]`, `outputs: ["out"]`.
  - [node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx)
    — `JoinBody`. `onRun` fires only when both slots are `filled`
    AND `outWire.canAccept`; consumes both and emits `[va, vb]`.
    Re-entrancy from `Node.fill` is what makes the firing rule
    fire as soon as the second slot arrives.
  - [TopologyRoot.tsx](../../../tools/topology-vscode/src/webview/substrate-r/TopologyRoot.tsx)
    — dispatches the `join` kind to `JoinBody`.
  - [r-topology-join.test.tsx](../../../tools/topology-vscode/test/contracts/r-topology-join.test.tsx)
    — 3 tests: parseSpec assigns wA=wB=0/wOut=1; asymmetric case
    (only srcA queued) never fires the join, readgate stays empty;
    both queued → two steps deliver wOut at cohort 1 and arm the
    readgate button.

  **Gates at handoff:** `tsc --noEmit` clean. `npx vitest run` →
  123 passing across 21 files. `npm run check:loc` clean.
  `check-substrate-vocab.mjs` still stale (targets `substrate/`,
  the live dir is `substrate-r/`) — fix queued.

  **Auto-retire signal:** `task/in0-readgate-emission-ack` still
  past its retire condition. Branch deletion is destructive
  shared-state — needs explicit user sign-off. Flag at next
  opportunity.

  **Pre-existing uncommitted diff:** `topology.view.json` still
  carries a modification that pre-dates the slot-in-node work; not
  touched again.

  **Commits this session:** `79ede00` substrate: 2-input join node
  (pushed).

## Dev-loop

Read [MODEL.md](../../../MODEL.md) +
[JoinBody](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx)
and the join test
([r-topology-join.test.tsx](../../../tools/topology-vscode/test/contracts/r-topology-join.test.tsx)).
Next code change: a fan-out (distribute) node — see
[handoff-next-task.md](handoff-next-task.md).

## Next move

See [handoff-next-task.md](handoff-next-task.md). The next concrete
step is to add a `fanout` kind (slot `in0`; one source port driving
multiple outgoing wires) whose firing rule requires every outgoing
wire's `canAccept` to be true, then a contract test for the
asymmetric backpressure case (one downstream consumes, the other
holds full).

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
