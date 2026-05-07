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

State at handoff (2026-05-07 evening):
  `main` at HEAD `8daf317`. Two task branches merged in sequence:
  - `task/wires` (revised step 1): Wire primitive, per-node loops,
    AnimatedEdge wire-driven, toolbar pause off legacy state,
    pulse-concurrency reset retired, PulseInstance off legacy sim
    clock, sim/event-bus retired from substrate side. Trivial
    Input→ReadGate animates on the wires runtime; pause/resume
    behaves per design (in-flight pulse completes its arc).
  - `task/node-visuals-strip` (this session): four legacy node-body
    visuals removed from `AnimatedNode` — flash, glow, held tint,
    buffered halo. All four archived verbatim in
    [../sim-substrate/removed-node-visuals.md](../sim-substrate/removed-node-visuals.md)
    along with restoration notes. `FLASH_DURATION_MS` deleted from
    `_styles.ts` (last consumer gone). `portStyle` lost its 4th
    `buffered` arg. `bufferedPorts()` is still exported (still used
    by `fold-halo-probe` + tests).

  Tests: 235/235 vitest still green from step-1 merge; no test
  changes in the strip work. Build + tsc green. No LOC violations.

  Working tree: `topology.view.json` shows incidental pan/zoom drift;
  not part of either merged branch — leave or discard.

  Prior branches preserved as reference:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

  Visual validation: edge animates; node body is now bare (no flash,
  glow, tint, or halo). Stateful label and motion tween still work.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. The watcher logs `[topology] bundleWatcher
fired` / `hot-reload: re-rendering webview.html` to Output → Log
(Extension Host) — check there if a fix appears not to have landed.

## Next move

Start at [handoff-next-task.md](handoff-next-task.md). Spec for the
node-tick stream is in
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
