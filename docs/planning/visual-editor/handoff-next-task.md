# Handoff — Next task (START HERE)

**State:** `task/remove-legacy-runtimes` (opened from `task/node-ticks`
HEAD). Steps 2–3 of the deletion sweep landed; steps 4–8 remain.

## Commits landed on this branch

- `7148137` — `TransportControls.tsx` rewritten against
  `FrameRendererCtl` only. Toggle posts `frame-pause`/`frame-resume`,
  step posts `frame-step`. `step()` on `RunFramesHandle` arms a
  one-shot in `adapter.onPaced` (resume + re-pause on next paced
  frame). Tick-ms slider dropped; `disabled={ticked}` bug retired.
- `1673f3e` — `AnimatedEdge` / `AnimatedNode` collapsed to the
  frame-mode branch. `!frameMode &&` pulse renders gone; styling
  ternaries collapsed; `heldFill` fallback gone. Dead
  `usePulseLanes*`, `ruleForNodeId`/`effectiveSpeedPxPerMs`,
  `runtime-wires` version sub, and `isTickedActive` pulled from
  `AnimatedEdge.tsx`. `AnimatedNode.tsx` still imports `subscribe` /
  `getWorld` / `getTickMs` from `sim/runner` and `subscribeNodeHeld`
  / `subscribeNodeBuffered` from `runtime-wires` — retire in step 4.

Build/tsc/vocab/LOC clean; 310 pass, two pre-existing reds.

## Why this branch exists

Each new system has been *added* on top of the prior, never replacing
it (per `feedback_derive_model_from_visual_spec.md`). Steps 2–3
retired transport + painter legacy; the rest deletes modules + tests.

## Remaining steps

4. **Detach webview/panel callers from legacy modules.** Files still
   importing `sim/runner`, `substrate/runtime*`, or `substrate/ticked`.
   `AnimatedEdge.tsx` is clean; `AnimatedNode.tsx` still pulls
   `subscribe`/`getWorld`/`getTickMs` and `subscribeNodeHeld`/
   `subscribeNodeBuffered` (held/buffered/offset/tween state is dead
   in frame mode — retires here). Re-grep at start (was ~13 pre-step
   3). Per file: port to the frame-renderer event stream if it drives
   shape-A behavior; otherwise delete. Likely deletes: `RunnerProbe`,
   `fold-halo-probe`, `_stuck-runner-snapshot`, `timeline-probe/*`,
   `Bookmarks`, `trace-load`. Likely ports: `TriggerSlotButton`,
   `ClearSlotButton`, `_handle-load`, `_on-node-drag`, `PulseInstance`,
   `_use-pulse-lanes*` (now unimported — decide here), `TimelinePanel`.
5. **Delete the systems.** After step 4, no live importers remain.
   Delete `src/sim/runner*`, `src/sim/simulator*`,
   `src/substrate/runtime.ts`, `src/substrate/runtime/`,
   `src/substrate/runtime-wires*.ts`, `src/substrate/ticked/`. Audit
   `src/sim/` for unused leftovers (keep what `run-frames.ts` reaches
   — currently `seeds.ts`).
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

Substrate transitively reached by `host-shim/run-frames.ts`:
`wire-entity.ts`, `wire-loop.ts`, `wire-events.ts`, `wire.ts`,
`node-streams.ts`, `node-loop*.ts`, `pause-controller.ts`,
`pause-aware.ts`, `match.ts`, `log.ts`, `trigger-gate.ts`,
`build-wires.ts`, `build-wire-entities.ts`, `step/`. Plus
`host-shim/`, `extension/frame-renderer.ts`, `handle-message.ts`,
the renderer adapter, and the recorder. Anything not transitively
imported from `run-frames.ts` is in scope to delete.

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
