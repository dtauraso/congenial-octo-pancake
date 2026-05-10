# Handoff — Next task (START HERE)

**State:** `task/remove-legacy-runtimes` (opened from `task/node-ticks`
HEAD). Step 2 of the deletion sweep landed; steps 3–8 remain.

## Commit landed this session

- `7148137` — `TransportControls.tsx` rewritten against
  `FrameRendererCtl` only. Paused state is host-owned, the toggle
  posts `frame-pause`/`frame-resume`, the step button posts
  `frame-step`. `step()` added on `RunFramesHandle` /
  `FrameRendererCtl`: arms a one-shot in `adapter.onPaced` so the
  next paced frame re-pauses; resume only happens if currently
  paused. `frame-step` webview→host message added and routed in
  `handle-message.ts`. Tick-ms slider dropped (survivor adapter has
  no analogue). `disabled={ticked}` bug retires with the rewrite.

Build/tsc/vocab/LOC clean; 310 pass, two pre-existing reds.

## Why this branch exists

`TransportControls` knew about four substrate vocabularies and my
prior session added a fifth via `frame-pause`/`frame-resume`. The
painter has `!frameMode &&` guards so a legacy renderer can coexist
that shouldn't exist anymore. Each new system has been *added* on top
of the prior, never replacing it — the same pattern-matching
corruption flagged in `feedback_derive_model_from_visual_spec.md`.
The fix is the deletion sweep, not another patch.

## Remaining steps

3. **Drop `!frameMode &&` guards.** [AnimatedEdge.tsx](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx),
   [AnimatedNode.tsx](../../../tools/topology-vscode/src/webview/rf/AnimatedNode/AnimatedNode.tsx),
   and the four `AnimatedEdge/_*` helpers. Collapse to the
   frame-mode branch; delete the legacy branch.
4. **Detach webview/panel callers from legacy modules.** 13 files
   import `sim/runner`, `substrate/runtime*`, or `substrate/ticked`.
   Per file: port to subscribe to the frame-renderer event stream if
   it drives shape-A behavior the user actually uses; otherwise
   delete. Likely deletes: `RunnerProbe.tsx`, `fold-halo-probe.ts`,
   `_stuck-runner-snapshot.ts`, `timeline-probe/*`, `Bookmarks.tsx`,
   `trace-load.ts`. Likely ports: `TriggerSlotButton`,
   `ClearSlotButton`, `_handle-load.ts`, `_on-node-drag.ts`,
   `PulseInstance.tsx`, `_use-pulse-lanes*.ts`, `TimelinePanel.tsx`.
5. **Delete the systems.** After step 4, no live importers remain.
   Delete `src/sim/runner*`, `src/sim/simulator*`,
   `src/substrate/runtime.ts`, `src/substrate/runtime/`,
   `src/substrate/runtime-wires*.ts`, `src/substrate/ticked/`. Audit
   the rest of `src/sim/` for unused leftovers (keep what
   `host-shim/run-frames.ts` reaches — currently `seeds.ts`).
6. **Delete pinned tests.** Anything under `**/runner.*test*`,
   `**/runtime-wires*.test.ts`, `**/ticked*.test.ts`, plus
   `shape-d-cycle.test.ts` and `handle-load-repro.test.ts` (the two
   pre-existing reds — they test wires-runtime).
7. **Gates.** Vocab → `npm run check:loc` → `tsc` → `npm run build`
   → tests (expect green; pre-existing reds gone). Proof-out: load
   topology, hit play/pause/step, verify pulses animate, pause halts
   at line level, step advances one event.
8. **Refresh handoff and merge.**

## Survivor surface (do not delete)

Substrate that `host-shim/run-frames.ts` transitively reaches:
`wire-entity.ts`, `wire-loop.ts`, `wire-events.ts`, `wire.ts`,
`node-streams.ts`, `node-loop*.ts`, `pause-controller.ts`,
`pause-aware.ts`, `match.ts`, `log.ts`, `trigger-gate.ts`,
`build-wires.ts`, `build-wire-entities.ts`, `step/`. Plus
`host-shim/`, `extension/frame-renderer.ts`,
`extension/handle-message.ts`, the renderer adapter, and the
recorder. Anything not transitively imported from `run-frames.ts`
is in scope to delete.

## Read first

1. [MODEL.md](../../../MODEL.md) — substrate timing-free; banned vocab.
2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md) —
   forever-loops + line-level pause + state-change events.
3. [session-log.md](session-log.md) entry from 2026-05-10 — pacing
   contract gap between painter and substrate.

## Refuse cheap alternatives

Per `feedback_derive_model_from_visual_spec.md` + MODEL.md, refuse:
keeping legacy as "museum" when it doesn't run; preserving the ticked
sidecar because Step was wired to it (Step now lives on the survivor
via `frame-step` + `stepArmed`); leaving `!frameMode &&` guards in
place "for safety"; adding any new branch to `TransportControls`.
The deletion sweep is the load-bearing move.

## ALWAYS clause

At end of session, overwrite this file (and sibling `handoff-*.md`)
with a freshly-rendered prompt for the state you're leaving and
commit on the task branch. Do not rely on chat history; next AI may
be a fresh model. The rendered handoff must contain this ALWAYS
clause so the loop self-perpetuates. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as structural source of truth. Keep each file ≤100 LOC.
