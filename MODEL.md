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
- **Geometry is cosmetic.** Path length, snake-routing, edits to the
  drawn line affect only what is rendered. They do not affect wire
  state, tick count, or substrate correctness.
- **The substrate halts and resumes pulses. That is all.** It does not
  schedule them, time them, or wait on them. No durations are tracked
  anywhere in the substrate.
- **The renderer animates.** It owns pixels and motion. It plays out
  visible state changes the substrate has already decided. It never
  signals back to the substrate.
- **Tick close is event-driven, not time-driven.** A round ends when
  every wire has cycled through `loaded → taken → empty`. The
  substrate observes this; it does not schedule it.

## Banned vocabulary (in substrate context)

If you find yourself writing or reasoning with these words while
working on the substrate, you have drifted:

- duration, ms, milliseconds, seconds
- speed, px/ms, pixel rate
- schedule, scheduler, deadline, timeout, setTimeout, setInterval
- wall-clock, Date.now, performance.now
- "tick takes X", "tick boundary at Y", "tick duration"
- "renderer signals complete", "wait for animation"
- inbox queue, edge queue, slot ledger, buffered values

These belong to the renderer or to legacy code that is being retired.
None of them describe the substrate.

## Allowed vocabulary

- tick (ordinal), round, step
- empty, loaded(v), taken(v)
- halt, resume, snap
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
