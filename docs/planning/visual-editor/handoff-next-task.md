# Handoff — Next task (START HERE)

**Continue retiring legacy on the matched path.** Spec is at
[../sim-substrate/revised-step-1.md](../sim-substrate/revised-step-1.md).
Commits 1–6 landed:
- bf304d7 — Wire primitive + buildWires + contract test.
- 30d6e28 — per-node loops + runtime-wires + contract test.
- c89e246 — AnimatedEdge wire-driven hook + `_handle-load` swap.
- 72318e1 — toolbar play/pause off legacy state.
- 3921640 — `_resetPulseConcurrency` retired from legacy
  `loadSubstrate`.
- d7aaaae — PulseInstance + `_pulse-frame` read `performance.now()`
  instead of `getSimTime()`; both `simStart` producers emit
  `performance.now()`; `runtime-wires.ts` no longer touches
  `legacyRunnerState`. In-flight pulses now finish their arc on
  wall-clock time regardless of pause; new emissions are gated at the
  substrate, so visible behavior is unchanged on the trivial path.

**Commit 7 (next):** retire `sim/event-bus` substrate-side usage. The
`notifyState()` calls in `runtime-wires.ts` (pause/resume/start/stop)
exist only to refresh TimelinePanel. Add a `subscribeWires` effect in
TimelinePanel alongside the existing `subscribeState` effect, then
drop the `notifyState()` pokes and the `sim/event-bus` import from
`runtime-wires.ts`.

Endpoint after commit 7: `sim/event-bus`, `legacyRunnerState`, and
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
5. ✅ 3921640 — `_resetPulseConcurrency` retired from legacy
   `loadSubstrate` (matched path was already off the ledger).
6. ✅ d7aaaae — PulseInstance off legacy sim clock; rAF math reads
   `performance.now()`; `runtime-wires` no longer pokes
   `legacyRunnerState`.
7. Retire `sim/event-bus` substrate-side usage; switch TimelinePanel
   to `subscribeWires` for wires-runtime state changes.

## Open questions (decide during implementation)

1. **TimelinePanel re-render source for wires state?** Simplest is to
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
