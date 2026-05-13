# Substrate model

Read this before changing anything in `tools/topology-vscode/src/substrate/`,
the wire primitive, or anything that schedules/orders work. If your
reasoning slips into banned vocabulary (below), you are in the wrong
frame. Stop, re-read this file, and re-derive from the model.

The pivot from earlier substrate versions: the `<Wire>` no longer owns
a parked slot. The wire is transient — it carries a value to the
destination and becomes empty on arrival. The slot lives on the
destination node. Source nodes observe destination slot phase
directly, not through wire phase.

## What things are

- **Node.** Owns its firing rule, its output references (each = a
  pointer to a destination node + that destination's slot id), and a
  map of input slots indexed by slot id. Slots are the node's own
  state. A node's identity *is* its firing rule (e.g. ReadGate's
  identity is AND-of-3-slots; XOR's is inequality).
- **Slot.** A per-input cell on a destination node. Phase:
  `empty | filled(v) | consumed`. Phase is ordinal: filled happened,
  then consumed happened. No "during."
- **Wire.** Transient delivery + visual depiction. Phase:
  `empty | in-flight(v) | empty`. The wire carries a value from
  source to the destination's slot and then becomes `empty` again.
  The wire owns no parked state, no ack, no take.

## Who does what

- **Source node loads** by calling `dest.fill(slotId, v)` through its
  output reference. The wire enters `in-flight(v)` and animates. On
  animation completion the wire writes
  `dest.slot[slotId] = filled(v)` and returns to `empty`.
- **Source node observes readiness** by reading
  `dest.slotPhase(slotId)` directly through its output reference. It
  is free to load again when that returns `empty`. No wires involved
  in this observation. Backpressure lives in the slot's empty/filled
  state, observed by the source.
- **Destination node consumes** its own slot by transitioning
  `filled(v) → consumed → empty`. Consumption is local: the firing
  rule reads the node's own slot map, decides to fire, transitions
  its slots, and calls `fill` on its own outputs.
- **Auto vs. manually-gated destinations.** An auto destination's
  firing rule fires the moment its precondition holds (e.g. all
  slots filled). A manually-gated destination's firing rule
  additionally waits for a user click. The slot stays `filled(v)`
  until the rule fires.

## Geometry and time

- Wire geometry sets `in-flight(v)` traversal time:
  `inFlightTime = arcLength / pulseSpeed`. No other substrate effect.
- Geometry change while `in-flight(v)` re-derives remaining traversal
  time from new arc length and distance already covered. If the new
  arc length is below distance covered, the wire completes
  immediately (writes the slot).
- Phase is otherwise ordinal. The substrate tracks no other
  durations.

## Ticks and stepping

A tick is one cohort of edges that had activity at the same moment —
see [diagrams/model-revised-draft/13-tick-as-edge-cohort.svg](diagrams/model-revised-draft/13-tick-as-edge-cohort.svg).
The tick is observable in the edges themselves, not stored on any
node. Counting ticks is counting the simultaneity layers of a
cascade. This definition is intrinsic to the activity: it needs no
walker, no coordinator, no global ID, and no node-side bookkeeping.

**Driver: self-scheduling nodes + one global play/pause gate.** Nodes
fire when their preconditions hold; a single global gate halts or
starts every node at once. No central walker.

**Cohort enumeration is the step axis.** The regular animation loop
assigns each wire its cohort number at wire-time (max predecessor
cohort + 1), maintaining a cohort → wires registry as a side product
of normal wiring — see [diagrams/model-revised-draft/14-step-budget.svg](diagrams/model-revised-draft/14-step-budget.svg).
"Step N" is a pure lookup: the gate releases only wires tagged cohort
N. Random-access stepping over the cohort axis.

## Firing rule and slot writes

A wire's destination is `(node N, slot s_k)`, established at
construction time. On arrival, the wire carries its bound slot id;
the destination node sees the id and writes `slots[s_k] := filled(v)`
and re-evaluates its rule over the slot map — see
[diagrams/model-revised-draft/07-q2-firing-rule-and-slot-ownership.svg](diagrams/model-revised-draft/07-q2-firing-rule-and-slot-ownership.svg).
One incoming wire per slot id — two wires cannot share a slot, so
"right slot ↔ right wire" is deterministic by construction.
Mis-wiring is caught at parseSpec, not at runtime. No subscription
layer; slots are passive state.

## Tick close

A round ends when every wire is `empty` AND every node's firing rule
has had the chance to run on its current slot state. The substrate
observes this; it does not schedule it. A slot in `filled(v)` waiting
for a manually-gated destination continues to wait — halt/resume does
not abort it.

## React surface realization

- **`<Wire>`** renders the SVG path and runs the RAF pulse animation
  while in `in-flight(v)`. Exposes no `load`/`take`/`ack`. Its only
  substrate side-effect is calling `dest.fill(slotId, v)` on
  animation completion. Wire renders only the in-flight pulse; it is
  empty before and after arrival.
- **`<Node>`** owns its slot map, exposes `slotPhase(slotId)`,
  `fill(slotId, v)`, and its firing rule. The parked value renders
  on the destination's input port (small indicator that fills when
  the slot is `filled(v)`) — see [diagrams/model-revised-draft/05-q3-slot-visual-depiction.svg](diagrams/model-revised-draft/05-q3-slot-visual-depiction.svg).
  Manually-gated nodes render a take affordance whose click invokes
  the firing rule with the user-gate satisfied.
- **Global gate** halts or starts every node at once. Cohort registry
  maps step N → wires tagged cohort N.
- **Bridge surface** carries spec I/O only — `ready`, `spec`, `view`,
  `save`, `view-save`, optionally `topogen-status`. Nothing about
  ticks, phases, animation, or controls crosses.

## Banned vocabulary (in substrate context)

If you find yourself writing or reasoning with these words while
working on the substrate, you have drifted:

- duration, ms, milliseconds, seconds — **except** the one allowed
  duration: a wire's `in-flight` traversal time derived from geometry.
- speed, px/ms, pixel rate — **except** the single global pulse speed
  constant used to derive `in-flight` traversal time.
- schedule, scheduler, deadline, timeout, setTimeout, setInterval
- wall-clock, Date.now, performance.now (for substrate scheduling;
  the renderer may still use `performance.now` for animation)
- "tick takes X", "tick boundary at Y", "tick duration"
- "wire holds the value past arrival" — the wire is transient under
  the revised model; parked state lives on the destination node's slot
- `loaded(v)`, `taken(v)`, wire `ack`, wire `take` — replaced by slot
  phases (`filled(v)`, `consumed`) on the destination node
- inbox queue, edge queue, slot ledger, buffered values
- central walker, setup pass, separate budget counter

These belong to the renderer, to legacy code being retired, or to
prior substrate models that have been superseded. None of them
describe the current substrate.

## Allowed vocabulary

- tick (ordinal = edge cohort), round, step, cohort
- empty, in-flight(v), filled(v), consumed
- halt, resume, snap, global gate
- arc length, pulse speed, in-flight traversal time (the one permitted
  duration)
- `fill(slotId, v)`, `slotPhase(slotId)` — the substrate operations
- auto destination, manually-gated destination, destination policy
- node fires, wire delivers, slot fills, slot consumes
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
