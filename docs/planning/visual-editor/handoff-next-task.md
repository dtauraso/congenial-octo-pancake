# Handoff — Next task (START HERE)

**State:** `task/remove-legacy-runtimes`. Steps 2–6 landed; step 7
mid-proof-out (pipeline confirmed live, needs non-empty topology);
step 8 (merge) remains.

## Commits landed

- `5619b84` — step 5: delete legacy substrate/sim modules. 50 files
  removed (-3320 LOC).
- `2dd03f9` — step 6: delete tests for removed legacy runtimes. 53
  files (-2781 LOC).
- `2e7e9a6` — remove `topology.frameRendererEnabled` flag. With legacy
  ticked renderer deleted, flag-off meant play/pause/step posted to an
  undefined handle and silently no-op'd. Frame renderer now always
  runs; vscode config entry deleted; stale "legacy renderer keeps
  serving" comments removed.

**Gates after 2e7e9a6:** tsc ✓, build ✓, vitest 37/37 files /
189/189 tests pass.

## Proof-out status (step 7, mid-flight)

- F5 dev host launches, topology tab opens — ✓
- Play/pause/step buttons render and dispatch — ✓
- After `2e7e9a6` + Cmd-R: a brief pulse rendered mid-canvas on
  reload, then nothing. Investigated: `topology.view.json` is 2
  nodes / 0 edges, so the adapter emitted the initial state and had
  nothing to advance. Pipeline isn't broken — the topology is empty.
- **Outstanding:** load a non-empty topology (≥1 edge + a seeded
  source via `init` in node data) and confirm pulses animate, pause
  halts at line level, step advances one event.

## Remaining steps

7. **Finish proof-out (user-driven).** User wires the two nodes in
   the editor (or loads a fixture topology with edges + seed), saves,
   confirms pulses animate, pause halts at line level, step advances
   one event. Assistant cannot drive the UI.
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

## Refuse cheap alternatives

Per MODEL.md: refuse keeping legacy as museum; refuse `!frameMode &&`
guards; refuse preserving ticked sidecar. The deletion sweep is done;
do not reintroduce. Also: do not reintroduce the renderer-enabled
flag — there is nothing to fall back to.

## ALWAYS clause

At end of session, overwrite this file (and sibling `handoff-*.md`)
with a freshly-rendered prompt for the state you're leaving and commit
on the task branch. Do not rely on chat history; next AI may be fresh.
The rendered handoff must contain this ALWAYS clause so the loop
self-perpetuates. Use `continuation-prompt-template.md` as structural
source of truth. Keep each file ≤100 LOC.
