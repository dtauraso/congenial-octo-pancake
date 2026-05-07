# Handoff — Next task (START HERE)

**Continue revised step 1: toolbar play/pause off legacy state, then
start retiring legacy.** Spec is at
[../sim-substrate/revised-step-1.md](../sim-substrate/revised-step-1.md).
Commits 1–3 landed:
- bf304d7 — Wire primitive + buildWires + contract test.
- 30d6e28 — per-node loops + runtime-wires + contract test.
- c89e246 — AnimatedEdge dispatches to a wire-driven lanes hook when
  a `Wire` exists for the edge; `_handle-load` calls
  `startWiresRuntime` for matched Input→ReadGate topologies.
  `readGateLoop` gained `autoAck` (default true; runtime-wires passes
  false so the renderer paces ack). `runtime-wires.stop()` drains
  in-flight wires so input loops wind down cleanly. Files:
  [src/webview/rf/AnimatedEdge.tsx](/tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx),
  [src/webview/rf/AnimatedEdge/_use-pulse-lanes-wire.ts](/tools/topology-vscode/src/webview/rf/AnimatedEdge/_use-pulse-lanes-wire.ts),
  [src/webview/rf/app/_handle-load.ts](/tools/topology-vscode/src/webview/rf/app/_handle-load.ts).

**Visual validation (recommended before commit 4):** open the matched
Input→ReadGate topology and confirm cold-open animates, then rename
either node and confirm reload re-animates without stalling. The
legacy event bus is no longer in the active path for matched specs;
PulseInstance still reads `getSimTime()` (retires step 4-5).

**Commit 4 (next):** Toolbar play/pause must toggle a per-runtime flag
on the wires runtime instead of `legacyRunnerState.playing`. Today
runtime-wires writes that flag itself as a stand-in for the legacy
sim clock. Decide: either give Wire its own arc timer (sketches lean
this way) and let pause freeze the renderer locally, or keep the
"runtime stops calling send on pause; in-flight pulse finishes its
arc" semantics. Latter is simpler — pick that unless it makes step 5
awkward.

**Commit 5+ (after pause works):** start ripping. `_resetPulseConcurrency`
calls in [runtime.ts][rt], `legacyRunnerState.{playing,
simSegmentStartWall, simAccumMs}` coupling in runtime-wires + PulseInstance,
then the `sim/event-bus` substrate-side usage. Endpoint: `sim/event-bus`,
`legacyRunnerState`, and `pulse-concurrency` are all unused on the
matched code path.

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
4. Toolbar play/pause toggles a per-runtime flag, no
   `legacyRunnerState` coupling.
5. Once pause works, start ripping: `_resetPulseConcurrency` calls
   in [runtime.ts][rt], `legacyRunnerState.{playing,
   simSegmentStartWall, simAccumMs}` coupling, then the
   `sim/event-bus` substrate-side usage.

## Open questions (decide during implementation)

1. **Wire owns its arc timer, or visual layer does?** Sketches put
   it on the wire. Default to that unless step 5 gets awkward.
2. **Pause semantics?** Either wire freezes mid-arc, or runtime
   stops calling `send` (in-flight finishes, no new sends). Latter
   is simpler.

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
