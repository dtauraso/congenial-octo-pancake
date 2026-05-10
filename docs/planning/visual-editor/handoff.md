# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the deletion sweep, mid-flight on `task/remove-legacy-runtimes`.
     Steps 2–5 landed; steps 6–8 remain.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — system 3 model: forever-loops, line-level pause, events.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, fifty-fifth session):
  Active branch: `task/remove-legacy-runtimes`. Step 5 landed in
  `5619b84`: 50 files deleted (-3320 LOC) — `src/sim/runner*`,
  `src/sim/simulator*`, `src/sim/handlers*`, `src/sim/concurrency.ts`,
  `src/sim/drift.ts`, `src/sim/error-probe.ts`, `src/sim/event-bus.ts`,
  `src/sim/slot-release.ts`, `src/substrate/runtime.ts`,
  `src/substrate/runtime-wires*.ts` (6 files), `src/substrate/step/`,
  `src/substrate/ticked/`. Stripped `historyToTrace` from
  `sim/trace.ts` (only consumer was the simulator). Kept
  `sim/seeds.ts` (reached by `host-shim/run-frames.ts`) and
  `sim/trace.ts` (TraceEvent type still used by `webview/state/store.ts`).
  Build/tsc/vocab/LOC clean.

  **Test state:** 51 test files now fail to load (they import
  just-deleted modules). 37 file loaders succeed; 189 individual tests
  pass. The deletion sweep is step 6.

  **Steps remaining (see handoff-next-task.md):**
  6. Delete every test file that fails to load post-step-5 (~51 files),
     plus the two pre-existing reds (`shape-d-cycle`,
     `handle-load-repro`).
  7. Vocab → tsc → build → tests (expect green) → proof-out (load
     topology, hit play/pause/step, verify pulses animate, pause halts
     at line level, step advances one event).
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

Continue on `task/remove-legacy-runtimes` at step 6: delete every
test file that fails to load post-step-5 (~51 files). Enumerate via
`npm test 2>&1 | grep "Failed to load\|Cannot find module"`. Anything
testing wires-runtime, ticked-runtime, simulator, sim/runner, or
substrate/step goes; also delete the two pre-existing reds
(`shape-d-cycle.test.ts`, `handle-load-repro.test.ts`). Then step 7
runs gates + manual proof-out; step 8 merges to main (sign-off
required). See [handoff-next-task.md](handoff-next-task.md).

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
