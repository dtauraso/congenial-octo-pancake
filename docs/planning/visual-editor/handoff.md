# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-17, late night)

**Active branch:** `task/drop-output-wake-from-bodies` — **27 commits
ahead of origin, unpushed.** Working tree has the dirty
`topology.view.json` and two untracked diagram dirs (carryover); no
uncommitted source changes.

Ring smoke-tested: **runs 6 cycles cleanly, then stalls.** The
ReadGate-specific drop-token bug is fixed. The stall at cycle 6 is a
separate, parallel bug in other node bodies (see below).

## What landed this session (newest first)

- `4a5d6c1` **fix(readgate): guard fire on dest slot readiness** —
  restored `if (!wire.canAccept) return;` guard at the top of
  ReadGate's `run` in
  [node-kinds.tsx:237](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx#L237).
  Reverts the ReadGate slice of `aaf34de` ("strip all guards past
  ref-null").
  - **Why:** ReadGate was consuming both input slots and then calling
    `wire.load(1)`, which silently no-ops in
    [Wire.tsx:355](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx#L355)
    when the wire isn't `empty`. Tokens vanished on every cycle where
    the output destination slot was still occupied.
  - **Spec basis (MODEL.md §"Who does what"):** source observes
    readiness via `dest.slotPhase(slotId)` through the output
    reference; backpressure lives in the destination slot, not the
    wire. `wire.canAccept` is the spec-honest accessor — its getter
    at [Wire.tsx:376-381](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx#L376-L381)
    checks `dest.slotPhase(destSlotId) === "empty"`.
  - Build, `tsc --noEmit`, and `check-substrate-vocab.mjs` all clean.

## Open issues (in priority order)

1. **Other node bodies likely have the same bug.** Smoke test shows
   ring stalls at cycle 6: both upstream feeders (`in0`, `i1`) go
   silent *simultaneously*, suggesting a token vanished on the return
   path. The synchronized stop matches the pattern fixed in ReadGate
   — consume-before-checking-output. Two ways to fix:
   - **(a) Audit every node body** in
     [node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx)
     for `consume`/`wire.load` ordering without a `canAccept` guard.
     Restore guards locally.
   - **(b) Make `Wire.load` throw on non-empty** instead of silent
     return ([Wire.tsx:356](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx#L356)).
     Surfaces every offender as a loud runtime error. Matches
     `aaf34de`'s original premise and the
     [feedback_run_is_input_only](../../../memory/feedback_run_is_input_only.md)
     memory. Recommended — one commit, exhaustive.
2. **Push the branch.** 27 commits ahead of origin. Sign-off-gated.
4. **Hook regression** (carryover):
   `.claude/hooks/substrate-r-model-derive.sh` is still at `exit 0`;
   should be `exit 2`. Unauthorized flip during `f828517` agent run.
5. **Memory `feedback_run_is_input_only.md`** is stale (pre-polling
   redesign). Update or retire — and the conclusion from this session
   (silent `wire.load` is exactly the rate-bug-hider that memory
   predicted) is worth folding in.
6. **Two SVG diagrams untracked** (`diagrams/readgate-duty-cycle/`,
   `diagrams/input-body-duty-cycle/`). Commit or discard.
7. **`topology.view.json` is dirty** — uncommitted local camera/
   selection edit.

## What's actually working

- ReadGate fires per iteration without dropping tokens (6 clean cycles
  observed before unrelated stall).
- Wire animation loop runs independent of React's effect scheduler
  (carryover from previous session).
- Build, tsc, and the deterministic audits are clean.

## Substrate model state

Bodies should be "pure rules" per `aaf34de`'s framing, but pure-rule
ness depends on substrate primitives being honest about contract
violations. `Wire.load`'s silent no-op breaks that — it lets bodies
that skip the readiness check appear to work, then silently lose
tokens. The model-honest substrate either (a) requires bodies to read
`dest.slotPhase` via the output ref before consuming, or (b) makes
`Wire.load` assert. Currently the codebase is half-way between the
two: ReadGate now does (a), other bodies don't, and (b) isn't in
place.

## Dev-loop

After any substrate-r edit: `npm run build` (vitest/tsc don't refresh
`out/webview.js`). Live log at `.probe/webview-log.jsonl`; clear with
`: > .probe/webview-log.jsonl` between runs (NOT before reading the
current run — Claude truncated it once by mistake).

Cwd for tsc/tests/check:loc/build: `tools/topology-vscode/`.

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
