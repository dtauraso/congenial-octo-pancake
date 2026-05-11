# Handoff — Next task (START HERE)

**State:** `task/remove-legacy-runtimes`. Steps 2–6 landed; steps 7–8 remain.

## Commits landed

- `5619b84` — step 5: delete legacy substrate/sim modules. 50 files
  removed (-3320 LOC). Stripped `historyToTrace` from `sim/trace.ts`.
- `2dd03f9` — step 6: delete tests for removed legacy runtimes. 53
  files (-2781 LOC). Entire `test/handlers/`, entire `test/simulator/`,
  all `test/trace/` except `parser-validation.test.ts`, every
  `test/contracts/` test bound to the removed runtimes (including the
  two pre-existing reds `shape-d-cycle`, `handle-load-repro`, and
  `pulse-bridge-balance.test.tsx` which dynamic-imported
  `sim/runner/_state` and didn't surface in step 5's load-failure
  enumeration). Also `test/concurrency.test.ts`, `test/drift.test.ts`,
  `test/replay-spec-invariant.test.ts`.

**Gates after step 6:** vocab ✓, LOC ✓, tsc ✓, build ✓,
tests 37/37 files / 189/189 tests pass.

## Remaining steps

7. **Proof-out (user-driven).** Open the repo in VS Code, F5 to
   launch the extension dev host, load a topology, hit play / pause /
   step in the topology tab. Verify: pulses animate, pause halts at
   line level (mid-rendezvous frozen states valid), step advances one
   event. Assistant cannot drive the UI — flag explicitly if asked.
8. **Refresh handoff and merge to main** (requires sign-off).
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
Test survivors: 37 files, all in `test/contracts/`, `test/trace/`
(`parser-validation.test.ts` only), `test/` root non-deleted, plus
`test/camera.test.ts`, `test/spec-colors.test.ts`, etc.

## Refuse cheap alternatives

Per MODEL.md: refuse keeping legacy as museum; refuse `!frameMode &&`
guards; refuse preserving ticked sidecar. The deletion sweep is done;
do not reintroduce.

## ALWAYS clause

At end of session, overwrite this file (and sibling `handoff-*.md`)
with a freshly-rendered prompt for the state you're leaving and commit
on the task branch. Do not rely on chat history; next AI may be fresh.
The rendered handoff must contain this ALWAYS clause so the loop
self-perpetuates. Use `continuation-prompt-template.md` as structural
source of truth. Keep each file ≤100 LOC.
