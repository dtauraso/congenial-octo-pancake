# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-step1-notes.md](handoff-step1-notes.md) — what was
     built on the rebuild branch (decision audit, coupling hacks
     gated to step 1, automated logging, e2e).
  2. [handoff-gate-a.md](handoff-gate-a.md) — earlier merge to main
     (Gate A).
  3. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the next commit.
  4. [handoff-rebuild-plan.md](handoff-rebuild-plan.md) — port plan,
     contracts R1–R5, auto-retire signal.
  5. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-07, end of second session):
  Active branch: `task/node-ticks`. `main` is at `392602f`
  (post-pause-freeze merge from the prior session). No code
  changes this session — reflection-only.

  This session added:

  - Memory `project_local_clocks_beat_global_runner.md` (and
    `MEMORY.md` index entry). Captures that the easy pause-freeze
    fix had **multiple causes** — locality, recency, small surface,
    simple problem shape, written-down contracts — and warns
    against using ease/pain of a single fix as standalone evidence
    for substrate decisions. Read it before drawing conclusions
    from "this transport fix was easy/hard."

  Prior-session shipped work (still current on `main`):

  - **Visuals 1–4 on wires runtime** (`6554e07`…`8f13034`): flash,
    glow ring, held tint, buffered halo via
    `subscribeNodeTicks/Held/Buffered`.
  - **Pause = freeze mid-arc** (`34b8c20`): `subscribeWiresPause`
    fans one pause/resume signal; each `PulseInstance` owns its
    rAF clock and freezes/rebases independently. Per-node streams
    extracted to `node-streams.ts` for LOC budget.

  Conceptual frame to carry forward: not a global clock, but
  **concurrent clocks frozen on command**. (This framing is right
  on its own merits — see the memory note about not over-attributing
  the easy fix to it.)

  Tests last green at 238/238 vitest; tsc + build + `check:loc`
  clean as of prior session. Not re-run this session (no code
  changed).

  Working tree: `.claude/settings.json` and `topology.view.json`
  carry incidental drift; orthogonal — leave or stash.

  Prior branches preserved as reference:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

Start at [handoff-next-task.md](handoff-next-task.md). No queued
substrate task; next is **friction-driven** from
[session-log.md](session-log.md). The "remove legacy global part"
work (delete `sim/runner` / `sim/event-bus` / `legacyRunnerState`)
is gated on porting more node types — port-plan steps 4–6 in
[../sim-substrate/rebuild-plan.md](../sim-substrate/rebuild-plan.md).
Don't kick that off without a friction signal or an explicit ask.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
