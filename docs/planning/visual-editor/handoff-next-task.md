# Handoff — Next task (START HERE)

**State:** `task/node-ticks`. Steps 1–5 of the substrate iteration plan
landed. Option-2 integration has begun: step 6 (host-shim leaf
composition) is in. Frame schema decided —
[host-shim.ts](../../../tools/topology-vscode/src/host-shim/host-shim.ts)
exports `PacedFrame<V>`: per-wire `empty | carrying(value)` and
per-node `parked-input | running | parked-output | parked-ack`. Two
independent subscriptions feed the step-4 adapter and step-5 recorder
via `composeShim()`. Contract tests at
[host-shim.test.ts](../../../tools/topology-vscode/test/contracts/host-shim.test.ts).
All six leaf modules (wire-entity / pause-controller / node-loop /
adapter / recorder / host-shim) have no production callers yet.
121 contract tests green; only the two pre-existing reds remain.

## Read first

1. [MODEL.md](../../../MODEL.md) — substrate is timing-free; renderer
   owns pacing. Banned vocabulary list still applies.
2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md) —
   forever-loops per node and per wire, line-level pause, state-change
   events, no durations in substrate.

Run `node tools/topology-vscode/scripts/check-substrate-vocab.mjs`
before commits. Pacing-related vocab (`setTimeout`, `schedule`) is
banned only inside `src/substrate/`. The renderer adapter and host
shim live outside `src/substrate/` for that reason — do NOT move them
back, and do NOT add them to `LEGACY_SKIP`.

## Decisions locked this session

- **Event plumbing:** two independent subscriptions (adapter +
  recorder); `composeShim()` fans out, not a merged stream.
- **Frame schema:** per-wire `empty | carrying(value)`, per-node
  four-state. `loaded-outputs` is invisible; the next event flips it.

## Next concrete step — step 7: wire shim into extension host

Run the substrate in the extension host, register adapter + recorder
via `composeShim()`, forward paced `PacedFrame<V>` payloads to the
webview as a new host→webview message. Specifically: (1) add `frame`
to `src/messages.ts` (Maps → arrays of pairs; JSON-serializable
values); (2) host runner constructs wires + node loops from the
topology JSON and posts paced frames; (3) webview becomes a dumb
renderer painting wire/node states; (4) pick legacy coexistence —
flag-gated A/B or hard `LEGACY_SKIP` cutover. Resolve (4) with David
before writing the wiring.

Friction the step resolves: legacy `Pulse[]` per-edge can hold >1
pulse on a wire. Step-1 wire-entity throws on load-non-empty, so a
shim-driven editor makes the multi-pulse case impossible by
construction. Do NOT cap `Pulse[]` in the legacy renderer as a cheap
fix (preserves the wrong model — see
`feedback_derive_model_from_visual_spec.md`).

Open question to resolve before coding: legacy coexistence strategy
(flag-gate vs. hard cutover). Both touch `extension.ts` and the
webview entry differently.

## Decided previously, still hold

- Halt/resume on the substrate, not the wire (line-level via shared
  `PauseSignal`; controller is `createPauseController()`).
- Legacy runtime stays a working museum; ports retire one
  `LEGACY_SKIP` entry at a time.
- `send()`/`load()` on a non-empty wire **throws**. No queue, no
  overwrite.
- Renderer adapter and host shim live outside `src/substrate/` so the
  vocab lint can keep substrate timing-free.

## Refuse cheap alternatives

`feedback_derive_model_from_visual_spec.md` and MODEL.md catch
"smallest diff preserves wrong model." Examples to refuse: step-
duration awaits in substrate; capping `Pulse[]` in the legacy
renderer to mask multi-pulse-on-a-wire; merging adapter + recorder
into a single stream "to save a subscription" (decision was two).

## Pre-existing red tests / housekeeping

- Reds: `shape-d-cycle.test.ts`, `handle-load-repro.test.ts`.
- Unstaged: `topology.json`, `topology.view.json`. Branch is ahead
  of `origin/task/node-ticks`.
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
