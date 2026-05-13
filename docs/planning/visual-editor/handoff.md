# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task: exercise
     a multi-cohort (chain) topology end-to-end. Cohort gate + cursor
     driver is in and green.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — forever-loop substrate background; layered with the resolved
     slot-in-node model.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

State at handoff (2026-05-13, end of session):

  **Active branch:** `task/substrate-slot-in-node`. Commit 2 of the
  slot-in-node series landed locally (cohort gate + cohort cursor
  driver). On top of 31c6cdb's slot-in-node primitives this session
  added:

  - [cohort-gate.ts](../../../tools/topology-vscode/src/webview/substrate-r/cohort-gate.ts)
    — minimal `release(N) / isReleased(N) / subscribe(N, cb)` axis.
    Park is in the gate, never in the wire's value.
  - [spec.ts](../../../tools/topology-vscode/src/webview/substrate-r/spec.ts)
    — `parseSpec` assigns each wire `cohort = max(predecessor
    cohorts) + 1` (0 when the source node has no incoming wires).
    Cycle detection via DFS.
  - [Wire.tsx](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx)
    — `complete()` consults the gate; if its cohort isn't released
    yet it subscribes once and stays `in-flight` (no value
    parked on the wire).
  - [useTickDriver.ts](../../../tools/topology-vscode/src/webview/substrate-r/useTickDriver.ts)
    — retired the "all wires empty" round-close. Tick is the cohort
    cursor; `step()` releases the current cohort and waits for that
    cohort's wires to be empty, then advances.

  **Gates at handoff:** `tsc --noEmit` clean. `npx vitest run` → 123
  passing across 20 files (added `cohort-gate.test.ts` 6/6 and
  `r-parse-cohort.test.ts` 2/2). `npm run check:loc` clean (Wire.tsx
  154, useTickDriver 93). `check-substrate-vocab.mjs` still reports
  "substrate/ directory not present" — the script's path target is
  stale (`substrate-r/` is the real dir); fix is still queued.

  **Auto-retire signal:** still flagged — `task/in0-readgate-
  emission-ack` is past its retire condition. Branch deletion is
  destructive shared-state, so it needs explicit user sign-off.
  Flag at next opportunity.

  **Pre-existing uncommitted diff:** `topology.view.json` still
  carries a modification that pre-dates the slot-in-node work; not
  touched again.

  **Commits:** cohort gate landed at 5c68b67 (pushed); handoff
  update at 1137202.

## Dev-loop

Read [MODEL.md](../../../MODEL.md) + the cohort gate
([cohort-gate.ts](../../../tools/topology-vscode/src/webview/substrate-r/cohort-gate.ts))
and the cursor driver
([useTickDriver.ts](../../../tools/topology-vscode/src/webview/substrate-r/useTickDriver.ts)).
Next code change: exercise a multi-cohort topology (chain) end-to-end —
the current smoke test only has cohort 0. See
[handoff-next-task.md](handoff-next-task.md).

## Next move

See [handoff-next-task.md](handoff-next-task.md). The next concrete
step is to introduce a chain-capable node kind (or wire two ReadGates
through a relay) so cohorts > 0 actually fire in production, then
write a contract test that asserts cohort N+1 stays parked until
the cursor advances.

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
