# Substrate model

Read this before changing anything in `tools/topology-vscode/src/substrate/`,
the wire primitive, or anything that schedules/orders work. If your
reasoning slips into banned vocabulary (below), you are in the wrong frame.
Stop, re-read this file, and re-derive from the model.

## The model (David's words)

- **The substrate owns the tick.** A tick is a round number — an ordinal
  count, not a slice of wall-clock time. Tick N happened, then N+1
  happened. There is no "during" a tick from the substrate's view.
- **One tick** = every node runs one round, and any pulse a node emits
  travels its wire to the destination within that round.
- **The wire is a first-class entity.** A wire owns its phase:
  `empty | loaded(v) | taken(v)`. Not a queue, not a buffer, not a
  length. One value or none. The three phases match the wire loop's
  own await points — source loads, destination takes, source is
  acked (returning the wire to `empty`). Phase is ordinal, not timed:
  `loaded` happened, then `taken` happened, then `empty`. No "during."
- **Geometry sets `loaded` traversal time; otherwise cosmetic.** Path
  length and routing of a wire set how long that wire stays in
  `loaded(v)` before `taken(v)` is allowed: `loadedTime = arcLength /
  pulseSpeed`. Geometry has no other effect on substrate state — it
  does not change values, tick ordinality, or which nodes are wired
  to which. If geometry changes while a wire is `loaded`, the
  remaining traversal time is re-derived from the new arc length and
  the distance already covered.
- **The substrate halts, resumes, and waits for `loaded` traversal.**
  That is all. The only duration the substrate tracks is the per-wire
  `loaded` traversal time defined above. It does not schedule
  arbitrary work, does not time nodes, and does not track any other
  durations.
- **The renderer animates.** It owns pixels and motion. It plays out
  every `loaded(v)` the substrate has decided — to completion, in
  order, never dropping one.
- **One renderer→substrate signal: take.** The single back-channel
  from renderer to substrate is "take this wire's loaded value,"
  which advances `loaded(v) → taken(v)`. The renderer decides when
  to emit it based on the destination's policy (below). The
  substrate does not distinguish the source — one signal, one
  meaning.
- **Destination policy: auto vs. manual-take.** A destination node
  is either *auto* or *manually-gated*. For auto destinations the
  renderer emits take on animation completion (recovering the
  original behavior). For manually-gated destinations the renderer
  emits take on user click; the wire stays in `loaded(v)` across
  tick boundaries until that click arrives. Animation completion is
  renderer-internal in this case, not a substrate event.
- **Tick close is event-driven, not time-driven.** A round ends when
  every wire has cycled through `loaded → taken → empty`. The
  substrate observes this; it does not schedule it. A round in
  `loaded(v)` waiting for take continues to wait — halt/resume does
  not abort it.

## Banned vocabulary (in substrate context)

If you find yourself writing or reasoning with these words while
working on the substrate, you have drifted:

- duration, ms, milliseconds, seconds — **except** the one allowed
  duration: a wire's `loaded` traversal time derived from geometry.
- speed, px/ms, pixel rate — **except** the single global pulse speed
  constant used to derive `loaded` traversal time.
- schedule, scheduler, deadline, timeout, setTimeout, setInterval
- wall-clock, Date.now, performance.now (for substrate scheduling;
  the renderer may still use `performance.now` for animation)
- "tick takes X", "tick boundary at Y", "tick duration"
- "renderer signals complete" applied to anything other than the one
  permitted signal: take, ending the `loaded` phase
- inbox queue, edge queue, slot ledger, buffered values

These belong to the renderer or to legacy code that is being retired.
None of them describe the substrate.

## Allowed vocabulary

- tick (ordinal), round, step
- empty, loaded(v), taken(v)
- halt, resume, snap
- arc length, pulse speed, loaded traversal time (the one permitted
  duration)
- take (the one permitted renderer→substrate signal)
- auto destination, manually-gated destination, destination policy
- node runs, wire loads, destination takes, source acks
- arrives, observes

## React surface realization

The webview realizes the substrate as React components — substrate
state IS React state. A wire's phase is not mirrored from elsewhere;
it lives in React. No store adapter, no frame protocol, no transition
detector.

- **`<Wire>`** owns its phase in a reducer keyed on allowed
  transitions (invalid transitions unrepresentable). Exposes
  `load(v)`, `take()`, `ack()`. On entering `loaded(v)` a
  `useEffect` launches a RAF pulse animation using arc length and
  the global pulse-speed constant. Animation completion fires a
  local callback; whether it calls `take()` is the destination's
  concern. The wire is unaware of policy.
- **`<Node>`** owns its `run()`, output-wire refs, and any
  per-node affordances. Manual-take destinations render an
  affordance whose click invokes `take()` on the input wire; it is
  armed iff that wire's phase is `loaded(v)` (a direct read of
  phase state, not a frame snapshot).
- **`useTickDriver`** at the topology root owns the ordinal tick
  count and `halted` flag. Per round: walk nodes once calling
  `run()`, observe wire cycle completion, increment tick. Step
  advances one round even when halted. Schedules nothing on
  wall-clock time.
- **Geometry change while `loaded(v)`** re-runs the animation
  effect; `distanceCovered` is held in a ref (preserved across
  geometry changes), and the RAF loop resumes at
  `distanceCovered / newArcLength`. If `newArcLength` shrinks below
  `distanceCovered`, the pulse clamps and the completion path runs
  immediately. Phase, value, and tick ordinal are unaffected by
  geometry in `empty` or `taken(v)` phases.
- **Bridge surface** carries spec I/O only — `ready`, `spec`,
  `view`, `save`, `view-save`, optionally `topogen-status`.
  Nothing about ticks, phases, animation, or controls crosses.

## Why this file exists

The same model gap has been routed around through 5–7 substrate
rewrites. Each rewrite imported industry-default timing vocabulary
(game loops, schedulers, animation frames) and treated wires as
plumbing. That is the **wrong answer for the substance** of this
project (see CLAUDE.md "Medium vs. substance"). This file pins the
model so a fresh AI session cannot launder it back into a
conventional frame.

If a request seems to require banned vocabulary to fulfill, the
request is in the wrong frame — name the gap explicitly to David
before writing code. Do not substitute a near-miss.
