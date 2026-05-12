# Substrate model — revised draft

Draft for review. Not yet authoritative. [MODEL.md](MODEL.md) remains
the source of truth until this is approved and promoted.

The pivot: today the substrate `<Wire>` owns the parked slot
(`loaded(v)` persisting after pulse arrival until `take`). Under the
revised model, the wire is transient — it carries a value to the
destination and becomes empty on arrival. The slot lives on the
destination node. Source nodes observe destination slot phase
directly, not through wire phase.

## What things are

- **Node.** Owns its `run()`, its output references (each = a pointer
  to a destination node + that destination's slot id), and a map of
  input slots indexed by slot id. Slots are the node's own state.
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
  in this observation.
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
  animation completion.
- **`<Node>`** owns its slot map, exposes `slotPhase(slotId)`,
  `fill(slotId, v)`, and its firing rule. Manually-gated nodes
  render a take affordance whose click invokes the firing rule with
  the user-gate satisfied.
- **`useTickDriver`** walks nodes per round, observes wire cycle
  completion, increments tick. No wall-clock scheduling.

## Banned vocabulary (revised)

Drop from MODEL.md's current list: `loaded(v)` and `taken(v)`
(replaced by slot phases). Keep: all timing/scheduler bans. Add:
"wire holds the value past arrival" — under the revised model the
wire is transient.

## What this retires

- The current `<Wire>` fused phase + animation object.
- The `take` and `ack` signals as wire concerns.
- The `ack-is-wire-state` memory.
- The latch + AND-gate backpressure pattern as currently described
  in CLAUDE.md, which assumes wire phase carries the parked state.
  Backpressure now lives in source nodes reading `dest.slotPhase`
  directly.

## Open questions

### Q1. Tick-driver shape under slot-in-node

Today `useTickDriver` walks every node per round, calls `run()`, and
observes wire cycles to detect round close. Under the revised model
slots live on nodes and source nodes observe destination slot phase
directly — which means a node could in principle fire reactively the
moment its precondition holds, without a central walker waking it.

**What a tick actually is.** A tick is one cohort of edges that had
activity at the same moment — see
[diagrams/model-revised-draft/13-tick-as-edge-cohort.svg](diagrams/model-revised-draft/13-tick-as-edge-cohort.svg).
The tick is observable in the edges themselves, not stored on any
node. Counting ticks is counting the simultaneity layers of a
cascade. This definition is intrinsic to the activity: it needs no
walker, no coordinator, no global ID, and no node-side bookkeeping.
Any earlier framing that treated "tick ordinality" as something
only a central walker can provide was importing a top-down
assumption that the cohort definition does not need.

**Resolution: self-scheduling nodes + global play/pause gate.**
Nodes subscribe to their own slot maps and fire when preconditions
hold. A single global gate halts or starts every node at once — one
master switch, not per-node plumbing. The gate is orthogonal to the
cohort-based tick definition: ticks remain well-defined as edge
cohorts whenever the gate is on.

**Cohort enumeration is the step axis.** The regular animation loop
assigns each wire its cohort number at wire-time (max predecessor
cohort + 1), maintaining a cohort → wires registry as a side product
of normal wiring — see
[diagrams/model-revised-draft/14-step-budget.svg](diagrams/model-revised-draft/14-step-budget.svg).
No separate setup pass. "Step N" is a pure lookup: the gate releases
only wires tagged cohort N. Cohorts &lt; N and &gt; N stay inert.
Random-access stepping over the cohort axis, with the same
observability the cascade-firing pattern already exposes.

- *Properties:* Nothing happens when nothing changes — matches the
  "topology IS the logic" thesis. Halt and step are recovered
  cheaply via the master switch. Ticks are intrinsic to the
  activity, not imposed by a walker. Within a released cohort,
  wires by definition do not depend on each other, so the runaway
  synchronous-cascade risk of naive self-scheduling does not arise.
- *Cost:* Implementation surface area for the registry and gate
  plumbing, comparable to the walker code it replaces.

### Q2. Firing rule and slot ownership

The original framing asked how a firing rule "subscribes" to its
slot map (per-slot listeners vs. a node-level revision counter).
That framing dissolves once slots are recognized as passive state
owned by the node — slots do not notify anyone, so there is no
subscription to choose a shape for.

**Resolution.** A node's identity *is* its firing rule (e.g.
ReadGate's identity is AND-of-3-slots; XOR's is inequality). Slots
are passive cells of internal state, owned by the node, transitioning
through `empty → filled(v) → consumed → empty`. The node receives
incoming wire arrivals and writes the corresponding slot itself —
see
[diagrams/model-revised-draft/07-q2-firing-rule-and-slot-ownership.svg](diagrams/model-revised-draft/07-q2-firing-rule-and-slot-ownership.svg).

A wire's destination is `(node N, slot s_k)`, established at
construction time. On arrival, the wire carries its bound slot id;
the destination node sees the id and writes `slots[s_k] := filled(v)`.
The rule then re-evaluates over the slot map. One incoming wire per
slot id — two wires cannot share a slot, so "right slot ↔ right
wire" is deterministic by construction. Mis-wiring is caught at
parseSpec, not at runtime.

- *Properties:* No subscription layer. No listener bookkeeping.
  Slot identity lives on the wire (addressing metadata), not on
  the slot. The rule consults its slots when the node is woken by
  an arrival; nothing pushes from the slot side.
- *Cost:* The wire's construction-time binding must carry the slot
  id — already implied by drawing wires to specific input ports in
  the visual editor.

### Q3. Visual depiction of slots

Today the parked value is drawn as a circle at the destination end
of the wire ([Wire.tsx:112-125](tools/topology-vscode/src/webview/substrate-r/Wire.tsx#L112-L125)). Under the revised model the slot
lives on the node, not the wire.

**Resolution: slot visualized on the destination node.** A small
indicator on the destination's input port that fills when the slot
is `filled(v)` (and may show the value) — see
[diagrams/model-revised-draft/05-q3-slot-visual-depiction.svg](diagrams/model-revised-draft/05-q3-slot-visual-depiction.svg).
The wire renders only its in-flight state and is empty after arrival;
the parked value sits on the destination node where the model says
it lives.

- *Properties:* Visual matches ownership; in-flight (on the wire) is
  distinguishable from parked (on the node) at a glance. The whole
  motivation for the model change is that fusing concerns causes
  confusion; the diagram should not re-fuse them.
- *Cost:* Node bodies get marginally busier; the SVG style guide and
  reference SVGs need updating to match.
