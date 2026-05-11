# Handoff — Next task (START HERE)

**State:** `task/remove-legacy-runtimes`. Steps 2–7 landed; step 8
(merge to main, sign-off required) remains.

## Commits landed

- `5619b84` — step 5: delete legacy substrate/sim modules. 50 files
  removed (-3320 LOC).
- `2dd03f9` — step 6: delete tests for removed legacy runtimes. 53
  files (-2781 LOC).
- `2e7e9a6` — remove `topology.frameRendererEnabled` flag. Frame
  renderer now always runs.
- `1a572da` — renderer adapter: pause-gate the pump. Without it,
  `step()` flooded frames and `pause()` had no visible effect after
  the substrate had already buffered events. Wires `PauseController`
  through `AdapterOptions`; pump gates on it. New contract test at
  `test/contracts/run-frames-controls.test.ts` covers pause/step/
  resume semantics.
- `b67f189` — drop legacy `runtime: "ticked"` from `topology.json`;
  extend Input seed from `[0,1]` → 10-element sequence so proof-out
  has enough activity to observe pause/step.

**Gates after b67f189:** tsc ✓, build ✓, vitest 38 files / 193 tests
pass.

## Proof-out status (step 7, DONE)

- F5 dev host launches, topology tab opens — ✓
- Edge `in08.out → readGate1.chainIn` renders, pulses animate — ✓
- Pause halts the pump mid-stream — ✓ (user-confirmed)
- Step advances exactly one frame, then re-pauses — ✓ (user-confirmed
  + contract test)
- Resume drains queued frames — ✓

Bug surfaced + fixed during proof-out: the renderer adapter was not
pause-aware. Substrate is timing-free per MODEL.md; the adapter is
the pacing layer. Without a pause gate on the adapter pump, queued
events drained on next tick regardless of pause state. Fix in
`1a572da`.

## Remaining steps

8. **Merge to main** (requires sign-off).
   `git checkout main && git merge --no-ff task/remove-legacy-runtimes`,
   then push. Reference branches retained — do not delete on merge.

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
guards; refuse preserving ticked sidecar. Also: do not reintroduce
the renderer-enabled flag — there is nothing to fall back to. Do
not move pacing into the substrate to "fix" pause; the adapter owns
pacing and now owns pause-gating too.

## ALWAYS clause

At end of session, overwrite this file (and sibling `handoff-*.md`)
with a freshly-rendered prompt for the state you're leaving and commit
on the task branch. Do not rely on chat history; next AI may be fresh.
The rendered handoff must contain this ALWAYS clause so the loop
self-perpetuates. Use `continuation-prompt-template.md` as structural
source of truth. Keep each file ≤100 LOC.
