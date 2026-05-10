# Handoff — Next task (START HERE)

**State:** `task/node-ticks`, phase 2 landed and **visually verified**
(commit `6550ae2`). User confirms ⏭ → +1 in ticked Shape A. Build
green. Branch is ready to merge into `main` pending sign-off.

## Next move

**Merge `task/node-ticks` → `main` with explicit sign-off.** This is
a shared-state action per CLAUDE.md "Executing actions with care" —
do not merge without the user's go-ahead in the session.

After merge:
  - Phase 3 (drag-resilient pulse rendering) unblocks. See
    [handoff-ticked-substrate-plan.md](handoff-ticked-substrate-plan.md).
  - Triage the two pre-existing red tests (may resolve under phase 5).

## What landed in phase 2

- `tools/topology-vscode/src/substrate/ticked/index.ts` — module-scope
  subscriber set (`_subs`) so subs survive `stopTicked()` / runtime
  swaps; `start` and `stop` both notify.
- `tools/topology-vscode/src/webview/panels/TimelinePanel.tsx` — when
  `isTickedActive()`, label renders `tick ${tickedTickCount()}`
  instead of falling through to `getTotalTicks()` (which counted
  every `publishTick`, hence the +2 symptom).

Root cause: label was reading `getTotalTicks()`, which Shape A
incremented twice per step (once for Input, once for ReadGate).

## Pre-existing red tests (carry over)

- `test/contracts/shape-d-cycle.test.ts` — ackEdge depth race.
- `test/contracts/handle-load-repro.test.ts` — real `topology.json`.

## Working tree at handoff

Unstaged (editor state, intentionally not committed):
- `topology.json` — `"runtime": "ticked"` flag for verification.
- `topology.view.json` — camera/position drift from manual editing.

## ALWAYS clause

At end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
