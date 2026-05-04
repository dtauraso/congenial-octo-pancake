# Phase 6 — node motion (state-derived; record-mode-lite for paused drag)

**Cap:** ~2.5 (risk to ~4) + ~⅜ tests. **$ extra-usage est:** ~$225 (range $115–$400, 1.5× UI-iteration heavy: keyframe interpolation + record-mode); risk-case ~$360 (up to ~$560). Rebudget after Phase 5.5.

## Re-framing (post Phase 5.5)

The original Phase 6 plan was *keyframes-at-time-t* — `positionKeyframes`
on the spec, a renderer that tweens between them, and a record-mode that
writes a new keyframe when the user drags at non-zero playhead. Phase 5.5
removed the master clock that made "time-t" meaningful, so keyframes
have no anchor to interpolate against.

**Replacement model:** node motion is a *derived view of simulator state*.
A motion-bearing handler (currently `Partition`) writes `state.dx` /
`state.dy` on each fire; `AnimatedNode` reads `world.state[id]` on every
fire event and tweens a CSS transform over the current `tickMs`. Nothing
in the spec describes a *trajectory*; the trajectory is whatever the
handler produces from `(state, input, props)`. `topogen` is unaffected
because the handlers live in the simulator, not the codegen path.

**Record-mode-lite:** in this model, "drag a node at the playhead" can't
mean "edit a keyframe" because there are no keyframes. Re-framed: drag
during pause edits the *rule that produces motion*, not a position.
Concretely, paused-drag on a motion-bearing node writes
`props.slidePx` / `props.slideDy` (the per-phase slide vector) instead
of base x/y. Non-motion nodes keep the old behavior — drag updates
`spec.nodes[i].x/y` and posts a save.

## Chunks

- **Chunk A — state-derived node motion ($2.50, commit `a6bbb42`).**
  Partition handler writes `state.dx` per phase advance using
  `props.slidePx` (default 30). `AnimatedNode` subscribes to fire events,
  reads `world.state[id]`, applies CSS `transform: translate(dx, dy)`
  with a `transition` paced at `getTickMs()`. `AnimatedEdge` pulse
  duration paced at `clamp(tickMs * 1.2, 200, 1200)` so per-tick visuals
  stay coherent across speed slider changes. Adapter round-trips
  `node.state`.

- **Chunk B — record-mode-lite paused drag ($1.37, commit `62ce705`).**
  `MOTION_TYPES: ReadonlySet<string>` exported from `handlers.ts`
  (sibling to `GATE_TYPES`); declares which node types route paused-drag
  to props. `onNodeDragStop` branches on `MOTION_TYPES.has(type) &&
  !isRunnerPlaying()`: writes drag delta into `props.slidePx +=` /
  `props.slideDy +=` (additive — small drags are small adjustments,
  not rule resets), keeps base x/y untouched, calls `rebuildFlow()` so
  RF re-snaps to the spec base instead of compounding with the next
  state.dx tween. Tier 3 e2e covers the gesture; Partition handler
  extended to accumulate `state.dy` symmetric to dx.

- **Chunk C — tests + docs ($1.17).**
  Tier 1 round-trip extended to cover `node.props` (sibling to the
  Chunk A `node.state` test) so save-then-reload can't silently erase
  a paused-drag gesture. Handler unit tests for `slideDy` accumulation
  and `MOTION_TYPES` membership. This document — records actuals + the
  re-framing.

## What's intentionally not in Phase 6

- **`positionKeyframes` / `endpointKeyframes` / `visibility` schema
  fields.** Dropped with the keyframes-at-time-t model; nothing in the
  current architecture would consume them.
- **Tier 2 invariant test (viewer-kind keyframes never reach topogen).**
  Moot — there are no viewer-kind keyframes. The spec/viewer split
  test that *does* matter is "props edits via paused-drag survive
  round-trip," which is covered by Chunk C.
- **Bookmarked-playhead interpolation test.** Re-framed: bookmarks
  resume the simulator at a cycle (Phase 5.5 N2), and node positions
  are whatever `world.state[id]` says at that point — there's no
  separate position cursor to desync.
- **Saved-view scoping for record-mode.** Paused-drag writes to
  `spec.nodes[i].props`, which is global to the spec; saved views
  scope viewer state, not spec edits. If a "drag scoped to this saved
  view" gesture is ever wanted, it's a separate phase.

## Risk surface that turned out not to bite

- Drag math against `state.dx` (would the dragged-to position
  compound?). Resolved by `rebuildFlow()` after the props edit:
  RF re-renders from spec, base x/y unchanged → node visually returns
  to base, then state.dx tween reapplies on next fire.
- Distinguishing the gesture from a normal drag. Resolved by
  `!isRunnerPlaying()` alone — no modifier key needed; the runner's
  default-paused state means most editor sessions are already in the
  "this drag is a rule edit" mode.

## Actuals

| Chunk | Commit | $ | vs est |
|---|---|---|---|
| A — state-derived node motion | `a6bbb42` | $2.50 | $2–3 est |
| B — record-mode-lite paused drag | `62ce705` | $1.37 | $1.5–3.5 est (under) |
| C — tests + docs | `pending` | $1.17 | $1–2 est |

**Phase 6 total: $5.04** (A+B+C), inside the recalibrated $6–9 band.
