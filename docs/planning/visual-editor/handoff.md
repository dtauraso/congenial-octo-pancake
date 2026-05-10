# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the next commit. Spec has been re-framed: wire-as-entity,
     not inbox-deferral. Read carefully — this reverses the prior
     cheap-fix framing.
  2. [handoff-step1-notes.md](handoff-step1-notes.md) — what was
     built on the rebuild branch (decision audit, coupling hacks
     gated to step 1, automated logging, e2e).
  3. [handoff-gate-a.md](handoff-gate-a.md) — earlier merge to main
     (Gate A).
  4. [handoff-rebuild-plan.md](handoff-rebuild-plan.md) — port plan,
     contracts R1–R5, auto-retire signal.
  5. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, forty-third session):
  Active branch: `task/node-ticks`. Steps 1 & 2 of the substrate
  iteration plan landed. Step 1: wire forever-loop
  (`wire-entity.ts`, `wire-events.ts`, `pause-aware.ts`,
  `wire-loop.ts`). Step 2: shared `pause-controller.ts`
  exporting `createPauseController()` / `PauseController` (extends
  `PauseSignal`); `wire-loop.test.ts` updated to import it.
  18 contract tests green across wire-loop + pause-controller;
  substrate vocab lint clean; LOC budget clean. No production
  callers wired up — substrate modules are leaf.

  **Substrate iteration model: decided.** See
  `handoff-substrate-iteration.md`. Forever-loops per node and per
  wire; coordination by backpressure at await points; line-level
  pause via shared signal; substrate emits state-change events with
  ordinal sequence numbers (no durations); renderer owns all pacing
  and plays back faithfully at human-read speed; recorder is a
  second event subscriber. Substrate is **timing-free** per
  MODEL.md.

  Runtime.ts port is **unblocked**. Implementation order is in
  `handoff-substrate-iteration.md`. Branch name `task/node-ticks` is
  now misleading (global tick gone) — rename on next branch.

  **Held:** halt/resume on substrate; legacy is a working museum
  (`LEGACY_SKIP`); send-on-non-empty throws.

  Pre-existing red tests, still red, not blocking:
  `shape-d-cycle.test.ts`, `handle-load-repro.test.ts`.

  Carried context: Shape D self-pumps via `fb56c30`'s i1 fan-out +
  one-shot `seedLoop` + per-round `setTimeout(0)`. Manual-ack:
  [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

  Working tree: `topology.json` (`"runtime": "ticked"` flag for
  verification) and `topology.view.json` (camera drift) — editor
  state, intentionally not committed. Reference branches retained:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

Read [MODEL.md](../../../MODEL.md) and
[handoff-substrate-iteration.md](handoff-substrate-iteration.md).
Steps 1 & 2 done. Next: step 3 — uniform node loop module that
awaits all-inputs-carrying, runs the body, awaits
all-outputs-empty, loads outputs, awaits all-outputs-acked.
Every wait routes through `pauseAware()` with a shared
`PauseSignal`. Emits state-change events with ordinal seq.
See [handoff-next-task.md](handoff-next-task.md) for the surface
and contract tests to add.

Dormant: triage pre-existing reds (`shape-d-cycle`,
`handle-load-repro`); Shape D port. Tick-batching audit superseded.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
