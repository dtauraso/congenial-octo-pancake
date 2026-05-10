# Handoff — Next task (START HERE)

**State:** `task/node-ticks`. Steps 1–6 + 7a + 7b done. Step 7b
landed this session: sibling builder
[build-wire-entities.ts](../../../tools/topology-vscode/src/substrate/build-wire-entities.ts),
host orchestrator
[run-frames.ts](../../../tools/topology-vscode/src/host-shim/run-frames.ts),
and integration helper
[frame-renderer.ts](../../../tools/topology-vscode/src/extension/frame-renderer.ts)
gated on `topology.frameRendererEnabled` (default off). Per-node
behavior is identity broadcast; source-only nodes skipped (no seed
in 7b). 309 contract tests green; same two pre-existing reds.
Webview consumer is still a no-op.

## Read first

1. [MODEL.md](../../../MODEL.md) — substrate timing-free; banned vocab.
2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md) —
   forever-loops, line-level pause, state-change events.

Run `node tools/topology-vscode/scripts/check-substrate-vocab.mjs`
before commits. `setTimeout`/`schedule` banned inside `src/substrate/`
only; adapter + host-shim + extension helper live outside for that
reason — do NOT move back or `LEGACY_SKIP`.

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
- **7b node behavior:** identity broadcast `(vals) => outputs.map(()
  => vals[0])`. Source-only nodes skipped without throwing. Richer
  kinds (and-gate, latch, …) land later — likely 7d.

## Next concrete step — step 7c: webview painter

Build a webview-side consumer of `FrameMsg` that paints per-wire
`empty | carrying(value)` and per-node four-state across the
existing topology graph. The host already posts frames when the
flag is on (verify via Output → Log when toggled). Open questions
for 7c:

1. Does the painter overlay the legacy renderer on the same canvas,
   or replace it while the flag is on? Recommendation: replace, so
   we exercise the wire-entity model end-to-end and uncover
   friction the cap-`Pulse[]` cheap fix would have hidden.
2. How are values rendered on a wire — chip on the wire, color tint,
   or both? Match the legacy idiom where possible.
3. Where does the painter mount — extend the existing webview
   pipeline in `webview/` or a dedicated subscriber that listens
   for `type: "frame"` messages?

Friction reminder: legacy `Pulse[]` per-edge can hold >1 pulse.
Step-1 wire-entity throws on load-non-empty, so shim-driven editor
makes multi-pulse impossible by construction. Do NOT cap `Pulse[]`
in the legacy renderer (preserves wrong model — see
`feedback_derive_model_from_visual_spec.md`).

After 7c proves out on a real topology, evaluate flipping the
default. Until then `topology.frameRendererEnabled` stays off.

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
