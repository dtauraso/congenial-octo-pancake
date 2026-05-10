# Handoff — Next task (START HERE)

**State:** `task/node-ticks`. Steps 1, 2, 3 of the substrate iteration
plan landed: wire forever-loop (`wire-entity.ts`, `wire-events.ts`,
`pause-aware.ts`, `wire-loop.ts`); shared
[pause-controller.ts](../../../tools/topology-vscode/src/substrate/pause-controller.ts);
and uniform node loop
[node-loop-uniform-v2.ts](../../../tools/topology-vscode/src/substrate/node-loop-uniform-v2.ts)
with contract tests at
[node-loop-uniform-v2.test.ts](../../../tools/topology-vscode/test/contracts/node-loop-uniform-v2.test.ts).
23 contract tests green across wire-loop, pause-controller, and
node-loop-v2; vocab lint clean; LOC budget clean (module 94 LOC). No
production caller yet — substrate modules are leaf. Branch not ready
to merge.

## Read first

1. [MODEL.md](../../../MODEL.md) — substrate is timing-free; renderer
   owns pacing. Banned vocabulary list still applies.
2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md) —
   the decided model: forever-loops per node and per wire, line-level
   pause, state-change events, no durations in substrate.

Run `node tools/topology-vscode/scripts/check-substrate-vocab.mjs`
before commits.

## Next concrete step — Step 4: renderer adapter

Implementation order in `handoff-substrate-iteration.md` lists step 4
as: renderer adapter subscribes to substrate events (wire + node) and
plays them back at human-read speed, preserving order and causal
structure. Substrate stays timing-free per MODEL.md — pacing lives in
the renderer, not the substrate.

Open questions to resolve before coding:
- Single merged event stream vs. two subscriptions (wire + node)?
  Both currently share the `nextSeq()` ordinal so a merge is trivial.
- Where the adapter lives (webview-side module vs. extension-host
  shim) and how it gets the wire/node handles.
- Minimum visible state set the renderer needs to draw (likely:
  per-wire `empty | carrying`, per-node `parked-input | running |
  parked-output | parked-ack`).

Do not start step 4 by porting any tick/duration vocabulary into the
substrate. If the design seems to require that, name the gap to David
first — see "Refuse cheap alternatives" below.

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
