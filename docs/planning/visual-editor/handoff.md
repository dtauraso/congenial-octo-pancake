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

State at handoff (2026-05-07 late):
  Active branch: `task/node-ticks` (cut from `main` at `8daf317`).
  Three commits on it, each its own step:

  - `6554e07` — `subscribeNodeTicks` on wires runtime. `node-loop.ts`
    fires `onTick` after each Input send and after each ReadGate
    arrive (regardless of autoAck). Runtime exposes
    `subscribeNodeTicks(fn)` + `publishTick(nodeId)`. Contract test
    asserts tick count >= ack-cycle count.
  - `33fe174` — visual #1 (flash) restored on AnimatedNode, driven by
    `subscribeNodeTicks` (replacing legacy `subscribe(fire)`).
    `FLASH_DURATION_MS` reinstated in `_styles.ts`.
  - `54cd832` — visual #2 (glow ring) restored, sharing the same
    tick subscription as flash.

  Visual validation by user: flash + glow both fire on Input and
  ReadGate per pulse; rapid retrigger restarts cleanly; pause stops
  new pulses (in-flight completes arc — matches design); motion tween
  + stateText label still work. Console errors: not verified.

  Tests: 236/236 vitest green (one new contract test added). Build +
  tsc green. No LOC violations (AnimatedNode.tsx at 144).

  Working tree: `.claude/settings.json` has uncommitted allowlist
  additions (compound git patterns); orthogonal to this branch — leave
  or stash.

  Prior branches preserved as reference:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. The watcher logs `[topology] bundleWatcher
fired` / `hot-reload: re-rendering webview.html` to Output → Log
(Extension Host) — check there if a fix appears not to have landed.

## Next move

Start at [handoff-next-task.md](handoff-next-task.md). Next is
visual #3 (held tint) — needs a new per-node held-value stream
(`subscribeNodeHeld`) on the wires runtime before the visual itself
can be reinstated. Spec for the original tick stream is in
[../sim-substrate/revised-step-2.md](../sim-substrate/revised-step-2.md)
(D2 only — D1/D3 corner-glyph design is **vetoed**; restore originals
instead, driven by the wires runtime).

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
