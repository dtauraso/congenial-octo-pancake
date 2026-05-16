# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-16)

**Active branch:** none. Work landed on `main` at `041949e`. No task
branch in flight.

Ring animation is working live in the editor. The `Wire.load` dev
assertion (throws on in-flight reload) is active and silent on the
current topology — meaning the working ring is genuinely robust, not
relying on the prior swallow.

## What landed this session

- `9d0cafc` — merged `task/pulse-secondary-value` to main:
  ChainInhibitor 2abc shift-register fanout, scalar pulse payload,
  ReadGate's `lastPartialSigRef` guard removed.
- `2ebe7c3` — `Wire.load` now throws on in-flight reload (was a
  silent swallow + `trace.wire.load.dropped` log). Dev safety net;
  no test relied on the swallow.
- `041949e` / `a532729` — reverts of two unauthorized commits a
  subagent pushed during a merge task (`3eda027` removed ReadGate's
  partial-0 emit, `7de6431` rewrote the partial-fill contract test
  to match). Both contradicted the settled ReadGate spec.

129 tests green; build clean; tsc clean; vocab clean; LOC clean.

## ReadGate spec (settled, do not drift from this)

ReadGate is a variable-arity AND with two mutually exclusive rules
per `run()` invocation:

1. **All N slots filled** → consume all slots, `wire.load(1)`.
2. **`[0, N-1]` slots filled** → `wire.load(0)`, do nothing else
   (no consume).

The doc-comment at `node-kinds.tsx:228-231` currently states only
rule 1. Updating it to include rule 2 is a pending tidy-up.

The partial-0 emit IS part of the spec. A prior investigation (this
session) framed it as "drift causing 2× amplification per src
arrival" — that framing was wrong; the user corrected it. Each
slot-change fires exactly one rule.

## ChainInhibitor 2abc (settled)

On `in` fill: emit held value on both `out` and `inhibitOut` (no
canAccept guards), store incoming, slot empties. Seed via `data.seed`.

## Open follow-ups (not urgent)

- Fix the stale ReadGate doc-comment at `node-kinds.tsx:228-231` to
  state both rules.
- Subscription bookkeeping: node bodies still call
  `subscribeCanAccept` (ChainInhibitor on both `out` and
  `inhibitOut`). User flagged this as substrate concern leaking into
  nodes. Prior attempt to move wake into the substrate
  (`sourceNodeRef` on Wire, direct `.run()`) was reverted. Revisit
  only with a clear design.
- If a reload-while-in-flight ever fires the dev assertion, that's a
  real rate-imbalance bug — not something to swallow.

## Working mode

- Delegate executor work (log walks, mechanical edits) to sonnet/haiku
  subagents. Main session is for judgment.
- **Verify subagent commits before merging.** A subagent this session
  picked up an unstaged working-tree edit during a "merge to main"
  task and pushed it as an extra commit. Check `git log` deltas
  against the intended diff before pushing to shared branches.
- Don't propose menus of options when the user is mid-investigation;
  finish the current frame.
- When the user says "delegate", they want a subagent call, not the
  main session doing the work inline.

## Dev-loop

After any substrate-r edit: `npm run build` (vitest/tsc don't refresh
`out/webview.js`). Live log at `.probe/webview-log.jsonl`; clear with
`: > .probe/webview-log.jsonl` between runs.

Cwd for tsc/tests/check:loc/build: `tools/topology-vscode/`.

## Open branches

- `main` — production trunk; at `041949e`; working.
- `task/pulse-secondary-value` — merged, left intact (per workflow).
- `task/dropped-load-assert` — merged, left intact.

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
