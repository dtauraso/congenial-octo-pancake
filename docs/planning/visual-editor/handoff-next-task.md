# Handoff — Next task (START HERE)

**State:** `task/remove-legacy-runtimes`. Steps 2–4 landed; steps 5–8 remain.

## Commits landed on this branch (step 4)

- `9d7f54f` — delete unimported `_use-pulse-lanes.ts` / `_use-pulse-lanes-wire.ts`
- `31b1a15` — delete runner/timeline/fold-halo probes; port PulseInstance;
  strip AnimatedNode; simplify TimelinePanel; wire main.tsx to frame-pause/resume.

**Deleted:** `RunnerProbe.tsx`, `fold-halo-probe.ts`, `_stuck-runner-snapshot.ts`,
`_stuck-pulse-probe.ts`, `timeline-probe.ts`, `timeline-probe/` dir,
`Bookmarks.tsx`, `trace-load.ts`, `TraceStatus.tsx`,
`TriggerSlotButton.tsx`, `ClearSlotButton.tsx`.

**Ported / stripped:**
- `PulseInstance.tsx` — runner/runtime-wires deps gone; pure rAF animation.
- `AnimatedNode.tsx` — held/buffered/offset/tween/stateText stripped; frame-only.
- `_handle-load.ts` — matchSubstrate/runner/runtime paths removed; spec+flow only.
- `_on-node-drag.ts` — isRunnerPlaying branch removed; position-only drags.
- `TimelinePanel.tsx` — collapses to `<TransportControls label="—" />`.
- `main.tsx` — `installPulseLifetimes` gone; pause/resume post frame-pause/resume.

All gates pass: vocab ✓ LOC ✓ tsc ✓ build ✓ 310 tests pass, 2 pre-existing reds.

## Remaining steps

5. **Delete the systems.** No live webview importers remain. Delete:
   `src/sim/runner*/`, `src/sim/simulator*/`, `src/sim/drift.ts`,
   `src/sim/trace.ts`, `src/sim/handlers.ts`, `src/sim/event-bus.ts`,
   `src/substrate/runtime.ts`, `src/substrate/runtime/`,
   `src/substrate/runtime-wires*.ts`, `src/substrate/ticked/`.
   Audit `src/sim/` for unused leftovers (keep `seeds.ts` if
   `run-frames.ts` reaches it; otherwise delete too).
6. **Delete pinned tests.** `**/runner.*test*`,
   `**/runtime-wires*.test.ts`, `**/ticked*.test.ts`,
   `shape-d-cycle.test.ts`, `handle-load-repro.test.ts`.
7. **Gates.** Vocab → LOC → tsc → build → tests (expect all green).
   Proof-out: load topology, play/pause/step, verify pulses animate.
8. **Refresh handoff and merge to main** (requires sign-off).

## Survivor surface (do not delete)

Substrate transitively reached by `host-shim/run-frames.ts`:
`wire-entity.ts`, `wire-loop.ts`, `wire-events.ts`, `wire.ts`,
`node-streams.ts`, `node-loop*.ts`, `pause-controller.ts`,
`pause-aware.ts`, `match.ts`, `log.ts`, `trigger-gate.ts`,
`build-wires.ts`, `build-wire-entities.ts`, `step/`. Plus
`host-shim/`, `extension/frame-renderer.ts`, `handle-message.ts`,
renderer adapter, recorder. Keep `seeds.ts` if reached.

## Refuse cheap alternatives

Per MODEL.md: refuse keeping legacy as museum; refuse `!frameMode &&`
guards; refuse preserving ticked sidecar. The deletion sweep is the
load-bearing move.

## ALWAYS clause

At end of session, overwrite this file (and sibling `handoff-*.md`)
with a freshly-rendered prompt for the state you're leaving and commit
on the task branch. Do not rely on chat history; next AI may be fresh.
The rendered handoff must contain this ALWAYS clause so the loop
self-perpetuates. Use `continuation-prompt-template.md` as structural
source of truth. Keep each file ≤100 LOC.
