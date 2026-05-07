# Handoff — Next task (START HERE)

**Start retiring legacy on the matched path.** Spec is at
[../sim-substrate/revised-step-1.md](../sim-substrate/revised-step-1.md).
Commits 1–4 landed:
- bf304d7 — Wire primitive + buildWires + contract test.
- 30d6e28 — per-node loops + runtime-wires + contract test.
- c89e246 — AnimatedEdge wire-driven hook + `_handle-load` swap.
- 72318e1 — toolbar play/pause off legacy state. Wires runtime now has
  `pauseWiresRuntime` / `resumeWiresRuntime` / `isWiresRuntimePaused`.
  Pause stops the input loop's next `send`; in-flight pulse finishes
  and acks. Sim clock stays running across pause so PulseInstance's
  rAF math keeps advancing — retires together in step 5.

**Visual validation (recommended before commit 5):** open the matched
Input→ReadGate topology, press pause mid-flight (in-flight pulse
should finish its arc, then no new pulses), press play (next pulse
fires). Step button should also pause the wires runtime.

**Commit 5 (next):** start ripping the legacy coupling on the matched
path. Three things to retire, roughly in order:

1. `_resetPulseConcurrency` calls in [runtime.ts][rt] and the
   `pulse-concurrency` ledger reads in PulseInstance / probe code on
   the matched path. The wires runtime never registers in that ledger,
   so legacy probes shouldn't gate it.
2. `legacyRunnerState.{playing, simSegmentStartWall, simAccumMs}`
   coupling in `runtime-wires.ts` (`startSimClock`/`stopSimClock`) and
   the `getSimTime()` read in PulseInstance. Replace with a wire-local
   clock or inline rAF math that doesn't need a global flag.
3. `sim/event-bus` substrate-side usage. The `notifyState()` calls in
   `runtime-wires.ts` (added in commit 4 to refresh TimelinePanel)
   need a wires-side equivalent — probably `subscribeWires`-driven
   re-renders in TimelinePanel.

Do these as separate commits if any one is non-trivial; bundle if
mechanical. Endpoint: `sim/event-bus`, `legacyRunnerState`, and
`pulse-concurrency` are all unused on the matched code path.

[rt]: /tools/topology-vscode/src/substrate/runtime.ts

## Why / branch / scope

See [handoff-frame.md](handoff-frame.md) for the conceptual frame and
[handoff-rebuild-plan.md](handoff-rebuild-plan.md) for the port plan.
Branch is `task/wires` (cut from `task/runtime-substrate-rebuild` at
1aeee65). Trivial Input→ReadGate only through this whole stretch;
endpoint is `sim/event-bus` + `legacyRunnerState` + `pulse-concurrency`
unused on the matched path.

## Concrete commits (remaining)

1. ✅ bf304d7 — `Wire` type + builder + contract test.
2. ✅ 30d6e28 — per-node loops + runtime-wires + contract test.
3. ✅ c89e246 — AnimatedEdge wire-driven hook + `_handle-load` swap.
4. ✅ 72318e1 — toolbar play/pause off legacy state.
5. Retire `_resetPulseConcurrency` / `pulse-concurrency` reads on the
   matched path.
6. Retire `legacyRunnerState.{playing, simSegmentStartWall,
   simAccumMs}` coupling and the `getSimTime()` read in PulseInstance.
7. Retire `sim/event-bus` substrate-side usage; switch TimelinePanel
   to `subscribeWires` for wires-runtime state changes.

## Open questions (decide during implementation)

1. **Wire-local clock vs renderer-local rAF math?** PulseInstance
   currently reads `getSimTime()`. Cleanest swap is for PulseInstance
   to receive a per-pulse start timestamp and compute progress from
   `performance.now()` directly — no global clock needed.
2. **TimelinePanel re-render source for wires state?** Simplest is to
   add a `subscribeWires` effect alongside the existing
   `subscribeState` effect.

## ALWAYS clause

At end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
