---
name: revised-step-2
description: Revised port-plan step 2 — per-node running indicator + reloop glyph, drawn for the first time on the wire-based substrate.
---

# Revised step 2 — Per-node running indicator + reloop glyph

## Why this step exists

Revised step 1 made each node a per-edge async loop driven by its
inbound/outbound `Wire`s. Loops are now real, but invisible — the
renderer animates the *wires* (chan-anim style) and not the *nodes*.
Step 2 makes the per-node loop legible: you can see which nodes are
ticking, when they re-enter their loop, and (later, once topologies
have cycles) which nodes are reloop-ing through repeated work.

This is the first time the indicator is drawn at all — the rebuild
plan has prose only, no chan sketch. So this step is partly a design
spike: pick the visual vocabulary, lock it in for later steps.

## What "running indicator" means

Two distinct visuals on the same node:

1. **Running indicator** — the node is alive (its loop is iterating).
   Steady-state visual; on while the loop is running, off when it has
   stopped (or hasn't started). Think "power LED."

2. **Reloop glyph** — the node just completed one iteration and is
   re-entering its loop. Transient visual; flashes once per loop
   iteration. Think "tick blink."

Both read off the same source: a per-node loop-tick signal. The
indicator decays slowly (or is bound to `running` boolean); the glyph
is edge-triggered on each tick.

For the trivial Input→ReadGate topology in this step:
- Input loop ticks every time it sends a value.
- ReadGate loop ticks every time it acks an arrival.
- So a 720ms arc produces one Input tick, then one ReadGate tick,
  ~720ms apart. The two glyphs should be visually distinguishable in
  motion — that's the validation.

## Decisions to lock in (proposed)

These answer the three open questions from the prior turn. Push back
on any.

### D1. Indicator renders on the React Flow node, not a side panel.

The chan-anim aesthetic is "watch the topology." A side panel would
be a second place to look. Render the indicator inside `AnimatedNode`
(or a thin sibling), positioned at a corner of the node box.

Fallback if RF makes this awkward: an SVG overlay in the same React
Flow viewport, indexed by node id. But try the in-node path first.

### D2. The signal is a per-node loop-tick event, distinct from wire state.

`subscribeWires` already publishes when wire state changes (good for
edge animation). Node ticks are a separate concern: they fire when a
*loop iteration completes*, regardless of wire transitions.

Add a sibling subscription: `subscribeNodeTicks(fn: (nodeId, kind) =>
void)` where `kind ∈ {"tick"}` for now (room to grow later, e.g.
`"reloop"` for explicit cycle re-entry once we have cycles).

`node-loop.ts` is the producer — `inputLoop` publishes a tick after
each successful `send`, `readGateLoop` publishes a tick after each
ack. The runtime owns the listener registry, mirroring `subscribeWires`.

Why a separate stream and not a payload field on the wire stream:
node ticks aren't wire transitions. Conflating them would force the
renderer to disambiguate, and would couple node liveness to wire
identity (wrong direction — a node with multiple wires has one
liveness, not N).

### D3. Glyph design: small filled dot near the node's top-right corner.

- **Running indicator**: dim outline ring, ~6px, on the node corner
  while the loop is alive.
- **Reloop glyph**: the ring fills briefly (200ms ease-out) on each
  tick, then returns to outline.

Single glyph, two states. Keeps SVG minimal (one circle element with
animated fill).

Color: borrow from `spec-colors.ts` if there's an existing accent;
otherwise pick a desaturated yellow that doesn't clash with the
existing edge stroke palette. (Defer exact color to implementation;
not load-bearing.)

## Scope of revised step 2

In:
- `subscribeNodeTicks` API in `runtime-wires.ts` (and a stub in
  legacy runner that does nothing — visual layer is shared).
- `node-loop.ts` publishes ticks after each iteration.
- `AnimatedNode` (or sibling) renders running indicator + reloop
  glyph, subscribing to node ticks.
- Contract test: starting the wires runtime causes both Input and
  ReadGate to emit ticks at the expected cadence (one per `send`
  ack cycle).

Out (deferred):
- Multi-node topologies — still trivial Input→ReadGate.
- "Reloop" as a distinct kind (vs. plain tick). Cycles don't exist
  yet on the substrate; revisit when step 4–5 ports an inhibitor
  with a feedback edge.
- Tick rate gauges, sparklines, or any aggregation. One blink per
  tick is the whole UX.

## Cost estimate

~$15–25. Smaller than revised step 1 because the substrate plumbing
already exists; this adds one signal stream, one renderer hook, and
one glyph SVG. No abstraction is being introduced for the first
time.

## Validation

- Cold-open: both nodes show running indicator immediately.
- During animation: Input glyph flashes, ~720ms later ReadGate glyph
  flashes, repeats.
- Pause: in-flight tick still flashes (one more from each side as
  the in-flight pulse completes), then no flashes until resume.
- Stop: indicators go dark.
- Contract test green: tick counts match send/ack counts.

## Open questions to resolve during implementation

- **Tick payload shape.** Just `nodeId`, or `{nodeId, ts}`? Lean
  `{nodeId, ts}` so the renderer can debounce/decay deterministically
  without `performance.now()` at the consumer.
- **Where in `AnimatedNode` does the glyph render?** Existing
  AnimatedNode geometry is unknown to me at spec time; may need a
  small refactor to make room for an overlay glyph. Keep an eye on
  the 100-LOC budget.
- **Legacy runner stub.** Does the legacy path need to publish
  ticks too (for parity), or do we accept that legacy nodes don't
  blink? Lean accept-no-blink; legacy is being retired anyway.
