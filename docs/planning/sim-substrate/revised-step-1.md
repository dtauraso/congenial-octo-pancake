---
name: revised-step-1
description: Revised port-plan step 1 — replace global scheduling (event bus, sim clock, pulse-concurrency ledger) with per-edge Wire objects, taking chan-anim/chan-wire as the literal spec.
---

# Revised step 1 — Wires, not a shared bus

## Why this revision exists

The original step 1 (commit f72e7ca, refined through d7983ab) stood
up a substrate that animates a 2-node topology, but it did so by
subscribing to the **legacy global event bus** (`sim/event-bus`) and
sharing the **legacy sim clock** (`legacyRunnerState`) and
**pulse-concurrency ledger** (`_resetPulseConcurrency`). The chan
sketches do not have any of those. They have `sender → wire →
receiver`, point-to-point, with the wire holding the pending value.

Layering on global scheduling produced the stuck-pulse-on-load class
of bugs: shared mailboxes mean shared bug surface, and React
StrictMode re-mounts of `AnimatedEdge` re-subscribed to the bus,
delivering tokens to disposed listeners. The dedup in `_handle-load`
was masking, not fixing, this shape.

This revision replaces the bus with `Wire` objects. After it lands,
the legacy runner, event bus, sim clock, and pulse-concurrency
ledger are all candidates for deletion (step 6 work pulled forward).

## What "Wire" means

A `Wire` is the runtime object for one edge. It owns:

- `cap` (0 for unbuffered, matches the chan-wire decision).
- `pending`: the value currently traversing the wire, or `null`.
- `state`: `idle | inFlight | full` (cap=1) — directly what
  chan-wire.html visualises.
- `onArrive`: callback the receiver registers; fires when the value
  reaches the receiver end.
- `send(value)`: called by the sender; resolves when receiver acks.

No global registry. The graph builder hands each node its inbound
and outbound `Wire`s by reference. The visual layer reads `Wire`
state directly to animate.

## What gets deleted (or stops being load-bearing)

- `sim/event-bus.ts` — `subscribe`/`notify`/`notifyState` go away
  for the substrate path. The legacy runner can keep its copy until
  step 4–5 retire it.
- `legacyRunnerState.{playing, simSegmentStartWall, simAccumMs}` —
  the substrate gets its own clock (or no clock; arc duration is a
  property of the wire, not a global).
- `_resetPulseConcurrency` — no shared visual-slot ledger; each
  Wire owns its own slot by construction (cap=0/1).
- `nextPulseId` — Wires don't need globally unique pulse ids; the
  wire IS the identity.

## Visual layer changes

`AnimatedEdge` no longer subscribes to a bus. Instead it receives
its `Wire` (through React Flow edge data or a context) and renders
based on `wire.state` + `wire.pending`. The traversal animation is
driven by the wire's own arc timer, not by a global clock.

This is the smaller AE rewrite — most of its geometry/SVG code is
unchanged. What changes is the data source: prop/context instead of
`subscribe(callback)`.

## Scope of this revised step 1

In:
- Define `Wire` (cap, pending, state, send/ack).
- Wire builder: walk spec, instantiate one `Wire` per edge,
  hand them to nodes.
- Substrate runtime: each node is a goroutine-like loop that reads
  inbound, writes outbound. For the trivial Input→ReadGate topology
  this is two loops.
- Rewire `AnimatedEdge` to read from its `Wire`.
- Toolbar play/pause toggles a per-runtime flag (no legacy clock
  coupling).

Out (deferred to later steps):
- Multiple inhibitor chains, partition logic, anything past the
  trivial topology.
- Deleting the legacy runner files (steps 4–5 do that as nodes port
  over).
- Deleting the legacy event bus (legacy runner still needs it until
  retired).
- Per-node running indicator + reloop glyph (that was old step 2;
  moves to **revised step 2**, unblocked once Wires animate).

## Cost estimate

~$40–80. Bigger than original step 1's ~$15 because:
- AE rewrite (smaller than feared, but real).
- Wire abstraction is new code, not reuse.
- Two parallel substrates (legacy still alive on no-match path)
  means careful gating in `_handle-load`.

Cheaper than steps 4–5 combined because the topology stays trivial
and we don't port any real node types yet.

## Validation

Same as original step 1 plus:
- Cold-open animates without the dedup guard (already true post
  7c59101, but the test now is "no global bus involved at all").
- Renaming a node (which fires `load`) does not stall — proves the
  new wiring is remount-safe by construction, not by guard.
- Stop the substrate, restart: clean, no ledger leak.

## Open questions

- **Does the Wire own its arc timer, or does the visual layer?**
  Sketches put the timer on the wire (chan-anim's 720-step
  traversal). Going with that unless it makes R5 awkward.
- **How does pause work?** Either the Wire freezes mid-arc (visual
  state captured) or the runtime stops calling `send`. Probably the
  latter is simpler — the in-flight pulse completes its arc, then
  no new sends until resume. Decide during implementation.
- **React Flow edge data vs. context?** Context is cleaner; edge
  data is what RF expects. Lean context, fall back to edge data if
  RF fights us.
