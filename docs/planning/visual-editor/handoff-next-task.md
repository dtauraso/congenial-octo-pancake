# Handoff — Next task (START HERE)

**State:** `task/node-ticks`. Steps 1 & 2 of the substrate iteration
plan landed: wire forever-loop (`wire-entity.ts`, `wire-events.ts`,
`pause-aware.ts`, `wire-loop.ts`) and shared
[pause-controller.ts](../../../tools/topology-vscode/src/substrate/pause-controller.ts)
with contract tests at
[pause-controller.test.ts](../../../tools/topology-vscode/test/contracts/pause-controller.test.ts).
`wire-loop.test.ts` now imports the shared controller. 18 contract
tests green; vocab lint clean; LOC budget clean. No production caller
yet — substrate modules are leaf. Branch not ready to merge.

## Read first

1. [MODEL.md](../../../MODEL.md) — substrate is timing-free; renderer
   owns pacing. Banned vocabulary list still applies.
2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md) —
   the decided model: forever-loops per node and per wire, line-level
   pause, state-change events, no durations in substrate.

Run `node tools/topology-vscode/scripts/check-substrate-vocab.mjs`
before commits.

## Next concrete step — Step 3: uniform node loop

Add `src/substrate/node-loop-uniform-v2.ts` (name TBD; must coexist
with the existing `node-loop-uniform.ts` until the legacy is retired)
implementing the uniform body from `handoff-substrate-iteration.md`:

  await all input wires `carrying`
  → run node body
  → await all output wires `empty`
  → load output wires
  → await output wires `acked`

Surface:
- Takes a node spec (input wires, output wires, pure body fn) and a
  `PauseSignal`.
- Every wait routes through `pauseAware()`.
- Emits state-change events (entered run, parked at input, parked at
  output, loaded outputs) with ordinal seq numbers via the same
  emitter style as `wire-events.ts`.
- No setTimeout, Date.now, performance.now, no durations.

Contract tests:
- Single-input single-output node passes one value end-to-end through
  a pair of wires.
- Multi-input node parks until all inputs carrying, then runs once.
- Multi-output node parks at output-empty until all destinations have
  acked before next round.
- Pause mid-run freezes; resume completes the round.

Keep file ≤100 LOC per the budget rule; split into helpers if needed.

## Decided previously, still hold

- Halt/resume on the substrate, not the wire (line-level via shared
  `PauseSignal`; controller is now `createPauseController()`).
- Legacy runtime stays a working museum; ports retire one
  `LEGACY_SKIP` entry at a time.
- `send()` on a non-empty wire **throws**. No queue, no overwrite.

## Refuse cheap alternatives

`feedback_derive_model_from_visual_spec.md` (in user memory) and
MODEL.md exist to catch "smallest diff preserves wrong model." Recent
drift example: per-loop step-duration awaits to "pace itself at
human-read speed" — violates MODEL.md. Renderer owns pacing; substrate
is flat-out.

If a request seems to require banned vocabulary, name the gap to
David before writing code.

## Pre-existing red tests (carry over)

- `test/contracts/shape-d-cycle.test.ts` — ackEdge depth race.
- `test/contracts/handle-load-repro.test.ts` — real `topology.json`.

## Working tree

Unstaged editor state: `topology.json`, `topology.view.json`. Branch
is 5 commits ahead of `origin/task/node-ticks` — push when ready.

## Branch name

`task/node-ticks` is now misleading — the work removed the global
tick. Rename on next branch, not this one.

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
