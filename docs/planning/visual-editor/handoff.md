# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the merge, on `task/remove-legacy-runtimes`.
     Steps 2–7 landed; step 8 (merge, sign-off required) remains.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — system 3 model: forever-loops, line-level pause, events.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, fifty-eighth session):
  Active branch: `task/remove-legacy-runtimes`. Step 7 done; step 8
  (merge to main, sign-off required) remains.

  Latest commits:
  - `1a572da` — renderer adapter: pause-gate the pump. Bug surfaced
    during proof-out: substrate is timing-free, adapter owns pacing
    via queued events. Without a pause gate, step() flooded frames
    and pause() had no visible effect. Adapter now accepts a
    `PauseSignal` and gates pump() on it. Contract test added.
  - `b67f189` — drop legacy `runtime: "ticked"` from topology.json;
    extend Input seed to 10 values for observable proof-out.

  Proof-out (step 7): user-confirmed pulses animate on the
  in08→readGate1 edge, pause halts the pump, step advances exactly
  one frame, resume drains.

  **Gates clean:** tsc ✓, build ✓, vitest 38 files / 193 tests pass.

  **Step remaining (see handoff-next-task.md):**
  8. Merge to main (sign-off required). Reference branches retained.

  **Model:** `handoff-substrate-iteration.md`. Forever-loops per
  node and per wire; backpressure coordination; line-level pause;
  ordinal-seq state-change events; renderer owns pacing. Substrate
  **timing-free** per MODEL.md.

  **Held:** halt/resume on substrate; send-on-non-empty throws;
  renderer adapter / host-shim / frame-store live outside
  `src/substrate/` for the vocab gate.

  Working tree: `topology.view.json` — editor state. Reference
  branches retained — do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

Continue on `task/remove-legacy-runtimes` at step 7: user drives the
extension dev host (F5 in VS Code), loads a topology, hits
play/pause/step. Verify pulses animate, pause halts at line level,
step advances one event. Once user signs off on proof-out, step 8
merges to main (sign-off required). See
[handoff-next-task.md](handoff-next-task.md).

Dormant: Shape D port (deleted with wires-runtime; reintroduce only
if friction surfaces). Tick-batching audit superseded.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
