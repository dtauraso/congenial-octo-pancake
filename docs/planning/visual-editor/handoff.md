# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-step1-notes.md](handoff-step1-notes.md) — what's
     been built so far on the rebuild branch (decision audit,
     coupling hacks gated to step 1, automated logging, e2e).
  2. [handoff-gate-a.md](handoff-gate-a.md) — what just merged
     to main (Gate A).
  3. [handoff-next-task.md](handoff-next-task.md) — **start
     here** for the next commit (play/pause toolbar fix).
  4. [handoff-rebuild-plan.md](handoff-rebuild-plan.md) — port
     plan, contracts R1–R5, auto-retire signal.
  5. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

Continuing on wirefold, branch `task/runtime-substrate-rebuild` (off
`main`, pushed). Gate A passed; this is the rebuild branch. Port-plan
**step 1 is done AND visibly animates** in the real VS Code extension
— tokens 0/1/0 from `data.init` traverse the chan→wire end-to-end,
**ack-driven** (cap=0 unbuffered: each emit waits for the previous
pulse to finish traversing). Verified by user 2026-05-07. Next work
is a **step-1 follow-up: fix the play/pause toolbar button** before
starting step 2 — see [handoff-next-task.md](handoff-next-task.md).

State at handoff:
  Local on `task/runtime-substrate-rebuild`, pushed to origin.
  Working tree has `topology.view.json` modified (incidental editor
  pan/zoom; not part of rebuild work — leave or discard, do not
  commit).
  Tests/build/tsc/check:loc clean. Last verified 218/218 vitest +
  Playwright `substrate-step1` green at d2f36c1 (ack-driven emit).

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
