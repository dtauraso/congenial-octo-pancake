# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the deletion sweep, mid-flight on `task/remove-legacy-runtimes`.
     Steps 2–4 landed; steps 5–8 remain.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — system 3 model: forever-loops, line-level pause, events.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, fifty-fourth session):
  Active branch: `task/remove-legacy-runtimes`. Step 4 landed in three
  commits: `9d7f54f` (unimported pulse-lanes helpers), `31b1a15`
  (delete runner/timeline/fold-halo probes; port PulseInstance; strip
  AnimatedNode; simplify TimelinePanel; wire main.tsx to
  frame-pause/resume), `e511681` (handoff refresh). 19 files deleted,
  8 ported/stripped. No webview/sim file imports `sim/runner`,
  `substrate/runtime*`, or `substrate/ticked` anymore.
  Build/tsc/vocab/LOC clean; 310 pass, same two pre-existing reds.

  **Judgment calls from step 4 — confirm before merge:**
  - `TriggerSlotButton` / `ClearSlotButton` were **deleted, not
    ported** (handoff listed them as "likely ports"). Agent reasoned
    they're wires-runtime UIs with no frame-mode equivalent.
  - `FoldNode` halo stubbed to `{ buffered: false }` pending re-wire
    via frame-renderer events. Render path preserved.

  **Steps remaining on this branch (see handoff-next-task.md):**
  5. Delete `src/sim/runner*`, `src/sim/simulator*`,
     `src/substrate/runtime.ts`, `src/substrate/runtime/`,
     `src/substrate/runtime-wires*.ts`, `src/substrate/ticked/`,
     plus orphaned `src/sim/` leftovers.
  6. Delete tests pinning systems 1/2/2.5; the two pre-existing reds
     (`shape-d-cycle`, `handle-load-repro`) retire with wires-runtime.
  7. Vocab → tsc → build → tests → proof-out (load topology, hit
     play/pause/step, verify pulses animate, pause halts at line
     level, step advances one event).
  8. Refresh handoff and merge (sign-off required).

  **Model:** `handoff-substrate-iteration.md`. Forever-loops per
  node and per wire; backpressure coordination; line-level pause;
  ordinal-seq state-change events; renderer owns pacing. Substrate
  **timing-free** per MODEL.md.

  **Held:** halt/resume on substrate; send-on-non-empty throws;
  renderer adapter / host-shim / frame-store live outside
  `src/substrate/` for the vocab gate.

  Pre-existing reds: `shape-d-cycle.test.ts`,
  `handle-load-repro.test.ts` — both test wires-runtime and retire
  with the deletion sweep. Working tree: `topology.view.json` —
  editor state. Reference branches retained — do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

Continue on `task/remove-legacy-runtimes` at step 5: delete the
now-unimported substrate/sim modules — `src/sim/runner*`,
`src/sim/simulator*`, `src/substrate/runtime.ts`,
`src/substrate/runtime/`, `src/substrate/runtime-wires*.ts`,
`src/substrate/ticked/`, plus any orphaned `src/sim/` leftovers (keep
`seeds.ts` only if `host-shim/run-frames.ts` still reaches it).
After step 5: step 6 retires the two pre-existing red tests with
wires-runtime; step 7 runs gates + manual proof-out; step 8 merges
to main (sign-off required). See
[handoff-next-task.md](handoff-next-task.md).

Dormant: Shape D port (likely deleted with wires-runtime unless
ported). Tick-batching audit superseded.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
