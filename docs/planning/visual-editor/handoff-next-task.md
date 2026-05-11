# Handoff — Last completed task

**State:** `task/remove-legacy-runtimes` merged to main as `95904bd`
and pushed. No active task branch.

## Commits landed on the branch

- `5619b84` — step 5: delete legacy substrate/sim modules.
  50 files removed (-3320 LOC).
- `2dd03f9` — step 6: delete tests for removed legacy runtimes.
  53 files (-2781 LOC).
- `2e7e9a6` — remove `topology.frameRendererEnabled` flag. Frame
  renderer now always runs.
- `1a572da` — renderer adapter: pause-gate the pump. Wires
  `PauseController` through `AdapterOptions`; pump gates on it.
  Contract test at
  `tools/topology-vscode/test/contracts/run-frames-controls.test.ts`.
- `b67f189` — drop legacy `runtime: "ticked"` from `topology.json`;
  extend Input seed to 10 values.
- `87dfae5` — handoff refresh.
- `95904bd` — merge to main (no-ff).

## Proof-out result

User-confirmed on the dev host:
- Edge `in08.out → readGate1.chainIn` renders, pulses animate.
- Pause halts the pump mid-stream.
- Step advances exactly one frame, then re-pauses.
- Resume drains queued frames.

## Bug surfaced + fixed during proof-out

Renderer adapter was not pause-aware. Substrate is timing-free per
MODEL.md; the adapter is the pacing layer. Without a pause gate on
the adapter pump, queued events drained on next tick regardless of
pause state — step() flooded frames; pause() looked like a no-op.
Fix lives in `1a572da` and stays inside the renderer layer; the
substrate vocab gate was not touched.

## Gates on main

tsc ✓, build ✓, vitest 38 files / 193 tests pass.

## Survivor surface

Substrate transitively reached by `host-shim/run-frames.ts`:
`wire-entity.ts`, `wire-loop.ts`, `wire-events.ts`, `wire.ts`,
`node-streams.ts`, `node-loop*.ts`, `pause-controller.ts`,
`pause-aware.ts`, `match.ts`, `log.ts`, `trigger-gate.ts`,
`build-wires.ts`, `build-wire-entities.ts`. Plus `host-shim/`,
`extension/frame-renderer.ts`, `handle-message.ts`, renderer adapter,
recorder. `sim/seeds.ts` and `sim/trace.ts` (type-only) survive.

## Refuse cheap alternatives

Per MODEL.md: do not reintroduce the renderer-enabled flag — there
is nothing to fall back to. Do not move pacing into the substrate
to "fix" pause; the adapter owns pacing and now owns pause-gating
too. Do not keep legacy as museum; the deletion sweep is done.

## ALWAYS clause

At end of session, overwrite this file (and sibling `handoff-*.md`)
with a freshly-rendered prompt for the state you're leaving and
commit on the active branch (main if no task is in flight). Do not
rely on chat history; next AI may be fresh. The rendered handoff
must contain this ALWAYS clause so the loop self-perpetuates. Use
`continuation-prompt-template.md` as structural source of truth.
Keep each file ≤100 LOC.
