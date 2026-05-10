# Handoff — Next task (START HERE)

**State:** `task/node-ticks`. Three new commits landed this session:

- `99dc8c5` — `run-frames` seeds Input nodes from `data.init` and
  spawns `runWire` for every wire. Before this, system 3 (forever-loop
  substrate) was wired to the painter via `runFrames`+`composeShim`
  but inert: source nodes were skipped and no wire-loop ran, so no ack
  ever fired and the pipeline jammed after one load.
- `03fcdf3` — `PauseController` created in `runFrames`, threaded into
  `runWire`, `runNode`, and the source loop's `pauseAware` awaits.
  `pause()`/`resume()` exposed on `RunFramesHandle` and
  `FrameRendererCtl`. Webview→host `frame-pause` / `frame-resume`
  messages routed through `handle-message.ts`.
- `43d66a6` — session-log entry for the mid-pulse replace observation.

Build/tsc/vocab/LOC clean; 310 pass, two pre-existing reds.

## Two findings this session reframe the work

**Finding 1.** System 3 was built (steps 1–5 on this branch) but
orphaned — the painter happened to wire to it (via `runFrames`), but
the substrate wasn't seeding source nodes or running wire-loops in
production, only in tests. The two commits above close that gap.

**Finding 2.** The Step-mid-pulse "replace" friction the user reported
isn't a substrate bug. The Step button drives the **ticked sidecar**
(system 2.5), not system 3. The ticked sidecar publishes
`publishEdgeArrive` on send and nothing on consume, so the painter's
"carrying" visual is replaced on the next arrive. The pacing contract
between painter and substrate was never specified; the painter is a
stateless mirror of the latest event.

## Known UI bug introduced by this session's wiring

`TransportControls.tsx` has `disabled={ticked}` on the play/pause
button. With `spec.runtime: "ticked"` (current default), the button is
greyed out — so the `frame-pause`/`frame-resume` hookup the toggle now
sends never fires. **Do not patch in place.** See next move.

## Next move — `task/remove-legacy-runtimes`

The right move is the deletion sweep, not another patch.
`TransportControls` already knows about four substrate vocabularies
(`isPlaying`, `isSubstrateRunning`, `isWiresRuntimeRunning`,
`isTickedActive`); my hookup made it five. The painter has
`!frameMode &&` guards so it can coexist with a legacy renderer that
shouldn't exist anymore. Each new system has been *added* on top of
the prior, never replacing it — the same pattern-matching corruption
flagged in `feedback_derive_model_from_visual_spec.md`.

Scope of the new branch (start from current HEAD of `task/node-ticks`):

1. Delete `sim/runner` (system 1), `substrate/runtime` (legacy
   substrate, system 2), `substrate/runtime-wires*` (wires-runtime,
   system 2), and `substrate/ticked/` (the sidecar, system 2.5).
2. Rewrite `TransportControls.tsx` against `FrameRendererCtl` only:
   `pause`/`resume`/`paused`. Step button's meaning in a forever-loop
   world is open — likely "unpause for one event, then re-pause" via
   a new `stepOnce()` on `PauseController`.
3. Delete `!frameMode &&` guards in `AnimatedEdge` /
   `AnimatedNode` — there is no other mode left.
4. Delete tests pinning system 1/2/2.5 behavior. The two pre-existing
   reds (`shape-d-cycle`, `handle-load-repro`) test wires-runtime and
   go with it.
5. Port any non-shape-A behavior the user actually drives that
   wires-runtime currently hosts. If unused, delete with the system.
6. Run vocab gate, tsc, build, full proof-out with play/pause active.

## Read first

1. [MODEL.md](../../../MODEL.md) — substrate timing-free; banned vocab.
2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md) —
   forever-loops + line-level pause + state-change events.
3. [session-log.md](session-log.md) entry from 2026-05-10 — pacing
   contract gap between painter and substrate.

## Refuse cheap alternatives

Per `feedback_derive_model_from_visual_spec.md` + MODEL.md, refuse:
patching `disabled={ticked}` instead of rewriting the controls;
keeping legacy as "museum" when it doesn't run; preserving the ticked
sidecar because Step is wired to it; adding a sixth substrate branch
to `TransportControls`. The deletion sweep is the load-bearing move.

## ALWAYS clause

At end of session, overwrite this file (and sibling `handoff-*.md`)
with a freshly-rendered prompt for the state you're leaving and
commit on the task branch. Do not rely on chat history; next AI may
be a fresh model. The rendered handoff must contain this ALWAYS
clause so the loop self-perpetuates. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as structural source of truth. Keep each file ≤100 LOC.
