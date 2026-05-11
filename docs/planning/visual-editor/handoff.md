# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the proof-out + merge, mid-flight on `task/remove-legacy-runtimes`.
     Steps 2–6 landed; steps 7–8 remain.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — system 3 model: forever-loops, line-level pause, events.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, fifty-seventh session):
  Active branch: `task/remove-legacy-runtimes`. Step 7 mid-proof-out;
  step 8 (merge) remains.

  Latest commit `2e7e9a6` — removed `topology.frameRendererEnabled`
  flag. Legacy ticked renderer was gone since step 5, but the flag
  still defaulted off, so play/pause/step posted to an undefined
  handle and silently no-op'd. Frame renderer now always runs.

  Proof-out state: F5 dev host + Cmd-R produced a brief mid-canvas
  pulse then nothing. Cause: working-tree `topology.view.json` is
  2 nodes / 0 edges, so the adapter emitted the initial state and
  had nothing to advance. Pipeline is live; topology is empty. User
  needs to wire nodes + seed a source to actually proof-out.

  **Gates clean:** tsc ✓, build ✓, vitest 37/37 files /
  189/189 tests pass.

  **Steps remaining (see handoff-next-task.md):**
  7. Finish proof-out: wire nodes in editor (or load fixture with
     edges + seed), confirm pulses animate, pause halts at line
     level, step advances one event. (User-driven.)
  8. Refresh handoff and merge to main (sign-off required).

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
