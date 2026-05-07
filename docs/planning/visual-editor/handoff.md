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

State at handoff (2026-05-07, end of session):
  Active branch: `task/node-ticks` (cut from `main` at `8daf317`).
  All four node visuals restored on the wires runtime — ready to
  merge to `main` pending user sign-off. Eight commits on top of
  `main`:

  - `6554e07` — `subscribeNodeTicks` on wires runtime. `node-loop.ts`
    fires `onTick` after each Input send and after each ReadGate
    arrive. Contract test: tick count >= ack-cycle count.
  - `33fe174` — visual #1 (flash) restored on AnimatedNode, driven
    by `subscribeNodeTicks`.
  - `54cd832` — visual #2 (glow ring) restored, sharing the tick
    subscription.
  - `6f17f83` — interim handoff update (held tint next).
  - `0b3efa9` — `subscribeNodeHeld` on wires runtime. Producer in
    `readGateLoop` arrive path; emits `(nodeId, StateValue)` on
    every arrive (tween-on-change handled by React equality).
  - `879e3d7` — visual #3 (held tint) restored on AnimatedNode.
  - `b4a1bee` — `subscribeNodeBuffered` on wires runtime. Tracks
    wire `state === "full"` per receiver node.
  - `8f13034` — visual #4 (buffered halo) restored. **All four
    visuals now driven by wires runtime.**

  Visual validation by user: through commit `8f13034` (4/4) — flash,
  glow, held tint, buffered halo all confirmed firing on Input +
  ReadGate per pulse; rapid retrigger clean; pause stops new pulses.
  Console errors: not verified.

  Tests: 238/238 vitest green (contract tests added for ticks, held,
  buffered). Build + tsc green. `check:loc` clean.

  Working tree: `.claude/settings.json` has uncommitted allowlist
  additions; `topology.view.json` has incidental pan/zoom drift.
  Both orthogonal to this branch — leave or stash.

  Prior branches preserved as reference:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. The watcher logs `[topology] bundleWatcher
fired` / `hot-reload: re-rendering webview.html` to Output → Log
(Extension Host).

## Next move

Start at [handoff-next-task.md](handoff-next-task.md). Immediate
next step is **merge `task/node-ticks` → `main`** (requires user
sign-off per workflow). After merge, next work is friction-driven
from [session-log.md](session-log.md) — no queued visual or
substrate task.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
