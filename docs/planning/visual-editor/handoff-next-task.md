# Handoff — Next task (START HERE)

**State:** `task/node-ticks`. Wire-entity is implemented at
`src/substrate/wire-entity.ts` (52 LOC); 5 contract tests green;
substrate vocab lint clean. No consumer adopts the new wire — it is
a leaf module. Branch is **not** ready to merge.

The substrate iteration model is now **decided**. See
[handoff-substrate-iteration.md](handoff-substrate-iteration.md).

## Read first

1. [MODEL.md](../../../MODEL.md) — substrate is timing-free; renderer
   owns pacing. Banned vocabulary list still applies.
2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md) —
   the decided model: forever-loops per node and per wire, line-level
   pause, state-change events, no durations in substrate.

Run `node tools/topology-vscode/scripts/check-substrate-vocab.mjs`
before commits.

## Next concrete step

Extend [src/substrate/wire-entity.ts](../../../tools/topology-vscode/src/substrate/wire-entity.ts)
with the wire's forever-loop and Promise-based wait API. Keep file
≤100 LOC per the budget rule; split if needed.

Surface to add:
- `awaitLoaded()`, `awaitEmpty()`, `awaitAcked()` returning Promises
  that resolve when state flips.
- `run(pauseController)` async loop: await source-loaded, await
  dest-took, ack source. Repeats while running.
- State-change event emitter (ordinal sequence numbers, not durations).
- Every internal `await` routes through a pause-aware helper that
  races against the shared pause signal.

Do **not** import setTimeout, Date.now, performance.now, or anything
duration-shaped. Substrate is timing-free.

Contract tests to add:
- Pause mid-load freezes state; resume completes the rendezvous.
- Pause mid-take freezes state; resume completes.
- Event stream emits in the expected order across one rendezvous.

## Decided previously, still hold

- Halt/resume on the substrate, not the wire (now line-level via
  shared pause signal).
- Legacy runtime stays a working museum; ports retire one
  `LEGACY_SKIP` entry at a time.
- `send()` on a non-empty wire **throws**. No queue, no overwrite.

## Refuse cheap alternatives

`feedback_derive_model_from_visual_spec.md` (in user memory) and
MODEL.md exist to catch the failure mode where a "smallest diff"
preserves the wrong model. Recent drift example caught this session:
proposing per-loop step-duration awaits to make substrate "pace
itself at human-read speed." That violates MODEL.md (no durations in
substrate). Renderer owns pacing; substrate is flat-out.

If a request seems to require banned vocabulary, name the gap to
David before writing code.

## Pre-existing red tests (carry over)

- `test/contracts/shape-d-cycle.test.ts` — ackEdge depth race.
- `test/contracts/handle-load-repro.test.ts` — real `topology.json`.

## Working tree

Unstaged editor state: `topology.json`, `topology.view.json`.

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
