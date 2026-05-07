# Handoff — Next task (START HERE)

**Revised step 1 is done.** Commits 1–7 landed on `task/wires`. The
matched (Input→ReadGate) path no longer touches `sim/event-bus`,
`legacyRunnerState`, or `pulse-concurrency`. Spec at
[../sim-substrate/revised-step-1.md](../sim-substrate/revised-step-1.md).

Commits:
- bf304d7 — Wire primitive + buildWires + contract test.
- 30d6e28 — per-node loops + runtime-wires + contract test.
- c89e246 — AnimatedEdge wire-driven hook + `_handle-load` swap.
- 72318e1 — toolbar play/pause off legacy state.
- 3921640 — `_resetPulseConcurrency` retired from legacy
  `loadSubstrate`.
- d7aaaae — PulseInstance + `_pulse-frame` read `performance.now()`;
  `runtime-wires.ts` no longer touches `legacyRunnerState`.
- HEAD — `sim/event-bus` substrate-side usage retired. TimelinePanel
  subscribes via `subscribeWires` alongside `subscribeState`;
  `runtime-wires.ts` no longer imports or pokes `notifyState()`.

**Next session:**
1. Visual validation pass on `topology.json`: cold-open animates,
   pause stops new emissions (in-flight pulse completes its arc),
   resume continues. Confirm post-clock-swap behavior visually.
2. If green, start port-plan **step 2** per
   [handoff-rebuild-plan.md](handoff-rebuild-plan.md). Otherwise
   fix-forward on `task/wires`.

Consider merging `task/wires` to `main` (with sign-off) once step 1
is visually validated, before step 2 begins.

[rt]: /tools/topology-vscode/src/substrate/runtime.ts

## Why / branch / scope

See [handoff-frame.md](handoff-frame.md) for the conceptual frame and
[handoff-rebuild-plan.md](handoff-rebuild-plan.md) for the port plan.
Branch is `task/wires` (cut from `task/runtime-substrate-rebuild` at
1aeee65). Trivial Input→ReadGate only through this whole stretch;
endpoint is `sim/event-bus` + `legacyRunnerState` + `pulse-concurrency`
unused on the matched path.

## Concrete commits (all landed)

1. ✅ bf304d7 — `Wire` type + builder + contract test.
2. ✅ 30d6e28 — per-node loops + runtime-wires + contract test.
3. ✅ c89e246 — AnimatedEdge wire-driven hook + `_handle-load` swap.
4. ✅ 72318e1 — toolbar play/pause off legacy state.
5. ✅ 3921640 — `_resetPulseConcurrency` retired from legacy
   `loadSubstrate`.
6. ✅ d7aaaae — PulseInstance off legacy sim clock; rAF math reads
   `performance.now()`.
7. ✅ HEAD — `sim/event-bus` retired from substrate; TimelinePanel
   subscribes to `subscribeWires`.

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
