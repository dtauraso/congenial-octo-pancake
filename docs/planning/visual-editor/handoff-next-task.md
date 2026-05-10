# Handoff — Next task (START HERE)

**State:** `task/node-ticks`. Steps 1–6 done. Step 7a landed this
session: `FrameMsg` host→webview message in
[messages.ts](../../../tools/topology-vscode/src/messages.ts) and
serializer at
[serialize-frame.ts](../../../tools/topology-vscode/src/host-shim/serialize-frame.ts)
(Maps → arrays of pairs, JSON-shaped). Pinned by
[serialize-frame.test.ts](../../../tools/topology-vscode/test/contracts/serialize-frame.test.ts)
(3 tests). Legacy coexistence decided: **flag-gated A/B**, not hard
cutover. Seven leaf modules; still no production callers. 303
contract tests green; same two pre-existing reds.

## Read first

1. [MODEL.md](../../../MODEL.md) — substrate timing-free; banned vocab.
2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md) —
   forever-loops, line-level pause, state-change events.

Run `node tools/topology-vscode/scripts/check-substrate-vocab.mjs`
before commits. `setTimeout`/`schedule` banned inside `src/substrate/`
only; adapter + host-shim live outside for that reason — do NOT move
back or `LEGACY_SKIP`.

## Decisions locked across step 7

- **Event plumbing:** two independent subscriptions; `composeShim()`
  fans out, not a merged stream.
- **Frame schema:** per-wire `empty | carrying(value)`, per-node
  four-state. `loaded-outputs` invisible; next event flips it.
- **Frame message:** `FrameMsg` in `messages.ts`; serializer in
  `host-shim/serialize-frame.ts`. Maps → pair arrays.
- **Legacy coexistence:** flag-gated A/B on
  `topology.frameRendererEnabled` (default off). Legacy ticked
  renderer keeps serving — do NOT delete or `LEGACY_SKIP` it.

## Next concrete step — step 7b: host-side runner

Build a flag-gated host module that, when `topology.frameRendererEnabled`
is true, drives the substrate from a parsed topology and posts
`FrameMsg` to the webview through the existing `panel.webview.postMessage`
bus in
[extension.ts](../../../tools/topology-vscode/src/extension.ts).
Pieces:

1. Sibling builder `substrate/build-wire-entities.ts` walking
   `Spec.edges` → `Map<string, Wire<unknown>>` (existing
   `build-wires.ts` is legacy chan-wire, not reusable).
2. Host orchestrator (e.g. `host-shim/run-frames.ts`) calling
   `composeShim()` with a `RendererAdapter` posting
   `serializeFrame(frame)` and a `Recorder` for trace dumps.
3. Wire into `extension.ts` behind the flag. Flag-off → legacy path
   unchanged.

Webview painter is step 7c — for 7b the consumer can be a no-op.

Friction: legacy `Pulse[]` per-edge can hold >1 pulse. Step-1
wire-entity throws on load-non-empty, so shim-driven editor makes
multi-pulse impossible by construction. Do NOT cap `Pulse[]` in the
legacy renderer (preserves wrong model — see
`feedback_derive_model_from_visual_spec.md`).

Open question for 7b: per-node behavior. Identity passthrough is the
minimum; richer kinds (and-gate, latch, etc.) can map later or throw
`unsupported-kind`. Decide before coding.

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

Per `feedback_derive_model_from_visual_spec.md` + MODEL.md, refuse:
step-duration awaits in substrate; capping `Pulse[]` in legacy
renderer; merging adapter + recorder into one stream.

## Housekeeping

- Reds: `shape-d-cycle.test.ts`, `handle-load-repro.test.ts`.
- Unstaged editor state: `topology.json`, `topology.view.json`.
- Branch `task/node-ticks` is misnamed (global tick gone) — rename
  next branch, not this one.

## ALWAYS clause

At end of session, overwrite this file (and sibling `handoff-*.md`)
with a freshly-rendered prompt for the state you're leaving and
commit on the task branch. Do not rely on chat history; next AI may
be a fresh model. The rendered handoff must contain this ALWAYS
clause so the loop self-perpetuates. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as structural source of truth. Keep each file ≤100 LOC.
