# Manual-take model

Spec for the "click → pulse finishes" redesign. Derived from
user-visible behavior, in MODEL.md vocabulary only. Compare against
[MODEL.md](../../../MODEL.md) before changing the substrate.

## Observations (user-visible)

1. Some nodes display an affordance.
2. The affordance is armed only when the node's input slot holds a value.
3. Clicking an armed affordance causes one pulse to traverse the input
   wire and arrive at the node, animated along the wire.
4. After the pulse arrives, the affordance is armed again iff another
   value is available upstream.

## Derived model

**Manual-take destination.** A node may be *manually-gated*. Its
**take** does not happen automatically inside a tick; it happens when
an external observer signals take. The wire feeding such a node stays
in `loaded(v)` across tick boundaries until that signal arrives.

**Phase progression unchanged.** When take is signaled, the wire
advances `loaded(v) → taken(v) → empty` in order, the source acks, and
the next upstream value (if any) is free to load. Phases remain
ordinal.

**Animation decoupled from take.** The renderer plays each `loaded(v)`
to completion as MODEL.md already requires. For manually-gated wires,
animation completion does **not** end the `loaded` phase. The phase
ends only when the observer signals take.

**One renderer→substrate signal: take.** The signal MODEL.md currently
names `pulse-arrived` is generalized to **take this wire's loaded
value**. The renderer decides when to emit it:

- Auto destinations: renderer emits take on animation completion.
- Manually-gated destinations: renderer emits take on user click.

The substrate does not distinguish the source. One signal, one
meaning.

## Comparison with MODEL.md

**Survives unchanged:**
- Phases `empty | loaded(v) | taken(v)`, ordinal.
- Substrate halts, resumes, waits for `loaded` traversal.
- Tick close is event-driven (every wire cycled).
- Geometry sets `loaded` traversal time; otherwise cosmetic.
- One permitted renderer→substrate signal.

**Changes:**
- The one signal is renamed/reframed: from "pulse arrival ends
  `loaded`" to "observer signals take." Auto destinations recover the
  old behavior as a special case (renderer auto-emits take on
  animation completion).
- A wire's `loaded(v)` phase may persist across tick boundaries when
  its destination is manually-gated. MODEL.md did not previously state
  this and did not forbid it.

**Newly stated:**
- A destination node's take is a first-class event, not implicit in
  the tick.
- Animation completion is renderer-internal; it is not a substrate
  event.

## Gap with current implementation

The current code routes the user click through `Wire.clear()`, a
substrate escape hatch outside the model. Three mechanisms compensate
for the missing model concept: the `ReadGate` carveout in the tick
driver, the `cleared`→`acked` frame collapse in the host-shim, and the
`ClearSlotButton` in the webview. The redesign collapses these into
one model event: *destination has manual take; renderer emits take on
click.* All three carveouts are deleted.

## Status

Spec only. Implementation lands behind a task branch. Promote this
file's content into MODEL.md once the redesign is in.
