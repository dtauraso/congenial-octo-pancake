# Handoff — Next task (START HERE)

**State:** `task/node-ticks`. Steps 1–4 of the substrate iteration plan
landed: wire forever-loop, shared
[pause-controller.ts](../../../tools/topology-vscode/src/substrate/pause-controller.ts),
uniform node loop
[node-loop-uniform-v2.ts](../../../tools/topology-vscode/src/substrate/node-loop-uniform-v2.ts),
and now the renderer adapter
[renderer-adapter.ts](../../../tools/topology-vscode/src/renderer/renderer-adapter.ts)
with contract tests at
[renderer-adapter.test.ts](../../../tools/topology-vscode/test/contracts/renderer-adapter.test.ts).
117 contract tests green; vocab lint clean; LOC budget clean. No
production callers — all four modules are leaf. Branch not ready to
merge.

## Read first

1. [MODEL.md](../../../MODEL.md) — substrate is timing-free; renderer
   owns pacing. Banned vocabulary list still applies.
2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md) —
   forever-loops per node and per wire, line-level pause, state-change
   events, no durations in substrate.

Run `node tools/topology-vscode/scripts/check-substrate-vocab.mjs`
before commits. Note: pacing-related vocabulary (`setTimeout`,
`schedule`) is banned only inside `src/substrate/`. The renderer
adapter lives in `src/renderer/` for exactly this reason — do NOT
move it back under substrate/, and do NOT add it to `LEGACY_SKIP`.

## Friction logged this session

In the legacy ticked path, pressing Step can put >1 pulse on the same
wire. `_use-pulse-lanes.ts` keeps `Pulse[]` per edge and the legacy
simulator doesn't enforce single-slot. The step-1 wire-entity throws
on load-non-empty, so wiring the editor through steps 1–4 makes this
impossible by construction. This is the motivating example for the
host-shim integration below; do NOT cap pulses in the legacy renderer
as a cheap fix (preserves the wrong model — see
`feedback_derive_model_from_visual_spec.md`).

## Next concrete step — pick one with David

(a) **Step 5: recorder.** Second event subscriber, independent leaf
    module, same shape as the adapter. Appends `(seq, event)` to an
    in-memory log; exposes `snapshot()` and `clear()`. Contract tests:
    captures every event, preserves seq order, multi-source merge.
    Cheap and parallel-safe with adapter work.

(b) **Option-2 integration: host shim.** Run the substrate in the
    extension host, pipe wire+node events through the step-4 adapter,
    forward paced frames over the existing extension↔webview message
    bus to a dumb renderer. Bigger commit — forces a paced-frame
    schema and a strategy for retiring (or coexisting with) the
    legacy ticked path that currently drives the webview. Resolves
    the multi-pulse friction.

Open questions still pending for (b): single merged event stream vs.
two subscriptions; minimum visible state set the renderer needs
(per-wire `empty | carrying`, per-node `parked-input | running |
parked-output | parked-ack`). Do NOT start (b) by porting tick or
duration vocabulary into the substrate.

## Decided previously, still hold

- Halt/resume on the substrate, not the wire (line-level via shared
  `PauseSignal`; controller is `createPauseController()`).
- Legacy runtime stays a working museum; ports retire one
  `LEGACY_SKIP` entry at a time.
- `send()`/`load()` on a non-empty wire **throws**. No queue, no
  overwrite.
- Renderer adapter lives outside `src/substrate/` so the vocab lint
  can keep substrate timing-free.

## Refuse cheap alternatives

`feedback_derive_model_from_visual_spec.md` and MODEL.md catch
"smallest diff preserves wrong model." Examples to refuse: step-
duration awaits in substrate; capping `Pulse[]` in the legacy
renderer to mask multi-pulse-on-a-wire. Name the gap to David before
writing code if a request seems to need banned vocabulary.

## Pre-existing red tests / housekeeping

- Reds: `shape-d-cycle.test.ts`, `handle-load-repro.test.ts`.
- Unstaged: `topology.json`, `topology.view.json`. Branch 6 commits
  ahead of `origin/task/node-ticks`.
- Branch name `task/node-ticks` misleading (global tick gone) —
  rename on next branch, not this one.

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
