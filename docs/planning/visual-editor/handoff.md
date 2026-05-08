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

State at handoff (2026-05-07, end of fourth session):
  Active branch: `task/node-ticks` at `e5b20d7` (pushed). `main`
  still at `392602f` — two pause-freeze fixes accumulated on this
  branch are not yet merged.

  This session added:

  - **Paint one frame on mid-pause remount** (`e5b20d7`).
    Follow-on friction from the prior fix: with the runtime paused,
    dragging a node detached the pulse label from the pulse dot.
    The skip-rAF-on-paused-mount branch never painted a frame, so
    the label kept its pre-remount transform (old geom) while the
    path rendered at new geom. Fix: call `frame()` once in the
    paused-on-mount branch — with `frozenElapsed = 0` this snaps
    label transform and dash offset to `arcTraveled = startArc` on
    the new geom. Logged at
    [session-log/2026-05-07-pulse-label-detaches-on-paused-drag.md](session-log/2026-05-07-pulse-label-detaches-on-paused-drag.md).
    User confirmed fixed.

  Prior session on this branch:

  - **Pause-freeze on PulseInstance remount** (`a0260fb`).
    Drag/touch mid-pause let the pulse run to completion because
    the `[geom, speedPxPerMs]` effect re-mounted and started a
    fresh rAF loop without consulting `isWiresRuntimePaused()`.
    Fix: on mount, if paused, set `frozenElapsed = 0` and skip the
    initial rAF; existing resume path handles rebase. Logged at
    [session-log/2026-05-07-paused-pulse-resumes-on-node-touch.md](session-log/2026-05-07-paused-pulse-resumes-on-node-touch.md).

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

  Tests green at 238/238 vitest; tsc + build clean after the fix.
  `check:loc` not re-run (PulseInstance.tsx still under budget).

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
