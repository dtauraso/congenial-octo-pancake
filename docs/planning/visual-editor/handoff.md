# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-16)

**Active branch:** `task/drop-output-wake-from-bodies` — **10 commits
ahead of origin, unpushed.** Awaiting user spot-check before push.

Tick-loop redesign landed end-to-end. The substrate's wake model
changed from event-driven (`Node.fill` synchronously calling `onRun`)
to RAF-paced polling (each body has its own poll loop that re-evaluates
its firing rule each frame). The ReadGate ring rate-imbalance bug
(in-flight `Wire.load` assertion firing on the double-pulse from Rule
2 + Rule 1) is resolved by `canAccept` naturally gating re-emit on
the polling cycle. 130/130 tests, tsc/vocab/loc clean.

## What landed this session (newest first)

- `69cfab1` step 9/9 — ReadGate ring regression test, no in-flight assert.
- `4b1f070` step 8/9 — MODEL.md revised: "firing as control-flow event"
  clause weakened to allow RAF-paced observation while keeping
  precondition-gated firing; global gate retargeted from nodes to wire
  animations.
- `2a8abb4` step 7/9 — no-op (pause was already wire-layer only).
- `6cce2d6` step 6/9 — Wire deferred-deliver safety net: arrival into
  filled slot stays pending instead of throwing.
- `cbf7fed` step 5/9 — audit only: `onRun` prop kept (NodeHandle.run
  delegates to it). Step's intent was deletion but a real use exists.
- `7b0254e` step 4/9 — RAF poll added to Relay, Join, ChainInhibitor,
  Register, ReadGate, InhibitRightGate bodies.
- `b093c7d` step 3/9 — removed `onRun` call from `Node.fill`. Tests
  fail in this commit by design; restored by step 4.
- `039931f` step 2/9 — removed `subscribeCanAccept` from Wire and
  InputBody. Two smoke tests gained an extra `flushRaf()` to match
  the polling model's one-tick refill latency.
- `9ff4ee5` step 1/9 — RAF poll added to InputBody alongside the
  existing `subscribeCanAccept` (coexist for one commit, both call
  the same idempotent run).
- `525316b` plan + diagrams under
  [docs/planning/visual-editor/tick-loop-redesign.md](tick-loop-redesign.md)
  and [diagrams/tick-loop-redesign/](../../../diagrams/tick-loop-redesign/).

## Open follow-ups

- **Push the branch** after spot-check. Possibly squash the docs-only
  step 5 and step 7 commits if you want a cleaner history (but each is
  individually meaningful).
- **`topology.view.json` lost** — an uncommitted user edit was wiped
  by a `git reset --hard` during the option A→B switch. Redo if needed.
- **Deferred-deliver is interim (Option A).** The long-term fix is
  parseSpec validation preventing two wires from racing the same slot
  (Option B in the plan). File this as future work.
- **Memory drift:** `feedback_run_is_input_only.md` was written
  pre-redesign ("run is input-woken only; output drain isn't a wake
  source"). Under the polling model run isn't *woken* at all — it's
  polled. Update or retire the memory.

## Working mode

- Delegate executor work (multi-step migrations, mechanical edits) to
  sonnet subagents. Two agents executed this redesign across the 9
  plan steps; both hit real blockers and correctly stopped to ask
  instead of improvising.
- **Verify subagent commits before pushing shared branches.** Spot-check
  `git log` deltas against the plan.
- Don't propose menus of options when the user is mid-investigation;
  finish the current frame.
- When the user says "delegate", they want a subagent call, not the
  main session doing the work inline.

## Dev-loop

After any substrate-r edit: `npm run build` (vitest/tsc don't refresh
`out/webview.js`). Live log at `.probe/webview-log.jsonl`; clear with
`: > .probe/webview-log.jsonl` between runs (but NOT before reading the
current run — Claude truncated it once this session by mistake).

Cwd for tsc/tests/check:loc/build: `tools/topology-vscode/`.

## Open branches

- `main` — production trunk at `9b55128` (handoff doc commit on top of
  the assertion-live state).
- `task/drop-output-wake-from-bodies` — current task; 10 commits ahead
  of origin; unpushed. Holds the tick-loop redesign + plan + SVGs.
- `task/pulse-secondary-value`, `task/dropped-load-assert` — merged
  prior sessions, left intact.

## ALWAYS clause

At end of session, overwrite this file with a freshly-rendered
prompt tailored to the state you're leaving the branch in, and
commit on the active branch (main if no task is in flight). Do not
rely on chat history; the next AI may be a fresh model with no
transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes.
