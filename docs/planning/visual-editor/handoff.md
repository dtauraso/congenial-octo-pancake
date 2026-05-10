# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the deletion sweep, mid-flight on `task/remove-legacy-runtimes`.
     Step 2 landed; steps 3–8 remain.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — system 3 model: forever-loops, line-level pause, events.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, fifty-second session):
  Active branch: `task/remove-legacy-runtimes`, opened from
  `task/node-ticks` HEAD. One commit landed: `7148137`
  (TransportControls rewritten against `FrameRendererCtl` only —
  paused state host-owned, toggle posts `frame-pause`/`frame-resume`,
  step posts `frame-step`; `step()` on `RunFramesHandle` /
  `FrameRendererCtl` arms a one-shot in the `adapter.onPaced` wrapper:
  resume + re-pause on the next paced frame; `frame-step` message
  added end-to-end; tick-ms slider dropped — the survivor adapter has
  no analogue; `disabled={ticked}` bug retired with the rewrite).
  Build/tsc/vocab/LOC clean; 310 pass, same two pre-existing reds.

  **Steps remaining on this branch (see handoff-next-task.md):**
  3. Delete `!frameMode &&` guards in `AnimatedEdge` /
     `AnimatedNode` and the four `AnimatedEdge/_*` helpers.
  4. Detach the 13 webview/panel files that import `sim/runner`,
     `substrate/runtime*`, or `substrate/ticked`. Per file:
     port-or-delete (refuse "keep as museum").
  5. Delete `src/sim/runner*`, `src/sim/simulator*`,
     `src/substrate/runtime.ts`, `src/substrate/runtime/`,
     `src/substrate/runtime-wires*.ts`, `src/substrate/ticked/`.
  6. Delete tests pinning systems 1/2/2.5; the two pre-existing reds
     (`shape-d-cycle`, `handle-load-repro`) retire with wires-runtime.
  7. Vocab → tsc → build → tests → proof-out (load topology, hit
     play/pause/step, verify pulses animate, pause halts at line
     level, step advances one event).
  8. Refresh handoff and merge.

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

Continue on `task/remove-legacy-runtimes` at step 3: drop
`!frameMode &&` guards in `AnimatedEdge` / `AnimatedNode` and the
`AnimatedEdge/_*` helpers; collapse to the frame-mode branch and
delete the legacy branch. See
[handoff-next-task.md](handoff-next-task.md) for the full scope and
the cheap-alternative refusal list.

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
