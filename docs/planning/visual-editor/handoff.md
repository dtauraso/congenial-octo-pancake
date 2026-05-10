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

State at handoff (2026-05-10, forty-second session):
  Active branch: `task/node-ticks`. Wire forever-loop landed:
  `wire-entity.ts` (load/take/ack + awaitLoaded/Empty/Acked +
  event emitter), `wire-events.ts` (ordinal seq), `pause-aware.ts`
  (PauseSignal interface + helper that persists work across
  pause/resume), `wire-loop.ts` (runWire). 8 contract tests green;
  substrate vocab lint clean. No callers wired up.

  **Substrate iteration model: decided.** See
  `handoff-substrate-iteration.md`. Forever-loops per node and per
  wire; coordination by backpressure at await points; line-level
  pause via shared signal; substrate emits state-change events with
  ordinal sequence numbers (no durations); renderer owns all pacing
  and plays back faithfully at human-read speed; recorder is a
  second event subscriber. Substrate is **timing-free** per
  MODEL.md.

  Drift caught this session: a "step-duration in substrate loops"
  framing was almost locked in. MODEL.md forbids durations in
  substrate; renderer owns pacing. Reverted before commit.

  Runtime.ts port is **unblocked**. Implementation order is in
  `handoff-substrate-iteration.md`. Branch name `task/node-ticks` is
  now misleading (the global tick is gone) — rename on next branch.

  **Held:** halt/resume on substrate; legacy is a working museum
  (`LEGACY_SKIP`); send-on-non-empty throws.

  Memory entries:
  `feedback_derive_model_from_visual_spec.md` (cheap-fix detector,
  prior session). A vocabulary-drift sibling is a candidate add-on
  but not yet written.

  Pre-existing red tests, still red, still not blocking:
  `shape-d-cycle.test.ts` (ackEdge race), `handle-load-repro.test.ts`.

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
Step 1 done. Next: step 2 — promote the test-local
`pauseController()` factory in `wire-loop.test.ts` into
`src/substrate/pause-controller.ts` implementing `PauseSignal`,
plus contract tests for back-to-back pause/resume and multiple
subscribers.

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
