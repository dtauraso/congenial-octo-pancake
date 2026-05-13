# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task: the
     global play/pause gate + cohort registry (commit 2 of the
     slot-in-node series). First code commit already landed.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — forever-loop substrate background; layered with the resolved
     slot-in-node model.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

State at handoff (2026-05-13, end of session):

  **Active branch:** `task/substrate-slot-in-node`. First code
  commit landed at 31c6cdb (pushed): wire reducer is
  `empty | in-flight` only; slot lives on the destination
  [Node](../../../tools/topology-vscode/src/webview/substrate-r/Node.tsx)
  with `fill` / `consume` / `slotPhase` / `subscribeSlot` /
  `requestConsume`; each
  [Wire](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx)
  carries a construction-time `(destNodeRef, destSlotId)` binding
  and, on RAF arrival, calls `dest.fill(slotId, v)` before
  returning to empty;
  [parseSpec](../../../tools/topology-vscode/src/webview/substrate-r/spec.ts)
  rejects wires whose `target.port` isn't a declared slot on the
  destination kind; `ManualTakeButton` observes node slot phase
  via `subscribeSlot`. `take` / `ack` paths retired. Contract
  tests rewritten and green.

  **Gates at commit time:** `tsc --noEmit` clean. `npx vitest run`
  → 109 tests passing (4 substrate contract files: wire phase,
  node, tick driver, topology smoke). `npm run check:loc` →
  no offenders. `check-substrate-vocab.mjs` still reports
  "substrate/ directory not present" — its path target is stale
  (actual dir is `substrate-r/`); fix is queued, not in scope here.

  **Auto-retire signal hit:** per
  [handoff-frame.md](handoff-frame.md), `task/in0-readgate-
  emission-ack` was held "until first green contract test on the
  new substrate." That condition is now met. Branch deletion still
  needs explicit user sign-off (destructive shared-state action);
  flag at the next opportunity.

  **Pre-existing uncommitted diff:** `topology.view.json` still
  carries a modification that pre-dated the slot-in-node work; it
  was not part of 31c6cdb and was left alone again. Leave it
  unless a future session has a reason to touch it.

## Dev-loop

Read [MODEL.md](../../../MODEL.md) + the slot-in-node
[Node](../../../tools/topology-vscode/src/webview/substrate-r/Node.tsx)
and
[Wire](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx).
Next code change: introduce the global play/pause gate + cohort
registry so cohort N is released on a single observable axis
(random-access step). See
[handoff-next-task.md](handoff-next-task.md).

## Next move

See [handoff-next-task.md](handoff-next-task.md). The next concrete
step is the cohort gate: cohort assigned at wire-time
(max predecessor cohort + 1), gate releases cohort N only.

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
