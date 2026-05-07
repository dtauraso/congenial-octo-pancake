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

Continuing on wirefold, branch `task/wires` (cut from
`task/runtime-substrate-rebuild` at 1aeee65, fresh branch by user
request). The original step-1 substrate animates, but it rides the
global event bus + sim clock + pulse-concurrency ledger — i.e. it
layers on the very scheduling system the rebuild is supposed to
replace. Stuck-pulse-on-load was a symptom of that, not a fix
target. User decision this session: **retire global scheduling
before doing anything else**, including step 2. Spec for the
revised foundation is at
[../sim-substrate/revised-step-1.md](../sim-substrate/revised-step-1.md).
Start at [handoff-next-task.md](handoff-next-task.md).

State at handoff:
  `task/wires` at 30d6e28, pushed and tracking origin. Commits 1–2
  of revised step 1 landed: `Wire` primitive + `buildWires` (bf340d7),
  per-node loops + `runtime-wires` (30d6e28). 234/234 vitest, build
  green, no LOC violations. Nothing is wired into the active code
  path yet — `startWiresRuntime` exists but no caller invokes it. Prior
  branch `task/runtime-substrate-rebuild` is preserved as reference;
  do not delete. Working tree has `topology.view.json` modified
  (incidental pan/zoom; not part of rebuild work — leave or discard,
  do not commit).

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
