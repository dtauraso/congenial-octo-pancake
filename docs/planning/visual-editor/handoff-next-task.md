# Handoff — Next task (START HERE)

**State:** `task/remove-legacy-runtimes`. Steps 2–5 landed; steps 6–8 remain.

## Commits landed (step 5)

- `5619b84` — delete legacy substrate/sim modules. 50 files removed
  (-3320 LOC). Stripped `historyToTrace` from `sim/trace.ts` (only
  consumer was the deleted simulator); `webview/state/store.ts` still
  uses the `TraceEvent` type so `trace.ts` itself stays.

**Deleted (step 5):** `src/sim/runner.ts`, `src/sim/runner/`,
`src/sim/simulator.ts`, `src/sim/simulator/`, `src/sim/concurrency.ts`,
`src/sim/drift.ts`, `src/sim/error-probe.ts`, `src/sim/event-bus.ts`,
`src/sim/handlers.ts`, `src/sim/handlers/`, `src/sim/slot-release.ts`,
`src/substrate/runtime.ts`, `src/substrate/runtime-wires*.ts` (6 files),
`src/substrate/step/` (5 files), `src/substrate/ticked/` (3 files).

**Kept in src/sim/:** `seeds.ts` (reached by `host-shim/run-frames.ts`),
`trace.ts` (TraceEvent type still imported by `webview/state/store.ts`).

Build/tsc/vocab/LOC clean. Tests: 51 files fail to **load** because
they import the just-deleted modules — that's step 6's sweep. Of the
file loaders that succeed, 37 pass (189 individual tests pass).

## Remaining steps

6. **Delete pinned tests.** Sweep every test file that fails to load
   (~51 files), plus the two pre-existing reds (`shape-d-cycle.test.ts`,
   `handle-load-repro.test.ts`). Use
   `npm test 2>&1 | grep "Failed to load\|Cannot find module"` to
   enumerate. Anything testing wires-runtime, ticked-runtime, simulator,
   sim/runner, or substrate/step goes.
7. **Gates.** Vocab → LOC → tsc → build → tests (expect all green).
   Proof-out: load topology in extension dev host, hit play/pause/step,
   verify pulses animate, pause halts at line level, step advances one
   event.
8. **Refresh handoff and merge to main** (requires sign-off).

## Survivor surface (do not delete)

Substrate transitively reached by `host-shim/run-frames.ts`:
`wire-entity.ts`, `wire-loop.ts`, `wire-events.ts`, `wire.ts`,
`node-streams.ts`, `node-loop*.ts`, `pause-controller.ts`,
`pause-aware.ts`, `match.ts`, `log.ts`, `trigger-gate.ts`,
`build-wires.ts`, `build-wire-entities.ts`. Plus `host-shim/`,
`extension/frame-renderer.ts`, `handle-message.ts`, renderer adapter,
recorder. `sim/seeds.ts` and `sim/trace.ts` (type-only) survive.

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
