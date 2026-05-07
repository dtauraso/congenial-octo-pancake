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
     here** for the next commit (port-plan step 2).
  4. [handoff-rebuild-plan.md](handoff-rebuild-plan.md) — port
     plan, contracts R1–R5, auto-retire signal.
  5. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

Continuing on wirefold, branch `task/runtime-substrate-rebuild` (off
`main`, pushed). Gate A passed; this is the rebuild branch. Port-plan
**step 1 animates with working play/pause** — verified 2026-05-07.
Bundle hot-reload landed (commit d7983ab): edit → `npm run build` →
tab refreshes in place, no Reload Window. **Step 2 is blocked** by a
stuck-pulse regression that surfaces on cold-open AND on every
in-editor doc edit (renaming a node halts animation). Next work is
diagnosing that — see [handoff-next-task.md](handoff-next-task.md).

State at handoff:
  Local on `task/runtime-substrate-rebuild`, pushed to origin
  through d7983ab (bundle hot-reload). Working tree has
  `topology.view.json` and `topology.json` modified (incidental
  editor pan/zoom; not part of rebuild work — leave or discard, do
  not commit). Tests/build/tsc/check:loc clean as of last build.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. The watcher logs `[topology] bundleWatcher
fired` / `hot-reload: re-rendering webview.html` to Output → Log
(Extension Host) — check there if a fix appears not to have landed.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
