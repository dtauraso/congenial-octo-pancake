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
  order, never dropping one. The renderer's pulse arrival is the
  signal that ends the `loaded` phase; that is the one back-channel
  from renderer to substrate.
- **Tick close is event-driven, not time-driven.** A round ends when
  every wire has cycled through `loaded → taken → empty`. The
  substrate observes this; it does not schedule it.

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
  permitted signal: pulse arrival ending the `loaded` phase
- inbox queue, edge queue, slot ledger, buffered values

These belong to the renderer or to legacy code that is being retired.
None of them describe the substrate.

## Allowed vocabulary

- tick (ordinal), round, step
- empty, loaded(v), taken(v)
- halt, resume, snap
- arc length, pulse speed, loaded traversal time (the one permitted
  duration)
- pulse arrived (the one permitted renderer→substrate signal)
- node runs, wire loads, destination takes, source acks
- arrives, observes

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
