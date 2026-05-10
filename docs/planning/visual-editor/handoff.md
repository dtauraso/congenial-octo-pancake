# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the deletion sweep. Names systems 1, 2, 2.5 explicitly and
     the cheap alternatives to refuse.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — system 3 model: forever-loops, line-level pause, events.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, fifty-first session):
  Active branch: `task/node-ticks`. This session landed three
  commits: `99dc8c5` (`run-frames` seeds Input from `data.init`,
  spawns `runWire` for every wire — system 3 was wired to the
  painter but inert in production: no source seeding, no wire
  loops, so the pipeline jammed after one load); `03fcdf3`
  (`PauseController` threaded through `runWire`/`runNode`/source
  loop; exposed up through `RunFramesHandle` and
  `FrameRendererCtl`; `frame-pause`/`frame-resume` webview→host
  messages routed); `43d66a6` (session-log entry).
  Build/tsc/vocab/LOC clean; 310 pass, same two pre-existing reds.

  **Architectural shift this session:** the user named that there
  have been three from-scratch substrate attempts (system 1 sim
  runner, system 2 legacy substrate + wires-runtime, system 3
  forever-loop substrate) plus a ticked sidecar (system 2.5). The
  current state corrupts system 3 by layering it on top of all
  prior systems instead of replacing them. `TransportControls`
  branches on four substrate vocabularies; painter has
  `!frameMode &&` guards to coexist with a legacy renderer that
  shouldn't exist anymore.

  **Known UI bug:** `TransportControls.tsx` has `disabled={ticked}`
  on the play/pause button, so the new `frame-pause`/`frame-resume`
  toggle hookup never fires under `runtime: "ticked"`. Do **not**
  patch in place; the deletion sweep is the right move.

  **Model:** `handoff-substrate-iteration.md`. Forever-loops per
  node and per wire; backpressure coordination; line-level pause;
  ordinal-seq state-change events; renderer owns pacing. Substrate
  **timing-free** per MODEL.md.

  **Held:** halt/resume on substrate; send-on-non-empty throws;
  renderer adapter / host-shim / frame-store live outside
  `src/substrate/` for the vocab gate.

  Pre-existing reds: `shape-d-cycle.test.ts`,
  `handle-load-repro.test.ts` — both test wires-runtime and retire
  with the deletion sweep. Working tree: `topology.{json,view.json}`
  — editor state. Reference branches retained — do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

Open `task/remove-legacy-runtimes` from current `task/node-ticks`
HEAD. Delete `sim/runner` (system 1), `substrate/runtime` + every
`substrate/runtime-wires*` (system 2), and `substrate/ticked/`
(system 2.5 sidecar). Rewrite `TransportControls.tsx` against
`FrameRendererCtl` only — `pause`/`resume`/`paused` plus a Step
that means "unpause for one event then re-pause" (likely a new
`stepOnce()` on `PauseController`). Delete `!frameMode &&` guards
in `AnimatedEdge` / `AnimatedNode`. Delete tests pinning
system 1/2/2.5 behavior; the two pre-existing reds retire with
wires-runtime. Port any non-shape-A behavior the user actually
drives that wires-runtime currently hosts; delete what's unused.
Vocab/tsc/build/proof-out gates as usual. See
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
