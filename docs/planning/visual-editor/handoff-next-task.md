# Handoff — Next task (START HERE)

**State:** `task/node-ticks`, phase 2 landed but **not yet visually
verified**. User reports the editor's tick counter still increments
**by 2 per ⏭ click** in ticked mode after the attempted fix below.
Build green. Working tree dirty (uncommitted attempted fix — see
"Uncommitted attempt").

## The bug

In ticked Shape A, clicking ⏭ once should advance the tick label by
exactly 1. It still advances by 2. Expected behavior per
[handoff-ticked-substrate-plan.md](handoff-ticked-substrate-plan.md)
phase 2 exit criterion.

## Uncommitted attempt (did not fix it)

Working tree changes:
- `tools/topology-vscode/src/webview/panels/TimelinePanel.tsx` — when
  `isTickedActive()`, render label as `tick ${tickedTickCount()}`
  instead of falling through to `getTotalTicks()`. Subscribed to
  `subscribeTicked`.
- `tools/topology-vscode/src/substrate/ticked/index.ts` — moved
  subscriber set to module scope (`_subs`) so subscribers survive
  `stopTicked()` / runtime swaps. `start` and `stop` notify.

Hypothesis was: label was reading `getTotalTicks()` (a counter
incremented by every `publishTick(...)` call, and Shape A fires it
twice per step — once for `Input`, once for `ReadGate`). Routing
through `tickedTickCount()` should have shown +1 per click. User
says no change. Either:
  a) the label isn't actually showing `tickedTickCount()` (check
     `isTickedActive()` — maybe ticked mode never actually started
     and we're still on a different runtime path), OR
  b) `step(rt)` is being called twice per click (check React
     StrictMode double-invoke, double event binding, or something
     else calling `tickedStep()` from a subscriber).

## How to debug next session

1. Build: `cd tools/topology-vscode && npm run build`.
2. Open editor, load a Shape A spec with `runtime: "ticked"`.
3. Add a `console.log` in `tickedStep()` and in `step()` (runtime.ts)
   — confirm whether one click → one or two invocations.
4. Check `isTickedActive()` returns true at the time of click; if
   false, ticked startup never happened and the label is reading
   `getTotalTicks()` (the +2 source).
5. Inspect `TransportControls.onStep`: it's the only caller of
   `tickedStep` we know of. Grep for any other.

## Decision

Either land the working-tree fix (if root cause is confirmed and
fixed) or revert it. Do **not** merge to `main` until ⏭ → +1 is
visually verified.

## Pre-existing red tests (carry over)

- `test/contracts/shape-d-cycle.test.ts` — ackEdge depth race.
- `test/contracts/handle-load-repro.test.ts` — real `topology.json`.

## Working tree at handoff

Modified, not committed:
- `tools/topology-vscode/src/substrate/ticked/index.ts`
- `tools/topology-vscode/src/webview/panels/TimelinePanel.tsx`
- `topology.view.json` (incidental drift)

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
