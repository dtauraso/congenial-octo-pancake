# Handoff — Next task (START HERE)

**State:** `task/node-ticks`. Steps 1–6 + 7a + 7b + 7c done. Step 7c
landed this session (commit `168645e`). New
[frame-store.ts](../../../tools/topology-vscode/src/webview/frame-store.ts)
(useSyncExternalStore bridge; `active` flips true on first frame);
`main.tsx` routes `frame` msgs in; `AnimatedEdge.tsx` paints per-wire
empty/carrying (tinted stroke + value chip); `AnimatedNode.tsx` paints
per-node four-state (fill+border). Legacy pulse rendering suppressed
by `!frameMode &&` guards while flag is on; flag-off byte-identical.
309 contract tests green; same two pre-existing reds.

**Decision locked:** painter REPLACES the legacy renderer on the same
canvas while the flag is on. Not an overlay.

**Not yet proof-out:** the painter has not been driven through VS Code
on a real topology. Code-complete; visual verification is the next
move before flipping the default.

## Read first

1. [MODEL.md](../../../MODEL.md) — substrate timing-free; banned vocab.
2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md) —
   forever-loops, line-level pause, state-change events.

Run `node tools/topology-vscode/scripts/check-substrate-vocab.mjs`
before commits. `setTimeout`/`schedule` banned inside `src/substrate/`
only; adapter + host-shim + extension helper + frame-store live
outside for that reason — do NOT move back or `LEGACY_SKIP`.

## Decisions locked across step 7

- **Event plumbing:** two independent subscriptions; `composeShim()`
  fans out, not a merged stream.
- **Frame schema:** per-wire `empty | carrying(value)`, per-node
  four-state. `loaded-outputs` invisible; next event flips it.
- **Frame message:** `FrameMsg` in `messages.ts`; serializer in
  `host-shim/serialize-frame.ts`. Maps → pair arrays.
- **Legacy coexistence:** flag-gated A/B on
  `topology.frameRendererEnabled` (default off). Painter replaces
  legacy on the same canvas while flag is on (7c decision); flag-off
  keeps legacy serving — do NOT delete or `LEGACY_SKIP` it.
- **7b/7c node behavior:** identity broadcast `(vals) => outputs.map(
  () => vals[0])`. Source-only nodes skipped without throwing. Richer
  kinds (and-gate, latch, …) land in 7d.

## Next concrete step — proof-out + decide on 7d

1. Open the topology tab on a real spec.
2. Flip `topology.frameRendererEnabled` on; reload webview if needed.
3. Verify: empty edges dim, carrying edges full-opacity with chip
   at midpoint; node fill+border cycles `parked-input` → `running`
   → `parked-output` → `parked-ack`; no legacy pulses bleed through.
4. If proof-out passes: flip flag default; update CLAUDE.md / README.
5. If friction: log to [session-log.md](session-log.md). Candidates:
   chip vs `EdgeLabels` overlap; four-state legibility; identity-
   broadcast too thin → tee up **7d (richer node kinds)**.

Friction reminder: legacy `Pulse[]` per-edge can hold >1 pulse.
Step-1 wire-entity throws on load-non-empty, so shim-driven editor
makes multi-pulse impossible by construction. Do NOT cap `Pulse[]`
in the legacy renderer (preserves wrong model — see
`feedback_derive_model_from_visual_spec.md`).

## Decided previously, still hold

- Halt/resume on the substrate, not the wire (line-level via shared
  `PauseSignal`; controller is `createPauseController()`).
- Legacy runtime stays a working museum; ports retire one
  `LEGACY_SKIP` entry at a time.
- `send()`/`load()` on a non-empty wire **throws**. No queue, no
  overwrite.
- Renderer adapter, host shim, frame-store live outside
  `src/substrate/` so the vocab lint can keep substrate timing-free.

## Refuse cheap alternatives

Per `feedback_derive_model_from_visual_spec.md` + MODEL.md, refuse:
step-duration awaits in substrate; capping `Pulse[]` in legacy
renderer; merging adapter + recorder into one stream; baking frame
state into edge `data` via a re-decorate path (frame-store
subscription is the right plumbing).

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
