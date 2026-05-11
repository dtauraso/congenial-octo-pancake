# React surface spec

How substrate primitives are realized as React components in the
collapsed (one-layer) webview. Sibling to
[manual-take-model.md](manual-take-model.md). Uses MODEL.md vocabulary
only; check against [MODEL.md](../../../MODEL.md) before changes.

## Principle

Substrate state IS React state. A wire's phase is not mirrored into
React from elsewhere — it lives in React. A phase transition is a
state update; the re-render is the substrate's observable effect. No
store adapter, no frame protocol, no transition detector.

## `<Wire>`

Owns its phase: `empty | loaded(v) | taken(v)`. Phase is held in
local React state (`useReducer` keyed on the phase transitions allowed
by the model — invalid transitions are unrepresentable).

**Methods (exposed via context or imperative handle to the wire's
source and destination):**
- `load(v)`: `empty → loaded(v)`. Throws if called on non-empty (the
  send-on-non-empty rule from the slot contract).
- `take()`: `loaded(v) → taken(v)`. Called by the destination node;
  the renderer decides when by per-destination policy (see below).
- `ack()`: `taken(v) → empty`. Called by the source node after take.

**Animation.** When the wire enters `loaded(v)`, a `useEffect`
launches the pulse animation using the wire's geometric arc length
and the global pulse speed constant. Animation completion fires a
local callback. The callback's effect depends on destination policy.

**Destination policy.**
- *Auto*: animation-completion callback invokes `take()` directly.
- *Manual-take*: animation-completion callback is a no-op for take;
  the destination node renders an affordance whose click invokes
  `take()`.

The policy is a property of the destination node, not of the wire.
The wire is unaware which it is — it always exposes `take()` and runs
its animation; *who calls `take()` and when* is the destination's
concern.

**Rendering.** The wire renders its own path (route geometry) and its
own pulse (during the `loaded` phase). React Flow provides positions;
it does not host substrate-aware children.

## `<Node>`

Owns its node-type-specific `run()` method, references to its output
wires, and any per-node affordances (manual-take button when the
input wire's destination policy is manual).

**Methods:**
- `run()`: called once per tick by the tick driver. May invoke
  `load(v)` on output wires whose phase is `empty`.
- `requestTake(wireId)`: called by a manual-take button click;
  invokes `take()` on the named input wire if its phase is
  `loaded(v)`.

The manual-take affordance is rendered only when the input wire is in
`loaded(v)`. Arming is a direct read of phase state, not a frame
snapshot.

## `useTickDriver`

The tick driver is a hook at the topology root. Owns the ordinal tick
count and the `halted` flag.

**Per round:**
1. If `halted`, do nothing.
2. Walk all nodes once, calling `run()` on each.
3. Observe wire cycle completion: the round closes when every wire
   that entered `loaded(v)` this round has returned to `empty`.
4. Increment the ordinal tick count.

**Step.** Advances the substrate by one round even when `halted`.
**Halt / resume.** Toggles the `halted` flag. Does not abort a
round in flight; a round in `loaded` waiting for take continues to
wait.

The driver schedules nothing on wall-clock time. Round close is
event-driven: it observes the wires.

## `<TransportControls>`

Reads `halted` and `tick` from the driver's context; calls
`halt`/`resume`/`step` directly. No postMessage, no commands.

## Behavioral traces

### Pulse animation (one cycle)

1. `empty → loaded(v)`. Source node's `run()` calls `wire.load(v)`.
   The wire's reducer dispatches LOAD; phase becomes `loaded(v)`.
2. Render. `<Wire>` re-renders. The `loaded` branch includes a pulse
   element positioned along the path.
3. Effect fires. A `useEffect` keyed on phase reads the rendered
   path's arc length, derives `loadedTime = arcLength / pulseSpeed`,
   captures a sim-start reference (renderer-local clock), and starts
   a RAF loop.
4. RAF. Each frame, the loop computes fractional distance covered
   and updates the pulse's position along the path. Distance covered
   is held in a ref so it survives geometry changes.
5. Completion. When the fractional distance reaches 1, the loop
   stops. The completion callback's effect depends on destination
   policy:
   - Auto: calls `wire.take()` directly. Phase → `taken(v)` → source
     `ack()` → `empty`. Pulse element unmounts on re-render.
   - Manual-take: callback does nothing about take. Pulse rests
     visually at the destination end. The destination node's button
     is now armed (phase === `loaded(v)`); a click invokes
     `wire.take()` and the same `taken → empty` cycle runs.

No frame protocol, no transition detector, no postMessage step
involved.

### Geometry change while `loaded`

React Flow owns node positions. When a node is dragged, the wire
receives new source/target coordinates as props and re-renders. The
phase reducer is unaffected.

- Phase `empty` or `taken(v)`: only the rendered path changes.
- Phase `loaded(v)`: the animation effect re-runs because geometry
  props changed. It reads `distanceCovered` from its ref (preserved,
  not re-zeroed), re-derives `newArcLength` from the new path, and
  resumes the RAF loop at fractional position
  `distanceCovered / newArcLength`. Remaining loaded traversal time
  is `(newArcLength - distanceCovered) / pulseSpeed`. This matches
  MODEL.md: "If geometry changes while a wire is loaded, the
  remaining traversal time is re-derived from the new arc length
  and the distance already covered."

Edge cases:
- Drag during animation: pulse continues smoothly along the new path;
  no teleport.
- Drag that shrinks `newArcLength` below `distanceCovered`: pulse
  clamps to the destination and the completion path runs immediately
  — `take()` for auto, button armed for manual.
- Drag during `taken(v)` or `empty`: pure repaint; phase, value, and
  tick ordinal are unaffected. Geometry is cosmetic in these phases.

## Bridge surface (unchanged from minimal floor)

Webview ↔ extension carries spec I/O only:
- `ready` (out), `spec` (in), `view` (in), `save` (out),
  `view-save` (out), optionally `topogen-status` (in). Nothing about
  ticks, phases, animation, or controls crosses.

## Status

Spec only. Implementation lands on the existing
`task/collapse-to-one-layer` branch in steps 2–7 of the
what-needs-to-happen chain. Promote into MODEL.md once landed.
